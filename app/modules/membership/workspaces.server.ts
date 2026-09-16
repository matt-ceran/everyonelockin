import { randomBytes } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../platform/db/client.server";
import {
  boards,
  labels,
  members,
  workspaces,
} from "../../platform/db/schema.server";
import { demoLabels } from "../workspace/demo-data";
import { hashPassword, verifyPassword } from "./auth.server";

export const MAIN_BOARD = "main";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const AVATAR_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);
const MEMBER_COLORS = ["purple", "pink", "blue", "green", "orange"];
const USERNAME_PATTERN = /^[A-Za-z0-9 _.'-]{2,24}$/;

export class MembershipError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || fallback;
}

function randomCode(length: number) {
  const bytes = randomBytes(length);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte! % CODE_ALPHABET.length];
  return code;
}

export function normalizeInviteCode(value: string) {
  return value.toUpperCase().replace(/[\s]/g, "");
}

export async function getWorkspace(workspaceId: string) {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getWorkspaceByCode(code: string) {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.inviteCode, normalizeInviteCode(code)))
    .limit(1);
  return rows[0] ?? null;
}

async function uniqueInviteCode(name: string) {
  const prefix = (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3) || "ELK"
  ).padEnd(3, "X");
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${prefix}-${randomCode(5)}`;
    const existing = await getWorkspaceByCode(code);
    if (!existing) return code;
  }
  throw new MembershipError("Could not create a unique invite code.", 500);
}

async function uniqueWorkspaceId(name: string) {
  const base = slugify(name, "lockin");
  for (let attempt = 0; attempt < 10; attempt++) {
    const id =
      attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const existing = await getWorkspace(id);
    if (!existing) return id;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

export function validateWorkspaceName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2 || trimmed.length > 60)
    throw new MembershipError("Give the lock-in a name, 2 to 60 characters.");
  return trimmed;
}

export async function createWorkspace(name: string) {
  const clean = validateWorkspaceName(name);
  const id = await uniqueWorkspaceId(clean);
  const inviteCode = await uniqueInviteCode(clean);
  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({ id, name: clean, inviteCode });
    await tx
      .insert(boards)
      .values({ workspaceId: id, id: MAIN_BOARD, name: "The board" });
    await tx
      .insert(labels)
      .values(demoLabels.map((label) => ({ ...label, workspaceId: id })));
  });
  return { id, name: clean, inviteCode };
}

export function validateUsername(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!USERNAME_PATTERN.test(trimmed))
    throw new MembershipError(
      "Usernames are 2 to 24 characters: letters, numbers, spaces, and _ . ' -",
    );
  return trimmed;
}

export function validatePassword(password: string) {
  if (password.length < 8)
    throw new MembershipError("Passwords need at least 8 characters.");
  return password;
}

function initialsFor(name: string) {
  const words = name.split(" ").filter(Boolean);
  const letters =
    words.length > 1
      ? `${words[0]![0]}${words[1]![0]}`
      : (name.replace(/[^A-Za-z0-9]/g, "") + "X").slice(0, 2);
  return letters.toUpperCase();
}

export async function getMemberByName(workspaceId: string, name: string) {
  const rows = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.workspaceId, workspaceId),
        sql`lower(${members.name}) = lower(${name})`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function countMembers(workspaceId: string) {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.workspaceId, workspaceId));
  return rows.length;
}

export async function signupMember(
  workspaceId: string,
  username: string,
  password: string,
) {
  const name = validateUsername(username);
  validatePassword(password);
  const workspace = await getWorkspace(workspaceId);
  if (!workspace)
    throw new MembershipError("This lock-in no longer exists.", 404);
  if (await getMemberByName(workspaceId, name))
    throw new MembershipError("That username is taken in this lock-in.", 409);
  const total = await countMembers(workspaceId);
  const id = `${slugify(name, "member")}-${randomBytes(2).toString("hex")}`;
  const member = {
    workspaceId,
    id,
    name,
    initials: initialsFor(name),
    color: MEMBER_COLORS[total % MEMBER_COLORS.length]!,
    role: total === 0 ? "Founder" : "Member",
    passwordHash: await hashPassword(password),
    avatar: null as string | null,
  };
  await db.insert(members).values(member);
  return { id: member.id, name: member.name };
}

export async function verifyMember(
  workspaceId: string,
  username: string,
  password: string,
) {
  const member = await getMemberByName(workspaceId, username.trim());
  if (!member || !member.passwordHash)
    throw new MembershipError("No login found with that username.", 401);
  if (!(await verifyPassword(password, member.passwordHash)))
    throw new MembershipError("That password did not match.", 401);
  return { id: member.id, name: member.name, avatar: member.avatar };
}

export function avatarDirectory() {
  return path.join(process.cwd(), "public", "gamer-icons");
}

export function listAvatars() {
  try {
    return readdirSync(avatarDirectory())
      .filter((file) => {
        if (!AVATAR_EXTENSIONS.has(path.extname(file).toLowerCase()))
          return false;
        try {
          return statSync(path.join(avatarDirectory(), file)).isFile();
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function avatarUrl(file: string) {
  return `/gamer-icons/${encodeURIComponent(file)}`;
}

export async function setMemberAvatar(
  workspaceId: string,
  memberId: string,
  file: string,
) {
  if (!listAvatars().includes(file))
    throw new MembershipError("Pick one of the available icons.", 400);
  const updated = await db
    .update(members)
    .set({ avatar: file })
    .where(and(eq(members.workspaceId, workspaceId), eq(members.id, memberId)))
    .returning({ id: members.id });
  if (!updated[0]) throw new MembershipError("Membership not found.", 404);
}

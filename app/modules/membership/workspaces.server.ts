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
import {
  MembershipError,
  collapseName,
  normalizeInviteCode,
  slugify,
  validatePassword,
  validateUsername,
  validateWorkspaceName,
} from "./validation";

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
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function randomCode(length: number) {
  const bytes = randomBytes(length);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte! % CODE_ALPHABET.length];
  return code;
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
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;
  const rows = await db
    .select()
    .from(workspaces)
    .where(sql`replace(${workspaces.inviteCode}, '-', '') = ${normalized}`)
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

export async function createWorkspace(name: string) {
  const clean = validateWorkspaceName(name);
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = await uniqueWorkspaceId(clean);
    const inviteCode = await uniqueInviteCode(clean);
    try {
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
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
    }
  }
  throw new MembershipError("Could not create the lock-in.", 500);
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
  try {
    await db.insert(members).values({
      workspaceId,
      id,
      name,
      initials: initialsFor(name),
      color: MEMBER_COLORS[total % MEMBER_COLORS.length]!,
      role: total === 0 ? "Founder" : "Member",
      passwordHash: await hashPassword(password),
      avatar: null,
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new MembershipError("That username is taken in this lock-in.", 409);
    throw error;
  }
  return { id, name };
}

export async function verifyMember(
  workspaceId: string,
  username: string,
  password: string,
) {
  const member = await getMemberByName(workspaceId, collapseName(username));
  if (!member) {
    await verifyPassword(password, DUMMY_HASH);
    throw new MembershipError("Invalid username or password.", 401);
  }
  if (!member.passwordHash)
    throw new MembershipError(
      "This teammate predates logins and needs a fresh invite.",
      401,
    );
  if (!(await verifyPassword(password, member.passwordHash)))
    throw new MembershipError("Invalid username or password.", 401);
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

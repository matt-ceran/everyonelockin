import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { db } from "../../platform/db/client.server";
import { members, sessions } from "../../platform/db/schema.server";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 30;

export function sessionCookieName(workspaceId: string) {
  return `el_${workspaceId}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function serializeSessionCookie(workspaceId: string, token: string) {
  return `${sessionCookieName(workspaceId)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie(workspaceId: string) {
  return `${sessionCookieName(workspaceId)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createSession(workspaceId: string, memberId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    workspaceId,
    memberId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
  });
  return serializeSessionCookie(workspaceId, token);
}

export async function destroySession(request: Request, workspaceId: string) {
  const token = readSessionToken(request, workspaceId);
  if (token) {
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.workspaceId, workspaceId),
          eq(sessions.tokenHash, hashToken(token)),
        ),
      );
  }
  return clearSessionCookie(workspaceId);
}

export function readSessionToken(request: Request, workspaceId: string) {
  const header = request.headers.get("Cookie") ?? "";
  const name = sessionCookieName(workspaceId);
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name)
      return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export interface SessionMember {
  id: string;
  name: string;
  avatar: string | null;
}

export async function readSessionMember(
  request: Request,
  workspaceId: string,
): Promise<SessionMember | null> {
  const token = readSessionToken(request, workspaceId);
  if (!token) return null;
  const rows = await db
    .select({
      memberId: sessions.memberId,
      expiresAt: sessions.expiresAt,
      id: members.id,
      name: members.name,
      avatar: members.avatar,
    })
    .from(sessions)
    .innerJoin(
      members,
      and(
        eq(members.workspaceId, sessions.workspaceId),
        eq(members.id, sessions.memberId),
      ),
    )
    .where(
      and(
        eq(sessions.workspaceId, workspaceId),
        eq(sessions.tokenHash, hashToken(token)),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return { id: row.id, name: row.name, avatar: row.avatar };
}

export function readSessionTokens(request: Request) {
  const header = request.headers.get("Cookie") ?? "";
  const found: { workspaceId: string; token: string }[] = [];
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name.startsWith("el_")) continue;
    found.push({
      workspaceId: name.slice(3),
      token: decodeURIComponent(part.slice(index + 1).trim()),
    });
  }
  return found;
}

export async function listMemberSessions(request: Request) {
  const memberships: { workspaceId: string; memberName: string }[] = [];
  for (const { workspaceId } of readSessionTokens(request)) {
    const member = await readSessionMember(request, workspaceId);
    if (member) memberships.push({ workspaceId, memberName: member.name });
  }
  return memberships;
}

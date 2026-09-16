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

export function normalizeInviteCode(value: string) {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export function collapseName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const USERNAME_PATTERN = /^[A-Za-z0-9 _.'-]{2,24}$/;

export function validateWorkspaceName(name: string) {
  const trimmed = collapseName(name);
  if (trimmed.length < 2 || trimmed.length > 60)
    throw new MembershipError("Give the lock-in a name, 2 to 60 characters.");
  return trimmed;
}

export function validateUsername(name: string) {
  const trimmed = collapseName(name);
  if (!USERNAME_PATTERN.test(trimmed))
    throw new MembershipError(
      "Usernames are 2 to 24 characters: letters, numbers, spaces, and _ . ' -",
    );
  return trimmed;
}

export function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128)
    throw new MembershipError("Passwords need 8 to 128 characters.");
  return password;
}

export function isValidWorkspaceId(value: string) {
  return /^[a-z0-9-]{1,64}$/.test(value);
}

export const LABEL_COLORS = ["purple", "pink", "blue", "green", "orange"];

export function validateLabelName(name: string) {
  const trimmed = collapseName(name);
  if (trimmed.length < 2 || trimmed.length > 30)
    throw new MembershipError("Labels are 2 to 30 characters.");
  return trimmed;
}

export function validateLabelColor(color: string) {
  if (!LABEL_COLORS.includes(color))
    throw new MembershipError("Pick one of the label colors.");
  return color;
}

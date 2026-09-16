import type { Member } from "../modules/tasks/model";

export function avatarImageUrl(file: string) {
  return `/gamer-icons/${encodeURIComponent(file)}`;
}

export function Avatar({
  member,
  small = false,
}: {
  member?: Member;
  small?: boolean;
}) {
  if (member?.avatar) {
    return (
      <img
        className={`avatar avatar-photo ${small ? "avatar-small" : ""}`}
        src={avatarImageUrl(member.avatar)}
        alt=""
        title={member.name}
      />
    );
  }
  return (
    <span
      className={`avatar ${small ? "avatar-small" : ""} color-${member?.color ?? "neutral"}`}
      title={member?.name ?? "Unassigned"}
      aria-label={member?.name ?? "Unassigned"}
    >
      {member?.initials ?? "?"}
    </span>
  );
}

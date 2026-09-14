import type { Member } from "../modules/tasks/model";

export function Avatar({
  member,
  small = false,
}: {
  member?: Member;
  small?: boolean;
}) {
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

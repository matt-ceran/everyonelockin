import { useState } from "react";
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
  const size = small ? 23 : 34;
  const [broken, setBroken] = useState(false);
  if (member?.avatar && !broken) {
    return (
      <img
        className={`avatar avatar-photo ${small ? "avatar-small" : ""}`}
        src={avatarImageUrl(member.avatar)}
        alt=""
        title={member.name}
        width={size}
        height={size}
        onError={() => setBroken(true)}
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

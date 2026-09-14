import type { CSSProperties } from "react";

export type IconName =
  | "board"
  | "backlog"
  | "person"
  | "activity"
  | "search"
  | "plus"
  | "close"
  | "arrow"
  | "check"
  | "grip"
  | "help"
  | "refresh";
const paths: Record<IconName, string> = {
  board: "M2 3h4v14H2z M8 3h4v9H8z M14 3h4v12h-4z",
  backlog: "M3 4h14v4H3z M3 11h14v5H3z",
  person: "M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M4 17v-2a6 6 0 0 1 12 0v2",
  activity: "M2 10h4l2-6 4 12 2-6h4",
  search: "M13 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M12 12l5 5",
  plus: "M10 3v14 M3 10h14",
  close: "M4 4l12 12 M16 4 4 16",
  arrow: "M3 10h13 M11 5l5 5-5 5",
  check: "m3 10 4 4L17 4",
  grip: "M7 4v1 M13 4v1 M7 9v1 M13 9v1 M7 14v1 M13 14v1",
  help: "M10 3v14 M3 10h14 M3 3h14v14H3z",
  refresh: "M16 6A7 7 0 1 0 17 12 M16 2v5h-5",
};
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}

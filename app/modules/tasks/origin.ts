export const TASK_ORIGINS = {
  board: "",
  backlog: "/backlog",
  "my-tasks": "/my-tasks",
  activity: "/activity",
} as const;
export type TaskOrigin = keyof typeof TASK_ORIGINS;
export const DEFAULT_TASK_ORIGIN: TaskOrigin = "board";

export function readTaskOrigin(value: unknown): TaskOrigin {
  return typeof value === "string" && Object.hasOwn(TASK_ORIGINS, value)
    ? (value as TaskOrigin)
    : DEFAULT_TASK_ORIGIN;
}

export function taskOriginPath(base: string, origin: TaskOrigin) {
  return `${base}${TASK_ORIGINS[origin]}`;
}

export function taskPath(
  base: string,
  taskId: string,
  origin: TaskOrigin,
  params: Record<string, string> = {},
) {
  return buildPath(`${base}/tasks/${taskId}`, origin, params);
}

export function newTaskPath(
  base: string,
  origin: TaskOrigin,
  params: Record<string, string> = {},
) {
  return buildPath(`${base}/tasks/new`, origin, params);
}

export function taskOriginFromPath(
  pathname: string,
  from: string | null,
  base: string,
): TaskOrigin {
  if (pathname.startsWith(`${base}/tasks/`)) return readTaskOrigin(from);
  const suffix = pathname.slice(base.length).replace(/\/+$/, "");
  const match = (Object.entries(TASK_ORIGINS) as [TaskOrigin, string][]).find(
    ([origin, path]) => origin !== DEFAULT_TASK_ORIGIN && path === suffix,
  );
  return match?.[0] ?? DEFAULT_TASK_ORIGIN;
}

function buildPath(
  path: string,
  origin: TaskOrigin,
  params: Record<string, string>,
) {
  const search = new URLSearchParams(
    origin === DEFAULT_TASK_ORIGIN ? params : { from: origin, ...params },
  );
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

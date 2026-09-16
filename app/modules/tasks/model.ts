export const STATUSES = [
  "backlog",
  "ready",
  "in_progress",
  "review",
  "done",
] as const;
export type TaskStatus = (typeof STATUSES)[number];
export const ACTIVE_STATUSES = [
  "ready",
  "in_progress",
  "review",
  "done",
] as const;
export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  ready: "Up next",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};
export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  avatar: string | null;
}
export interface Label {
  id: string;
  name: string;
  color: string;
}
export interface Task {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  ownerId: string | null;
  helperIds: string[];
  labelIds: string[];
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Activity {
  id: string;
  taskId: string | null;
  actorId: string;
  message: string;
  createdAt: string;
}
export interface WorkspaceSnapshot {
  name: string;
  currentMemberId: string;
  tasks: Task[];
  archived: Task[];
  members: Member[];
  labels: Label[];
  activity: Activity[];
}

export function matchesTask(
  task: Task,
  filters: { query?: string; label?: string; owner?: string },
) {
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";
  return (
    (!query ||
      `${task.title} ${task.description} EL-${task.number}`
        .toLocaleLowerCase()
        .includes(query)) &&
    (!filters.label || task.labelIds.includes(filters.label)) &&
    (!filters.owner ||
      (filters.owner === "unassigned"
        ? !task.ownerId
        : task.ownerId === filters.owner))
  );
}

export function orderedTasks(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) => a.position - b.position || a.number - b.number,
  );
}

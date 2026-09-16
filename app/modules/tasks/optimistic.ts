import type { TaskCommand } from "./commands";
import { orderedTasks, type WorkspaceSnapshot } from "./model";

export function optimisticWorkspace(
  snapshot: WorkspaceSnapshot,
  command?: TaskCommand,
): WorkspaceSnapshot {
  if (
    !command ||
    command.intent === "create" ||
    command.intent === "archive" ||
    command.intent === "restore" ||
    command.intent === "delete"
  )
    return snapshot;
  const tasks = snapshot.tasks.map((t) => ({ ...t }));
  const task = tasks.find((t) => t.id === command.taskId);
  if (!task) return snapshot;
  if (command.intent === "move") {
    const siblings = orderedTasks(
      tasks.filter((t) => t.status === command.status && t.id !== task.id),
    );
    const target = command.beforeId
      ? siblings.findIndex((t) => t.id === command.beforeId)
      : siblings.length;
    if (target < 0) return snapshot;
    siblings.splice(target, 0, task);
    for (const [i, item] of siblings.entries()) {
      item.status = command.status;
      item.position = (i + 1) * 1000;
    }
  } else if (command.intent === "help") {
    task.helperIds = command.helping
      ? [...new Set([...task.helperIds, snapshot.currentMemberId])]
      : task.helperIds.filter((id) => id !== snapshot.currentMemberId);
  } else if (command.intent === "update") {
    Object.assign(task, {
      title: command.title,
      description: command.description,
      ownerId: command.ownerId,
      labelIds: command.labelIds,
      priority: command.priority,
    });
  }
  return { ...snapshot, tasks };
}

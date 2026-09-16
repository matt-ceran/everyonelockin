import { createHash } from "node:crypto";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "../../platform/db/client.server";
import {
  activity,
  boards,
  labels,
  members,
  receipts,
  taskHelpers,
  taskLabels,
  tasks,
} from "../../platform/db/schema.server";
import { MAIN_BOARD } from "../membership/workspaces.server";
import { STATUS_LABELS } from "./model";
import type { CommandResult, TaskCommand } from "./commands";

export class TaskError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function executeCommand(
  command: TaskCommand,
  workspaceId: string,
  actorId: string,
): Promise<CommandResult> {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  return db.transaction(async (tx) => {
    // All writes take this lock, including creates, archives, and rank rebalances.
    const board = await tx
      .select()
      .from(boards)
      .where(
        and(eq(boards.workspaceId, workspaceId), eq(boards.id, MAIN_BOARD)),
      )
      .for("update");
    if (!board[0])
      throw new TaskError("This workspace could not be found.", 404);
    const actor = await tx
      .select()
      .from(members)
      .where(
        and(eq(members.workspaceId, workspaceId), eq(members.id, actorId)),
      );
    if (!actor[0])
      throw new TaskError("You don't have access to this workspace.", 403);
    const receipt = await tx
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.workspaceId, workspaceId),
          eq(receipts.actorId, actorId),
          eq(receipts.id, command.mutationId),
        ),
      );
    if (receipt[0]) {
      if (receipt[0].payloadHash !== payloadHash)
        throw new TaskError(
          "This request ID was already used for a different change.",
          409,
        );
      return receipt[0].result;
    }

    if (command.intent === "create" || command.intent === "update") {
      if (command.ownerId) {
        const owner = await tx
          .select()
          .from(members)
          .where(
            and(
              eq(members.workspaceId, workspaceId),
              eq(members.id, command.ownerId),
            ),
          );
        if (!owner[0]) throw new TaskError("Choose someone in this workspace.");
      }
      const available = await tx
        .select()
        .from(labels)
        .where(eq(labels.workspaceId, workspaceId));
      if (
        command.labelIds.some(
          (id) => !available.some((label) => label.id === id),
        )
      )
        throw new TaskError("One of those labels is no longer available.");
    }

    let taskId: string;
    let message: string;
    if (command.intent === "create") {
      const last = await tx
        .select({ position: tasks.position })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            eq(tasks.boardId, MAIN_BOARD),
            eq(tasks.status, command.status),
            isNull(tasks.archivedAt),
          ),
        )
        .orderBy(sql`${tasks.position} desc`)
        .limit(1);
      const [created] = await tx
        .insert(tasks)
        .values({
          workspaceId,
          boardId: MAIN_BOARD,
          title: command.title,
          description: command.description,
          status: command.status,
          ownerId: command.ownerId,
          priority: command.priority,
          position: (last[0]?.position ?? 0) + 1000,
        })
        .returning();
      if (!created) throw new TaskError("The task could not be created.", 500);
      taskId = created.id;
      message = `created EL-${created.number}: ${created.title}`;
    } else {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            eq(tasks.id, command.taskId),
            isNull(tasks.archivedAt),
          ),
        );
      if (!task) throw new TaskError("This task is no longer available.", 404);
      if (task.version !== command.version)
        throw new TaskError(
          "Someone updated this task. Your changes have not been saved.",
          409,
        );
      taskId = task.id;
      const version = task.version + 1;
      const updatedAt = new Date();
      if (command.intent === "update") {
        await tx
          .update(tasks)
          .set({
            title: command.title,
            description: command.description,
            ownerId: command.ownerId,
            priority: command.priority,
            version,
            updatedAt,
          })
          .where(eq(tasks.id, taskId));
        message = `updated EL-${task.number}: ${command.title}`;
      } else if (command.intent === "move") {
        if (command.beforeId === task.id)
          throw new TaskError("A task cannot be placed before itself.");
        const siblings = await tx
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              eq(tasks.boardId, MAIN_BOARD),
              eq(tasks.status, command.status),
              ne(tasks.id, task.id),
              isNull(tasks.archivedAt),
            ),
          )
          .orderBy(asc(tasks.position), asc(tasks.number));
        const insertion = command.beforeId
          ? siblings.findIndex((t) => t.id === command.beforeId)
          : siblings.length;
        if (insertion < 0)
          throw new TaskError(
            "The destination changed. Refresh the board and try again.",
            409,
          );
        let previous = siblings[insertion - 1]?.position ?? 0;
        let next = siblings[insertion]?.position ?? previous + 2000;
        if (next - previous < 2) {
          for (const [i, sibling] of siblings.entries())
            await tx
              .update(tasks)
              .set({ position: (i + 1) * 1000 })
              .where(eq(tasks.id, sibling.id));
          previous = insertion * 1000;
          next = previous + 2000;
          if (insertion < siblings.length) next = (insertion + 1) * 1000;
        }
        await tx
          .update(tasks)
          .set({
            status: command.status,
            position: Math.floor((previous + next) / 2),
            version,
            updatedAt,
          })
          .where(eq(tasks.id, taskId));
        message = `moved EL-${task.number} to ${STATUS_LABELS[command.status]}`;
      } else if (command.intent === "help") {
        if (command.helping)
          await tx
            .insert(taskHelpers)
            .values({ workspaceId, taskId, memberId: actorId })
            .onConflictDoNothing();
        else
          await tx
            .delete(taskHelpers)
            .where(
              and(
                eq(taskHelpers.taskId, taskId),
                eq(taskHelpers.memberId, actorId),
              ),
            );
        await tx
          .update(tasks)
          .set({ version, updatedAt })
          .where(eq(tasks.id, taskId));
        message = `${command.helping ? "offered to help with" : "stepped back from"} EL-${task.number}`;
      } else {
        await tx
          .update(tasks)
          .set({ archivedAt: new Date(), version, updatedAt })
          .where(eq(tasks.id, taskId));
        message = `archived EL-${task.number}: ${task.title}`;
      }
    }
    if (command.intent === "create" || command.intent === "update") {
      await tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
      const ids = [...new Set(command.labelIds)];
      if (ids.length)
        await tx
          .insert(taskLabels)
          .values(ids.map((labelId) => ({ workspaceId, taskId, labelId })));
    }
    await tx.insert(activity).values({ workspaceId, taskId, actorId, message });
    const result: CommandResult = {
      ok: true,
      taskId,
      message: "Saved. " + message[0]!.toUpperCase() + message.slice(1) + ".",
      intent: command.intent,
    };
    await tx.insert(receipts).values({
      id: command.mutationId,
      workspaceId,
      actorId,
      payloadHash,
      result,
    });
    return result;
  });
}

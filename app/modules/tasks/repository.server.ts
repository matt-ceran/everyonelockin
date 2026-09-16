import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../../platform/db/client.server";
import * as tables from "../../platform/db/schema.server";
import type { WorkspaceSnapshot } from "./model";

export async function readWorkspace(
  workspaceId: string,
  currentMemberId: string,
): Promise<WorkspaceSnapshot> {
  return db.transaction(
    async (tx) => {
      const workspace = await tx
        .select()
        .from(tables.workspaces)
        .where(eq(tables.workspaces.id, workspaceId));
      const taskRows = await tx
        .select()
        .from(tables.tasks)
        .where(
          and(
            eq(tables.tasks.workspaceId, workspaceId),
            isNull(tables.tasks.archivedAt),
          ),
        );
      const archivedRows = await tx
        .select()
        .from(tables.tasks)
        .where(
          and(
            eq(tables.tasks.workspaceId, workspaceId),
            isNotNull(tables.tasks.archivedAt),
          ),
        )
        .orderBy(desc(tables.tasks.updatedAt))
        .limit(50);
      const memberRows = await tx
        .select({
          id: tables.members.id,
          name: tables.members.name,
          initials: tables.members.initials,
          color: tables.members.color,
          role: tables.members.role,
          avatar: tables.members.avatar,
        })
        .from(tables.members)
        .where(eq(tables.members.workspaceId, workspaceId));
      const labels = await tx
        .select()
        .from(tables.labels)
        .where(eq(tables.labels.workspaceId, workspaceId));
      const links = await tx
        .select()
        .from(tables.taskLabels)
        .where(eq(tables.taskLabels.workspaceId, workspaceId));
      const helpers = await tx
        .select()
        .from(tables.taskHelpers)
        .where(eq(tables.taskHelpers.workspaceId, workspaceId));
      const activity = await tx
        .select()
        .from(tables.activity)
        .where(eq(tables.activity.workspaceId, workspaceId))
        .orderBy(desc(tables.activity.createdAt))
        .limit(100);
      if (!workspace[0] || !memberRows.some((m) => m.id === currentMemberId))
        throw new Response("Workspace not found.", { status: 404 });
      const shape = (task: (typeof taskRows)[number]) => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        labelIds: links
          .filter((l) => l.taskId === task.id)
          .map((l) => l.labelId),
        helperIds: helpers
          .filter((h) => h.taskId === task.id)
          .map((h) => h.memberId),
      });
      return {
        name: workspace[0].name,
        currentMemberId,
        members: memberRows,
        labels,
        tasks: taskRows.map(shape),
        archived: archivedRows.map(shape),
        activity: activity.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

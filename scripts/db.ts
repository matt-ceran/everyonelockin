import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, closeDatabase } from "../app/platform/db/client.server";
import * as schema from "../app/platform/db/schema.server";
import { DEMO_BOARD, DEMO_WORKSPACE } from "../app/platform/demo.server";
import {
  demoLabels,
  demoMembers,
  demoTasks,
} from "../app/modules/workspace/demo-data";

try {
  if (process.argv[2] === "migrate") {
    await migrate(db, { migrationsFolder: "./db/migrations" });
    console.log("Database migrations applied.");
  } else if (process.argv[2] === "seed") {
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.workspaces)
        .values({ id: DEMO_WORKSPACE, name: "The studio" })
        .onConflictDoNothing();
      await tx
        .insert(schema.boards)
        .values({
          workspaceId: DEMO_WORKSPACE,
          id: DEMO_BOARD,
          name: "The board",
        })
        .onConflictDoNothing();
      await tx
        .insert(schema.members)
        .values(demoMembers.map((m) => ({ ...m, workspaceId: DEMO_WORKSPACE })))
        .onConflictDoNothing();
      await tx
        .insert(schema.labels)
        .values(demoLabels.map((l) => ({ ...l, workspaceId: DEMO_WORKSPACE })))
        .onConflictDoNothing();
      const existing = await tx
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(eq(schema.tasks.workspaceId, DEMO_WORKSPACE))
        .limit(1);
      if (existing.length) {
        console.log("Existing workspace kept; seed tasks already exist.");
        return;
      }
      for (const [i, task] of demoTasks.entries()) {
        const id = randomUUID();
        const createdAt = new Date(
          Date.now() - (demoTasks.length - i) * 3600000,
        );
        await tx.insert(schema.tasks).values({
          id,
          workspaceId: DEMO_WORKSPACE,
          boardId: DEMO_BOARD,
          title: task.title,
          description: task.description,
          status: task.status,
          ownerId: task.ownerId,
          priority: task.priority ?? "normal",
          position: (i + 1) * 1000,
          createdAt,
          updatedAt: createdAt,
        });
        await tx.insert(schema.taskLabels).values(
          task.labels.map((labelId) => ({
            workspaceId: DEMO_WORKSPACE,
            taskId: id,
            labelId,
          })),
        );
        if (task.helpers?.length)
          await tx.insert(schema.taskHelpers).values(
            task.helpers.map((memberId) => ({
              workspaceId: DEMO_WORKSPACE,
              taskId: id,
              memberId,
            })),
          );
        await tx.insert(schema.activity).values({
          workspaceId: DEMO_WORKSPACE,
          taskId: id,
          actorId: task.ownerId ?? "you",
          message: `added ${task.title}`,
          createdAt,
        });
      }
      console.log("Sample workspace created.");
    });
  } else throw new Error("Use migrate or seed.");
} finally {
  await closeDatabase();
}

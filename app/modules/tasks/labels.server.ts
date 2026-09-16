import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../platform/db/client.server";
import {
  labels,
  members,
  receipts,
  taskLabels,
} from "../../platform/db/schema.server";
import {
  slugify,
  validateLabelColor,
  validateLabelName,
} from "../membership/validation";
import type { LabelCommand, LabelResult } from "./commands";
import { TaskError } from "./service.server";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function executeLabelCommand(
  command: LabelCommand,
  workspaceId: string,
  actorId: string,
): Promise<LabelResult> {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  return db.transaction(async (tx) => {
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
      if (!("labelId" in receipt[0].result))
        throw new TaskError(
          "This request ID was already used for a different change.",
          409,
        );
      return receipt[0].result;
    }

    let labelId: string;
    let message: string;
    if (command.intent === "create") {
      const name = validateLabelName(command.name);
      const color = validateLabelColor(command.color);
      labelId = `${slugify(name, "label")}-${randomBytes(2).toString("hex")}`;
      try {
        await tx
          .insert(labels)
          .values({ workspaceId, id: labelId, name, color });
      } catch (error) {
        if (isUniqueViolation(error))
          throw new TaskError("That label already exists.", 409);
        throw error;
      }
      message = `added the ${name} label`;
    } else {
      const found = await tx
        .select()
        .from(labels)
        .where(
          and(
            eq(labels.workspaceId, workspaceId),
            eq(labels.id, command.labelId),
          ),
        );
      if (!found[0]) throw new TaskError("That label is gone.", 404);
      labelId = found[0].id;
      if (command.intent === "rename") {
        const name = validateLabelName(command.name);
        const color = validateLabelColor(command.color);
        try {
          await tx
            .update(labels)
            .set({ name, color })
            .where(
              and(eq(labels.workspaceId, workspaceId), eq(labels.id, labelId)),
            );
        } catch (error) {
          if (isUniqueViolation(error))
            throw new TaskError("That label already exists.", 409);
          throw error;
        }
        message = `renamed a label to ${name}`;
      } else {
        await tx
          .delete(taskLabels)
          .where(
            and(
              eq(taskLabels.workspaceId, workspaceId),
              eq(taskLabels.labelId, labelId),
            ),
          );
        await tx
          .delete(labels)
          .where(
            and(eq(labels.workspaceId, workspaceId), eq(labels.id, labelId)),
          );
        message = `removed the ${found[0].name} label`;
      }
    }
    const result: LabelResult = {
      ok: true,
      labelId,
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

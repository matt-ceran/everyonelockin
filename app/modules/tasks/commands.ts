import { z } from "zod";
import { PRIORITIES, STATUSES } from "./model";

const fields = {
  title: z
    .string()
    .trim()
    .min(1, "Give your task a title.")
    .max(180, "Keep the title under 180 characters."),
  description: z.string().trim().max(10000),
  ownerId: z.string().max(60).nullable(),
  labelIds: z.array(z.string().max(60)).max(12),
  priority: z.enum(PRIORITIES),
};
const mutation = { mutationId: z.uuid() };
const existing = {
  ...mutation,
  taskId: z.uuid(),
  version: z.number().int().positive(),
};
export const commandSchema = z.discriminatedUnion("intent", [
  z.object({
    ...mutation,
    ...fields,
    intent: z.literal("create"),
    status: z.enum(STATUSES),
  }),
  z.object({ ...existing, ...fields, intent: z.literal("update") }),
  z.object({
    ...existing,
    intent: z.literal("move"),
    status: z.enum(STATUSES),
    beforeId: z.uuid().nullable(),
  }),
  z.object({ ...existing, intent: z.literal("help"), helping: z.boolean() }),
  z.object({ ...existing, intent: z.literal("archive") }),
]);
export type TaskCommand = z.infer<typeof commandSchema>;
export type TaskCommandInput = TaskCommand extends infer C
  ? C extends TaskCommand
    ? Omit<C, "mutationId">
    : never
  : never;
export interface CommandResult {
  ok: true;
  taskId: string;
  message: string;
  intent: TaskCommand["intent"];
}
export interface CommandFailure {
  ok: false;
  message: string;
  conflict?: boolean;
}

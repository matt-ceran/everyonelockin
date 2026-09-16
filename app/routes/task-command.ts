import { data, redirect, type ActionFunctionArgs } from "react-router";
import { readSessionMember } from "../modules/membership/auth.server";
import { getWorkspace } from "../modules/membership/workspaces.server";
import { requireSameOrigin } from "../platform/demo.server";
import { commandSchema } from "../modules/tasks/commands";
import {
  readTaskOrigin,
  taskOriginPath,
  taskPath,
  type TaskOrigin,
} from "../modules/tasks/origin";
import { executeCommand, TaskError } from "../modules/tasks/service.server";

export async function action({ request, params }: ActionFunctionArgs) {
  requireSameOrigin(request);
  const workspaceId = params.workspaceId!;
  const workspace = await getWorkspace(workspaceId);
  if (!workspace)
    return data(
      { ok: false as const, message: "This lock-in no longer exists." },
      { status: 404 },
    );
  const member = await readSessionMember(request, workspaceId);
  if (!member)
    return data(
      { ok: false as const, message: "Log in to make changes." },
      { status: 403 },
    );
  const base = `/w/${workspaceId}`;
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 32768)
    return data(
      { ok: false as const, message: "That task is too large." },
      { status: 413 },
    );
  let payload: unknown;
  let origin: TaskOrigin;
  try {
    const form = await request.formData();
    const value = form.get("command");
    if (typeof value !== "string" || value.length > 32768) throw new Error();
    payload = JSON.parse(value);
    origin = readTaskOrigin(form.get("origin"));
  } catch {
    return data(
      {
        ok: false as const,
        message: "The change could not be read. Please try again.",
      },
      { status: 400 },
    );
  }
  const parsed = commandSchema.safeParse(payload);
  if (!parsed.success)
    return data(
      {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Check the task fields.",
      },
      { status: 422 },
    );
  try {
    const result = await executeCommand(parsed.data, workspaceId, member.id);
    if (
      result.intent === "create" ||
      result.intent === "update" ||
      result.intent === "restore"
    )
      return redirect(taskPath(base, result.taskId, origin));
    if (result.intent === "archive" || result.intent === "delete")
      return redirect(taskOriginPath(base, origin));
    return data(result);
  } catch (error) {
    if (error instanceof TaskError)
      return data(
        {
          ok: false as const,
          message: error.message,
          conflict: error.status === 409,
        },
        { status: error.status },
      );
    console.error(
      "Task command failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    return data(
      {
        ok: false as const,
        message: "The change wasn't saved. Please try again.",
      },
      { status: 500 },
    );
  }
}

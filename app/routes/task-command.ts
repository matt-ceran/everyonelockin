import { data, redirect, type ActionFunctionArgs } from "react-router";
import { commandSchema } from "../modules/tasks/commands";
import { executeCommand, TaskError } from "../modules/tasks/service.server";
import { requireDemo, requireSameOrigin } from "../platform/demo.server";

export async function action({ request }: ActionFunctionArgs) {
  requireDemo(request);
  requireSameOrigin(request);
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 32768)
    return data(
      { ok: false as const, message: "That task is too large." },
      { status: 413 },
    );
  let payload: unknown;
  try {
    const form = await request.formData();
    const value = form.get("command");
    if (typeof value !== "string" || value.length > 32768) throw new Error();
    payload = JSON.parse(value);
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
    const result = await executeCommand(parsed.data);
    if (result.intent === "create" || result.intent === "update")
      return redirect(`/tasks/${result.taskId}`);
    if (result.intent === "archive") return redirect("/");
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

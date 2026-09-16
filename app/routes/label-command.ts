import { data, type ActionFunctionArgs } from "react-router";
import { readSessionMember } from "../modules/membership/auth.server";
import { MembershipError } from "../modules/membership/validation";
import { getWorkspace } from "../modules/membership/workspaces.server";
import { requireSameOrigin } from "../platform/demo.server";
import { labelSchema } from "../modules/tasks/commands";
import { executeLabelCommand } from "../modules/tasks/labels.server";
import { TaskError } from "../modules/tasks/service.server";

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
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 32768)
    return data(
      { ok: false as const, message: "That change is too large." },
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
  const parsed = labelSchema.safeParse(payload);
  if (!parsed.success)
    return data(
      {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Check the label fields.",
      },
      { status: 422 },
    );
  try {
    return data(await executeLabelCommand(parsed.data, workspaceId, member.id));
  } catch (error) {
    if (error instanceof TaskError || error instanceof MembershipError)
      return data(
        { ok: false as const, message: error.message },
        { status: error.status },
      );
    console.error(
      "Label command failed.",
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

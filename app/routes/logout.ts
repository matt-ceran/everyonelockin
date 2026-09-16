import { redirect, type ActionFunctionArgs } from "react-router";
import { destroySession } from "../modules/membership/auth.server";
import { requireSameOrigin } from "../platform/demo.server";

export async function action({ request, params }: ActionFunctionArgs) {
  requireSameOrigin(request);
  const workspaceId = params.workspaceId!;
  const cookie = await destroySession(request, workspaceId);
  return redirect("/", { headers: { "Set-Cookie": cookie } });
}

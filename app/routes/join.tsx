import { redirect, type LoaderFunctionArgs } from "react-router";
import { getWorkspaceByCode } from "../modules/membership/workspaces.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const workspace = await getWorkspaceByCode(params.code ?? "");
  if (!workspace) return redirect("/?unknown-code=1");
  return redirect(`/w/${workspace.id}/welcome`);
}

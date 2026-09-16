import { useState } from "react";
import {
  Form,
  data,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { readSessionMember } from "../modules/membership/auth.server";
import {
  MembershipError,
  getWorkspace,
  listAvatars,
  setMemberAvatar,
} from "../modules/membership/workspaces.server";
import { requireSameOrigin } from "../platform/demo.server";
import { avatarImageUrl } from "../components/avatar";
import { GateFrame } from "../modules/gate/frame";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const workspaceId = params.workspaceId!;
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Response("Lock-in not found.", { status: 404 });
  const member = await readSessionMember(request, workspaceId);
  if (!member) return redirect(`/w/${workspaceId}/welcome`);
  return { workspace, avatars: listAvatars(), picked: member.avatar };
}

export async function action({ request, params }: ActionFunctionArgs) {
  requireSameOrigin(request);
  const workspaceId = params.workspaceId!;
  const member = await readSessionMember(request, workspaceId);
  if (!member) return redirect(`/w/${workspaceId}/welcome`);
  const form = await request.formData();
  try {
    await setMemberAvatar(
      workspaceId,
      member.id,
      String(form.get("avatar") ?? ""),
    );
    return redirect(`/w/${workspaceId}`);
  } catch (error) {
    if (error instanceof MembershipError)
      return data(
        { ok: false as const, message: error.message },
        { status: error.status },
      );
    console.error(
      "Pick-icon action failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    return data(
      { ok: false as const, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

export default function PickIconRoute() {
  const { workspace, avatars, picked } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const [selected, setSelected] = useState<string | null>(picked);
  return (
    <GateFrame
      asideTitle="All together now."
      asideNote="Almost in. Pick your face."
      footerNote={`${workspace.name} / PICK YOUR ICON`.toUpperCase()}
    >
      <div className="gate-column gate-wide">
        <Form method="post" className="icon-form">
          <div className="gamer-grid" role="group" aria-label="Pick your icon">
            {avatars.map((file) => (
              <button
                key={file}
                type="button"
                className="gamer"
                aria-pressed={selected === file}
                onClick={() => setSelected(file)}
              >
                <img src={avatarImageUrl(file)} alt="" />
              </button>
            ))}
          </div>
          {!avatars.length && (
            <p className="muted">No icons are available yet.</p>
          )}
          {result && !result.ok && (
            <p className="form-error" role="alert">
              {result.message}
            </p>
          )}
          <input type="hidden" name="avatar" value={selected ?? ""} />
          <button
            className="button button-primary"
            type="submit"
            disabled={!selected}
          >
            Enter the board →
          </button>
        </Form>
      </div>
    </GateFrame>
  );
}

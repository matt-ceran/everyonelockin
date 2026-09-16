import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { listMemberSessions } from "../modules/membership/auth.server";
import {
  MembershipError,
  createWorkspace,
  getWorkspace,
  getWorkspaceByCode,
} from "../modules/membership/workspaces.server";
import { requireSameOrigin } from "../platform/demo.server";
import { GateFrame } from "../modules/gate/frame";

export async function loader({ request }: LoaderFunctionArgs) {
  const memberships = await listMemberSessions(request);
  const lockins = [];
  for (const membership of memberships) {
    const workspace = await getWorkspace(membership.workspaceId);
    if (workspace)
      lockins.push({ ...membership, workspaceName: workspace.name });
  }
  return { lockins };
}

export async function action({ request }: ActionFunctionArgs) {
  requireSameOrigin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  try {
    if (intent === "create") {
      const { id } = await createWorkspace(String(form.get("name") ?? ""));
      return redirect(`/w/${id}/welcome`);
    }
    if (intent === "join") {
      const code = String(form.get("code") ?? "");
      const workspace = await getWorkspaceByCode(code);
      if (!workspace)
        return data(
          { ok: false as const, message: "That code didn't match a lock-in." },
          { status: 404 },
        );
      return redirect(`/w/${workspace.id}/welcome`);
    }
    return data(
      { ok: false as const, message: "Choose create or join." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof MembershipError)
      return data(
        { ok: false as const, message: error.message },
        { status: error.status },
      );
    console.error(
      "Landing action failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    return data(
      { ok: false as const, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

export default function LandingRoute() {
  const { lockins } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const [params] = useSearchParams();
  return (
    <GateFrame
      asideTitle="All together now."
      asideNote="Create or join. Then lock in."
      footerNote="START"
    >
      <div className="gate-column">
        {lockins.length > 0 && (
          <section className="gate-card" aria-label="Your lock-ins">
            <h2>Back to it.</h2>
            {lockins.map((lockin) => (
              <Link
                key={lockin.workspaceId}
                className="button lockin-link"
                to={`/w/${lockin.workspaceId}`}
              >
                {lockin.workspaceName} · {lockin.memberName} →
              </Link>
            ))}
          </section>
        )}
        <section className="gate-card" aria-label="Create a lock-in">
          <Form method="post">
            <input type="hidden" name="intent" value="create" />
            <label className="form-field">
              Name your lock-in
              <input
                name="name"
                placeholder="e.g. The studio"
                required
                minLength={2}
                maxLength={60}
                autoComplete="off"
              />
            </label>
            <button className="button button-primary" type="submit">
              + Create a new lock-in
            </button>
          </Form>
        </section>
        <section className="gate-card" aria-label="Join a lock-in">
          <Form method="post">
            <input type="hidden" name="intent" value="join" />
            <label className="form-field">
              Have a code?
              <input
                name="code"
                placeholder="e.g. STU-4F8K2"
                required
                autoComplete="off"
              />
            </label>
            <button className="button" type="submit">
              Join a lock-in
            </button>
          </Form>
          {result && !result.ok && (
            <p className="form-error" role="alert">
              {result.message}
            </p>
          )}
          {params.get("unknown-code") !== null && (
            <p className="form-error" role="alert">
              That link didn't match a lock-in.
            </p>
          )}
        </section>
      </div>
    </GateFrame>
  );
}

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
import {
  createSession,
  readSessionMember,
} from "../modules/membership/auth.server";
import {
  MembershipError,
  getWorkspace,
  signupMember,
  verifyMember,
} from "../modules/membership/workspaces.server";
import { requireSameOrigin } from "../platform/demo.server";
import { GateFrame } from "../modules/gate/frame";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const workspaceId = params.workspaceId!;
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Response("Lock-in not found.", { status: 404 });
  const member = await readSessionMember(request, workspaceId);
  if (member)
    return redirect(
      member.avatar ? `/w/${workspaceId}` : `/w/${workspaceId}/pick-icon`,
    );
  return { workspace };
}

export async function action({ request, params }: ActionFunctionArgs) {
  requireSameOrigin(request);
  const workspaceId = params.workspaceId!;
  const form = await request.formData();
  const mode = form.get("mode");
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  try {
    if (mode === "signup") {
      const repeat = String(form.get("repeat") ?? "");
      if (password !== repeat)
        return data(
          { ok: false as const, message: "Those passwords did not match." },
          { status: 400 },
        );
      const member = await signupMember(workspaceId, username, password);
      const cookie = await createSession(workspaceId, member.id);
      return redirect(`/w/${workspaceId}/pick-icon`, {
        headers: { "Set-Cookie": cookie },
      });
    }
    if (mode === "login") {
      const member = await verifyMember(workspaceId, username, password);
      const cookie = await createSession(workspaceId, member.id);
      const destination = member.avatar
        ? `/w/${workspaceId}`
        : `/w/${workspaceId}/pick-icon`;
      return redirect(destination, { headers: { "Set-Cookie": cookie } });
    }
    return data(
      { ok: false as const, message: "Choose signup or login." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof MembershipError)
      return data(
        { ok: false as const, message: error.message },
        { status: error.status },
      );
    console.error(
      "Welcome action failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    return data(
      { ok: false as const, message: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

export default function WelcomeRoute() {
  const { workspace } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const [params] = useSearchParams();
  const login = params.get("mode") === "login";
  return (
    <GateFrame
      asideTitle="All together now."
      asideNote={`You joined “${workspace.name}”.`}
      footerNote={`${workspace.name} / NEW MEMBER`.toUpperCase()}
    >
      <div className="gate-column">
        <section className="gate-card" aria-label="Your login for this lock-in">
          <Form method="post">
            <input
              type="hidden"
              name="mode"
              value={login ? "login" : "signup"}
            />
            <label className="form-field">
              Username
              <input
                name="username"
                placeholder="e.g. matt"
                required
                minLength={2}
                maxLength={24}
                autoComplete="username"
              />
            </label>
            <label className="form-field">
              Password
              <input
                name="password"
                type="password"
                placeholder={login ? "Your password" : "Pick a password"}
                required
                minLength={8}
                autoComplete={login ? "current-password" : "new-password"}
              />
            </label>
            {!login && (
              <label className="form-field">
                Repeat password
                <input
                  name="repeat"
                  type="password"
                  placeholder="Again"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            )}
            {result && !result.ok && (
              <p className="form-error" role="alert">
                {result.message}
              </p>
            )}
            <button className="button button-primary" type="submit">
              {login ? "Log in →" : "Lock me in →"}
            </button>
          </Form>
          <p className="gate-switch">
            {login ? (
              <>
                New here? <Link to=".">Make a login for this lock-in</Link>
              </>
            ) : (
              <>
                Already have one? <Link to="?mode=login">Log in</Link>
              </>
            )}
          </p>
        </section>
      </div>
    </GateFrame>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Outlet,
  redirect,
  useFetcher,
  useLoaderData,
  useLocation,
  useRevalidator,
  type LoaderFunctionArgs,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import {
  publicOrigin,
  readSessionMember,
} from "../modules/membership/auth.server";
import { getWorkspace } from "../modules/membership/workspaces.server";
import { pickQuote } from "../modules/quotes/quotes";
import {
  commandSchema,
  type CommandFailure,
  type CommandResult,
  type TaskCommandInput,
} from "../modules/tasks/commands";
import { optimisticWorkspace } from "../modules/tasks/optimistic";
import { readWorkspace } from "../modules/tasks/repository.server";
import { WorkspaceContext } from "../modules/workspace/context";
import { Shell } from "../modules/workspace/shell";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const workspaceId = params.workspaceId!;
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Response("Lock-in not found.", { status: 404 });
  const member = await readSessionMember(request, workspaceId);
  if (!member) return redirect(`/w/${workspaceId}/welcome`);
  if (!member.avatar) return redirect(`/w/${workspaceId}/pick-icon`);
  const snapshot = await readWorkspace(workspaceId, member.id);
  const inviteCode = workspace.inviteCode;
  return {
    snapshot,
    base: `/w/${workspaceId}`,
    quote: pickQuote(),
    inviteCode,
    inviteLink: `${publicOrigin(request)}/join/${inviteCode}`,
  };
}
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (
    !formMethod &&
    !currentUrl.pathname.includes("/tasks/") &&
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  )
    return false;
  return defaultShouldRevalidate;
}
export default function WorkspaceRoute() {
  const {
    snapshot: loaded,
    base,
    quote,
    inviteCode,
    inviteLink,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<CommandResult | CommandFailure>();
  const { revalidate, state } = useRevalidator();
  const location = useLocation();
  const [resultLocation, setResultLocation] = useState<string>();
  const pendingFocus = useRef<{ taskId: string; sawBusy: boolean } | null>(
    null,
  );
  const busy = fetcher.state !== "idle";
  const encoded = fetcher.formData?.get("command");
  const parsed =
    typeof encoded === "string"
      ? commandSchema.safeParse(JSON.parse(encoded))
      : null;
  const workspace = optimisticWorkspace(
    loaded,
    busy && parsed?.success ? parsed.data : undefined,
  );
  const send = (
    command: TaskCommandInput,
    options?: { focusTask?: boolean },
  ) => {
    if (busy) return;
    if (options?.focusTask && "taskId" in command)
      pendingFocus.current = { taskId: command.taskId, sawBusy: false };
    setResultLocation(location.key);
    void fetcher.submit(
      {
        command: JSON.stringify({
          ...command,
          mutationId: crypto.randomUUID(),
        }),
      },
      { method: "post", action: `${base}/resources/tasks` },
    );
  };
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    if (busy) pending.sawBusy = true;
    if (document.activeElement === document.body) {
      const target =
        document.querySelector<HTMLElement>(
          `[data-task-id="${pending.taskId}"] .task-title`,
        ) ?? document.querySelector<HTMLElement>("#main");
      target?.focus();
    }
    if (!busy && pending.sawBusy) pendingFocus.current = null;
  }, [busy, workspace.tasks]);
  useEffect(() => {
    if (busy || state !== "idle" || location.pathname.includes("/tasks/"))
      return;
    const refresh = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [busy, state, location.pathname, revalidate]);
  return (
    <WorkspaceContext
      value={{
        workspace,
        base,
        quote,
        inviteCode,
        inviteLink,
        send,
        busy,
        result: location.key === resultLocation ? fetcher.data : undefined,
        refresh: () => {
          setResultLocation(undefined);
          void revalidate();
        },
      }}
    >
      <Shell>
        <Outlet />
      </Shell>
    </WorkspaceContext>
  );
}

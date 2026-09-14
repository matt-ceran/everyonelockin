import { useEffect, useRef, useState } from "react";
import {
  Outlet,
  useFetcher,
  useLoaderData,
  useLocation,
  useRevalidator,
  type LoaderFunctionArgs,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
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
import { requireDemo } from "../platform/demo.server";

export async function loader({ request }: LoaderFunctionArgs) {
  requireDemo(request);
  return readWorkspace();
}
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (
    !formMethod &&
    !currentUrl.pathname.startsWith("/tasks/") &&
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  )
    return false;
  return defaultShouldRevalidate;
}
export default function WorkspaceRoute() {
  const loaded = useLoaderData<typeof loader>();
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
      { method: "post", action: "/resources/tasks" },
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
    if (busy || state !== "idle" || location.pathname.startsWith("/tasks/"))
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

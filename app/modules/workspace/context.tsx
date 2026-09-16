import { createContext, useContext } from "react";
import type { Quote } from "../quotes/quotes";
import type {
  CommandFailure,
  CommandResult,
  TaskCommandInput,
} from "../tasks/commands";
import type { WorkspaceSnapshot } from "../tasks/model";

interface WorkspaceContextValue {
  workspace: WorkspaceSnapshot;
  base: string;
  quote: Quote;
  send: (command: TaskCommandInput, options?: { focusTask?: boolean }) => void;
  busy: boolean;
  result?: CommandResult | CommandFailure;
  refresh: () => void;
}
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("A workspace is required.");
  return context;
}

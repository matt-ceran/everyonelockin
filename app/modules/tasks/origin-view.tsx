import { useSearchParams } from "react-router";
import { ActivityView } from "../workspace/activity-view";
import { BoardView } from "./board-view";
import { TaskListView } from "./list-view";
import { readTaskOrigin } from "./origin";

export function TaskOriginView() {
  const [params] = useSearchParams();
  const origin = readTaskOrigin(params.get("from"));
  if (origin === "backlog") return <TaskListView />;
  if (origin === "my-tasks") return <TaskListView mine />;
  if (origin === "activity") return <ActivityView />;
  return <BoardView />;
}

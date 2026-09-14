import { useParams } from "react-router";
import { BoardView } from "../modules/tasks/board-view";
import { TaskDialog } from "../modules/tasks/task-dialog";
import { useWorkspace } from "../modules/workspace/context";
export default function TaskRoute() {
  const { taskId } = useParams();
  const { workspace } = useWorkspace();
  const task = workspace.tasks.find((t) => t.id === taskId);
  if (!task) throw new Response("Task not found.", { status: 404 });
  return (
    <>
      <BoardView />
      <TaskDialog task={task} />
    </>
  );
}

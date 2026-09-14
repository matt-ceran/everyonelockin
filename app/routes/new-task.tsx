import { BoardView } from "../modules/tasks/board-view";
import { NewTaskDialog } from "../modules/tasks/task-dialog";
export default function NewTaskRoute() {
  return (
    <>
      <BoardView />
      <NewTaskDialog />
    </>
  );
}

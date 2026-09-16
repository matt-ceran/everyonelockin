import { TaskOriginView } from "../modules/tasks/origin-view";
import { NewTaskDialog } from "../modules/tasks/task-dialog";
export default function NewTaskRoute() {
  return (
    <>
      <TaskOriginView />
      <NewTaskDialog />
    </>
  );
}

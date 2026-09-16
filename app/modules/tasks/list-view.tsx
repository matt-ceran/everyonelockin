import { Link, useSearchParams } from "react-router";
import { Avatar } from "../../components/avatar";
import { Icon } from "../../components/icon";
import { useWorkspace } from "../workspace/context";
import { TaskFilters, ViewHeading } from "./board-view";
import { matchesTask, orderedTasks, STATUS_LABELS } from "./model";

export function TaskListView({ mine = false }: { mine?: boolean }) {
  const { workspace, base, send, busy } = useWorkspace();
  const [params] = useSearchParams();
  const candidates = workspace.tasks.filter((t) =>
    mine
      ? t.ownerId === workspace.currentMemberId ||
        t.helperIds.includes(workspace.currentMemberId)
      : t.status === "backlog",
  );
  const tasks = orderedTasks(
    candidates.filter((t) =>
      matchesTask(t, {
        query: params.get("q") ?? "",
        label: params.get("label") ?? "",
        owner: params.get("owner") ?? "",
      }),
    ),
  );
  return (
    <>
      <ViewHeading title={mine ? "My work" : "The backlog"} />
      <TaskFilters />
      {tasks.length ? (
        <div className="task-list">
          <div className="list-heading">
            <span>THE TASK</span>
            <span>LABELS</span>
            <span>OWNER</span>
            <span>{mine ? "YOUR PART" : "NEXT STEP"}</span>
          </div>
          {tasks.map((task) => (
            <article key={task.id} className="task-row">
              <div>
                <span className="task-number">
                  EL-{String(task.number).padStart(2, "0")}
                </span>
                <Link to={`${base}/tasks/${task.id}`}>{task.title}</Link>
                <span className="row-status">{STATUS_LABELS[task.status]}</span>
              </div>
              <div className="task-labels">
                {task.labelIds.map((id) => {
                  const label = workspace.labels.find((l) => l.id === id);
                  return label ? (
                    <span key={id} className={`label color-${label.color}`}>
                      {label.name}
                    </span>
                  ) : null;
                })}
              </div>
              <span className="task-owner">
                <Avatar
                  member={workspace.members.find((m) => m.id === task.ownerId)}
                  small
                />
                <span>
                  {workspace.members.find((m) => m.id === task.ownerId)?.name ??
                    "Unassigned"}
                </span>
              </span>
              {mine ? (
                <span className="part-label">
                  {task.ownerId === workspace.currentMemberId
                    ? "Owning it"
                    : "Helping out"}
                </span>
              ) : (
                <button
                  type="button"
                  className="button button-small"
                  disabled={busy}
                  onClick={() =>
                    send({
                      intent: "move",
                      taskId: task.id,
                      version: task.version,
                      status: "ready",
                      beforeId: null,
                    })
                  }
                >
                  Up next <Icon name="arrow" size={14} />
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{mine ? "A little room on your plate." : "A clean slate."}</h2>
          <p>
            {params.size
              ? "Try a different filter or search."
              : mine
                ? "Pick a task to own, or offer someone a hand."
                : "Add an idea here and bring it onto the board when you're ready."}
          </p>
          <Link
            className="button"
            to={mine ? base : `${base}/tasks/new?status=backlog`}
          >
            {mine ? "Explore the board" : "Add an idea"}
          </Link>
        </div>
      )}
    </>
  );
}

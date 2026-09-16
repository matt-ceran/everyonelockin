import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { Avatar } from "../../components/avatar";
import { Icon } from "../../components/icon";
import { useWorkspace } from "../workspace/context";
import { STATUSES, STATUS_LABELS, type Task } from "./model";

export function TaskCard({ task }: { task: Task }) {
  const { workspace, base, send, busy } = useWorkspace();
  const element = useRef<HTMLElement>(null);
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);
  const owner = workspace.members.find((m) => m.id === task.ownerId);
  const helping = task.helperIds.includes(workspace.currentMemberId);
  useEffect(() => {
    if (!element.current) return;
    return combine(
      draggable({
        element: element.current,
        canDrag: () => !busy,
        getInitialData: () => ({ taskId: task.id }),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element: element.current,
        canDrop: ({ source }) =>
          !busy &&
          typeof source.data.taskId === "string" &&
          source.data.taskId !== task.id,
        getData: () => ({ status: task.status, beforeId: task.id }),
        onDragEnter: () => setOver(true),
        onDragLeave: () => setOver(false),
        onDrop: () => setOver(false),
      }),
    );
  }, [task.id, task.status, busy]);
  return (
    <article
      ref={element}
      className={`task-card ${dragging ? "is-dragging" : ""} ${over ? "is-drop-target" : ""} ${task.status === "done" ? "task-complete" : ""}`}
      data-task-id={task.id}
      data-task-version={task.version}
    >
      <div className="card-top">
        <span className="task-number">
          EL-{String(task.number).padStart(2, "0")}
        </span>
        <div className="card-tools">
          {task.priority === "high" && (
            <span
              className="priority-high"
              title="High priority"
              aria-label="High priority"
            >
              !
            </span>
          )}
          <span className="drag-handle" aria-hidden="true">
            <Icon name="grip" size={16} />
          </span>
        </div>
      </div>
      <Link
        className="task-title"
        to={`${base}/tasks/${task.id}`}
        onPointerDownCapture={(event) => event.stopPropagation()}
      >
        {task.title}
      </Link>
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
      <div className="card-bottom">
        <span className="task-owner">
          <Avatar member={owner} small />
          <span>{owner?.name ?? "Unassigned"}</span>
        </span>
        <button
          type="button"
          className={`help-button ${helping ? "is-helping" : ""}`}
          aria-label={`${helping ? "Stop helping with" : "Help with"} ${task.title}`}
          title={helping ? "You're helping" : "I can help"}
          disabled={busy}
          onPointerDownCapture={(event) => event.stopPropagation()}
          onClick={() =>
            send({
              intent: "help",
              taskId: task.id,
              version: task.version,
              helping: !helping,
            })
          }
        >
          <Icon name={helping ? "check" : "help"} size={14} />
          {task.helperIds.length > 0 ? (
            task.helperIds.length
          ) : (
            <span>Help</span>
          )}
        </button>
      </div>
      <details
        className="move-menu"
        onPointerDownCapture={(event) => event.stopPropagation()}
      >
        <summary aria-label={`Move ${task.title}`}>
          Move <span aria-hidden="true">▾</span>
        </summary>
        <div className="move-options">
          {STATUSES.filter((status) => status !== task.status).map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                send(
                  {
                    intent: "move",
                    taskId: task.id,
                    version: task.version,
                    status,
                    beforeId: null,
                  },
                  { focusTask: true },
                );
              }}
            >
              To {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </details>
    </article>
  );
}

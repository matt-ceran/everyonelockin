import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Icon } from "../../components/icon";
import { useWorkspace } from "../workspace/context";
import {
  ACTIVE_STATUSES,
  STATUSES,
  STATUS_LABELS,
  matchesTask,
  orderedTasks,
  type Task,
  type TaskStatus,
} from "./model";
import { TaskCard } from "./task-card";

export function ViewHeading({
  title,
  note,
  newTask = true,
}: {
  title: string;
  note: string;
  newTask?: boolean;
}) {
  return (
    <div className="view-heading">
      <div>
        <div className="eyebrow">
          THE STUDIO <span aria-hidden="true">/</span> WORKSPACE 001
        </div>
        <h1>
          {title}
          <span className="heading-period">.</span>
        </h1>
        <p>{note}</p>
      </div>
      {newTask && (
        <Link to="/tasks/new" className="button button-primary">
          <Icon name="plus" />
          New task
        </Link>
      )}
    </div>
  );
}

export function TaskFilters() {
  const { workspace } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    void setParams(next, { replace: true });
  };
  return (
    <div className="filter-bar">
      <div className="label-filters" aria-label="Filter by label">
        <button
          type="button"
          className={!params.get("label") ? "is-selected" : ""}
          onClick={() => update("label", "")}
        >
          Everything
        </button>
        {workspace.labels.map((label) => (
          <button
            key={label.id}
            type="button"
            className={params.get("label") === label.id ? "is-selected" : ""}
            onClick={() =>
              update("label", params.get("label") === label.id ? "" : label.id)
            }
          >
            {label.name}
          </button>
        ))}
      </div>
      <div className="filter-inputs">
        <label className="owner-filter">
          <span className="sr-only">Filter by owner</span>
          <select
            value={params.get("owner") ?? ""}
            onChange={(e) => update("owner", e.target.value)}
          >
            <option value="">Everyone</option>
            {workspace.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <label className="search-field">
          <Icon name="search" size={16} />
          <span className="sr-only">Find a task</span>
          <input
            type="search"
            placeholder="Find a task..."
            value={params.get("q") ?? ""}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function Column({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { busy } = useWorkspace();
  const ref = useRef<HTMLElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    return dropTargetForElements({
      element: ref.current,
      canDrop: ({ source }) => !busy && typeof source.data.taskId === "string",
      getData: () => ({ status, beforeId: null }),
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: () => setOver(false),
    });
  }, [status, busy]);
  return (
    <section
      ref={ref}
      className={`board-column column-${status} ${over ? "column-over" : ""}`}
      aria-label={STATUS_LABELS[status]}
    >
      <div className="column-heading">
        <h2>{STATUS_LABELS[status]}</h2>
        <span className="column-count">{tasks.length}</span>
        {status === "done" && <Icon name="check" size={17} />}
      </div>
      <div className="column-cards">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <p className="column-empty">A little room for what's next.</p>
        )}
      </div>
      <Link className="add-task-link" to={`/tasks/new?status=${status}`}>
        <Icon name="plus" size={14} />
        Add a task
      </Link>
    </section>
  );
}

export function BoardView() {
  const { workspace, busy, send } = useWorkspace();
  const [params] = useSearchParams();
  const tasks = orderedTasks(
    workspace.tasks.filter((task) =>
      matchesTask(task, {
        query: params.get("q") ?? "",
        label: params.get("label") ?? "",
        owner: params.get("owner") ?? "",
      }),
    ),
  );
  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => typeof source.data.taskId === "string",
        onDrop({ source, location }) {
          if (busy) return;
          const target = location.current.dropTargets[0];
          const task = workspace.tasks.find((t) => t.id === source.data.taskId);
          if (
            !task ||
            !target ||
            !STATUSES.includes(target.data.status as TaskStatus)
          )
            return;
          const beforeId =
            typeof target.data.beforeId === "string"
              ? target.data.beforeId
              : null;
          if (beforeId === task.id) return;
          send({
            intent: "move",
            taskId: task.id,
            version: task.version,
            status: target.data.status as TaskStatus,
            beforeId,
          });
        },
      }),
    [workspace.tasks, busy, send],
  );
  return (
    <>
      <ViewHeading
        title="The board"
        note="Good ideas, meet a little follow-through."
      />
      <TaskFilters />
      <div className="board-grid">
        {ACTIVE_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
          />
        ))}
      </div>
      <div className="board-note">
        <span>
          <strong>
            {workspace.tasks.filter((t) => t.status === "backlog").length} ideas
          </strong>{" "}
          waiting in the <Link to="/backlog">backlog</Link>.
        </span>
        <span>Pick something up. Ask for a hand. Keep it moving.</span>
      </div>
    </>
  );
}

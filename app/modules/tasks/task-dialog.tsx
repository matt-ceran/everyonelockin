import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Icon } from "../../components/icon";
import { Avatar } from "../../components/avatar";
import { useWorkspace } from "../workspace/context";
import { readTaskOrigin, taskOriginPath, taskPath } from "./origin";
import {
  STATUSES,
  STATUS_LABELS,
  type Priority,
  type Task,
  type TaskStatus,
} from "./model";

function Frame({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const { base } = useWorkspace();
  const [params] = useSearchParams();
  const closeTo = taskOriginPath(base, readTaskOrigin(params.get("from")));
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) void navigate(closeTo);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="task-dialog"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="dialog-titlebar">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close task">
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Task details, ownership, labels, and ways to help.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Notice({ editingTaskId }: { editingTaskId?: string }) {
  const { base, result, refresh, busy } = useWorkspace();
  const [params] = useSearchParams();
  const origin = readTaskOrigin(params.get("from"));
  return result && !result.ok ? (
    <div className="form-notice" role="alert">
      <p>{result.message}</p>
      {result.conflict &&
        (editingTaskId ? (
          <>
            <p>
              Your draft is still here. Reviewing the latest task will leave
              this draft.
            </p>
            <Link
              className="text-button"
              to={taskPath(base, editingTaskId, origin)}
            >
              Review latest task
            </Link>
          </>
        ) : (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={refresh}
          >
            Refresh latest tasks
          </button>
        ))}
    </div>
  ) : null;
}

function TaskEditor({
  task,
  status = "backlog",
}: {
  task?: Task;
  status?: TaskStatus;
}) {
  const { workspace, base, send, busy } = useWorkspace();
  const [params] = useSearchParams();
  const origin = readTaskOrigin(params.get("from"));
  const [version] = useState(task?.version);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      ownerId: String(form.get("ownerId") ?? "") || null,
      labelIds: form.getAll("labelIds").map(String),
      priority: String(form.get("priority")) as Priority,
    };
    if (task && version)
      send({ intent: "update", taskId: task.id, version, ...fields });
    else
      send({
        intent: "create",
        status: String(form.get("status")) as TaskStatus,
        ...fields,
      });
  }
  return (
    <form className="task-form" onSubmit={submit}>
      <Notice editingTaskId={task?.id} />
      <fieldset disabled={busy}>
        <label className="form-field">
          Task title
          <input
            name="title"
            placeholder="What needs doing?"
            required
            maxLength={180}
            defaultValue={task?.title}
            autoFocus
          />
        </label>
        <label className="form-field">
          A little context
          <textarea
            name="description"
            placeholder="What does a good result look like?"
            rows={5}
            maxLength={10000}
            defaultValue={task?.description}
          />
        </label>
        <div className="form-grid">
          <label className="form-field">
            Owner
            <select name="ownerId" defaultValue={task?.ownerId ?? ""}>
              <option value="">Unassigned</option>
              {workspace.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Priority
            <select name="priority" defaultValue={task?.priority ?? "normal"}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          {!task && (
            <label className="form-field">
              Start in
              <select name="status" defaultValue={status}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="form-field">
          <span>Labels</span>
          <div className="label-checkboxes">
            {workspace.labels.map((l) => (
              <label key={l.id} className={`label-choice color-${l.color}`}>
                <input
                  name="labelIds"
                  type="checkbox"
                  value={l.id}
                  defaultChecked={task?.labelIds.includes(l.id)}
                />
                {l.name}
              </label>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <Link
            className="text-button"
            to={
              task
                ? taskPath(base, task.id, origin)
                : taskOriginPath(base, origin)
            }
          >
            Cancel
          </Link>
          <button className="button button-primary" type="submit">
            {busy ? "Saving..." : task ? "Save changes" : "Create task"}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function NewTaskDialog() {
  const [params] = useSearchParams();
  const value = params.get("status") as TaskStatus;
  return (
    <Frame title="New task">
      <div className="dialog-intro">
        <h2>Make a little progress.</h2>
        <p>Give it a name. Give it a home.</p>
      </div>
      <TaskEditor status={STATUSES.includes(value) ? value : "backlog"} />
    </Frame>
  );
}

export function TaskDialog({ task }: { task: Task }) {
  const { workspace, base, send, busy } = useWorkspace();
  const [params] = useSearchParams();
  const origin = readTaskOrigin(params.get("from"));
  const [archive, setArchive] = useState(false);
  const [removing, setRemoving] = useState(false);
  const owner = workspace.members.find((m) => m.id === task.ownerId);
  const helping = task.helperIds.includes(workspace.currentMemberId);
  const editing = params.has("edit");
  return (
    <Frame
      title={`${editing ? "Edit task / " : ""}EL-${String(task.number).padStart(2, "0")}`}
    >
      {editing ? (
        <TaskEditor task={task} />
      ) : (
        <div className="task-detail">
          <Notice />
          <div className="detail-labels">
            {task.labelIds.map((id) => {
              const label = workspace.labels.find((l) => l.id === id);
              return label ? (
                <span key={id} className={`label color-${label.color}`}>
                  {label.name}
                </span>
              ) : null;
            })}
            <span className={`priority-text priority-${task.priority}`}>
              {task.priority} priority
            </span>
          </div>
          <h2>{task.title}</h2>
          <p className="task-description">
            {task.description || "A little context would go nicely here."}
          </p>
          <div className="detail-properties">
            <div>
              <span className="property-label">OWNER</span>
              <span className="task-owner">
                <Avatar member={owner} />
                <strong>{owner?.name ?? "Unassigned"}</strong>
              </span>
            </div>
            <label>
              <span className="property-label">STATUS</span>
              <select
                aria-label="Task status"
                value={task.status}
                disabled={busy}
                onChange={(e) =>
                  send({
                    intent: "move",
                    taskId: task.id,
                    version: task.version,
                    status: e.target.value as TaskStatus,
                    beforeId: null,
                  })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section className="helpers-section">
            <div>
              <h3>A few extra hands</h3>
              <p>
                {task.helperIds.length
                  ? task.helperIds
                      .map(
                        (id) =>
                          workspace.members.find((m) => m.id === id)?.name,
                      )
                      .join(", ") +
                    (task.helperIds.length === 1
                      ? " is helping."
                      : " are helping.")
                  : "Good work is a team sport."}
              </p>
            </div>
            <button
              type="button"
              className={`button ${helping ? "button-helping" : ""}`}
              disabled={busy}
              onClick={() =>
                send({
                  intent: "help",
                  taskId: task.id,
                  version: task.version,
                  helping: !helping,
                })
              }
            >
              <Icon name={helping ? "check" : "plus"} size={16} />
              {helping ? "I'm helping" : "I can help"}
            </button>
          </section>
          <div className="detail-actions">
            <Link
              className="button button-primary"
              to={taskPath(base, task.id, origin, { edit: "1" })}
            >
              Edit task
            </Link>
            <button
              className="text-button muted"
              type="button"
              onClick={() => setArchive(true)}
            >
              Archive task
            </button>
            <button
              className="text-button muted"
              type="button"
              onClick={() => setRemoving(true)}
            >
              Delete forever
            </button>
          </div>
          {archive && (
            <div
              className="archive-confirm"
              role="group"
              aria-label="Confirm archive"
            >
              <p>Move this task out of the active workspace?</p>
              <button
                type="button"
                className="button button-danger"
                disabled={busy}
                onClick={() =>
                  send({
                    intent: "archive",
                    taskId: task.id,
                    version: task.version,
                  })
                }
              >
                Yes, archive task
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setArchive(false)}
              >
                Keep it here
              </button>
            </div>
          )}
          {removing && (
            <div
              className="archive-confirm"
              role="group"
              aria-label="Confirm delete"
            >
              <p>This wipes the task for everyone. There is no undo.</p>
              <button
                type="button"
                className="button button-danger"
                disabled={busy}
                onClick={() =>
                  send({
                    intent: "delete",
                    taskId: task.id,
                    version: task.version,
                  })
                }
              >
                Yes, delete forever
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setRemoving(false)}
              >
                Keep it here
              </button>
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { commandSchema } from "../../app/modules/tasks/commands";
import {
  matchesTask,
  type Task,
  type WorkspaceSnapshot,
} from "../../app/modules/tasks/model";
import { optimisticWorkspace } from "../../app/modules/tasks/optimistic";
import {
  newTaskPath,
  readTaskOrigin,
  taskOriginFromPath,
  taskOriginPath,
  taskPath,
} from "../../app/modules/tasks/origin";

const makeTask = (
  id: string,
  position: number,
  status: Task["status"] = "ready",
): Task => ({
  id,
  number: position,
  position,
  status,
  title: "Welcome email",
  description: "A useful first hello",
  priority: "normal",
  ownerId: "riley",
  labelIds: ["growth"],
  helperIds: [],
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
const base = {
  mutationId: randomUUID(),
  intent: "create",
  title: "A new task",
  description: "",
  ownerId: null,
  labelIds: [],
  priority: "normal",
  status: "backlog",
};

test("task commands reject blank titles and unknown statuses", () => {
  assert.equal(
    commandSchema.safeParse({ ...base, title: "   " }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({ ...base, status: "finished-ish" }).success,
    false,
  );
  assert.equal(commandSchema.safeParse(base).success, true);
});
test("commands require a valid mutation ID and expected task version", () => {
  assert.equal(
    commandSchema.safeParse({ ...base, mutationId: "reused" }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      intent: "move",
      mutationId: randomUUID(),
      taskId: randomUUID(),
      status: "done",
      beforeId: null,
    }).success,
    false,
  );
});
test("search combines text, label, and ownership without changing the task", () => {
  const task = makeTask("one", 1);
  assert.equal(
    matchesTask(task, { query: "WELCOME", label: "growth", owner: "riley" }),
    true,
  );
  assert.equal(matchesTask(task, { owner: "unassigned" }), false);
  assert.equal(matchesTask(task, { query: "EL-1" }), true);
  assert.equal(matchesTask(task, { label: "engineering" }), false);
});
test("task origins stay inside the workspace views", () => {
  assert.equal(readTaskOrigin("backlog"), "backlog");
  assert.equal(readTaskOrigin("my-tasks"), "my-tasks");
  assert.equal(readTaskOrigin("activity"), "activity");
  assert.equal(readTaskOrigin("board"), "board");
  assert.equal(readTaskOrigin("https://unrelated.example"), "board");
  assert.equal(readTaskOrigin("toString"), "board");
  assert.equal(readTaskOrigin(null), "board");
  assert.equal(readTaskOrigin(42), "board");
  assert.equal(taskOriginPath("/w/one", "activity"), "/w/one/activity");
  assert.equal(taskOriginPath("/w/one", "board"), "/w/one");
  assert.equal(taskPath("/w/one", "task-1", "board"), "/w/one/tasks/task-1");
  assert.equal(
    taskPath("/w/one", "task-1", "backlog"),
    "/w/one/tasks/task-1?from=backlog",
  );
  assert.equal(
    taskPath("/w/one", "task-1", "my-tasks", { edit: "1" }),
    "/w/one/tasks/task-1?from=my-tasks&edit=1",
  );
  assert.equal(
    newTaskPath("/w/one", "backlog"),
    "/w/one/tasks/new?from=backlog",
  );
  assert.equal(
    newTaskPath("/w/one", "backlog", { status: "backlog" }),
    "/w/one/tasks/new?from=backlog&status=backlog",
  );
  assert.equal(taskOriginFromPath("/w/one/backlog", null, "/w/one"), "backlog");
  assert.equal(
    taskOriginFromPath("/w/one/my-tasks/", null, "/w/one"),
    "my-tasks",
  );
  assert.equal(
    taskOriginFromPath("/w/one/activity", null, "/w/one"),
    "activity",
  );
  assert.equal(taskOriginFromPath("/w/one/", null, "/w/one"), "board");
  assert.equal(
    taskOriginFromPath("/w/one/tasks/task-1", "backlog", "/w/one"),
    "backlog",
  );
  assert.equal(taskOriginFromPath("/w/one/tasks/new", null, "/w/one"), "board");
});
test("optimistic movement inserts before its target and leaves confirmed state untouched", () => {
  const a = makeTask(randomUUID(), 1000);
  const b = makeTask(randomUUID(), 2000, "review");
  const c = makeTask(randomUUID(), 3000, "review");
  const state: WorkspaceSnapshot = {
    name: "Test",
    currentMemberId: "you",
    tasks: [a, b, c],
    archived: [],
    members: [],
    labels: [],
    activity: [],
  };
  const next = optimisticWorkspace(state, {
    intent: "move",
    taskId: a.id,
    version: 1,
    mutationId: randomUUID(),
    status: "review",
    beforeId: c.id,
  });
  assert.deepEqual(
    next.tasks.toSorted((x, y) => x.position - y.position).map((t) => t.id),
    [b.id, a.id, c.id],
  );
  assert.equal(state.tasks[0]?.status, "ready");
  assert.equal(state.tasks[1]?.position, 2000);
});
test("optimistic helping stays unique and does not mutate saved helper lists", () => {
  const task = makeTask(randomUUID(), 1000);
  task.helperIds = ["you"];
  const state: WorkspaceSnapshot = {
    name: "Test",
    currentMemberId: "you",
    tasks: [task],
    archived: [],
    members: [],
    labels: [],
    activity: [],
  };
  const next = optimisticWorkspace(state, {
    intent: "help",
    taskId: task.id,
    version: 1,
    mutationId: randomUUID(),
    helping: true,
  });
  assert.deepEqual(next.tasks[0]?.helperIds, ["you"]);
  assert.deepEqual(state.tasks[0]?.helperIds, ["you"]);
});

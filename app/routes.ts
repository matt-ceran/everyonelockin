import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  layout("routes/workspace.tsx", [
    index("routes/board.tsx"),
    route("backlog", "routes/backlog.tsx"),
    route("my-tasks", "routes/my-tasks.tsx"),
    route("activity", "routes/activity.tsx"),
    route("tasks/new", "routes/new-task.tsx"),
    route("tasks/:taskId", "routes/task.tsx"),
  ]),
  route("resources/tasks", "routes/task-command.ts"),
  route("health", "routes/health.ts"),
] satisfies RouteConfig;

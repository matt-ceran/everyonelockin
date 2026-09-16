import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("join/:code", "routes/join.tsx"),
  route("w/:workspaceId/welcome", "routes/welcome.tsx"),
  route("w/:workspaceId/pick-icon", "routes/pick-icon.tsx"),
  layout("routes/workspace.tsx", [
    route("w/:workspaceId", "routes/board.tsx"),
    route("w/:workspaceId/backlog", "routes/backlog.tsx"),
    route("w/:workspaceId/my-tasks", "routes/my-tasks.tsx"),
    route("w/:workspaceId/activity", "routes/activity.tsx"),
    route("w/:workspaceId/tasks/new", "routes/new-task.tsx"),
    route("w/:workspaceId/tasks/:taskId", "routes/task.tsx"),
    route("w/:workspaceId/resources/tasks", "routes/task-command.ts"),
    route("w/:workspaceId/resources/labels", "routes/label-command.ts"),
    route("w/:workspaceId/logout", "routes/logout.ts"),
  ]),
  route("health", "routes/health.ts"),
] satisfies RouteConfig;

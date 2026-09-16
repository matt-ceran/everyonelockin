import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  integer,
  serial,
  timestamp,
  primaryKey,
  foreignKey,
  unique,
  uniqueIndex,
  index,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { STATUSES, PRIORITIES } from "../../modules/tasks/model";
import type { CommandResult } from "../../modules/tasks/commands";

export const statusEnum = pgEnum("task_status", STATUSES);
export const priorityEnum = pgEnum("task_priority", PRIORITIES);
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().default("").unique(),
});
export const members = pgTable(
  "members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    id: text("id").notNull(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    color: text("color").notNull(),
    role: text("role").notNull(),
    passwordHash: text("password_hash").notNull().default(""),
    avatar: text("avatar"),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.id] }),
    uniqueIndex("member_name_unique").on(t.workspaceId, sql`lower(${t.name})`),
  ],
);
export const boards = pgTable(
  "boards",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    id: text("id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.id] })],
);
export const labels = pgTable(
  "labels",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    id: text("id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.id] })],
);
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull(),
    workspaceId: text("workspace_id").notNull(),
    boardId: text("board_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: statusEnum("status").notNull().default("backlog"),
    priority: priorityEnum("priority").notNull().default("normal"),
    ownerId: text("owner_id"),
    position: integer("position").notNull().default(1000),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    unique("task_workspace_id").on(t.workspaceId, t.id),
    unique("task_number").on(t.workspaceId, t.number),
    index("task_board_order").on(
      t.workspaceId,
      t.boardId,
      t.status,
      t.position,
    ),
    foreignKey({
      columns: [t.workspaceId, t.boardId],
      foreignColumns: [boards.workspaceId, boards.id],
    }),
    foreignKey({
      columns: [t.workspaceId, t.ownerId],
      foreignColumns: [members.workspaceId, members.id],
    }),
  ],
);
export const taskLabels = pgTable(
  "task_labels",
  {
    workspaceId: text("workspace_id").notNull(),
    taskId: uuid("task_id").notNull(),
    labelId: text("label_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.labelId] }),
    foreignKey({
      columns: [t.workspaceId, t.taskId],
      foreignColumns: [tasks.workspaceId, tasks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.workspaceId, t.labelId],
      foreignColumns: [labels.workspaceId, labels.id],
    }),
  ],
);
export const taskHelpers = pgTable(
  "task_helpers",
  {
    workspaceId: text("workspace_id").notNull(),
    taskId: uuid("task_id").notNull(),
    memberId: text("member_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.memberId] }),
    foreignKey({
      columns: [t.workspaceId, t.taskId],
      foreignColumns: [tasks.workspaceId, tasks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.workspaceId, t.memberId],
      foreignColumns: [members.workspaceId, members.id],
    }),
  ],
);
export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id").notNull(),
    taskId: uuid("task_id"),
    actorId: text("actor_id").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("activity_recent").on(t.workspaceId, t.createdAt),
    foreignKey({
      columns: [t.workspaceId, t.actorId],
      foreignColumns: [members.workspaceId, members.id],
    }),
    foreignKey({
      columns: [t.workspaceId, t.taskId],
      foreignColumns: [tasks.workspaceId, tasks.id],
    }),
  ],
);
export const receipts = pgTable(
  "command_receipts",
  {
    id: uuid("id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    actorId: text("actor_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    result: jsonb("result").$type<CommandResult>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.actorId, t.id] })],
);
export const taskRelations = relations(tasks, ({ many }) => ({
  labels: many(taskLabels),
  helpers: many(taskHelpers),
}));
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    memberId: text("member_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.workspaceId, t.memberId],
      foreignColumns: [members.workspaceId, members.id],
    }).onDelete("cascade"),
    index("session_member").on(t.workspaceId, t.memberId),
  ],
);

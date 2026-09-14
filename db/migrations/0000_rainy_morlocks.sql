CREATE TYPE "public"."task_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('backlog', 'ready', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"task_id" uuid,
	"actor_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"workspace_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "boards_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"workspace_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	CONSTRAINT "labels_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"workspace_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"color" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "members_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "command_receipts" (
	"id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "command_receipts_workspace_id_actor_id_id_pk" PRIMARY KEY("workspace_id","actor_id","id")
);
--> statement-breakpoint
CREATE TABLE "task_helpers" (
	"workspace_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "task_helpers_task_id_member_id_pk" PRIMARY KEY("task_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"workspace_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "task_labels_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"workspace_id" text NOT NULL,
	"board_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "task_status" DEFAULT 'backlog' NOT NULL,
	"priority" "task_priority" DEFAULT 'normal' NOT NULL,
	"owner_id" text,
	"position" integer DEFAULT 1000 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "task_workspace_id" UNIQUE("workspace_id","id"),
	CONSTRAINT "task_number" UNIQUE("workspace_id","number")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_workspace_id_actor_id_members_workspace_id_id_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_workspace_id_task_id_tasks_workspace_id_id_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."tasks"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_receipts" ADD CONSTRAINT "command_receipts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_helpers" ADD CONSTRAINT "task_helpers_workspace_id_task_id_tasks_workspace_id_id_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."tasks"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_helpers" ADD CONSTRAINT "task_helpers_workspace_id_member_id_members_workspace_id_id_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_workspace_id_task_id_tasks_workspace_id_id_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."tasks"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_workspace_id_label_id_labels_workspace_id_id_fk" FOREIGN KEY ("workspace_id","label_id") REFERENCES "public"."labels"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_board_id_boards_workspace_id_id_fk" FOREIGN KEY ("workspace_id","board_id") REFERENCES "public"."boards"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_owner_id_members_workspace_id_id_fk" FOREIGN KEY ("workspace_id","owner_id") REFERENCES "public"."members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_recent" ON "activity" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "task_board_order" ON "tasks" USING btree ("workspace_id","board_id","status","position");
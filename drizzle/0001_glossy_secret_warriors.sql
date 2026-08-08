ALTER TABLE "projects" ADD COLUMN "phase" text DEFAULT 'preconstruction' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner" text DEFAULT 'Unassigned' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "completion_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "projects" USING btree ("company_id","status");
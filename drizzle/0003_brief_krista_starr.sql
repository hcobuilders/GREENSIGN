CREATE TABLE "layout_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family" text DEFAULT 'GREENSIGN Default' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "layout_family_idx" ON "layout_versions" USING btree ("family","version");--> statement-breakpoint
CREATE INDEX "layout_status_idx" ON "layout_versions" USING btree ("status");
CREATE TABLE "interface_map_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"route" text NOT NULL,
	"group" text DEFAULT 'Application' NOT NULL,
	"region" text DEFAULT 'workspace' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interface_map_items_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "managed_environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"label" text DEFAULT 'Development' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"accent" text DEFAULT '#87ff4f' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managed_environments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"document_type" text DEFAULT 'project-document' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"extracted_text" text DEFAULT '' NOT NULL,
	"parsed_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'parsed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'review due' NOT NULL,
	"primary_trade" text DEFAULT 'Unassigned' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"license_number" text DEFAULT '' NOT NULL,
	"license_state" text DEFAULT '' NOT NULL,
	"license_expires" date,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prequalification" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"past_projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_partners" ADD CONSTRAINT "trade_partners_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interface_map_group_idx" ON "interface_map_items" USING btree ("group","region");--> statement-breakpoint
CREATE INDEX "managed_environment_status_idx" ON "managed_environments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_project_idx" ON "project_documents" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "partner_company_idx" ON "trade_partners" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "partner_trade_idx" ON "trade_partners" USING btree ("company_id","primary_trade");
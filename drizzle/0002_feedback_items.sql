CREATE TABLE "feedback_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "note" text NOT NULL,
  "page" text NOT NULL,
  "context" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'flagged' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "feedback_company_idx" ON "feedback_items" USING btree ("company_id","status","created_at");

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const role = pgEnum("role", [
  "superuser",
  "admin",
  "member",
  "external",
]);
export const environmentStatus = pgEnum("environment_status", [
  "active",
  "suspended",
  "disabled",
]);
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: environmentStatus("status").notNull().default("active"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: role("role").notNull().default("member"),
  },
  (t) => [
    index("membership_company_idx").on(t.companyId),
    index("membership_user_idx").on(t.userId),
  ],
);
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("planning"),
    phase: text("phase").notNull().default("preconstruction"),
    owner: text("owner").notNull().default("Unassigned"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    completionDate: date("completion_date"),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("project_company_idx").on(t.companyId),
    index("project_status_idx").on(t.companyId, t.status),
  ],
);
export const toolConfigurations = pgTable(
  "tool_configurations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    toolKey: text("tool_key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    setup: jsonb("setup").notNull().default({}),
    templates: jsonb("templates").notNull().default([]),
    fieldMaps: jsonb("field_maps").notNull().default([]),
    connectors: jsonb("connectors").notNull().default([]),
  },
  (t) => [index("tool_company_idx").on(t.companyId)],
);
export const workflowRecords = pgTable(
  "workflow_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    toolKey: text("tool_key").notNull(),
    type: text("type").notNull(),
    state: text("state").notNull().default("draft"),
    revision: integer("revision").notNull().default(1),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("workflow_project_idx").on(t.projectId),
    index("workflow_tool_idx").on(t.companyId, t.toolKey),
  ],
);
export const fileReferences = pgTable("file_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  displayName: text("display_name").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
});
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    detail: jsonb("detail").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("audit_company_idx").on(t.companyId, t.createdAt)],
);
export const feedbackItems = pgTable(
  "feedback_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    note: text("note").notNull(),
    page: text("page").notNull(),
    context: jsonb("context").notNull().default({}),
    status: text("status").notNull().default("flagged"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("feedback_company_idx").on(t.companyId, t.status, t.createdAt)],
);
export const layoutVersions = pgTable(
  "layout_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    family: text("family").notNull().default("GREENSIGN Default"),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("draft"),
    configuration: jsonb("configuration").notNull().default({}),
    notes: text("notes").notNull().default(""),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("layout_family_idx").on(t.family, t.version),
    index("layout_status_idx").on(t.status),
  ],
);

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    documentType: text("document_type").notNull().default("project-document"),
    content: text("content").notNull().default(""),
    extractedText: text("extracted_text").notNull().default(""),
    parsedData: jsonb("parsed_data").notNull().default({}),
    status: text("status").notNull().default("parsed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("document_project_idx").on(t.projectId, t.createdAt)],
);

export const tradePartners = pgTable(
  "trade_partners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("review due"),
    primaryTrade: text("primary_trade").notNull().default("Unassigned"),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    licenseNumber: text("license_number").notNull().default(""),
    licenseState: text("license_state").notNull().default(""),
    licenseExpires: date("license_expires"),
    address: jsonb("address").notNull().default({}),
    prequalification: jsonb("prequalification").notNull().default({}),
    pastProjects: jsonb("past_projects").notNull().default([]),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("partner_company_idx").on(t.companyId, t.status),
    index("partner_trade_idx").on(t.companyId, t.primaryTrade),
  ],
);

export const managedEnvironments = pgTable(
  "managed_environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    label: text("label").notNull().default("Development"),
    status: text("status").notNull().default("active"),
    accent: text("accent").notNull().default("#87ff4f"),
    url: text("url").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("managed_environment_status_idx").on(t.status)],
);

export const interfaceMapItems = pgTable(
  "interface_map_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    label: text("label").notNull(),
    route: text("route").notNull(),
    group: text("group").notNull().default("Application"),
    region: text("region").notNull().default("workspace"),
    enabled: boolean("enabled").notNull().default(true),
    notes: text("notes").notNull().default(""),
    configuration: jsonb("configuration").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("interface_map_group_idx").on(t.group, t.region)],
);

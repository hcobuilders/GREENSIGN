import { NavLink, useFetcher, useLoaderData } from "react-router";
import { modules, settingsLinks } from "../lib/navigation";
import { AddressField } from "./address-field";

type ToolConfig = {
  toolKey: string;
  enabled: boolean;
  setup: unknown;
  templates: unknown;
  fieldMaps: unknown;
  connectors: unknown;
};
type RecordRow = {
  id: string;
  projectId: string | null;
  toolKey: string;
  state: string;
  payload: unknown;
};
type SettingsLoader = {
  configurations: ToolConfig[];
  company: { settings: unknown };
  records: RecordRow[];
};
type Field = { key: string; label: string; description: string; type?: string };
const fields: Record<string, Field[]> = {
  account: [
    {
      key: "account:adminName",
      label: "Administrator name",
      description:
        "Controls the account name and RG initials throughout the environment.",
    },
    {
      key: "account:adminEmail",
      label: "Administrator email",
      description: "Primary login and notification address.",
      type: "email",
    },
    {
      key: "account:adminPhone",
      label: "Administrator phone",
      description: "Direct contact number.",
      type: "tel",
    },
    {
      key: "account:jobTitle",
      label: "Job title",
      description: "Displayed in account and approval surfaces.",
    },
  ],
  company: [
    {
      key: "company:name",
      label: "Company name",
      description: "Operating company identity.",
    },
    {
      key: "company:legalName",
      label: "Legal name",
      description: "Contracts and proposals.",
    },
    {
      key: "company:address",
      label: "Company address",
      description: "One-line validated operating address.",
      type: "address",
    },
    {
      key: "company:url",
      label: "Environment URL",
      description: "Company-specific GREENSIGN destination.",
    },
    {
      key: "company:standards",
      label: "Default standards",
      description: "Codes, divisions, and workflow conventions.",
    },
    {
      key: "company:dataPolicy",
      label: "Data policy",
      description: "Retention, approvals, and audit rules.",
    },
  ],
  contacts: [
    {
      key: "contacts:defaultRole",
      label: "Default contact role",
      description: "Role assigned to new contacts.",
    },
    {
      key: "contacts:trades",
      label: "Trade taxonomy",
      description: "Comma-separated supported trade categories.",
    },
    {
      key: "contacts:mergeRule",
      label: "Import rules",
      description: "How matching contacts are merged.",
    },
    {
      key: "contacts:qualification",
      label: "Qualification standard",
      description: "Minimum trade partner requirements.",
    },
  ],
  features: [
    {
      key: "features:preview",
      label: "Feature previews",
      description: "Approved preview capability list.",
    },
    {
      key: "features:roles",
      label: "User assignments",
      description: "Module access by role.",
    },
    {
      key: "features:status",
      label: "Environment status",
      description: "Enable, suspend, or disable this instance.",
    },
    {
      key: "features:confirmations",
      label: "Confirmation policy",
      description: "Required approval gates before records commit.",
    },
  ],
  connections: [
    {
      key: "connections:files",
      label: "File providers",
      description: "SharePoint, Dropbox, and indexed references.",
    },
    {
      key: "connections:projects",
      label: "Project systems",
      description: "Procore, Newforma, and Trimble.",
    },
    {
      key: "connections:accounting",
      label: "Accounting",
      description: "Sage and supported cost imports.",
    },
    {
      key: "connections:communications",
      label: "Email and calendar",
      description: "Communication tracking and reminders.",
    },
  ],
  subscription: [
    {
      key: "subscription:plan",
      label: "Current plan",
      description: "GREENSIGN workspace plan.",
    },
    {
      key: "subscription:users",
      label: "Licensed users",
      description: "Admin and member seats.",
    },
    {
      key: "subscription:modules",
      label: "Module access",
      description: "Included and optional tools.",
    },
    {
      key: "subscription:billing",
      label: "Billing contact",
      description: "Invoices and subscription notices.",
      type: "email",
    },
  ],
};

export function SettingsWorkspace({
  section,
  toolSlug,
}: {
  section?: string;
  toolSlug?: string;
}) {
  const data = useLoaderData<SettingsLoader>(),
    tool = modules.find((item) => item[0] === toolSlug);
  return (
    <div className="settings-grid">
      <nav className="settings-nav">
        {settingsLinks.map((item) => (
          <NavLink key={item[0]} to={`/app/settings/${item[0]}`}>
            {item[1]}
          </NavLink>
        ))}
        <div className="settings-label">TOOL SETTINGS</div>
        {modules.map((item) => (
          <NavLink key={item[0]} to={`/app/settings/tools/${item[0]}`}>
            {item[2]}
          </NavLink>
        ))}
      </nav>
      {tool ? (
        <ToolSettings toolSlug={tool[0]} title={tool[2]} data={data} />
      ) : section === "proposals" ? (
        <UnlinkedProposals records={data.records} />
      ) : (
        <EnvironmentSettings section={section ?? "account"} data={data} />
      )}
    </div>
  );
}

function EnvironmentSettings({
  section,
  data,
}: {
  section: string;
  data: SettingsLoader;
}) {
  const settings = (data.company.settings ?? {}) as Record<string, unknown>,
    title =
      settingsLinks.find((item) => item[0] === section)?.[1] ?? "Account info";
  return (
    <section className="settings-card">
      <div className="panel-head">
        <div>
          <h2>{title.toUpperCase()}</h2>
          <span className="panel-caption">
            Every value is saved to the active company environment.
          </span>
        </div>
      </div>
      {(fields[section] ?? fields.account).map((field) => (
        <SettingRow
          key={field.key}
          field={field}
          value={String(settings[field.key] ?? defaultValue(field.key))}
        />
      ))}
    </section>
  );
}

function SettingRow({ field, value }: { field: Field; value: string }) {
  const fetcher = useFetcher();
  return (
    <form
      className="setting-row"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        fetcher.submit(
          {
            intent: "company-setting",
            key: field.key,
            value: String(
              form.get(field.type === "address" ? "location" : "value") ?? "",
            ),
          },
          { method: "post" },
        );
      }}
    >
      <div>
        <b>{field.label}</b>
        <span>{field.description}</span>
      </div>
      <div className="setting-control">
        {field.type === "address" ? (
          <AddressField label={field.label.toUpperCase()} value={value} />
        ) : (
          <input
            name="value"
            aria-label={field.label}
            type={field.type ?? "text"}
            defaultValue={value}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.value = value;
                event.currentTarget.blur();
              }
            }}
          />
        )}
        <button className="secondary">
          {fetcher.state !== "idle" ? "SAVING…" : "SAVE"}
        </button>
      </div>
    </form>
  );
}

function ToolSettings({
  toolSlug,
  title,
  data,
}: {
  toolSlug: string;
  title: string;
  data: SettingsLoader;
}) {
  const fetcher = useFetcher(),
    configuration = data.configurations.find(
      (item) => item.toolKey === toolSlug,
    ),
    setup = (configuration?.setup ?? {}) as Record<string, unknown>,
    sections = [
      {
        key: "workflowStages",
        label: "Workflow stages",
        description: "Ordered stage names used by the tool.",
        value: String(setup.workflowStages ?? ""),
      },
      {
        key: "ownershipRules",
        label: "Ownership rules",
        description: "Assignment and escalation conventions.",
        value: String(setup.ownershipRules ?? ""),
      },
      {
        key: "confirmationGuardrails",
        label: "Confirmation guardrails",
        description: "Approval requirements before records commit.",
        value: String(setup.confirmationGuardrails ?? ""),
      },
      {
        key: "templates",
        label: "Templates",
        description: "Approved reusable template names.",
        value: Array.isArray(configuration?.templates)
          ? configuration.templates.join("\n")
          : "",
      },
      {
        key: "fieldMaps",
        label: "Field maps",
        description: "Source-to-GREENSIGN field mappings.",
        value: Array.isArray(configuration?.fieldMaps)
          ? configuration.fieldMaps.join("\n")
          : "",
      },
      {
        key: "connectors",
        label: "Connectors",
        description: "External systems available to this tool.",
        value: Array.isArray(configuration?.connectors)
          ? configuration.connectors.join("\n")
          : "",
      },
    ];
  return (
    <section className="settings-card">
      <div className="panel-head">
        <div>
          <h2>{title.toUpperCase()} SETUP</h2>
          <span className="panel-caption">
            Complete workflow configuration for this tool.
          </span>
        </div>
        <button
          className={`toggle ${configuration?.enabled ? "on" : ""}`}
          aria-label={`Enable ${title}`}
          aria-pressed={configuration?.enabled ?? false}
          onClick={() =>
            fetcher.submit(
              {
                intent: "tool-toggle",
                toolKey: toolSlug,
                enabled: String(!configuration?.enabled),
              },
              { method: "post" },
            )
          }
        />
      </div>
      {sections.map((section) => (
        <form
          className="setting-row tool-setting-row"
          key={section.key}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget),
              raw = String(form.get("value") ?? ""),
              isArray = ["templates", "fieldMaps", "connectors"].includes(
                section.key,
              ),
              payload = isArray
                ? raw
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                : { [section.key]: raw };
            fetcher.submit(
              {
                intent: "tool-setting",
                toolKey: toolSlug,
                section: isArray ? section.key : "setup",
                value: JSON.stringify(payload),
              },
              { method: "post" },
            );
          }}
        >
          <div>
            <b>{section.label}</b>
            <span>{section.description}</span>
          </div>
          <div className="setting-control">
            <textarea
              name="value"
              aria-label={section.label}
              defaultValue={section.value}
            />
            <button className="secondary">SAVE</button>
          </div>
        </form>
      ))}
    </section>
  );
}

function UnlinkedProposals({ records }: { records: RecordRow[] }) {
  const fetcher = useFetcher(),
    items = records.filter(
      (record) => record.toolKey === "proposal-designer" && !record.projectId,
    );
  return (
    <section className="settings-card">
      <div className="panel-head">
        <div>
          <h2>UNLINKED PROPOSALS</h2>
          <span className="panel-caption">
            Company-level proposals created without a project association.
          </span>
        </div>
        <NavLink className="primary" to="/app/tools/proposal-designer?create=1">
          + NEW PROPOSAL
        </NavLink>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Proposal</th>
              <th>Value</th>
              <th>Due</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((record) => {
              const payload = record.payload as {
                title?: string;
                total?: number;
                dueDate?: string;
              };
              return (
                <tr key={record.id}>
                  <td>
                    <input
                      className="table-edit"
                      defaultValue={payload.title ?? "Untitled proposal"}
                      onBlur={(event) =>
                        fetcher.submit(
                          {
                            intent: "workflow-payload",
                            id: record.id,
                            patch: JSON.stringify({
                              title: event.target.value,
                            }),
                          },
                          { method: "post" },
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="table-edit"
                      type="number"
                      defaultValue={payload.total ?? 0}
                      onBlur={(event) =>
                        fetcher.submit(
                          {
                            intent: "workflow-payload",
                            id: record.id,
                            patch: JSON.stringify({
                              total: Number(event.target.value),
                            }),
                          },
                          { method: "post" },
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="table-edit"
                      type="date"
                      defaultValue={payload.dueDate ?? ""}
                      onChange={(event) =>
                        fetcher.submit(
                          {
                            intent: "workflow-payload",
                            id: record.id,
                            patch: JSON.stringify({
                              dueDate: event.target.value,
                            }),
                          },
                          { method: "post" },
                        )
                      }
                    />
                  </td>
                  <td>{record.state.toUpperCase()}</td>
                  <td>
                    <NavLink to="/app/tools/proposal-designer">OPEN</NavLink>
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td colSpan={5} className="table-empty">
                  Create an unlinked proposal from Quick Add or this page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function defaultValue(key: string) {
  const defaults: Record<string, string> = {
    "account:adminName": "R. Green",
    "account:adminEmail": "",
    "account:jobTitle": "Administrator",
    "company:name": "HCO Builders",
    "company:url": "greensign-dev.greensign.app",
    "features:status": "Active",
    "subscription:plan": "Foundation workspace",
  };
  return defaults[key] ?? "";
}

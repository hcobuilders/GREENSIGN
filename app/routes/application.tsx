import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Link,
  NavLink,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router";
import { Dashboard } from "../components/dashboard";
import { ProjectsPage } from "../components/projects-page";
import { ToolPage } from "../components/tool-page";
import { ProjectWorkspace } from "../components/project-workspace";
import { DataWorkspace } from "../components/data-workspace";
import { NetworkWorkspace } from "../components/network-workspace";
import { SettingsWorkspace } from "../components/settings-workspace";
import { AiAssistant } from "../components/ai-assistant";
import {
  bulkUpdateProjects,
  createProject,
  createProjectsFromUpload,
  deleteProjects,
  listProjects,
  updateProject,
  updateProjectData,
} from "../lib/projects.server";
import { globalLinks, modules, settingsLinks } from "../lib/navigation";
import {
  createFeedback,
  listFeedback,
  updateFeedbackStatus,
} from "../lib/feedback.server";
import {
  createWorkflowRecord,
  deleteWorkflowRecord,
  getCompany,
  importWorkflowCsv,
  listToolConfigurations,
  listWorkflowRecords,
  setToolEnabled,
  updateCompanySettings,
  updateToolConfiguration,
  updateWorkflowPayload,
  updateWorkflowRecord,
} from "../lib/workflows.server";
import { activateLayout, getLayout, saveLayout } from "../lib/layouts.server";
import {
  normalizeLayout,
  type LayoutConfiguration,
} from "../lib/layout-config";
import {
  confirmProjectIntake,
  ingestProjectDocuments,
  listProjectDocuments,
} from "../lib/documents.server";
import {
  createTradePartner,
  listTradePartners,
  updateTradePartner,
} from "../lib/partners.server";
import {
  applyAiSuggestion,
  getAiRuntime,
  listAiJobs,
  listAiSuggestions,
  reviewAiSuggestion,
  runAiAssistant,
} from "../lib/ai.server";
import type { Route } from "./+types/application";

export function meta(): Route.MetaDescriptors {
  return [{ title: "GREENSIGN — Construction Intelligence" }];
}
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    projects: await listProjects(),
    feedback: await listFeedback(),
    records: await listWorkflowRecords(),
    documents: await listProjectDocuments(),
    partners: await listTradePartners(),
    aiRuntime: await getAiRuntime(),
    aiJobs: await listAiJobs(),
    aiSuggestions: await listAiSuggestions(),
    configurations: await listToolConfigurations(),
    company: await getCompany(),
    layout: await getLayout(url.searchParams.get("layout")),
    runtime: {
      version: process.env.APP_VERSION ?? "0.8.2",
      buildDate: process.env.BUILD_DATE ?? "Development build",
      environment: "GREENSIGN DEV",
      server: "Online",
      database: "Connected",
    },
  };
}
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  let createdId: string | undefined;
  if (intent === "update")
    await updateProject(
      String(form.get("id")),
      String(form.get("field")),
      String(form.get("value") ?? "") || null,
    );
  else if (intent === "project-data")
    await updateProjectData(
      String(form.get("id")),
      JSON.parse(String(form.get("patch") ?? "{}")),
    );
  else if (intent === "bulk-update")
    await bulkUpdateProjects(
      parseIds(form.get("ids")),
      String(form.get("status") ?? "active"),
    );
  else if (intent === "delete") await deleteProjects(parseIds(form.get("ids")));
  else if (intent === "create") createdId = (await createProject())?.id;
  else if (intent === "create-manual")
    createdId = (
      await createProject(
        Object.fromEntries(
          [...form.entries()].map(([key, value]) => [key, String(value)]),
        ),
      )
    )?.id;
  else if (intent === "project-intake") {
    const values = Object.fromEntries(
        [...form.entries()]
          .filter(([, value]) => typeof value === "string")
          .map(([key, value]) => [key, String(value)]),
      ),
      project = await createProject({
        ...values,
        status: "draft",
        phase: "document review",
      });
    createdId = project?.id;
    if (createdId) {
      const files = form
        .getAll("documents")
        .filter(
          (value): value is File => value instanceof File && value.size > 0,
        );
      if (files.length) {
        try {
          await ingestProjectDocuments(createdId, files);
        } catch (error) {
          // Intake is atomic: a failed parse must not leave an untitled orphan.
          await deleteProjects([createdId]);
          return {
            ok: false,
            error: await documentProcessingError(error),
          };
        }
        try {
          await runAiAssistant({
            capability: "project-intake",
            projectId: createdId,
            instruction:
              "Review the newly uploaded project documents, identify facts and scope, and prepare a confirmation draft with source evidence.",
          });
        } catch (error) {
          console.error("AI intake review failed after document parsing", error);
          return {
            ok: true,
            createdId,
            warning:
              "Documents were stored and parsed. AI review is temporarily unavailable; continue with the confirmation fields.",
          };
        }
      }
    }
  } else if (intent === "document-upload") {
    const projectId = String(form.get("projectId")),
      files = form
        .getAll("documents")
        .filter(
          (value): value is File => value instanceof File && value.size > 0,
        );
    try {
      await ingestProjectDocuments(projectId, files);
    } catch (error) {
      return { ok: false, error: await documentProcessingError(error) };
    }
    if (files.length)
      try {
        await runAiAssistant({
          capability: "project-intake",
          projectId,
          instruction:
            "Merge these newly uploaded documents into the current project review and prepare an updated confirmation draft with source evidence.",
        });
      } catch (error) {
        console.error("AI document review failed after document parsing", error);
        return {
          ok: true,
          warning:
            "Documents were stored and parsed. AI review is temporarily unavailable; continue with the confirmation fields.",
        };
      }
  } else if (intent === "intake-confirm")
    await confirmProjectIntake(
      String(form.get("projectId")),
      JSON.parse(String(form.get("values") ?? "{}")),
    );
  else if (intent === "create-from-file") {
    const file = form.get("projectFile");
    if (!(file instanceof File))
      throw new Response("Project file is required", { status: 400 });
    await createProjectsFromUpload(file);
  } else if (intent === "feedback")
    await createFeedback(
      String(form.get("note") ?? ""),
      String(form.get("page") ?? ""),
      JSON.parse(String(form.get("context") ?? "{}")),
    );
  else if (intent === "feedback-status")
    await updateFeedbackStatus(
      String(form.get("id")),
      String(form.get("status")) === "implemented" ? "implemented" : "flagged",
    );
  else if (intent === "workflow-create")
    await createWorkflowRecord(
      String(form.get("toolKey")),
      String(form.get("type") ?? "item"),
      String(form.get("projectId") ?? "") || null,
      {
        title: String(form.get("title") ?? "Untitled"),
        detail: String(form.get("detail") ?? ""),
      },
    );
  else if (intent === "workflow-create-payload")
    await createWorkflowRecord(
      String(form.get("toolKey")),
      String(form.get("type") ?? "item"),
      String(form.get("projectId") ?? "") || null,
      JSON.parse(String(form.get("payload") ?? "{}")),
      String(form.get("state") ?? "draft"),
    );
  else if (intent === "workflow-update")
    await updateWorkflowRecord(
      String(form.get("id")),
      String(form.get("state") ?? "draft"),
      {
        title: String(form.get("title") ?? "Untitled"),
        detail: String(form.get("detail") ?? ""),
      },
    );
  else if (intent === "workflow-payload")
    await updateWorkflowPayload(
      String(form.get("id")),
      JSON.parse(String(form.get("patch") ?? "{}")),
    );
  else if (intent === "workflow-import") {
    const file = form.get("csvFile");
    if (!(file instanceof File))
      throw new Response("CSV file is required", { status: 400 });
    await importWorkflowCsv(
      String(form.get("toolKey")),
      String(form.get("projectId") ?? "") || null,
      file,
    );
  } else if (intent === "workflow-delete")
    await deleteWorkflowRecord(String(form.get("id")));
  else if (intent === "tool-toggle")
    await setToolEnabled(
      String(form.get("toolKey")),
      String(form.get("enabled")) === "true",
    );
  else if (intent === "tool-setting")
    await updateToolConfiguration(
      String(form.get("toolKey")),
      String(form.get("section") ?? "setup"),
      JSON.parse(String(form.get("value") ?? "{}")),
    );
  else if (intent === "company-setting")
    await updateCompanySettings(
      String(form.get("key")),
      String(form.get("value") ?? ""),
    );
  else if (intent === "layout-tags") {
    const active = await getLayout(),
      configuration = normalizeLayout(active.configuration),
      created = await saveLayout(
        active.family,
        {
          ...configuration,
          tags: JSON.parse(String(form.get("tags") ?? "[]")),
        },
        "Tag system updated from dashboard",
        active.id,
      );
    await activateLayout(created.id);
  } else if (intent === "partner-create") {
    const created = await createTradePartner(form);
    createdId = created.id;
  } else if (intent === "partner-update")
    await updateTradePartner(
      String(form.get("id")),
      JSON.parse(String(form.get("patch") ?? "{}")),
    );
  else if (intent === "ai-run") {
    const suggestion = await runAiAssistant({
      capability: String(form.get("capability") ?? "project-intelligence"),
      projectId: String(form.get("projectId") ?? "") || null,
      instruction: String(form.get("instruction") ?? ""),
    });
    return {
      ok: true,
      aiSuggestionId: suggestion.id,
      message: "Review draft generated",
    };
  } else if (intent === "ai-review") {
    await reviewAiSuggestion(
      String(form.get("id")),
      String(form.get("status")) === "rejected" ? "rejected" : "accepted",
    );
  } else if (intent === "ai-apply") {
    const applied = await applyAiSuggestion(String(form.get("id")));
    return { ok: true, applied, message: "Workflow draft created" };
  }
  else if (intent === "activity-approve")
    await createWorkflowRecord(
      "activity",
      "approval",
      null,
      { title: String(form.get("title")), detail: String(form.get("detail")) },
      "approved",
    );
  else throw new Response("Unsupported project action", { status: 400 });
  return { ok: true, createdId };
}
async function documentProcessingError(error: unknown) {
  if (error instanceof Response) {
    const message = await error.text();
    if (message.trim()) return message;
  }
  console.error("Document processing failed", error);
  return "Document processing did not complete. No partial files or project were saved. Check the file and try again.";
}
function parseIds(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
function appLayoutStyle(config: LayoutConfiguration): CSSProperties {
  return {
    "--green": config.accent,
    "--bg": config.background,
    "--panel": config.panel,
    "--text": config.text,
    "--muted": config.muted,
    "--line": config.border,
    "--layout-font": config.fontFamily,
    "--layout-scale": String(config.fontScale),
    "--layout-density": String(config.density),
    "--layout-radius": `${config.cornerRadius}px`,
    "--layout-nav": `${config.navHeight}px`,
    "--layout-rail": `${config.projectRail}px`,
    "--layout-info": `${config.informationPane}px`,
    "--layout-card-columns": String(config.cardColumns),
  } as CSSProperties;
}

function ConfirmDialog({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="eyebrow">WORKFLOW DETAILS</div>
        <h2>{title}</h2>
        <div className="dialog-actions">
          <button className="primary" onClick={onClose}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickAddDialog({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose: () => void;
}) {
  const actions = [
    [
      "PROJECT",
      "Create a project with full project information",
      "/app/projects?create=1",
    ],
    [
      "TRADE PARTNER",
      "Add a contractor to the company network",
      "/app/network?create=1",
    ],
    [
      "PROPOSAL",
      "Start a linked or unlinked proposal",
      projectId
        ? `/app/tools/proposal-designer?project=${projectId}&create=1`
        : "/app/tools/proposal-designer?create=1",
    ],
    ...(projectId
      ? [
          [
            "SOLICITATION",
            "Create a bid package for the open project",
            `/app/tools/solicitations?project=${projectId}&create=1`,
          ],
        ]
      : []),
  ];
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog quick-add-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="eyebrow">QUICK ADD</div>
        <h2>Choose what to create</h2>
        <div className="quick-add-grid">
          {actions.map((item) => (
            <Link key={item[0]} to={item[2]} onClick={onClose}>
              <b>{item[0]}</b>
              <span>{item[1]}</span>
            </Link>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="secondary" onClick={onClose}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackComposer({
  x,
  y,
  page,
  target,
  onClose,
}: {
  x: number;
  y: number;
  page: string;
  target: string;
  onClose: () => void;
}) {
  const fetcher = useFetcher();
  const [note, setNote] = useState("");
  const position = {
    left: Math.max(8, Math.min(x, window.innerWidth - 360)),
    top: Math.max(8, Math.min(y, window.innerHeight - 210)),
  };
  function save(event: React.FormEvent) {
    event.preventDefault();
    fetcher.submit(
      {
        intent: "feedback",
        note,
        page,
        context: JSON.stringify({
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          url: window.location.href,
          target,
          point: { x, y },
        }),
      },
      { method: "post" },
    );
    onClose();
  }
  return (
    <form
      className="feedback-composer"
      style={position}
      onSubmit={save}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div className="eyebrow">FLAG FOR REVIEW</div>
      <textarea
        autoFocus
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Describe the issue or suggestion…"
      />
      <div className="feedback-meta">
        Page and viewport context will be attached automatically.
      </div>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>
          CANCEL
        </button>
        <button className="primary" disabled={!note.trim()}>
          SAVE NOTE
        </button>
      </div>
    </form>
  );
}

const commandRoutes: Record<string, string> = {
  "/dashboard": "dashboard",
  "/projects": "projects",
  "/data": "data",
  "/network": "network",
  "/proposal": "tools/proposal-designer",
  "/project-intelligence": "tools/project-intelligence",
  "/contractors": "tools/subcontractors",
  "/subcontractors": "tools/subcontractors",
  "/solicitations": "tools/solicitations",
  "/rfis": "tools/rfis",
  "/contracts": "tools/contracts",
  "/scope-review": "tools/risk",
  "/risk": "tools/risk",
  "/submittals": "tools/submittals",
  "/procurement": "tools/procurement",
  "/schedule": "tools/schedule",
  "/closeout": "tools/closeout",
  "/change-risk": "tools/change-risk",
  "/settings": "settings/account",
  "/account": "settings/account",
  "/company": "settings/company",
  "/contacts": "settings/contacts",
  "/features": "settings/features",
  "/connections": "settings/connections",
  "/subscription": "settings/subscription",
  "/feedback": "feedback",
};
const actionCommands: Record<string, string> = {
  ...Object.fromEntries(modules.map((item) => [`/new-${item[0]}`, item[0]])),
  "/new-proposal": "proposal-designer",
  "/initiate-project": "project-intelligence",
  "/new-contractor": "network-partner",
  "/add-contractor": "network-partner",
  "/add-partner": "network-partner",
  "/new-solicitation": "solicitations",
  "/new-bid-package": "solicitations",
  "/new-rfi": "rfis",
  "/new-commitment": "contracts",
  "/add-scope": "risk",
  "/build-submittal-log": "submittals",
  "/add-critical-item": "procurement",
  "/generate-schedule": "schedule",
  "/build-closeout-log": "closeout",
  "/log-change-event": "change-risk",
};
const commands = [
  ...Object.keys(commandRoutes),
  ...Object.keys(actionCommands),
  "/new-project",
  "/import-project",
  "/quick-add",
  "/commands",
  "/ver",
  "/ai",
];

function Settings({
  section,
  toolSlug,
}: {
  section?: string;
  toolSlug?: string;
}) {
  const fetcher = useFetcher(),
    data = useLoaderData<{
      configurations: { toolKey: string; enabled: boolean }[];
      company: { settings: unknown };
    }>(),
    tool = modules.find((item) => item[0] === toolSlug),
    title = tool
      ? `${tool[2]} SETUP`
      : (
          settingsLinks.find((item) => item[0] === section)?.[1] ??
          "Account info"
        ).toUpperCase(),
    rows = tool
      ? [
          ["Enable tool", "Make this module available in GREENSIGN DEV"],
          ["Tool setup", "Default stages, ownership, and workflow rules"],
          ["Templates", "Approved reusable templates"],
          ["Field maps", "Standardized inputs and outputs"],
          ["Connectors", "External workflow and storage connections"],
          [
            "Confirmation guardrails",
            "Approval before parsed data is committed",
          ],
        ]
      : (settingsRows[section ?? "account"] ?? settingsRows.account),
    companySettings = (data.company.settings ?? {}) as Record<string, unknown>,
    enabled = toolSlug
      ? (data.configurations.find((item) => item.toolKey === toolSlug)
          ?.enabled ?? false)
      : false;
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
      <section className="settings-card">
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            <span className="panel-caption">
              Connected to the active company environment · save each field
              independently
            </span>
          </div>
        </div>
        {rows.map((row, index) => {
          const key = toolSlug
              ? `${toolSlug}:${index}`
              : `${section ?? "account"}:${index}`,
            saved = String(companySettings[key] ?? "");
          if (toolSlug && index === 0)
            return (
              <div className="setting-row" key={row[0]}>
                <div>
                  <b>{row[0]}</b>
                  <span>{row[1]}</span>
                </div>
                <button
                  className={`toggle ${enabled ? "on" : ""}`}
                  aria-pressed={enabled}
                  onClick={() =>
                    fetcher.submit(
                      {
                        intent: "tool-toggle",
                        toolKey: toolSlug,
                        enabled: String(!enabled),
                      },
                      { method: "post" },
                    )
                  }
                />
              </div>
            );
          return (
            <form
              className="setting-row"
              key={row[0]}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                fetcher.submit(
                  {
                    intent: "company-setting",
                    key,
                    value: String(form.get("value") ?? ""),
                  },
                  { method: "post" },
                );
              }}
            >
              <div>
                <b>{row[0]}</b>
                <span>{row[1]}</span>
              </div>
              <div className="setting-control">
                <input
                  name="value"
                  defaultValue={saved}
                  placeholder={`Configure ${row[0].toLowerCase()}`}
                />
                <button className="secondary">SAVE</button>
              </div>
            </form>
          );
        })}
      </section>
    </div>
  );
}
const settingsRows: Record<string, string[][]> = {
  account: [
    ["Profile information", "Name, email and personal preferences"],
    ["Security", "Password, sessions and future OAuth connections"],
    ["Notifications", "Workflow assignments and deadline alerts"],
    ["Appearance", "Environment typeface and density"],
  ],
  company: [
    ["Company identity", "Legal name, logo and operating address"],
    ["Environment URL", "Company-specific GREENSIGN subdomain"],
    ["Default standards", "Codes, divisions and workflow conventions"],
    ["Data policy", "Retention, approvals and audit requirements"],
  ],
  contacts: [
    ["Company contacts", "Manage internal and external contacts"],
    ["Trades", "Define and organize supported trade categories"],
    ["Contact roles", "Estimator, PM, superintendent and accounting"],
    ["Import rules", "Review and approve contact merges"],
  ],
  features: [
    ["Enabled modules", "Control tools available in this environment"],
    ["Feature previews", "Opt into approved preview capabilities"],
    ["User assignments", "Assign module access by role"],
    ["Environment status", "Enable, suspend or disable this instance"],
  ],
  connections: [
    ["File providers", "SharePoint, Dropbox and indexed references"],
    ["Project systems", "Procore, Newforma and Trimble"],
    ["Accounting", "Sage and supported cost imports"],
    ["Email and calendar", "Communication tracking and reminders"],
  ],
  subscription: [
    ["Current plan", "GREENSIGN foundation workspace"],
    ["Licensed users", "Manage admin and member seats"],
    ["Module access", "Review included and optional tools"],
    ["Billing contact", "Invoices and subscription notices"],
  ],
};

function MenuPopover({
  close,
  projectId,
}: {
  close: () => void;
  projectId?: string;
}) {
  const preconstruction = modules.slice(0, 7),
    operations = modules.slice(7);
  if (!projectId)
    return (
      <div className="menu-popover project-required">
        <div className="eyebrow">PROJECT CONTEXT REQUIRED</div>
        <h2>Open a project to use construction tools</h2>
        <p>
          Project tools, records, and actions are scoped to the active project.
        </p>
        <Link className="primary" onClick={close} to="/app/projects">
          SELECT PROJECT
        </Link>
      </div>
    );
  const url = (slug: string) => `/app/tools/${slug}?project=${projectId}`;
  return (
    <div className="menu-popover">
      <div className="menu-section">
        <span>PRECONSTRUCTION</span>
        <div className="menu-grid">
          {preconstruction.map((item) => (
            <Link key={item[0]} onClick={close} to={url(item[0])}>
              <i>{item[1]}</i>
              {item[2]}
            </Link>
          ))}
        </div>
      </div>
      <div className="menu-divider" />
      <div className="menu-section">
        <span>PROJECT OPERATIONS</span>
        <div className="menu-grid">
          {operations.map((item) => (
            <Link key={item[0]} onClick={close} to={url(item[0])}>
              <i>{item[1]}</i>
              {item[2]}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountPopover({
  close,
  name,
  company,
  title,
}: {
  close: () => void;
  name: string;
  company: string;
  title: string;
}) {
  return (
    <div className="account-popover">
      <div className="account-heading">
        <b>{name.toUpperCase()}</b>
        <span>
          {company} · {title}
        </span>
      </div>
      {settingsLinks.map((item) => (
        <Link key={item[0]} onClick={close} to={`/app/settings/${item[0]}`}>
          {item[1]}
        </Link>
      ))}
    </div>
  );
}

function utcTimestamp(value: string | Date) {
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}
function FeedbackWorkspace() {
  const { feedback } = useLoaderData<{
      feedback: {
        id: string;
        note: string;
        page: string;
        status: string;
        createdAt: string;
      }[];
    }>(),
    fetcher = useFetcher();
  return (
    <section className="panel feedback-list">
      <div className="panel-head">
        <div>
          <h2>FLAGGED FEEDBACK</h2>
          <span className="panel-caption">
            Right-click anywhere in GREENSIGN to add a contextual note.
          </span>
        </div>
        <b>{feedback.length} ITEMS</b>
      </div>
      {feedback.map((item) => (
        <article key={item.id}>
          <span className={`project-state ${item.status}`}>{item.status}</span>
          <div>
            <b>{item.note}</b>
            <small>
              {item.page} · {utcTimestamp(item.createdAt)}
            </small>
          </div>
          <button
            className="secondary"
            onClick={() =>
              fetcher.submit(
                {
                  intent: "feedback-status",
                  id: item.id,
                  status:
                    item.status === "implemented" ? "flagged" : "implemented",
                },
                { method: "post" },
              )
            }
          >
            {item.status === "implemented" ? "REOPEN" : "MARK IMPLEMENTED"}
          </button>
        </article>
      ))}
      {!feedback.length && (
        <div className="activity-empty">
          <b>NO FEEDBACK CAPTURED</b>
          <span>Right-click anywhere to flag an item.</span>
        </div>
      )}
    </section>
  );
}

export default function Application({ loaderData }: Route.ComponentProps) {
  const location = useLocation(),
    navigate = useNavigate(),
    commandRef = useRef<HTMLInputElement>(null);
  const base = location.pathname.startsWith("/mockup") ? "/mockup" : "/app",
    path = location.pathname
      .replace(/^\/(?:app|mockup)\/?/, "")
      .split("/")
      .filter(Boolean);
  const [accountOpen, setAccountOpen] = useState(false),
    [dialog, setDialog] = useState<string>(),
    [menuOpen, setMenuOpen] = useState(false),
    [quickAddOpen, setQuickAddOpen] = useState(false),
    [command, setCommand] = useState(""),
    [commandActive, setCommandActive] = useState(false),
    [commandTip, setCommandTip] = useState<string>(),
    [aiOpen, setAiOpen] = useState(false),
    [aiInstruction, setAiInstruction] = useState(""),
    [aiProjectOverride, setAiProjectOverride] = useState<string>(),
    [aiCapabilityOverride, setAiCapabilityOverride] = useState<string>(),
    [feedbackPoint, setFeedbackPoint] = useState<{
      x: number;
      y: number;
      target: string;
    }>();
  const current = path[0] || "dashboard",
    toolSlug = current === "tools" ? path[1] : undefined,
    settingsSection = current === "settings" ? path[1] : undefined,
    settingsTool = settingsSection === "tools" ? path[2] : undefined,
    activeProjectId =
      current === "projects" && path[1]
        ? path[1]
        : (new URLSearchParams(location.search).get("project") ?? undefined),
    activeProject = loaderData.projects.find(
      (item) => item.id === activeProjectId,
    ),
    aiCapability = toolSlug
      ? toolSlug
      : activeProject?.status === "draft"
        ? "project-intake"
        : current === "network"
          ? "subcontractors"
          : current === "data"
            ? "project-intake"
            : "project-intelligence",
    assistantProjectId = aiProjectOverride ?? activeProjectId,
    assistantProject = loaderData.projects.find(
      (item) => item.id === assistantProjectId,
    );
  const companySettings = (loaderData.company.settings ?? {}) as Record<
      string,
      unknown
    >,
    adminName = String(companySettings["account:adminName"] ?? "R. Green"),
    companyName = String(companySettings["company:name"] ?? "HCO Builders"),
    adminTitle = String(companySettings["account:jobTitle"] ?? "Administrator"),
    adminInitials =
      adminName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "RG";
  const title = useMemo(
    () =>
      activeProject
        ? `${activeProject.code} · ${activeProject.name}`
        : toolSlug
          ? modules.find((item) => item[0] === toolSlug)?.[2]
          : current === "settings"
            ? settingsTool
              ? `${modules.find((item) => item[0] === settingsTool)?.[2]} SETUP`
              : (settingsLinks.find(
                  (item) => item[0] === settingsSection,
                )?.[1] ?? "SETTINGS")
            : current === "feedback"
              ? "FEEDBACK AUDIT"
              : (globalLinks.find((item) => item[0] === current)?.[1] ??
                "WORKSPACE"),
    [current, toolSlug, settingsTool, settingsSection, activeProject],
  );
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !target.matches("input,textarea,select")) {
        event.preventDefault();
        setCommand("/");
        setCommandActive(true);
        requestAnimationFrame(() => commandRef.current?.focus());
      }
      if (
        event.key === "Escape" &&
        document.activeElement === commandRef.current
      ) {
        commandRef.current?.blur();
        setCommand("");
        setCommandActive(false);
        setCommandTip(undefined);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!commandTip) return;
    const timer = window.setTimeout(() => setCommandTip(undefined), 5000);
    return () => window.clearTimeout(timer);
  }, [commandTip]);
  useEffect(() => {
    function capture(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]"))
        return;
      event.preventDefault();
      const control = target.closest(
          "button,a,[role=button],article,section,th,td",
        ) as HTMLElement | null,
        identified = control ?? target,
        description = [
          identified.tagName.toLowerCase(),
          identified.id ? `#${identified.id}` : "",
          ...[...identified.classList].slice(0, 3).map((name) => `.${name}`),
          identified.getAttribute("aria-label") ||
            identified.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) ||
            "",
        ]
          .filter(Boolean)
          .join(" ");
      setFeedbackPoint({
        x: event.clientX,
        y: event.clientY,
        target: description,
      });
    }
    window.addEventListener("contextmenu", capture);
    return () => window.removeEventListener("contextmenu", capture);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search),
      preview = params.get("layout");
    if (preview) sessionStorage.setItem("greensign-layout-preview", preview);
    else {
      const saved = sessionStorage.getItem("greensign-layout-preview");
      if (saved) {
        params.set("layout", saved);
        navigate(`${location.pathname}?${params}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);
  function closeMenus() {
    setAccountOpen(false);
    setMenuOpen(false);
  }
  function resetCommand() {
    setCommand("");
    setCommandActive(false);
    commandRef.current?.blur();
  }
  function runCommand(event: React.FormEvent) {
    event.preventDefault();
    const value = command.trim(),
      normalized = value.toLowerCase();
    if (value === "/gm_RH") {
      navigate("/gm_RH");
      resetCommand();
      return;
    }
    const query = normalized.match(
      /(?:go to|open|show)(?: project)?\s+([a-z0-9-]+)/i,
    )?.[1];
    const project =
      query &&
      loaderData.projects.find(
        (item) =>
          item.code.toLowerCase() === query ||
          item.name.toLowerCase().includes(query),
      );
    if (project) {
      navigate(`${base}/projects/${project.id}`);
      resetCommand();
      return;
    }
    const route = commandRoutes[normalized];
    if (route) {
      if (
        route.startsWith("tools/") &&
        route !== "tools/proposal-designer" &&
        !activeProjectId
      ) {
        setCommandTip("Open a project before using project tools.");
        resetCommand();
        return;
      }
      navigate(
        `${base}/${route}${route.startsWith("tools/") ? `?project=${activeProjectId}` : ""}`,
      );
      resetCommand();
      return;
    }
    if (normalized === "/commands") {
      setCommandTip(
        `Commands: ${commands.join(", ")}. You can also type “go to 26-020”.`,
      );
      resetCommand();
      return;
    }
    if (normalized === "/ai") {
      setAiInstruction("");
      setAiProjectOverride(undefined);
      setAiCapabilityOverride(undefined);
      setAiOpen(true);
      resetCommand();
      return;
    }
    if (normalized === "/ver") {
      const runtime = loaderData.runtime;
      setCommandTip(
        `GREENSIGN ${runtime.version}\nBuild: ${runtime.buildDate}\nServer: ${runtime.server} · Database: ${runtime.database}\nEnvironment: ${runtime.environment}\nRoute: ${location.pathname} · Viewport: ${window.innerWidth}×${window.innerHeight}`,
      );
      resetCommand();
      return;
    }
    if (normalized === "/new-project") {
      navigate(`${base}/projects?create=1`);
      resetCommand();
      return;
    }
    if (normalized === "/import-project") {
      navigate(`${base}/projects?create=1`);
      resetCommand();
      return;
    }
    if (normalized === "/quick-add") {
      setQuickAddOpen(true);
      resetCommand();
      return;
    }
    const actionSlug = actionCommands[normalized];
    if (actionSlug) {
      if (actionSlug === "network-partner") {
        navigate(`${base}/network?create=1`);
        resetCommand();
        return;
      }
      if (!activeProjectId && actionSlug !== "proposal-designer") {
        setCommandTip("Open a project before starting this workflow.");
        resetCommand();
        return;
      }
      navigate(
        `${base}/tools/${actionSlug}?${activeProjectId ? `project=${activeProjectId}&` : ""}create=1`,
      );
      resetCommand();
      return;
    }
    if (value && !value.startsWith("/")) {
      const referencedProject = loaderData.projects.find(
          (item) =>
            normalized.includes(item.code.toLowerCase()) ||
            normalized.includes(item.name.toLowerCase()),
        ),
        inferredCapability = /bid package|solicitation|invite/.test(normalized)
          ? "solicitations"
          : /proposal|clarification|exclusion/.test(normalized)
            ? "proposal-designer"
            : /scope|risk|coverage/.test(normalized)
              ? "risk"
              : /\brfi\b|question/.test(normalized)
                ? "rfis"
                : /submittal/.test(normalized)
                  ? "submittals"
                  : /procure|long[- ]lead|purchase/.test(normalized)
                    ? "procurement"
                    : /schedule|milestone|sequence/.test(normalized)
                      ? "schedule"
                      : /closeout|warranty|turnover/.test(normalized)
                        ? "closeout"
                        : /change|potential cost/.test(normalized)
                          ? "change-risk"
                          : /contractor|subcontractor|trade partner/.test(
                                normalized,
                              )
                            ? "subcontractors"
                            : /document|drawing|spec|intake/.test(normalized)
                              ? "project-intake"
                              : "command";
      setAiInstruction(value);
      setAiProjectOverride(referencedProject?.id);
      setAiCapabilityOverride(inferredCapability);
      setAiOpen(true);
      resetCommand();
      return;
    }
    setCommandTip(
      value
        ? `Command not recognized: ${value}. Try /commands.`
        : "Type a command to continue",
    );
  }
  const subtitle = activeProject
    ? "Project tools, records, information, and coverage in one workspace."
    : current === "projects"
      ? "Filter, edit, and manage the company project portfolio."
      : toolSlug
        ? modules.find((item) => item[0] === toolSlug)?.[3]
        : "Connected construction intelligence with confirmation-first workflows.";
  const layout = normalizeLayout(loaderData.layout.configuration),
    toolLayout = toolSlug ? (layout.toolLayouts[toolSlug] ?? "split") : "split";
  const commandSuggestions = [
    ...commands,
    ...loaderData.projects.map((project) => `go to ${project.code}`),
  ]
    .filter((item, index, all) => all.indexOf(item) === index)
    .filter(
      (item) => !command || item.toLowerCase().includes(command.toLowerCase()),
    )
    .slice(0, 8);
  return (
    <div
      className={`app-shell layout-${layout.contentMode} ${layout.headingsUppercase ? "layout-uppercase" : ""} tool-layout-${toolLayout}`}
      style={appLayoutStyle(layout)}
    >
      <header className="topbar">
        <div className="top-left">
          <button
            className={`menu-button ${menuOpen ? "active" : ""}`}
            aria-label="Open tools"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((value) => !value);
              setAccountOpen(false);
            }}
          >
            ☰
          </button>
          <Link className="brand" to="/app/dashboard" onClick={closeMenus}>
            <i className="mark" />
            <span>GREENSIGN</span>
          </Link>
          <nav className="global-nav">
            {globalLinks.map((item) => (
              <NavLink
                key={item[0]}
                to={`/app/${item[0]}`}
                onClick={closeMenus}
              >
                {item[1]}
              </NavLink>
            ))}
          </nav>
          {menuOpen && (
            <MenuPopover close={closeMenus} projectId={activeProjectId} />
          )}
        </div>
        <div className="top-actions">
          <button className="quick-add" onClick={() => setQuickAddOpen(true)}>
            ＋ QUICK ADD
          </button>
          <button
            className="avatar"
            onClick={() => setAccountOpen((value) => !value)}
          >
            {adminInitials}
          </button>
          {accountOpen && (
            <AccountPopover
              close={closeMenus}
              name={adminName}
              company={companyName}
              title={adminTitle}
            />
          )}
        </div>
      </header>
      {new URLSearchParams(location.search).get("layout") && (
        <div className="layout-preview-banner">
          <b>
            PREVIEWING {loaderData.layout.family} · V{loaderData.layout.version}
          </b>
          <span>
            Navigation remains in this preview until you return to the live
            layout.
          </span>
          <button
            onClick={() => {
              sessionStorage.removeItem("greensign-layout-preview");
              const params = new URLSearchParams(location.search);
              params.delete("layout");
              navigate(
                `${location.pathname}${params.size ? `?${params}` : ""}`,
                { replace: true },
              );
            }}
          >
            RETURN TO LIVE
          </button>
        </div>
      )}
      <main className="main">
        {layout.showEnvironmentBar && (
          <div className="project-bar">
            <div>
              <span>ACTIVE ENVIRONMENT</span>
              <b>GREENSIGN DEV</b>
            </div>
            <nav className="crumb">
              <Link to="/app/dashboard">GREENSIGN</Link>
              <span>/</span>
              {activeProject && (
                <>
                  <Link to="/app/projects">PROJECTS</Link>
                  <span>/</span>
                </>
              )}
              <b>{title}</b>
            </nav>
          </div>
        )}
        <div className="page-head">
          <div>
            <div className="eyebrow">
              {activeProject
                ? "PROJECT"
                : current === "settings"
                  ? "ENVIRONMENT SETTINGS"
                  : "GREENSIGN"}
            </div>
            <h1>{title}</h1>
            {layout.showSubtitles && <div className="subtitle">{subtitle}</div>}
          </div>
          <div className="page-actions">
            <button
              className={`ai-open-button ${loaderData.aiRuntime.enabled ? "live" : ""}`}
              onClick={() => {
                setAiInstruction("");
                setAiProjectOverride(undefined);
                setAiCapabilityOverride(undefined);
                setAiOpen(true);
              }}
            >
              <i /> AI ASSIST
            </button>
            {toolSlug && (
              <Link
                className="tool-settings"
                to={`/app/settings/tools/${toolSlug}`}
              >
                ⚙ TOOL SETUP
              </Link>
            )}
            {current === "dashboard" && (
              <Link className="primary" to="/app/projects?create=1">
                + NEW PROJECT
              </Link>
            )}
          </div>
        </div>
        {current === "dashboard" ? (
          <Dashboard confirm={setDialog} />
        ) : current === "projects" ? (
          <ProjectsPage
            projects={loaderData.projects}
            records={loaderData.records}
            documents={loaderData.documents}
            partners={loaderData.partners}
          />
        ) : current === "settings" ? (
          <SettingsWorkspace
            section={settingsSection}
            toolSlug={settingsTool}
          />
        ) : toolSlug && activeProject ? (
          <ProjectWorkspace
            project={activeProject}
            records={loaderData.records}
            documents={loaderData.documents}
            partners={loaderData.partners}
            toolSlug={toolSlug}
          />
        ) : current === "data" && activeProject ? (
          <ProjectWorkspace
            project={activeProject}
            records={loaderData.records}
            documents={loaderData.documents}
            partners={loaderData.partners}
            content={
              <DataWorkspace
                projects={loaderData.projects}
                records={loaderData.records}
                documents={loaderData.documents}
              />
            }
          />
        ) : current === "data" ? (
          <DataWorkspace
            projects={loaderData.projects}
            records={loaderData.records}
            documents={loaderData.documents}
          />
        ) : current === "network" ? (
          <NetworkWorkspace partners={loaderData.partners} />
        ) : current === "feedback" ? (
          <FeedbackWorkspace />
        ) : toolSlug ? (
          <ToolPage
            slug={toolSlug}
            confirm={setDialog}
            partners={loaderData.partners}
          />
        ) : (
          <Dashboard confirm={setDialog} />
        )}
      </main>
      <form
        className={`commandbar ${commandActive ? "active" : ""}`}
        onSubmit={runCommand}
      >
        <input
          ref={commandRef}
          value={command}
          onFocus={() => setCommandActive(true)}
          onBlur={() => setCommandActive(false)}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Type /commands or ask to go to a project…"
          aria-label="Global command"
        />
        {commandActive && commandSuggestions.length > 0 && (
          <div className="command-suggestions" role="listbox">
            {commandSuggestions.map((item) => (
              <button
                type="button"
                role="option"
                key={item}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setCommand(item);
                  requestAnimationFrame(() => commandRef.current?.focus());
                }}
              >
                <b>{item}</b>
                <span>
                  {item.startsWith("go to") ? "OPEN PROJECT" : "COMMAND"}
                </span>
              </button>
            ))}
          </div>
        )}
        <button type="submit" className="command-run">
          RUN
        </button>
        <small>GLOBAL COMMAND</small>
        {commandTip && (
          <div className="command-tooltip" role="status">
            {commandTip}
          </div>
        )}
      </form>
      {feedbackPoint && (
        <FeedbackComposer
          x={feedbackPoint.x}
          y={feedbackPoint.y}
          page={location.pathname}
          target={feedbackPoint.target}
          onClose={() => setFeedbackPoint(undefined)}
        />
      )}{" "}
      {quickAddOpen && (
        <QuickAddDialog
          projectId={activeProjectId}
          onClose={() => setQuickAddOpen(false)}
        />
      )}{" "}
      {dialog && (
        <ConfirmDialog title={dialog} onClose={() => setDialog(undefined)} />
      )}
      <AiAssistant
        open={aiOpen}
        close={() => {
          setAiOpen(false);
          setAiProjectOverride(undefined);
          setAiCapabilityOverride(undefined);
        }}
        capability={aiCapabilityOverride ?? aiCapability}
        projectId={assistantProjectId}
        projectLabel={
          assistantProject
            ? `${assistantProject.code} · ${assistantProject.name}`
            : undefined
        }
        runtime={loaderData.aiRuntime}
        suggestions={loaderData.aiSuggestions}
        jobs={loaderData.aiJobs}
        initialInstruction={aiInstruction}
      />
    </div>
  );
}

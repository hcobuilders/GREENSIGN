import { useMemo, useState } from "react";
import { Link, useFetcher, useLoaderData, useLocation } from "react-router";
import { modules } from "../lib/navigation";
import type { PartnerRow } from "./projects-page";

type ToolDefinition = {
  steps: string[];
  metrics: [string, string, string][];
  aside: [string, string][];
  primary: string;
};
const definitions: Record<string, ToolDefinition> = {
  "proposal-designer": {
    steps: ["Choose template", "Compose blocks", "Review values", "Publish"],
    metrics: [
      ["Draft proposals", "4", "Open drafts"],
      ["Approved blocks", "38", "6 categories"],
      ["Reviews", "3", "1 assigned"],
    ],
    aside: [
      ["Template library", "Approved proposal structures"],
      ["Block manager", "Reusable scope and narrative blocks"],
      ["Output center", "Editable and PDF packages"],
    ],
    primary: "NEW PROPOSAL",
  },
  "project-intelligence": {
    steps: ["Initiate", "Organize", "Monitor", "Forecast"],
    metrics: [
      ["Milestones", "27", "Open milestone view"],
      ["Forecast alerts", "5", "2 critical"],
      ["Budget signals", "12", "3 changed"],
    ],
    aside: [
      ["Portfolio pulse", "Milestone and budget signals"],
      ["Project data", "Connected project facts"],
      ["Forecast", "Dates and cost outlook"],
    ],
    primary: "INITIATE PROJECT",
  },
  subcontractors: {
    steps: ["Discover", "Qualify", "Invite", "Evaluate"],
    metrics: [
      ["Trade partners", "486", "31 trades"],
      ["Prequals due", "18", "7 overdue"],
      ["License alerts", "6", "Review required"],
    ],
    aside: [
      ["Qualification queue", "Review company records"],
      ["Trade directory", "Browse project-ready partners"],
      ["Invite center", "Add partners to active scopes"],
    ],
    primary: "ADD TRADE PARTNER",
  },
  solicitations: {
    steps: ["Build scopes", "Select bidders", "Issue", "Collect bids", "Level"],
    metrics: [
      ["Open packages", "38", "Open package register"],
      ["Invitations", "264", "71% viewed"],
      ["Bids received", "96", "36% response"],
    ],
    aside: [
      ["Plan room", "Files and bidder access"],
      ["Addenda", "Issue and acknowledge updates"],
      ["Communications", "Reminders and responses"],
    ],
    primary: "NEW BID PACKAGE",
  },
  rfis: {
    steps: ["Receive", "Classify", "Answer", "Publish", "Export"],
    metrics: [
      ["Open RFIs", "17", "6 need response"],
      ["Draft answers", "4", "2 assigned"],
      ["Published", "63", "8 scopes"],
    ],
    aside: [
      ["Response queue", "Open questions by responsibility"],
      ["Trade visibility", "Scope-specific plan room"],
      ["RFI log", "Publish and export"],
    ],
    primary: "NEW RFI",
  },
  contracts: {
    steps: [
      "Select template",
      "Build scope",
      "Review terms",
      "Redline",
      "Execute",
    ],
    metrics: [
      ["Draft commitments", "7", "$3.8M value"],
      ["Redlines", "4", "2 awaiting response"],
      ["Ready to execute", "3", "Scope confirmed"],
    ],
    aside: [
      ["Clause library", "Approved contract language"],
      ["Scope builder", "Commitment coverage"],
      ["Execution queue", "Final approval and signatures"],
    ],
    primary: "NEW COMMITMENT",
  },
  risk: {
    steps: ["Import requirements", "Compare scope", "Resolve gaps", "Approve"],
    metrics: [
      ["Requirements", "124", "91% covered"],
      ["Open gaps", "11", "3 high risk"],
      ["Exclusions", "18", "6 need review"],
    ],
    aside: [
      ["Risk index", "Coverage and exposure"],
      ["Scope conflicts", "Cross-trade conflicts"],
      ["Approval gate", "Final coverage confirmation"],
    ],
    primary: "ADD SCOPE ITEM",
  },
  submittals: {
    steps: ["Generate log", "Assign", "Collect", "Review", "Transmit"],
    metrics: [
      ["Required", "142", "11 trades"],
      ["Due soon", "19", "7 critical"],
      ["Received", "68", "48% complete"],
    ],
    aside: [
      ["Historical library", "Indexed prior submittals"],
      ["Cover sheets", "Markup and routing"],
      ["Transmittals", "Publish approved packages"],
    ],
    primary: "BUILD SUBMITTAL LOG",
  },
  procurement: {
    steps: ["Identify", "Confirm", "Track", "Escalate", "Deliver"],
    metrics: [
      ["Critical items", "23", "8 confirmed"],
      ["At risk", "5", "2 schedule impacts"],
      ["Due this month", "14", "6 unconfirmed"],
    ],
    aside: [
      ["Schedule links", "Needed-on-site milestones"],
      ["Communications", "Vendor and contractor updates"],
      ["Risk queue", "Late-order exposure"],
    ],
    primary: "ADD CRITICAL ITEM",
  },
  schedule: {
    steps: [
      "Import scope",
      "Build activities",
      "Set durations",
      "Sequence",
      "Export",
    ],
    metrics: [
      ["Activities", "184", "12 generated"],
      ["Logic checks", "7", "3 conflicts"],
      ["Milestones", "22", "4 critical"],
    ],
    aside: [
      ["Production rates", "Saved labor and unit rates"],
      ["Logic review", "Sequence and conflict checks"],
      ["Schedule export", "MPP and PDF packages"],
    ],
    primary: "GENERATE SCHEDULE",
  },
  closeout: {
    steps: ["Define requirements", "Request", "Collect", "Review", "Package"],
    metrics: [
      ["Requirements", "96", "14 trades"],
      ["Received", "61", "64% complete"],
      ["Overdue", "9", "4 critical"],
    ],
    aside: [
      ["Requirement matrix", "Deliverables by scope"],
      ["File bins", "Collected closeout records"],
      ["Package builder", "Owner turnover packages"],
    ],
    primary: "BUILD CLOSEOUT LOG",
  },
  "change-risk": {
    steps: [
      "Capture event",
      "Assess exposure",
      "Plan action",
      "Monitor",
      "Close",
    ],
    metrics: [
      ["Open events", "14", "$486K exposure"],
      ["High risk", "3", "Action required"],
      ["Mitigated", "22", "$311K avoided"],
    ],
    aside: [
      ["Exposure model", "Cost and schedule effects"],
      ["Action plan", "Guarded mitigation steps"],
      ["Notice log", "Project communications"],
    ],
    primary: "LOG CHANGE EVENT",
  },
};
type WorkflowRow = {
  id: string;
  projectId?: string | null;
  toolKey: string;
  type: string;
  state: string;
  revision: number;
  payload: unknown;
};
const states = ["draft", "review", "approved", "issued", "closed"];

function liveMetrics(
  slug: string,
  records: WorkflowRow[],
  partners: PartnerRow[],
): [string, string, string][] {
  const open = records.filter((record) => record.state !== "closed"),
    needsReview = records.filter((record) =>
      ["draft", "review"].includes(record.state),
    ),
    confirmed = records.filter((record) =>
      ["approved", "issued", "closed"].includes(record.state),
    );
  if (slug === "solicitations") {
    const invitations = records.reduce((total, record) => {
        const payload = record.payload as { partnerIds?: string[] };
        return total + (payload.partnerIds?.length ?? 0);
      }, 0),
      bids = records.reduce((total, record) => {
        const payload = record.payload as { received?: number };
        return total + Number(payload.received ?? 0);
      }, 0);
    return [
      ["Open packages", String(open.length), "Linked package register"],
      ["Invitations", String(invitations), "Selected trade partners"],
      ["Bids received", String(bids), "Recorded responses"],
    ];
  }
  if (slug === "proposal-designer") {
    const blocks = records.reduce((total, record) => {
      const payload = record.payload as { scopeIds?: string[] };
      return total + (payload.scopeIds?.length ?? 0);
    }, 0);
    return [
      ["Draft proposals", String(needsReview.length), "Open drafts"],
      ["Linked scope blocks", String(blocks), "Confirmed project scope"],
      ["Published", String(confirmed.length), "Approved or issued"],
    ];
  }
  if (slug === "subcontractors") {
    const reviewDue = partners.filter(
      (partner) => partner.status !== "qualified",
    ).length;
    return [
      ["Trade partners", String(partners.length), "Company directory"],
      ["Prequals due", String(reviewDue), "Review required"],
      ["Project invites", String(records.length), "Linked partner records"],
    ];
  }
  if (slug === "risk")
    return [
      ["Scope items", String(records.length), "Confirmed requirements"],
      ["Open review", String(needsReview.length), "Resolve before approval"],
      ["Approved", String(confirmed.length), "Covered scope"],
    ];
  return [
    ["Linked items", String(records.length), "Project register"],
    ["Needs review", String(needsReview.length), "Draft or review"],
    ["Confirmed", String(confirmed.length), "Approved or issued"],
  ];
}

export function ToolPage({
  slug,
  partners: partnerProp,
}: {
  slug: string;
  confirm: (value: string) => void;
  partners?: PartnerRow[];
}) {
  const module = modules.find((item) => item[0] === slug) ?? modules[0],
    definition = definitions[slug] ?? definitions["proposal-designer"],
    loader = useLoaderData<{
      records: WorkflowRow[];
      partners: PartnerRow[];
    }>(),
    records = loader.records,
    partners = partnerProp ?? loader.partners ?? [],
    location = useLocation(),
    params = new URLSearchParams(location.search),
    projectId = params.get("project"),
    fetcher = useFetcher(),
    [creating, setCreating] = useState(params.get("create") === "1"),
    [search, setSearch] = useState(""),
    [stateFilter, setStateFilter] = useState("all"),
    [typeFilter, setTypeFilter] = useState("all"),
    [step, setStep] = useState(0),
    [insight, setInsight] = useState(0),
    [metric, setMetric] = useState<number>(),
    [importing, setImporting] = useState(false),
    toolRecords = useMemo(
      () =>
        records.filter(
          (record) =>
            record.toolKey === slug &&
            (projectId
              ? record.projectId === projectId
              : slug === "proposal-designer"
                ? !record.projectId
                : true) &&
            `${JSON.stringify(record.payload)} ${record.type}`
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (stateFilter === "all" || record.state === stateFilter) &&
            (typeFilter === "all" || record.type === typeFilter),
        ),
      [records, slug, projectId, search, stateFilter, typeFilter],
    ),
    types = [
      ...new Set(
        records
          .filter((record) => record.toolKey === slug)
          .map((record) => record.type),
      ),
    ],
    projectScopes = records.filter(
      (record) => record.projectId === projectId && record.toolKey === "risk",
    ),
    metrics = liveMetrics(slug, toolRecords, partners);
  if (!projectId && slug !== "proposal-designer")
    return (
      <div className="empty-state">
        <b>OPEN A PROJECT FIRST</b>
        <span>
          This workflow writes linked project data and requires an active
          project.
        </span>
        <Link className="primary" to="/app/projects">
          SELECT PROJECT
        </Link>
      </div>
    );
  const template =
    slug === "procurement"
      ? "item,type,responsibleContractor,leadTime,value,neededOnSite,dateOrdered,status\nMain switchgear,Electrical,Apex Electrical,120,842000,2027-03-12,2026-10-01,tracking"
      : "title,detail,status\nExample item,Description,draft";
  return (
    <div className="tool-workspace">
      <div className="workflow-steps">
        {definition.steps.map((label, index) => (
          <button
            className={`workflow-step ${step === index ? "active" : ""}`}
            key={label}
            onClick={() => setStep(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="workflow-stage">
        <b>{definition.steps[step].toUpperCase()}</b>
        <span>
          Stage {step + 1} of {definition.steps.length}
        </span>
        <button
          onClick={() =>
            setStep(Math.min(definition.steps.length - 1, step + 1))
          }
          disabled={step === definition.steps.length - 1}
        >
          ADVANCE STAGE →
        </button>
      </div>
      <div className="metrics compact">
        {metrics.map((item, index) => (
          <button
            className={`metric metric-button ${metric === index ? "active" : ""}`}
            key={item[0]}
            onClick={() => setMetric(index)}
          >
            <label>{item[0]}</label>
            <strong>{item[1]}</strong>
            <small>{item[2]} →</small>
          </button>
        ))}
      </div>
      {metric !== undefined && (
        <div className="metric-detail-panel">
          <div>
            <span>WORKFLOW VIEW</span>
            <h3>{metrics[metric][0]}</h3>
            <p>
              {metrics[metric][2]}. This view is connected to the filtered{" "}
              {module[2].toLowerCase()} register below.
            </p>
          </div>
          <button
            onClick={() => {
              setSearch("");
              setStateFilter("all");
              setTypeFilter("all");
              setMetric(undefined);
              document
                .querySelector(".tool-layout")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            VIEW ALL ITEMS
          </button>
        </div>
      )}
      <div className="tool-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{module[2]} ITEMS</h2>
              <span className="panel-caption">
                {toolRecords.length} linked items
              </span>
            </div>
            <div className="page-actions">
              <button
                className="secondary"
                onClick={() => setImporting((value) => !value)}
              >
                IMPORT CSV
              </button>
              <a
                className="secondary"
                download={`${slug}-template.csv`}
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}
              >
                CSV TEMPLATE
              </a>
              {slug === "subcontractors" ? (
                <Link className="primary" to="/app/network?create=1">
                  {definition.primary}
                </Link>
              ) : (
                <button className="primary" onClick={() => setCreating(true)}>
                  {definition.primary}
                </button>
              )}
            </div>
          </div>
          {importing && (
            <fetcher.Form
              className="csv-import"
              method="post"
              encType="multipart/form-data"
            >
              <input type="hidden" name="intent" value="workflow-import" />
              <input type="hidden" name="toolKey" value={slug} />
              <input type="hidden" name="projectId" value={projectId ?? ""} />
              <label>
                CSV FILE
                <input
                  name="csvFile"
                  type="file"
                  accept=".csv,text/csv"
                  required
                />
              </label>
              <button className="primary">IMPORT ITEMS</button>
            </fetcher.Form>
          )}
          {creating && (
            <LinkedCreationForm
              slug={slug}
              projectId={projectId}
              scopes={projectScopes}
              partners={partners}
              fetcher={fetcher}
              close={() => setCreating(false)}
            />
          )}
          <div className="column-filters">
            <label>
              SEARCH ITEM
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search visible columns"
              />
            </label>
            <label>
              STATUS
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {states.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              TYPE
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All types</option>
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                setSearch("");
                setStateFilter("all");
                setTypeFilter("all");
              }}
            >
              CLEAR FILTERS
            </button>
          </div>
          {slug === "procurement" ? (
            <ProcurementTable records={toolRecords} fetcher={fetcher} />
          ) : (
            <LinkedTable
              slug={slug}
              records={toolRecords}
              partners={partners}
              fetcher={fetcher}
            />
          )}
        </section>
        <aside className="tool-aside">
          <div className="panel-head">
            <h2>WORKSPACE INTELLIGENCE</h2>
            <Link className="text-link" to={`/app/settings/tools/${slug}`}>
              SETUP →
            </Link>
          </div>
          {definition.aside.map((item, index) => (
            <button
              className={`insight-row ${insight === index ? "active" : ""}`}
              key={item[0]}
              onClick={() => setInsight(index)}
            >
              <b>{item[0]}</b>
              <span>{item[1]}</span>
              <i>→</i>
            </button>
          ))}
          <div className="insight-detail">
            <span>ACTIVE WORKFLOW</span>
            <h3>{definition.aside[insight][0]}</h3>
            <p>{definition.aside[insight][1]}</p>
            <button className="primary" onClick={() => setCreating(true)}>
              ADD ITEM
            </button>
            <Link
              className="secondary"
              to={
                projectId
                  ? `/app/data?project=${projectId}&type=report`
                  : "/app/settings/company"
              }
            >
              OPEN RELATED DATA
            </Link>
            <Link className="secondary" to={`/app/settings/tools/${slug}`}>
              CONFIGURE WORKFLOW
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LinkedCreationForm({
  slug,
  projectId,
  scopes,
  partners,
  fetcher,
  close,
}: {
  slug: string;
  projectId: string | null;
  scopes: WorkflowRow[];
  partners: PartnerRow[];
  fetcher: ReturnType<typeof useFetcher>;
  close: () => void;
}) {
  const [title, setTitle] = useState(""),
    [detail, setDetail] = useState(""),
    [dueDate, setDueDate] = useState(""),
    [total, setTotal] = useState(0),
    [blocks, setBlocks] = useState(
      "Project overview\nScope of work\nPrice and clarifications",
    ),
    [scopeIds, setScopeIds] = useState<string[]>([]),
    [partnerIds, setPartnerIds] = useState<string[]>([]);
  function create(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      title,
      detail,
      dueDate,
      total,
      scopeIds,
      partnerIds,
      blocks: blocks
        .split(/\r?\n/)
        .map((block) => block.trim())
        .filter(Boolean),
      sent: partnerIds.length,
      received: 0,
      linkedProjectId: projectId,
    };
    fetcher.submit(
      {
        intent: "workflow-create-payload",
        toolKey: slug,
        type:
          slug === "proposal-designer"
            ? "proposal"
            : slug === "solicitations"
              ? "bid-package"
              : slug === "risk"
                ? "scope-item"
                : "item",
        projectId: projectId ?? "",
        state: "draft",
        payload: JSON.stringify(payload),
      },
      { method: "post" },
    );
    close();
  }
  const linked = slug === "proposal-designer" || slug === "solicitations";
  return (
    <form className="inline-editor linked-create" onSubmit={create}>
      <div className="linked-form-grid">
        <label>
          ITEM NAME
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder={
              slug === "solicitations"
                ? "Bid package name"
                : slug === "proposal-designer"
                  ? "Proposal name"
                  : "Item name"
            }
          />
        </label>
        {linked && (
          <label>
            DUE DATE
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        )}
        {slug === "proposal-designer" && (
          <label>
            PROPOSAL VALUE
            <input
              type="number"
              value={total}
              onChange={(event) => setTotal(Number(event.target.value))}
            />
          </label>
        )}
        <label className="wide">
          DETAILS
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Scope, exclusions, delivery notes, or narrative"
          />
        </label>
        {slug === "proposal-designer" && (
          <label className="wide">
            PROPOSAL BLOCKS · ONE PER LINE
            <textarea
              value={blocks}
              onChange={(event) => setBlocks(event.target.value)}
              placeholder="Project overview\nScope of work\nPrice and clarifications"
            />
          </label>
        )}
      </div>
      {linked && (
        <fieldset>
          <legend>LINK CONFIRMED SCOPE</legend>
          {scopes.map((scope) => {
            const payload = scope.payload as { title?: string };
            return (
              <label className="check-row" key={scope.id}>
                <input
                  type="checkbox"
                  checked={scopeIds.includes(scope.id)}
                  onChange={() =>
                    setScopeIds((current) =>
                      current.includes(scope.id)
                        ? current.filter((id) => id !== scope.id)
                        : [...current, scope.id],
                    )
                  }
                />
                <span>{payload.title ?? scope.type}</span>
              </label>
            );
          })}
          {!scopes.length && (
            <p className="form-note">
              No confirmed scope exists yet. The item may be saved and linked
              later.
            </p>
          )}
        </fieldset>
      )}
      {slug === "solicitations" && (
        <fieldset>
          <legend>SELECT TRADE PARTNERS</legend>
          {partners.map((partner) => (
            <label className="check-row" key={partner.id}>
              <input
                type="checkbox"
                checked={partnerIds.includes(partner.id)}
                onChange={() =>
                  setPartnerIds((current) =>
                    current.includes(partner.id)
                      ? current.filter((id) => id !== partner.id)
                      : [...current, partner.id],
                  )
                }
              />
              <span>
                <b>{partner.name}</b> · {partner.primaryTrade} ·{" "}
                {partner.status.toUpperCase()}
              </span>
            </label>
          ))}
        </fieldset>
      )}{" "}
      {!projectId && slug === "proposal-designer" && (
        <div className="form-note">
          This proposal is intentionally unlinked and will be managed in Company
          Settings → Unlinked Proposals.
        </div>
      )}
      <div className="page-actions">
        <button type="button" className="secondary" onClick={close}>
          CANCEL
        </button>
        <button className="primary">SAVE DRAFT</button>
      </div>
    </form>
  );
}

function LinkedTable({
  slug,
  records,
  partners,
  fetcher,
}: {
  slug: string;
  records: WorkflowRow[];
  partners: PartnerRow[];
  fetcher: ReturnType<typeof useFetcher>;
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Linked data</th>
            <th>Due</th>
            <th>Status</th>
            <th>Revision</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const payload = (record.payload ?? {}) as {
                title?: string;
                detail?: string;
                scopeIds?: string[];
                partnerIds?: string[];
                dueDate?: string;
                total?: number;
                blocks?: string[];
              },
              partnerNames = (payload.partnerIds ?? [])
                .map(
                  (id) => partners.find((partner) => partner.id === id)?.name,
                )
                .filter(Boolean);
            return (
              <tr key={record.id}>
                <td>
                  <input
                    className="table-edit title"
                    defaultValue={payload.title ?? "Untitled"}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape")
                        event.currentTarget.value = payload.title ?? "Untitled";
                    }}
                    onBlur={(event) =>
                      fetcher.submit(
                        {
                          intent: "workflow-payload",
                          id: record.id,
                          patch: JSON.stringify({ title: event.target.value }),
                        },
                        { method: "post" },
                      )
                    }
                  />
                  {slug === "proposal-designer" && (
                    <details className="proposal-block-editor">
                      <summary>
                        EDIT {payload.blocks?.length ?? 0} PROPOSAL BLOCKS
                      </summary>
                      <textarea
                        defaultValue={(payload.blocks ?? []).join("\n")}
                        placeholder="Add one proposal block per line"
                        onBlur={(event) =>
                          fetcher.submit(
                            {
                              intent: "workflow-payload",
                              id: record.id,
                              patch: JSON.stringify({
                                blocks: event.target.value
                                  .split(/\r?\n/)
                                  .map((block) => block.trim())
                                  .filter(Boolean),
                              }),
                            },
                            { method: "post" },
                          )
                        }
                      />
                    </details>
                  )}
                  <input
                    className="table-edit detail"
                    defaultValue={payload.detail ?? ""}
                    placeholder="Add details"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape")
                        event.currentTarget.value = payload.detail ?? "";
                    }}
                    onBlur={(event) =>
                      fetcher.submit(
                        {
                          intent: "workflow-payload",
                          id: record.id,
                          patch: JSON.stringify({ detail: event.target.value }),
                        },
                        { method: "post" },
                      )
                    }
                  />
                </td>
                <td>
                  <b>{payload.scopeIds?.length ?? 0} scope items</b>
                  {partnerNames.length > 0 && (
                    <small>{partnerNames.join(" · ")}</small>
                  )}
                  {slug === "proposal-designer" && payload.total
                    ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(payload.total)}`
                    : ""}
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
                <td>
                  <select
                    className="cell-select status-value"
                    value={record.state}
                    onChange={(event) =>
                      fetcher.submit(
                        {
                          intent: "workflow-update",
                          id: record.id,
                          state: event.target.value,
                          title: payload.title ?? "Untitled",
                          detail: payload.detail ?? "",
                        },
                        { method: "post" },
                      )
                    }
                  >
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{record.revision}</td>
                <td>
                  <details className="row-actions">
                    <summary>OPEN</summary>
                    <div>
                      <button
                        onClick={() =>
                          fetcher.submit(
                            {
                              intent: "workflow-update",
                              id: record.id,
                              state: "approved",
                              title: payload.title ?? "Untitled",
                              detail: payload.detail ?? "",
                            },
                            { method: "post" },
                          )
                        }
                      >
                        APPROVE
                      </button>
                      {slug === "solicitations" && (
                        <button
                          onClick={() =>
                            fetcher.submit(
                              {
                                intent: "workflow-update",
                                id: record.id,
                                state: "issued",
                                title: payload.title ?? "Untitled",
                                detail: payload.detail ?? "",
                              },
                              { method: "post" },
                            )
                          }
                        >
                          ISSUE
                        </button>
                      )}
                      <button
                        className="danger-button"
                        onClick={() =>
                          window.confirm("Delete this item?") &&
                          fetcher.submit(
                            { intent: "workflow-delete", id: record.id },
                            { method: "post" },
                          )
                        }
                      >
                        DELETE
                      </button>
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
          {!records.length && (
            <tr>
              <td colSpan={6} className="table-empty">
                No linked items match the selected columns.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProcurementTable({
  records,
  fetcher,
}: {
  records: WorkflowRow[];
  fetcher: ReturnType<typeof useFetcher>;
}) {
  const fields = [
      ["title", "Item"],
      ["itemType", "Type"],
      ["responsibleContractor", "Responsible contractor"],
      ["leadTime", "Lead time"],
      ["value", "$"],
      ["neededOnSite", "Date needed on site"],
      ["dateOrdered", "Date ordered"],
    ] as const,
    save = (id: string, field: string, value: string) =>
      fetcher.submit(
        {
          intent: "workflow-payload",
          id,
          patch: JSON.stringify({
            [field]:
              field === "leadTime" || field === "value" ? Number(value) : value,
          }),
        },
        { method: "post" },
      );
  return (
    <div className="table-wrap">
      <table className="data-table procurement-table">
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field[0]}>{field[1]}</th>
            ))}
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const payload = (record.payload ?? {}) as Record<string, unknown>,
              lead = Number(payload.leadTime ?? 0),
              ordered = payload.dateOrdered
                ? new Date(String(payload.dateOrdered))
                : null,
              needed = payload.neededOnSite
                ? new Date(String(payload.neededOnSite))
                : null,
              late =
                !!ordered &&
                !!needed &&
                new Date(ordered.getTime() + lead * 86400000) > needed;
            return (
              <tr className={late ? "procurement-late" : ""} key={record.id}>
                {fields.map(([field]) => {
                  const isDate =
                    field === "dateOrdered" || field === "neededOnSite";
                  return (
                    <td key={field}>
                      <input
                        className="table-edit"
                        type={
                          isDate
                            ? "date"
                            : field === "leadTime" || field === "value"
                              ? "number"
                              : "text"
                        }
                        defaultValue={String(
                          payload[field] ??
                            (field === "title" ? "Untitled item" : ""),
                        )}
                        onChange={
                          isDate
                            ? (event) =>
                                save(record.id, field, event.target.value)
                            : undefined
                        }
                        onBlur={
                          !isDate
                            ? (event) =>
                                save(record.id, field, event.target.value)
                            : undefined
                        }
                      />
                    </td>
                  );
                })}
                <td>
                  <select
                    className={`cell-select status-value ${late ? "late" : ""}`}
                    value={late ? "at risk" : record.state}
                    onChange={(event) =>
                      fetcher.submit(
                        {
                          intent: "workflow-update",
                          id: record.id,
                          state: event.target.value,
                          title: String(payload.title ?? "Untitled item"),
                          detail: String(payload.itemType ?? ""),
                        },
                        { method: "post" },
                      )
                    }
                  >
                    <option value="at risk">AT RISK</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="danger-button"
                    onClick={() =>
                      window.confirm("Delete this item?") &&
                      fetcher.submit(
                        { intent: "workflow-delete", id: record.id },
                        { method: "post" },
                      )
                    }
                  >
                    DELETE
                  </button>
                </td>
              </tr>
            );
          })}
          {!records.length && (
            <tr>
              <td colSpan={9} className="table-empty">
                Import the template or add the first procurement item.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

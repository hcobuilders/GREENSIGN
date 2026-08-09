import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, useFetcher } from "react-router";
import { modules } from "../lib/navigation";
import {
  AddressField,
  formatAddress,
  type StructuredAddress,
} from "./address-field";
import { ToolPage } from "./tool-page";
import type {
  DocumentRow,
  PartnerRow,
  ProjectRow,
  WorkflowRow,
} from "./projects-page";

type BidPackage = {
  id?: string;
  title: string;
  sent: number;
  received: number;
  state: string;
  dueDate?: string;
  partnerIds?: string[];
};
type Scope = { code: string; title: string; source: string };
const projectDefaults: Record<string, Record<string, unknown>> = {
  "26-055": {
    location: "19410 Boyette Road, Lithia, FL 33547",
    projectOwner: "Lennar Homes",
    architect: "Fieldstone Architecture",
    description: "Amenity center and pool complex",
    sizeSf: 18600,
    anticipatedValue: 5850000,
    estimatedValue: 5620000,
    proposedValue: 5710000,
  },
  "26-068": {
    location: "701 4th Street S, St. Petersburg, FL 33701",
    projectOwner: "Johns Hopkins All Children’s Hospital",
    architect: "HOK",
    description: "Specialty pharmacy renovation",
    sizeSf: 12400,
    anticipatedValue: 4100000,
    estimatedValue: 3975000,
    proposedValue: 4050000,
  },
  "26-052": {
    location: "36727 Blanton Road, Dade City, FL 33523",
    projectOwner: "Pasco-Hernando State College",
    architect: "Harvard Jolly Architecture",
    description: "Campus envelope, interiors, and infrastructure repairs",
    sizeSf: 74200,
    anticipatedValue: 8650000,
    estimatedValue: 8420000,
    proposedValue: 8515000,
  },
  CMAR: {
    location: "4811 K-Bar Ranch Parkway, Tampa, FL 33647",
    projectOwner: "City of Tampa",
    architect: "Kimley-Horn",
    description: "CMAR park and recreation improvements",
    sizeSf: 310000,
    anticipatedValue: 22800000,
    estimatedValue: 21450000,
    proposedValue: 0,
  },
};
const money = (value: unknown) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export function ProjectWorkspace({
  project,
  records,
  documents = [],
  partners = [],
  toolSlug,
  content,
}: {
  project: ProjectRow;
  records: WorkflowRow[];
  documents?: DocumentRow[];
  partners?: PartnerRow[];
  toolSlug?: string;
  content?: ReactNode;
}) {
  const details = {
      ...projectDefaults[project.code],
      ...((project.data ?? {}) as Record<string, unknown>),
    },
    projectRecords = records.filter(
      (record) => record.projectId === project.id,
    ),
    scope = projectRecords.filter((record) => record.toolKey === "risk"),
    solicitations = projectRecords.filter(
      (record) => record.toolKey === "solicitations",
    ),
    proposals = projectRecords.filter(
      (record) => record.toolKey === "proposal-designer",
    ),
    packages: BidPackage[] = solicitations.length
      ? solicitations.map((record, index) => {
          const payload = record.payload as {
            title?: string;
            sent?: number;
            received?: number;
            dueDate?: string;
            partnerIds?: string[];
          };
          return {
            id: record.id,
            title: payload.title ?? `Bid package ${index + 1}`,
            sent: Number(payload.sent ?? payload.partnerIds?.length ?? 0),
            received: Number(payload.received ?? 0),
            state: record.state,
            dueDate: payload.dueDate,
            partnerIds: payload.partnerIds,
          };
        })
      : [];
  return (
    <div className="project-shell">
      <aside className="project-tools">
        <div className="project-tools-title">
          <span>PROJECT TOOLS</span>
        </div>
        <NavLink end to={`/app/projects/${project.id}`}>
          Overview
        </NavLink>
        {modules.map((item) => (
          <NavLink
            key={item[0]}
            to={`/app/tools/${item[0]}?project=${project.id}`}
          >
            {item[2]}
          </NavLink>
        ))}
        <div className="project-tools-divider" />
        <NavLink to={`/app/data?project=${project.id}&type=file`}>
          Files <b>{documents.length}</b>
        </NavLink>
        <NavLink to={`/app/data?project=${project.id}&type=report`}>
          Reports
        </NavLink>
        <NavLink to={`/app/data?project=${project.id}&type=template`}>
          Templates
        </NavLink>
      </aside>
      <section className="project-center">
        {content ??
          (toolSlug ? (
            <ToolPage slug={toolSlug} confirm={() => {}} partners={partners} />
          ) : project.status === "draft" ? (
            <DraftApproval
              project={project}
              details={details}
              documents={documents}
            />
          ) : (
            <ProjectOverview
              project={project}
              details={details}
              scope={scope}
              packages={packages}
              proposals={proposals}
              partners={partners}
            />
          ))}
      </section>
      <ProjectInformation
        project={project}
        details={details}
        packages={packages}
        documents={documents}
      />
    </div>
  );
}

function DraftApproval({
  project,
  details,
  documents,
}: {
  project: ProjectRow;
  details: Record<string, unknown>;
  documents: DocumentRow[];
}) {
  const fetcher = useFetcher<{
      ok: boolean;
      error?: string;
      warning?: string;
    }>(),
    intake = (details.intake ?? {}) as {
      parsed?: Record<string, unknown>;
      status?: string;
    },
    parsed = (intake.parsed ?? {}) as {
      projectNumber?: string;
      projectName?: string;
      projectOwner?: string;
      architect?: string;
      address?: string;
      bidDueDate?: string;
      startDate?: string;
      completionDate?: string;
      estimatedValue?: number;
      confidence?: number;
      scopes?: Scope[];
      sourceFiles?: string[];
    },
    [values, setValues] = useState({
      code: parsed.projectNumber || project.code,
      name: parsed.projectName || project.name,
      owner: project.owner,
      projectOwner: parsed.projectOwner || String(details.projectOwner ?? ""),
      architect: parsed.architect || String(details.architect ?? ""),
      address: {
        formatted:
          parsed.address ||
          formatAddress(details.address ?? details.location, ""),
        street: "",
        city: "",
        state: "",
        zip: "",
      } as StructuredAddress,
      dueDate: parsed.bidDueDate || project.dueDate || "",
      startDate: parsed.startDate || project.startDate || "",
      completionDate: parsed.completionDate || project.completionDate || "",
      estimatedValue: Number(
        parsed.estimatedValue ?? details.estimatedValue ?? 0,
      ),
    }),
    [scopes, setScopes] = useState<Scope[]>(parsed.scopes ?? []),
    [selected, setSelected] = useState<Set<number>>(
      new Set((parsed.scopes ?? []).map((_, index) => index)),
    );
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data)
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetcher.state, fetcher.data]);
  function confirm() {
    fetcher.submit(
      {
        intent: "intake-confirm",
        projectId: project.id,
        values: JSON.stringify({
          ...values,
          scopes: scopes.filter((_, index) => selected.has(index)),
        }),
      },
      { method: "post" },
    );
  }
  return (
    <div className="approval-workspace">
      <div className="approval-hero">
        <div>
          <span>DRAFT · FOR APPROVAL</span>
          <h2>DOCUMENT PARSE CONFIRMATION</h2>
          <p>
            Review extracted project information before it becomes operating
            data. Confirming creates the project scope records and advances the
            project to Planning.
          </p>
        </div>
        <div className="confidence">
          <strong>{Number(parsed.confidence ?? 0)}%</strong>
          <span>PARSE CONFIDENCE</span>
        </div>
      </div>
      <div className="approval-columns">
        <section className="panel approval-form">
          <div className="panel-head">
            <div>
              <h2>PROJECT INFORMATION</h2>
              <span className="panel-caption">
                Every parsed field remains editable.
              </span>
            </div>
          </div>
          <div className="drawer-grid">
            {(
              [
                ["code", "PROJECT NUMBER"],
                ["name", "PROJECT NAME"],
                ["owner", "PROJECT LEAD"],
                ["projectOwner", "PROJECT OWNER"],
                ["architect", "ARCHITECT"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={String(values[key])}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            <AddressField
              label="PROJECT ADDRESS"
              value={values.address}
              onChange={(address) =>
                setValues((current) => ({ ...current, address }))
              }
            />
            <label>
              BID / DUE
              <input
                type="date"
                value={values.dueDate}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              START
              <input
                type="date"
                value={values.startDate}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              COMPLETION
              <input
                type="date"
                value={values.completionDate}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    completionDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              ESTIMATED VALUE
              <input
                type="number"
                value={values.estimatedValue}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    estimatedValue: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
        </section>
        <section className="panel parsed-documents">
          <div className="panel-head">
            <div>
              <h2>SOURCE DOCUMENTS</h2>
              <span className="panel-caption">
                Stored with extracted text and parse traceability.
              </span>
            </div>
          </div>
          {documents.map((document) => (
            <article key={document.id}>
              <span>{document.documentType.toUpperCase()}</span>
              <b>{document.fileName}</b>
              <small>
                {Math.max(1, Math.round(document.size / 1024))} KB ·{" "}
                {document.status.toUpperCase()}
              </small>
              <a
                href={`/resource/document/${document.id}`}
                target="_blank"
                rel="noreferrer"
              >
                OPEN ORIGINAL ↗
              </a>
            </article>
          ))}
          <fetcher.Form
            method="post"
            encType="multipart/form-data"
            className="document-upload compact"
          >
            <input type="hidden" name="intent" value="document-upload" />
            <input type="hidden" name="projectId" value={project.id} />
            <input
              name="documents"
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              multiple
              required
            />
            <button className="secondary">UPLOAD + REPARSE</button>
          </fetcher.Form>
          {fetcher.data?.error && (
            <div className="intake-message error" role="alert">
              <b>UPLOAD DID NOT COMPLETE</b>
              <span>{fetcher.data.error}</span>
            </div>
          )}
          {fetcher.data?.warning && (
            <div className="intake-message warning" role="status">
              <b>PARSE COMPLETE</b>
              <span>{fetcher.data.warning}</span>
            </div>
          )}
        </section>
      </div>
      <section className="panel parsed-scope">
        <div className="panel-head">
          <div>
            <h2>PARSED SCOPE ITEMS</h2>
            <span className="panel-caption">
              Selected items become editable Scope + Contract Risk records.
            </span>
          </div>
          <button
            className="secondary"
            onClick={() => {
              setSelected((current) => {
                const next = new Set(current);
                next.add(scopes.length);
                return next;
              });
              setScopes((current) => [
                ...current,
                { code: "", title: "", source: "Manual confirmation" },
              ]);
            }}
          >
            + ADD SCOPE
          </button>
        </div>
        {scopes.map((scope, index) => (
          <div className="parsed-scope-row" key={index}>
            <input
              type="checkbox"
              checked={selected.has(index)}
              onChange={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  next.has(index) ? next.delete(index) : next.add(index);
                  return next;
                })
              }
            />
            <input
              aria-label="Scope code"
              value={scope.code}
              onChange={(event) =>
                setScopes((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, code: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <input
              aria-label="Scope title"
              value={scope.title}
              onChange={(event) =>
                setScopes((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, title: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <span>{scope.source}</span>
          </div>
        ))}
        {!scopes.length && (
          <div className="table-empty">
            No CSI scope headings were detected. Add the first scope before
            approval.
          </div>
        )}
      </section>
      <div className="approval-actions">
        <Link className="secondary" to="/app/projects">
          RETURN TO PROJECTS
        </Link>
        <button
          className="primary"
          disabled={fetcher.state !== "idle"}
          onClick={confirm}
        >
          {fetcher.state !== "idle"
            ? "CONFIRMING…"
            : "CONFIRM + CREATE OPERATING PROJECT"}
        </button>
      </div>
    </div>
  );
}

function ProjectOverview({
  project,
  details,
  scope,
  packages,
  proposals,
  partners,
}: {
  project: ProjectRow;
  details: Record<string, unknown>;
  scope: WorkflowRow[];
  packages: BidPackage[];
  proposals: WorkflowRow[];
  partners: PartnerRow[];
}) {
  const fetcher = useFetcher(),
    scopeComplete =
      scope.length > 0 &&
      scope.every(
        (item) => item.state === "approved" || item.state === "closed",
      ),
    recentProposal = proposals.at(-1),
    proposalPayload = recentProposal?.payload as
      | { title?: string; total?: number }
      | undefined;
  return (
    <div className="project-overview">
      <div className="project-overview-toolbar">
        <Link to="/app/projects">← ALL PROJECTS</Link>
        <div>
          <Link to={`/app/tools/risk?project=${project.id}`}>SCOPE REVIEW</Link>
          <Link to={`/app/tools/solicitations?project=${project.id}&create=1`}>
            NEW BID PACKAGE
          </Link>
        </div>
      </div>
      <section className="project-command-center">
        <div className="project-pulse">
          <div>
            <label>STATUS</label>
            <strong className="status-value">{project.status}</strong>
            <span>{project.phase}</span>
          </div>
          <div>
            <label>SCOPE REVIEW</label>
            <strong>{scope.length} linked items</strong>
            <Link to={`/app/tools/risk?project=${project.id}`}>
              {scopeComplete ? "OPEN REVIEW" : "COMPLETE SCOPE"}
            </Link>
          </div>
          <div>
            <label>LATEST ESTIMATE</label>
            <strong>{money(details.estimatedValue)}</strong>
            <Link to={`/app/data?project=${project.id}&type=estimate`}>
              OPEN ESTIMATE
            </Link>
          </div>
          <div>
            <label>LATEST OWNER PROPOSAL</label>
            <strong>{proposalPayload?.title ?? "No proposal sent"}</strong>
            <Link
              to={`/app/tools/proposal-designer?project=${project.id}&create=${recentProposal ? 0 : 1}`}
            >
              {recentProposal ? "OPEN PROPOSAL" : "CREATE FROM SCOPE"}
            </Link>
          </div>
        </div>
        <div className="overview-packages">
          <div className="overview-section-head">
            <div>
              <span>BID PACKAGES</span>
              <b>{packages.length} TOTAL</b>
            </div>
            <Link to={`/app/tools/solicitations?project=${project.id}`}>
              MANAGE ALL →
            </Link>
          </div>
          {packages.map((item) => {
            const ratio = item.sent
                ? Math.min(100, Math.round((item.received / item.sent) * 100))
                : 0,
              names = (item.partnerIds ?? [])
                .map(
                  (id) => partners.find((partner) => partner.id === id)?.name,
                )
                .filter(Boolean);
            return (
              <div
                className={`overview-package ${item.received ? "covered" : "uncovered"}`}
                key={item.id ?? item.title}
              >
                <div>
                  <b>{item.title}</b>
                  <span>
                    {item.received} received / {item.sent} invited
                    {item.dueDate ? ` · due ${item.dueDate}` : ""}
                  </span>
                  {names.length > 0 && <small>{names.join(" · ")}</small>}
                </div>
                <div className="coverage-bar">
                  <i style={{ width: `${ratio}%` }} />
                </div>
                {item.id && (
                  <div className="overview-package-actions">
                    <button
                      onClick={() =>
                        fetcher.submit(
                          {
                            intent: "workflow-update",
                            id: item.id!,
                            state: "issued",
                            title: item.title,
                            detail: `Issued to ${item.sent} trade partners`,
                          },
                          { method: "post" },
                        )
                      }
                    >
                      ISSUE PACKAGE
                    </button>
                    <Link
                      to={`/app/tools/subcontractors?project=${project.id}`}
                    >
                      ADD CONTRACTOR
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
          {!packages.length && (
            <div className="table-empty">
              Create a bid package from confirmed scope and select trade
              partners.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InlineDataField({
  label,
  value,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: string;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  function save() {
    onSave(draft);
    setEditing(false);
  }
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {editing ? (
          <span className="lead-editor">
            <input
              type={type}
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
                if (event.key === "Escape") {
                  setDraft(value);
                  setEditing(false);
                }
              }}
            />
            <button onClick={save}>SAVE</button>
            <button
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              CANCEL
            </button>
          </span>
        ) : (
          <span className="lead-value">
            {value || "Not set"}
            <button onClick={() => setEditing(true)}>EDIT</button>
          </span>
        )}
      </dd>
    </div>
  );
}

function InlineAddressDataField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: unknown;
  onSave: (value: StructuredAddress) => void;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<StructuredAddress>(() =>
      typeof value === "object" && value
        ? (value as StructuredAddress)
        : {
            formatted: String(value ?? ""),
            street: "",
            city: "",
            state: "",
            zip: "",
          },
    );
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {editing ? (
          <span className="custom-address-editor">
            <AddressField
              value={draft}
              onChange={setDraft}
              submitFields={false}
            />
            <button
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
            >
              SAVE
            </button>
            <button onClick={() => setEditing(false)}>CANCEL</button>
          </span>
        ) : (
          <span className="lead-value">
            {formatAddress(value, "Not set")}
            <button onClick={() => setEditing(true)}>EDIT</button>
          </span>
        )}
      </dd>
    </div>
  );
}

function ProjectInformation({
  project,
  details,
  packages,
  documents,
}: {
  project: ProjectRow;
  details: Record<string, unknown>;
  packages: BidPackage[];
  documents: DocumentRow[];
}) {
  const fetcher = useFetcher(),
    [editingAddress, setEditingAddress] = useState(false),
    [address, setAddress] = useState<StructuredAddress>(() =>
      typeof details.address === "object"
        ? (details.address as StructuredAddress)
        : {
            formatted: String(details.location ?? ""),
            street: "",
            city: "",
            state: "",
            zip: "",
          },
    );
  const saveProject = (field: string, value: string) =>
      fetcher.submit(
        { intent: "update", id: project.id, field, value },
        { method: "post" },
      ),
    saveData = (patch: Record<string, unknown>) =>
      fetcher.submit(
        {
          intent: "project-data",
          id: project.id,
          patch: JSON.stringify(patch),
        },
        { method: "post" },
      ),
    customFields = (details.customFields ?? []) as Array<{
      name: string;
      type: string;
      value: unknown;
    }>;
  return (
    <aside className="project-information">
      <div className="project-info-head">
        <span>PROJECT INFORMATION</span>
        {editingAddress ? (
          <div className="address-edit">
            <AddressField value={address} onChange={setAddress} />
            <button
              onClick={() => {
                saveData({ address, location: address.formatted });
                setEditingAddress(false);
              }}
            >
              SAVE ADDRESS
            </button>
            <button onClick={() => setEditingAddress(false)}>CANCEL</button>
          </div>
        ) : (
          <p>
            {formatAddress(details.address ?? details.location)}{" "}
            <button onClick={() => setEditingAddress(true)}>EDIT</button>
          </p>
        )}
      </div>
      <dl>
        <InlineDataField
          label="Owner"
          value={String(details.projectOwner ?? "")}
          onSave={(value) => saveData({ projectOwner: value })}
        />
        <InlineDataField
          label="Architect"
          value={String(details.architect ?? "")}
          onSave={(value) => saveData({ architect: value })}
        />
        <InlineDataField
          label="Project lead"
          value={project.owner}
          onSave={(value) => saveProject("owner", value)}
        />
        <InlineDataField
          label="Description"
          value={String(details.description ?? "")}
          onSave={(value) => saveData({ description: value })}
        />
        <InlineDataField
          label="Size (SF)"
          type="number"
          value={String(details.sizeSf ?? 0)}
          onSave={(value) => saveData({ sizeSf: Number(value) })}
        />
        <InlineDataField
          label="Anticipated value"
          type="number"
          value={String(details.anticipatedValue ?? 0)}
          onSave={(value) => saveData({ anticipatedValue: Number(value) })}
        />
        <InlineDataField
          label="Estimated value"
          type="number"
          value={String(details.estimatedValue ?? 0)}
          onSave={(value) => saveData({ estimatedValue: Number(value) })}
        />
        <InlineDataField
          label="Proposed value"
          type="number"
          value={String(details.proposedValue ?? 0)}
          onSave={(value) => saveData({ proposedValue: Number(value) })}
        />
      </dl>
      <div className="project-dates">
        <span>PROJECT DATES</span>
        <InlineDataField
          label="Start"
          type="date"
          value={project.startDate ?? ""}
          onSave={(value) => saveProject("startDate", value)}
        />
        <InlineDataField
          label="Bid / due"
          type="date"
          value={project.dueDate ?? ""}
          onSave={(value) => saveProject("dueDate", value)}
        />
        <InlineDataField
          label="Completion"
          type="date"
          value={project.completionDate ?? ""}
          onSave={(value) => saveProject("completionDate", value)}
        />
      </div>
      <div className="package-list">
        <span>LINKED DATA</span>
        <div className="package-row covered">
          <b>{documents.length} PROJECT DOCUMENTS</b>
          <small>Stored and parsed</small>
        </div>
        <div className="package-row">
          <b>{packages.length} BID PACKAGES</b>
          <small>Scope-linked solicitations</small>
        </div>
      </div>
      {customFields.length > 0 && (
        <div className="custom-info">
          <span>CUSTOM PARAMETERS</span>
          {customFields.map((field) =>
            field.type === "address" ? (
              <InlineAddressDataField
                key={field.name}
                label={field.name || "Custom field"}
                value={field.value}
                onSave={(value) =>
                  saveData({
                    customFields: customFields.map((item) =>
                      item === field ? { ...item, value } : item,
                    ),
                  })
                }
              />
            ) : (
              <InlineDataField
                key={field.name}
                label={field.name || "Custom field"}
                type={
                  field.type === "date"
                    ? "date"
                    : field.type === "value"
                      ? "number"
                      : "text"
                }
                value={String(field.value ?? "")}
                onSave={(value) =>
                  saveData({
                    customFields: customFields.map((item) =>
                      item === field ? { ...item, value } : item,
                    ),
                  })
                }
              />
            ),
          )}
        </div>
      )}
    </aside>
  );
}

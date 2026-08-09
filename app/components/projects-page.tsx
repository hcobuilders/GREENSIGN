import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher, useLocation, useNavigate } from "react-router";
import {
  AddressField,
  type StructuredAddress,
} from "./address-field";
import { ProjectWorkspace } from "./project-workspace";
import { MAX_PROJECT_DOCUMENT_MB } from "../lib/document-limits";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  phase: string;
  owner: string;
  startDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  data: unknown;
};
export type WorkflowRow = {
  id: string;
  projectId: string | null;
  toolKey: string;
  type: string;
  state: string;
  revision: number;
  payload: unknown;
};
export type DocumentRow = {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  size: number;
  documentType: string;
  extractedText: string;
  parsedData: unknown;
  status: string;
  createdAt: string | Date;
};
export type PartnerRow = {
  id: string;
  name: string;
  status: string;
  primaryTrade: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpires: string | null;
  address: unknown;
  prequalification: unknown;
  pastProjects: unknown;
  notes: string;
};
const statuses = [
  "draft",
  "planning",
  "bidding",
  "pricing",
  "active",
  "on hold",
  "complete",
];
const textFields = ["code", "name", "phase", "owner"] as const;
const dateFields = ["startDate", "dueDate", "completionDate"] as const;
type CustomField = {
  name: string;
  type: string;
  value: string | StructuredAddress;
};

export function ProjectsPage({
  projects,
  records,
  documents,
  partners,
}: {
  projects: ProjectRow[];
  records: WorkflowRow[];
  documents: DocumentRow[];
  partners: PartnerRow[];
}) {
  const fetcher = useFetcher<{
      ok: boolean;
      createdId?: string;
      error?: string;
      warning?: string;
    }>(),
    location = useLocation(),
    navigate = useNavigate(),
    params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(params.get("status") ?? "all"),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [bulkStatus, setBulkStatus] = useState("active"),
    [creating, setCreating] = useState(params.get("create") === "1"),
    [files, setFiles] = useState<File[]>([]),
    [customFields, setCustomFields] = useState<CustomField[]>([]);
  const filtered = useMemo(
      () =>
        projects.filter(
          (project) =>
            (status === "all" || project.status === status) &&
            `${project.code} ${project.name} ${project.owner} ${project.phase}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        ),
      [projects, query, status],
    ),
    allSelected =
      filtered.length > 0 &&
      filtered.every((project) => selected.has(project.id)),
    openProject = projects.find(
      (project) => project.id === location.pathname.split("/")[3],
    );
  const submit = (data: Record<string, string>) =>
    fetcher.submit(data, { method: "post" });
  useEffect(() => {
    if (fetcher.data?.createdId) {
      setCreating(false);
      navigate(`/app/projects/${fetcher.data.createdId}`);
    }
  }, [fetcher.data, navigate]);
  if (openProject)
    return (
      <ProjectWorkspace
        project={openProject}
        records={records}
        documents={documents.filter(
          (document) => document.projectId === openProject.id,
        )}
        partners={partners}
      />
    );
  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      filtered.forEach((project) =>
        allSelected ? next.delete(project.id) : next.add(project.id),
      );
      return next;
    });
  }
  function bulk(intent: "bulk-update" | "delete") {
    if (
      intent === "delete" &&
      !window.confirm(
        `Delete ${selected.size} selected project${selected.size === 1 ? "" : "s"}?`,
      )
    )
      return;
    submit({ intent, ids: JSON.stringify([...selected]), status: bulkStatus });
    setSelected(new Set());
  }
  return (
    <section className="projects-view">
      <div className="filter-bar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, codes, leads, or phases…"
          aria-label="Search projects"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            navigate(
              event.target.value === "all"
                ? "/app/projects"
                : `/app/projects?status=${encodeURIComponent(event.target.value)}`,
              { replace: true },
            );
          }}
          aria-label="Filter project status"
        >
          <option value="all">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.toUpperCase()}
            </option>
          ))}
        </select>
        <span className="result-count">{filtered.length} PROJECTS</span>
      </div>
      <div className="bulk-bar">
        <span>{selected.size} SELECTED</span>
        <select
          value={bulkStatus}
          onChange={(event) => setBulkStatus(event.target.value)}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          className="secondary"
          disabled={!selected.size}
          onClick={() => bulk("bulk-update")}
        >
          APPLY STATUS
        </button>
        <button
          className="danger-button"
          disabled={!selected.size}
          onClick={() => bulk("delete")}
        >
          DELETE
        </button>
        <button className="primary" onClick={() => setCreating(true)}>
          + NEW PROJECT
        </button>
      </div>
      <div className="table-wrap">
        <table className="projects-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all filtered projects"
                />
              </th>
              <th>Open</th>
              <th>Project number</th>
              <th>Project</th>
              <th>Status</th>
              <th>Phase</th>
              <th>Project lead</th>
              <th>Start</th>
              <th>Bid / Due</th>
              <th>Completion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <ProjectTableRow
                key={project.id}
                project={project}
                checked={selected.has(project.id)}
                onToggle={() => toggle(project.id)}
                submit={submit}
              />
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="table-empty">
            No projects match the selected status and search.
          </div>
        )}
      </div>
      {fetcher.state !== "idle" && (
        <div className="saving-indicator">SAVING…</div>
      )}
      {creating && (
        <div className="drawer-backdrop" onMouseDown={() => setCreating(false)}>
          <fetcher.Form
            className="project-drawer intake-drawer"
            method="post"
            encType="multipart/form-data"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <input type="hidden" name="intent" value="project-intake" />
            <input
              type="hidden"
              name="customFields"
              value={JSON.stringify(customFields)}
            />
            <div className="drawer-head">
              <div>
                <span className="eyebrow">DRAFT PROJECT INTAKE</span>
                <h2>CREATE + PARSE PROJECT</h2>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setCreating(false)}
              >
                CLOSE
              </button>
            </div>
            <div className="intake-steps">
              <span className="complete">01 PROJECT</span>
              <span className={files.length ? "complete" : ""}>
                02 DOCUMENTS
              </span>
              <span className={fetcher.state !== "idle" ? "active" : ""}>
                03 PARSE
              </span>
              <span>04 CONFIRM</span>
            </div>
            {fetcher.data?.error && (
              <div className="intake-message error" role="alert">
                <b>UPLOAD DID NOT COMPLETE</b>
                <span>{fetcher.data.error}</span>
              </div>
            )}
            <div className="drawer-grid">
              <label>
                PROJECT NUMBER
                <input
                  name="code"
                  placeholder="Optional — parsed from documents"
                />
              </label>
              <label>
                PROJECT NAME
                <input
                  name="name"
                  placeholder="Optional — parsed from documents"
                />
              </label>
              <label>
                PROJECT LEAD
                <input name="owner" placeholder="Unassigned" />
              </label>
              <label>
                PHASE
                <input name="phase" defaultValue="document review" />
              </label>
              <AddressField label="PROJECT ADDRESS" />
              <label className="wide document-upload">
                DRAWINGS + SPECIFICATIONS
                <input
                  name="documents"
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  multiple
                  onChange={(event) =>
                    setFiles(Array.from(event.currentTarget.files ?? []))
                  }
                />
                <span>
                  Upload PDF drawing sets, specifications, addenda, or text
                  schedules. Each file is parsed and then committed with the
                  project as one safe transaction. Up to{" "}
                  {MAX_PROJECT_DOCUMENT_MB} MB per file.
                </span>
              </label>
            </div>
            <div className="upload-queue" aria-live="polite">
              <header>
                <b>UPLOAD QUEUE</b>
                <span>{files.length} FILE{files.length === 1 ? "" : "S"}</span>
              </header>
              {files.map((file) => (
                <article key={`${file.name}-${file.lastModified}`}>
                  <div>
                    <b>{file.name}</b>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <strong
                    className={fetcher.data?.error ? "error" : undefined}
                  >
                    {fetcher.state !== "idle"
                      ? "PARSING"
                      : fetcher.data?.error
                        ? "RETRY"
                        : "READY"}
                  </strong>
                </article>
              ))}
              {!files.length && (
                <p>Select one or more drawing or specification files above.</p>
              )}
            </div>
            <section className="custom-fields">
              <div className="panel-head">
                <div>
                  <h2>CUSTOM PARAMETERS</h2>
                  <span className="panel-caption">
                    Add project-specific fields that persist with the project.
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setCustomFields((current) => [
                      ...current,
                      { name: "", type: "text", value: "" },
                    ])
                  }
                >
                  + ADD PARAMETER
                </button>
              </div>
              {customFields.map((field, index) => (
                <div className="custom-field-row" key={index}>
                  <input
                    aria-label="Parameter name"
                    placeholder="Parameter name"
                    value={field.name}
                    onChange={(event) =>
                      setCustomFields((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label="Parameter type"
                    value={field.type}
                    onChange={(event) =>
                      setCustomFields((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                type: event.target.value,
                                value:
                                  event.target.value === "address"
                                    ? {
                                        formatted:
                                          typeof item.value === "string"
                                            ? item.value
                                            : item.value.formatted,
                                        street: "",
                                        city: "",
                                        state: "",
                                        zip: "",
                                      }
                                    : typeof item.value === "string"
                                      ? item.value
                                      : item.value.formatted,
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {["text", "date", "value", "address", "other"].map(
                      (type) => (
                        <option key={type}>{type}</option>
                      ),
                    )}
                  </select>
                  {field.type === "address" ? (
                    <AddressField
                      label="PARAMETER ADDRESS"
                      submitFields={false}
                      value={field.value}
                      onChange={(value) =>
                        setCustomFields((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, value } : item,
                          ),
                        )
                      }
                    />
                  ) : (
                    <input
                      aria-label="Parameter value"
                      type={
                        field.type === "date"
                          ? "date"
                          : field.type === "value"
                            ? "number"
                            : "text"
                      }
                      value={String(field.value)}
                      onChange={(event) =>
                        setCustomFields((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  )}
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      setCustomFields((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    REMOVE
                  </button>
                </div>
              ))}
            </section>
            <div className="drawer-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setCreating(false)}
              >
                CANCEL
              </button>
              <button className="primary" disabled={fetcher.state !== "idle"}>
                {fetcher.state !== "idle"
                  ? "PARSING DOCUMENTS…"
                  : "CREATE DRAFT + PARSE"}
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ProjectTableRow({
  project,
  checked,
  onToggle,
  submit,
}: {
  project: ProjectRow;
  checked: boolean;
  onToggle: () => void;
  submit: (data: Record<string, string>) => void;
}) {
  const update = (field: string, value: string) =>
      submit({ intent: "update", id: project.id, field, value }),
    keyboard = (
      event: React.KeyboardEvent<HTMLInputElement>,
      value: string,
    ) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
      if (event.key === "Escape") {
        event.currentTarget.value = value;
        event.currentTarget.blur();
      }
    };
  return (
    <tr className={checked ? "selected" : ""}>
      <td>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select ${project.name}`}
        />
      </td>
      <td>
        <Link
          className="secondary table-open"
          to={`/app/projects/${project.id}`}
        >
          OPEN
        </Link>
      </td>
      {textFields.slice(0, 2).map((field) => (
        <td key={field}>
          <input
            className={`cell-input ${field}`}
            defaultValue={project[field]}
            onKeyDown={(event) => keyboard(event, project[field])}
            onBlur={(event) =>
              event.target.value !== project[field] &&
              update(field, event.target.value)
            }
          />
        </td>
      ))}
      <td>
        <select
          className="cell-select status-value"
          value={project.status}
          onChange={(event) => update("status", event.target.value)}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.toUpperCase()}
            </option>
          ))}
        </select>
      </td>
      {textFields.slice(2).map((field) => (
        <td key={field}>
          <input
            className="cell-input"
            defaultValue={project[field]}
            onKeyDown={(event) => keyboard(event, project[field])}
            onBlur={(event) =>
              event.target.value !== project[field] &&
              update(field, event.target.value)
            }
          />
        </td>
      ))}
      {dateFields.map((field) => (
        <td key={field}>
          <input
            className="date-input"
            type="date"
            value={project[field] ?? ""}
            onChange={(event) => update(field, event.target.value)}
          />
        </td>
      ))}
    </tr>
  );
}

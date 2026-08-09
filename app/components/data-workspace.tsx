import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { DocumentRow } from "./projects-page";
type Project = { id: string; code: string; name: string };
type RecordRow = {
  id: string;
  projectId: string | null;
  toolKey: string;
  type: string;
  state: string;
  revision: number;
  payload: unknown;
};
const typeOptions = ["file", "report", "template", "estimate", "submittal"];

export function DataWorkspace({
  projects,
  records,
  documents,
}: {
  projects: Project[];
  records: RecordRow[];
  documents: DocumentRow[];
}) {
  const [searchParams, setSearchParams] = useSearchParams(),
    [query, setQuery] = useState(""),
    project = searchParams.get("project") ?? "all",
    requestedType = searchParams.get("type") ?? "all",
    type = typeOptions.includes(requestedType) ? requestedType : "all",
    selectedDocument = documents.find(
      (document) => document.id === searchParams.get("document"),
    ),
    sample = [
      {
        id: "company-qualification",
        name: "Company qualification template",
        type: "template",
        projectId: null,
        source: "Proposal Designer",
        updated: "Today",
        route: "/app/settings/proposals",
      },
      {
        id: "master-estimate",
        name: "Master estimate workbook",
        type: "estimate",
        projectId: null,
        source: "Estimating",
        updated: "Yesterday",
        route: "/app/tools/proposal-designer",
      },
      {
        id: "subcontract-blocks",
        name: "Standard subcontract blocks",
        type: "template",
        projectId: null,
        source: "Commitments",
        updated: "Aug 06",
        route: "/app/settings/tools/contracts",
      },
    ],
    setFilter = (key: "project" | "type" | "document", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === "all" || !value) next.delete(key);
      else next.set(key, value);
      setSearchParams(next);
    },
    items = useMemo(
      () =>
        [
          ...documents.map((document) => ({
            id: document.id,
            name: document.fileName,
            type: "file",
            projectId: document.projectId,
            source: document.documentType,
            updated: document.status,
            route: `/app/data?document=${document.id}`,
          })),
          ...sample,
          ...records.map((record) => {
            const payload = record.payload as { title?: string };
            return {
              id: record.id,
              name: payload?.title ?? record.type,
              type: record.type,
              projectId: record.projectId,
              source: record.toolKey,
              updated: `Revision ${record.revision ?? 1}`,
              route: record.projectId
                ? `/app/tools/${record.toolKey}?project=${record.projectId}`
                : `/app/tools/${record.toolKey}`,
            };
          }),
        ].filter(
          (item) =>
            (project === "all" || item.projectId === project) &&
            (type === "all" || item.type.toLowerCase().includes(type)) &&
            `${item.name} ${item.source}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        ),
      [documents, projects, records, project, type, query],
    );
  if (selectedDocument)
    return (
      <DocumentViewer
        document={selectedDocument}
        project={projects.find(
          (item) => item.id === selectedDocument.projectId,
        )}
        close={() => setFilter("document", "")}
      />
    );
  return (
    <div className="library-workspace">
      <div className="filter-bar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files, reports, templates, budgets, estimates…"
        />
        <select
          value={project}
          onChange={(event) => setFilter("project", event.target.value)}
        >
          <option value="all">All projects</option>
          {projects.map((item) => (
            <option value={item.id} key={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) => setFilter("type", event.target.value)}
        >
          <option value="all">All types</option>
          <option value="file">Files</option>
          <option value="report">Reports</option>
          <option value="template">Templates</option>
          <option value="estimate">Estimates</option>
          <option value="submittal">Submittals</option>
        </select>
        <span className="result-count">{items.length} ITEMS</span>
      </div>
      <div className="library-grid">
        {items.map((item) => (
          <article className="library-card" key={item.id}>
            <span className="status-value">{item.type.toUpperCase()}</span>
            <h3>{item.name}</h3>
            <p>
              {item.projectId
                ? (projects.find((entry) => entry.id === item.projectId)
                    ?.name ?? "Project item")
                : "Company library"}
            </p>
            <footer>
              <small>{item.source}</small>
              <b>{String(item.updated).toUpperCase()}</b>
            </footer>
            {documents.some((document) => document.id === item.id) ? (
              <button
                className="outline-action"
                onClick={() => setFilter("document", item.id)}
              >
                REVIEW PARSE
              </button>
            ) : (
              <Link className="outline-action" to={item.route}>
                OPEN
              </Link>
            )}
          </article>
        ))}
        {!items.length && (
          <div className="table-empty">
            No items match this project and data type.
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentViewer({
  document,
  project,
  close,
}: {
  document: DocumentRow;
  project?: Project;
  close: () => void;
}) {
  const parsed = (document.parsedData ?? {}) as Record<string, unknown>;
  return (
    <div className="document-viewer">
      <div className="project-overview-toolbar">
        <button onClick={close}>← FILE REGISTER</button>
        {project && (
          <Link to={`/app/projects/${project.id}`}>
            PROJECT APPROVAL / OVERVIEW
          </Link>
        )}
      </div>
      <div className="document-viewer-head">
        <div>
          <span>{document.documentType.toUpperCase()}</span>
          <h2>{document.fileName}</h2>
          <p>
            {project ? `${project.code} · ${project.name}` : "Company document"}
          </p>
        </div>
        <a
          className="primary"
          href={`/resource/document/${document.id}`}
          target="_blank"
          rel="noreferrer"
        >
          OPEN ORIGINAL ↗
        </a>
      </div>
      <div className="document-review-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>PARSED PROJECT INFORMATION</h2>
          </div>
          <dl className="parsed-facts">
            {Object.entries(parsed)
              .filter(([key]) => !["scopes", "sourceFiles"].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {key
                      .replace(/[A-Z]/g, (letter) => ` ${letter}`)
                      .toUpperCase()}
                  </dt>
                  <dd>
                    {typeof value === "number"
                      ? value.toLocaleString()
                      : String(value ?? "Not detected")}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
        <section className="panel extracted-text">
          <div className="panel-head">
            <div>
              <h2>EXTRACTED TEXT</h2>
              <span className="panel-caption">
                Searchable source used for the confirmation draft.
              </span>
            </div>
          </div>
          <pre>
            {document.extractedText ||
              "No embedded text was extracted from this document."}
          </pre>
        </section>
      </div>
    </div>
  );
}

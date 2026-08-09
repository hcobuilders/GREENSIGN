import { useMemo, useState, type CSSProperties } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import type { LayoutConfiguration, TagDefinition } from "../lib/layout-config";
import { formatAddress } from "./address-field";
import type { ProjectRow } from "./projects-page";
type RecordRow = {
  projectId: string | null;
  toolKey: string;
  type: string;
  state: string;
  payload: unknown;
};
const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function Dashboard({ confirm }: { confirm: (value: string) => void }) {
  const fetcher = useFetcher(),
    { projects, records, company, layout } = useLoaderData<{
      projects: ProjectRow[];
      records: RecordRow[];
      company: { settings: unknown };
      layout: { configuration: LayoutConfiguration };
    }>(),
    [metric, setMetric] = useState<string>(),
    [dragged, setDragged] = useState<string>(),
    [dragOver, setDragOver] = useState<string>(),
    [tagManager, setTagManager] = useState(false),
    settings = (company.settings ?? {}) as Record<string, unknown>,
    tags = layout.configuration.tags,
    savedOrder = useMemo(() => {
      try {
        return JSON.parse(
          String(settings["dashboard:projectOrder"] ?? "[]"),
        ) as string[];
      } catch {
        return [];
      }
    }, [settings]),
    ordered = useMemo(
      () =>
        [...projects].sort((a, b) => {
          const ai = savedOrder.indexOf(a.id),
            bi = savedOrder.indexOf(b.id);
          return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        }),
      [projects, savedOrder],
    ),
    activities = [
      ["3 bids received", "Oakfield Trails · Division 09"],
      ["Scope confirmation ready", "JHACH · Electrical"],
      ["Insurance expires soon", "2 trade partners need review"],
      ["Proposal review assigned", "PHSC East Campus Repairs"],
    ],
    approved = new Set(
      records
        .filter(
          (record) =>
            record.toolKey === "activity" && record.state === "approved",
        )
        .map((record) => (record.payload as { title?: string })?.title),
    ),
    pending = activities.filter((item) => !approved.has(item[0])),
    metrics = [
      [
        "Active projects",
        String(projects.filter((item) => item.status === "active").length),
        "Open portfolio",
      ],
      [
        "Open solicitations",
        String(
          records.filter(
            (item) =>
              item.toolKey === "solicitations" && item.state !== "closed",
          ).length,
        ),
        "Review packages",
      ],
      [
        "Proposals",
        String(
          records.filter(
            (item) =>
              item.toolKey === "proposal-designer" && item.state !== "closed",
          ).length,
        ),
        "Open proposals",
      ],
      ["Pending actions", String(pending.length), "Review actions"],
    ];
  function drop(target: string) {
    if (!dragged || dragged === target) {
      setDragged(undefined);
      setDragOver(undefined);
      return;
    }
    const ids = ordered.map((item) => item.id),
      from = ids.indexOf(dragged),
      to = ids.indexOf(target);
    ids.splice(to, 0, ...ids.splice(from, 1));
    fetcher.submit(
      {
        intent: "company-setting",
        key: "dashboard:projectOrder",
        value: JSON.stringify(ids),
      },
      { method: "post" },
    );
    setDragged(undefined);
    setDragOver(undefined);
  }
  return (
    <>
      <div className="metrics">
        {metrics.map((item, index) =>
          index === 0 ? (
            <Link
              className="metric metric-button"
              key={item[0]}
              to="/app/projects?status=active"
            >
              <label>{item[0]}</label>
              <strong>{item[1]}</strong>
              <small>{item[2]} →</small>
            </Link>
          ) : (
            <button
              className="metric metric-button"
              key={item[0]}
              onClick={() => setMetric(item[0])}
            >
              <label>{item[0]}</label>
              <strong>{item[1]}</strong>
              <small>{item[2]} →</small>
            </button>
          ),
        )}
      </div>
      <div className="content-grid">
        <section>
          <div className="panel-head standalone">
            <h2>PRIORITY PROJECTS</h2>
            <div className="page-actions">
              <button
                className="text-button"
                onClick={() => setTagManager(true)}
              >
                EDIT TAGS
              </button>
              <Link to="/app/projects" className="text-link">
                VIEW ALL →
              </Link>
            </div>
          </div>
          <div className="cards project-cards">
            {ordered.slice(0, 4).map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                tags={tags}
                fetcher={fetcher}
                dragged={dragged}
                dragOver={dragOver}
                setDragged={setDragged}
                setDragOver={setDragOver}
                drop={drop}
              />
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>ACTIVITY + ACTIONS</h2>
            <b>{pending.length} OPEN</b>
          </div>
          {pending.map((item) => (
            <div className="activity-row activity-action" key={item[0]}>
              <i />
              <div>
                <b>{item[0]}</b>
                <span>{item[1]}</span>
              </div>
              <div className="activity-buttons">
                <button
                  className="secondary"
                  onClick={() => confirm(`${item[0]} · ${item[1]}`)}
                >
                  VIEW
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    fetcher.submit(
                      {
                        intent: "activity-approve",
                        title: item[0],
                        detail: item[1],
                      },
                      { method: "post" },
                    )
                  }
                >
                  APPROVE
                </button>
              </div>
            </div>
          ))}
          {!pending.length && (
            <div className="activity-empty">
              <b>YOU’RE CAUGHT UP</b>
            </div>
          )}
        </section>
      </div>
      {metric && (
        <MetricDrawer
          title={metric}
          projects={projects}
          records={records}
          close={() => setMetric(undefined)}
        />
      )}{" "}
      {tagManager && (
        <TagManager
          tags={tags}
          close={() => setTagManager(false)}
          submit={(tags) =>
            fetcher.submit(
              { intent: "layout-tags", tags: JSON.stringify(tags) },
              { method: "post" },
            )
          }
        />
      )}
    </>
  );
}

function ProjectCard({
  project,
  index,
  tags,
  fetcher,
  dragged,
  dragOver,
  setDragged,
  setDragOver,
  drop,
}: {
  project: ProjectRow;
  index: number;
  tags: TagDefinition[];
  fetcher: ReturnType<typeof useFetcher>;
  dragged?: string;
  dragOver?: string;
  setDragged: (id: string | undefined) => void;
  setDragOver: (id: string | undefined) => void;
  drop: (id: string) => void;
}) {
  const [menu, setMenu] = useState(false),
    detail = (project.data ?? {}) as Record<string, unknown>,
    coverage = [62, 48, 76, 25][index % 4],
    days = project.dueDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(`${project.dueDate}T12:00:00`).getTime() - Date.now()) /
              86400000,
          ),
        )
      : 0,
    cardColor = String(detail.cardColor ?? "#87ff4f"),
    tag = tags.find((item) => item.key === project.status) ?? {
      key: project.status,
      label: project.status.toUpperCase(),
      color: cardColor,
    };
  return (
    <article
      className={`reference-card ${dragged === project.id ? "dragging" : ""} ${dragOver === project.id && dragged !== project.id ? "drop-target" : ""}`}
      draggable
      onDragStart={() => setDragged(project.id)}
      onDragEnd={() => {
        setDragged(undefined);
        setDragOver(undefined);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(project.id);
      }}
      onDragLeave={() => dragOver === project.id && setDragOver(undefined)}
      onDrop={() => drop(project.id)}
      style={{ "--card-accent": cardColor } as CSSProperties}
    >
      {dragOver === project.id && dragged !== project.id && (
        <div className="drop-placeholder">DROP PROJECT HERE</div>
      )}
      <div className="reference-top">
        <select
          className="project-state"
          aria-label={`Status for ${project.name}`}
          value={project.status}
          style={{ color: tag.color, borderColor: tag.color }}
          onChange={(event) =>
            fetcher.submit(
              {
                intent: "update",
                id: project.id,
                field: "status",
                value: event.target.value,
              },
              { method: "post" },
            )
          }
        >
          {tags
            .filter((item) => !["qualified", "review due"].includes(item.key))
            .map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
        </select>
        <span className="drag-handle" title="Drag to reorder">
          DRAG
        </span>
        <button
          aria-label={`More options for ${project.name}`}
          onClick={() => setMenu((value) => !value)}
        >
          •••
        </button>
        {menu && (
          <div className="card-menu">
            <label>
              CARD COLOR
              <input
                type="color"
                value={cardColor}
                onChange={(event) =>
                  fetcher.submit(
                    {
                      intent: "project-data",
                      id: project.id,
                      patch: JSON.stringify({ cardColor: event.target.value }),
                    },
                    { method: "post" },
                  )
                }
              />
            </label>
            <Link to={`/app/projects/${project.id}`}>EDIT PROJECT</Link>
            <Link to={`/app/tools/risk?project=${project.id}`}>
              SCOPE REVIEW
            </Link>
            <Link to={`/app/tools/solicitations?project=${project.id}`}>
              SOLICITATIONS
            </Link>
            <Link to={`/app/data?project=${project.id}`}>FILES</Link>
          </div>
        )}
      </div>
      <h3>{project.name}</h3>
      <div className="project-identity">
        <b>{project.code}</b>
        <span>
          {formatAddress(
            detail.address ?? detail.location,
            "Full address not set",
          )}
        </span>
      </div>
      <div className="bid-signal">
        <div>
          <label>
            {project.status === "bidding" ? "BID COVERAGE" : "NEXT DEADLINE"}
          </label>
          <strong>
            {project.status === "bidding" ? `${coverage}%` : `${days} DAYS`}
          </strong>
        </div>
        <div className="coverage-bar">
          <i
            style={{
              width: `${project.status === "bidding" ? coverage : Math.min(100, days * 3)}%`,
            }}
          />
        </div>
      </div>
      <div className="reference-dates">
        <div>
          <label>BID / DUE</label>
          <b>{project.dueDate ?? "NOT SET"}</b>
        </div>
        <div>
          <label>COMPLETION</label>
          <b>{project.completionDate ?? "NOT SET"}</b>
        </div>
      </div>
      <div className="reference-actions">
        <Link to={`/app/projects/${project.id}`}>OPEN PROJECT</Link>
        <Link to={`/app/tools/risk?project=${project.id}`}>SCOPE</Link>
        <Link to={`/app/tools/solicitations?project=${project.id}`}>BIDS</Link>
        <Link to={`/app/data?project=${project.id}`}>FILES</Link>
      </div>
      <footer>
        <span>ESTIMATED VALUE</span>
        <b>{currency(Number(detail.estimatedValue ?? 0))}</b>
      </footer>
    </article>
  );
}

function TagManager({
  tags,
  close,
  submit,
}: {
  tags: TagDefinition[];
  close: () => void;
  submit: (tags: TagDefinition[]) => void;
}) {
  const [draft, setDraft] = useState(tags);
  return (
    <div className="drawer-backdrop" onMouseDown={close}>
      <aside
        className="metric-drawer tag-manager"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">SHARED TAG SYSTEM</span>
            <h2>PROJECT TAGS</h2>
          </div>
          <button className="secondary" onClick={close}>
            CLOSE
          </button>
        </div>
        {draft.map((tag, index) => (
          <div className="tag-editor-row" key={`${tag.key}-${index}`}>
            <input
              value={tag.label}
              onChange={(event) =>
                setDraft((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          label: event.target.value.toUpperCase(),
                          key: item.key,
                        }
                      : item,
                  ),
                )
              }
            />
            <input
              type="color"
              value={tag.color}
              onChange={(event) =>
                setDraft((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, color: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <button
              className="danger-button"
              onClick={() =>
                setDraft((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              REMOVE
            </button>
          </div>
        ))}
        <button
          className="secondary"
          onClick={() =>
            setDraft((current) => [
              ...current,
              {
                key: `tag-${current.length + 1}`,
                label: "NEW TAG",
                color: "#79aef2",
              },
            ])
          }
        >
          + ADD TAG
        </button>
        <div className="drawer-actions">
          <button className="secondary" onClick={close}>
            CANCEL
          </button>
          <button
            className="primary"
            onClick={() => {
              submit(draft);
              close();
            }}
          >
            SAVE TAG VERSION
          </button>
        </div>
      </aside>
    </div>
  );
}

function MetricDrawer({
  title,
  projects,
  records,
  close,
}: {
  title: string;
  projects: ProjectRow[];
  records: RecordRow[];
  close: () => void;
}) {
  const tool = title.includes("Solicitation")
      ? "solicitations"
      : title.includes("Proposal")
        ? "proposal-designer"
        : undefined,
    items = tool ? records.filter((record) => record.toolKey === tool) : [];
  return (
    <div className="drawer-backdrop" onMouseDown={close}>
      <aside
        className="metric-drawer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <h2>{title.toUpperCase()}</h2>
          <button className="secondary" onClick={close}>
            CLOSE
          </button>
        </div>
        {items.length ? (
          items.map((record, index) => (
            <Link
              className="drawer-link"
              key={index}
              to={
                record.projectId
                  ? `/app/tools/${record.toolKey}?project=${record.projectId}`
                  : `/app/tools/${record.toolKey}`
              }
            >
              <b>
                {(record.payload as { title?: string })?.title ?? record.type}
              </b>
              <span>{record.state.toUpperCase()}</span>
            </Link>
          ))
        ) : (
          <div className="activity-empty">
            <b>NO ITEMS YET</b>
          </div>
        )}
        <Link
          className="primary drawer-all"
          to={
            tool
              ? `/app/tools/${tool}${projects[0] && tool !== "proposal-designer" ? `?project=${projects[0].id}` : ""}`
              : "/app/feedback"
          }
        >
          CONTINUE IN WORKSPACE
        </Link>
      </aside>
    </div>
  );
}

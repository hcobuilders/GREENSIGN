import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useFetcher, useLoaderData, useNavigate } from "react-router";
import {
  defaultLayout,
  normalizeLayout,
  type LayoutConfiguration,
} from "../lib/layout-config";
import {
  activateLayout,
  duplicateLayout,
  getLayout,
  listEnvironments,
  listLayouts,
  restoreLayout,
  saveLayout,
} from "../lib/layouts.server";
import { modules } from "../lib/navigation";
import type { Route } from "./+types/godmode";

export function meta() {
  return [{ title: "GREENSIGN Godmode · Layout Studio" }];
}
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url),
    layouts = await listLayouts(),
    selected = await getLayout(url.searchParams.get("version"));
  return { layouts, selected, environments: await listEnvironments() };
}
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData(),
    intent = String(form.get("intent") ?? "");
  if (intent === "layout-save") {
    const created = await saveLayout(
      String(form.get("family") ?? "Untitled Layout"),
      normalizeLayout(JSON.parse(String(form.get("configuration") ?? "{}"))),
      String(form.get("notes") ?? ""),
      String(form.get("parentId") ?? "") || null,
    );
    return { ok: true, createdId: created.id };
  }
  if (intent === "layout-activate")
    await activateLayout(String(form.get("id")));
  else if (intent === "layout-restore") {
    const created = await restoreLayout(String(form.get("id")));
    return { ok: true, createdId: created.id };
  } else if (intent === "layout-duplicate") {
    const created = await duplicateLayout(
      String(form.get("id")),
      String(form.get("name") ?? ""),
    );
    return { ok: true, createdId: created.id };
  } else throw new Response("Unsupported Godmode action", { status: 400 });
  return { ok: true };
}

const fonts = [
  "Inter",
  "Arial",
  "Georgia",
  "Courier New",
  "Trebuchet MS",
  "Verdana",
];
const colors: [keyof LayoutConfiguration, string][] = [
  ["accent", "Accent"],
  ["background", "Background"],
  ["panel", "Panels"],
  ["text", "Primary text"],
  ["muted", "Secondary text"],
  ["border", "Borders"],
];
function layoutStyle(config: LayoutConfiguration): CSSProperties {
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

function utcTimestamp(value: string | Date) {
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

export default function Godmode() {
  const { layouts, selected, environments } = useLoaderData<typeof loader>(),
    fetcher = useFetcher<{ ok: boolean; createdId?: string }>(),
    navigate = useNavigate(),
    [config, setConfig] = useState<LayoutConfiguration>(
      normalizeLayout(selected.configuration),
    ),
    [family, setFamily] = useState(selected.family),
    [notes, setNotes] = useState("");
  useEffect(() => {
    setConfig(normalizeLayout(selected.configuration));
    setFamily(selected.family);
    setNotes("");
  }, [selected.id]);
  useEffect(() => {
    if (fetcher.data?.createdId)
      navigate(`/gm_RH?version=${fetcher.data.createdId}`);
  }, [fetcher.data, navigate]);
  const update = <K extends keyof LayoutConfiguration>(
    key: K,
    value: LayoutConfiguration[K],
  ) => setConfig((current) => ({ ...current, [key]: value }));
  const submit = (data: Record<string, string>) =>
    fetcher.submit(data, { method: "post" });
  return (
    <div className="gm-shell" style={layoutStyle(config)}>
      <header className="gm-topbar">
        <Link className="gm-brand" to="/gm_RH">
          <i />
          GREENSIGN <b>GODMODE</b>
        </Link>
        <nav>
          <a href="#studio">LAYOUT STUDIO</a>
          <a href="#versions">VERSIONS</a>
          <a href="#environments">ENVIRONMENTS</a>
          <a href="#map">INTERFACE MAP</a>
        </nav>
        <Link className="gm-exit" to="/app/dashboard">
          OPEN APPLICATION →
        </Link>
      </header>
      <main className="gm-main">
        <section className="gm-hero">
          <span>PRIVATE DESIGN CONTROL</span>
          <h1>LAYOUT STUDIO</h1>
          <p>
            Godmode is isolated from environment operations. It stores interface
            definitions only; project activity and environment actions never
            appear here.
          </p>
        </section>
        <div className="gm-grid" id="studio">
          <aside className="gm-sidebar">
            <b>EDITING</b>
            <select
              value={selected.id}
              onChange={(event) =>
                navigate(`/gm_RH?version=${event.target.value}`)
              }
            >
              {layouts.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.family} · v{item.version} · {item.status}
                </option>
              ))}
            </select>
            <label>
              LAYOUT FAMILY
              <input
                value={family}
                onChange={(event) => setFamily(event.target.value)}
              />
            </label>
            <label>
              VERSION NOTES
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Describe this iteration"
              />
            </label>
            <button
              className="gm-primary"
              disabled={fetcher.state !== "idle"}
              onClick={() =>
                submit({
                  intent: "layout-save",
                  family,
                  notes,
                  parentId: selected.id,
                  configuration: JSON.stringify(config),
                })
              }
            >
              SAVE AS NEW VERSION
            </button>
            <Link
              className="gm-preview"
              to={`/app/dashboard?layout=${selected.id}`}
            >
              PREVIEW SELECTED VERSION ↗
            </Link>
            <button
              className="gm-secondary"
              onClick={() =>
                submit({ intent: "layout-activate", id: selected.id })
              }
            >
              SET AS LIVE LAYOUT
            </button>
          </aside>
          <div className="gm-editor">
            <EditorSection title="COLOR SYSTEM">
              <div className="gm-control-grid">
                {colors.map(([key, label]) => (
                  <label key={key}>
                    {label.toUpperCase()}
                    <span className="gm-color">
                      <input
                        type="color"
                        value={String(config[key])}
                        onChange={(event) =>
                          update(key, event.target.value as never)
                        }
                      />
                      <input
                        value={String(config[key])}
                        onChange={(event) =>
                          update(key, event.target.value as never)
                        }
                      />
                    </span>
                  </label>
                ))}
              </div>
            </EditorSection>
            <EditorSection title="TYPE + SCALE">
              <div className="gm-control-grid">
                <label>
                  TYPEFACE
                  <select
                    value={config.fontFamily}
                    onChange={(event) =>
                      update("fontFamily", event.target.value)
                    }
                  >
                    {fonts.map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                </label>
                <Range
                  label="TYPE SCALE"
                  value={config.fontScale}
                  min={0.8}
                  max={1.35}
                  step={0.05}
                  set={(value) => update("fontScale", value)}
                />
                <Range
                  label="DENSITY"
                  value={config.density}
                  min={0.75}
                  max={1.3}
                  step={0.05}
                  set={(value) => update("density", value)}
                />
                <Range
                  label="CORNER RADIUS"
                  value={config.cornerRadius}
                  min={0}
                  max={20}
                  step={1}
                  set={(value) => update("cornerRadius", value)}
                />
              </div>
            </EditorSection>
            <EditorSection title="APPLICATION FRAME">
              <div className="gm-control-grid">
                <Range
                  label="NAV HEIGHT"
                  value={config.navHeight}
                  min={44}
                  max={84}
                  step={2}
                  set={(value) => update("navHeight", value)}
                />
                <Range
                  label="PROJECT RAIL"
                  value={config.projectRail}
                  min={160}
                  max={320}
                  step={10}
                  set={(value) => update("projectRail", value)}
                />
                <Range
                  label="INFORMATION PANE"
                  value={config.informationPane}
                  min={280}
                  max={560}
                  step={10}
                  set={(value) => update("informationPane", value)}
                />
                <Range
                  label="DASHBOARD COLUMNS"
                  value={config.cardColumns}
                  min={1}
                  max={4}
                  step={1}
                  set={(value) => update("cardColumns", value)}
                />
                <label>
                  CONTENT WIDTH
                  <select
                    value={config.contentMode}
                    onChange={(event) =>
                      update(
                        "contentMode",
                        event.target.value as "full" | "contained",
                      )
                    }
                  >
                    <option value="full">Full width</option>
                    <option value="contained">Contained</option>
                  </select>
                </label>
              </div>
              <div className="gm-toggles">
                <Toggle
                  label="UPPERCASE HEADINGS"
                  value={config.headingsUppercase}
                  set={(value) => update("headingsUppercase", value)}
                />
                <Toggle
                  label="PAGE SUBTITLES"
                  value={config.showSubtitles}
                  set={(value) => update("showSubtitles", value)}
                />
                <Toggle
                  label="ENVIRONMENT BAR"
                  value={config.showEnvironmentBar}
                  set={(value) => update("showEnvironmentBar", value)}
                />
              </div>
            </EditorSection>
            <EditorSection title="TOOL WORKSPACES">
              <div className="gm-tool-layouts">
                {modules.map((module) => (
                  <label key={module[0]}>
                    <span>{module[2]}</span>
                    <select
                      value={config.toolLayouts[module[0]] ?? "split"}
                      onChange={(event) =>
                        update("toolLayouts", {
                          ...config.toolLayouts,
                          [module[0]]: event.target.value as
                            | "split"
                            | "wide"
                            | "stacked",
                        })
                      }
                    >
                      <option value="split">Main + intelligence</option>
                      <option value="wide">Full-width table</option>
                      <option value="stacked">Stacked panels</option>
                    </select>
                  </label>
                ))}
              </div>
            </EditorSection>
            <EditorSection title="LIVE COMPONENT PREVIEW">
              <div
                className={`gm-preview-canvas ${config.headingsUppercase ? "uppercase" : ""}`}
              >
                <div className="gm-preview-nav">
                  GREENSIGN <span>Dashboard</span>
                  <span>Projects</span>
                  <button>QUICK ADD</button>
                </div>
                <div className="gm-preview-body">
                  <small>PROJECT</small>
                  <h2>INTERFACE PREVIEW</h2>
                  {config.showSubtitles && (
                    <p>
                      Changes are previewed here before a version is saved or
                      activated.
                    </p>
                  )}
                  <div className="gm-preview-cards">
                    {[1, 2, 3].map((item) => (
                      <article key={item}>
                        <b>CARD {item}</b>
                        <strong>{item * 12}</strong>
                        <button>OPEN</button>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </EditorSection>
          </div>
        </div>
        <section className="gm-library" id="versions">
          <div className="gm-section-head">
            <div>
              <span>VERSION CONTROL</span>
              <h2>SAVED LAYOUTS</h2>
            </div>
            <b>{layouts.length} IMMUTABLE VERSIONS</b>
          </div>
          <div className="gm-version-list">
            {layouts.map((item) => (
              <article
                className={item.status === "active" ? "active" : ""}
                key={item.id}
              >
                <div>
                  <span>{item.status}</span>
                  <h3>
                    {item.family} · v{item.version}
                  </h3>
                  <p>{item.notes || "Saved layout iteration"}</p>
                  <small>{utcTimestamp(item.createdAt)}</small>
                </div>
                <div>
                  <Link to={`/app/dashboard?layout=${item.id}`}>PREVIEW</Link>
                  <button
                    onClick={() =>
                      submit({ intent: "layout-activate", id: item.id })
                    }
                  >
                    ACTIVATE
                  </button>
                  <button
                    onClick={() =>
                      submit({ intent: "layout-restore", id: item.id })
                    }
                  >
                    RESTORE AS NEW
                  </button>
                  <button
                    onClick={() =>
                      submit({
                        intent: "layout-duplicate",
                        id: item.id,
                        name: `${item.family} Copy`,
                      })
                    }
                  >
                    DUPLICATE
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="gm-library" id="environments">
          <div className="gm-section-head">
            <div>
              <span>SEPARATE DESTINATIONS</span>
              <h2>ENVIRONMENTS</h2>
            </div>
          </div>
          <div className="gm-environments">
            {environments.map((environment) => (
              <article key={environment.id}>
                <h3>{environment.name}</h3>
                <code>{environment.slug}.greensign.app</code>
                <Link to="/app/dashboard">OPEN ENVIRONMENT →</Link>
              </article>
            ))}
          </div>
        </section>
        <section className="gm-library" id="map">
          <div className="gm-section-head">
            <div>
              <span>LAYOUT COVERAGE</span>
              <h2>INTERFACE MAP</h2>
            </div>
          </div>
          <div className="gm-map">
            <b>GLOBAL FRAME</b>
            <span>
              Navigation · command bar · typography · colors · spacing
            </span>
            <b>PROJECT FRAME</b>
            <span>Tool rail · workspace · information pane · tables</span>
            <b>DASHBOARD</b>
            <span>Metrics · project cards · card controls · activity</span>
            <b>TOOLS</b>
            <span>{modules.map((item) => item[2]).join(" · ")}</span>
          </div>
        </section>
      </main>
    </div>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="gm-editor-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step,
  set,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  set: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <span className="gm-range">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => set(Number(event.target.value))}
        />
        <b>{value}</b>
      </span>
    </label>
  );
}
function Toggle({
  label,
  value,
  set,
}: {
  label: string;
  value: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <button
      className={`gm-toggle ${value ? "on" : ""}`}
      onClick={() => set(!value)}
    >
      <i />
      {label}
    </button>
  );
}

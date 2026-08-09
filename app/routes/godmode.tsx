import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useFetcher, useLoaderData, useNavigate } from "react-router";
import {
  defaultLayout,
  normalizeLayout,
  type LayoutConfiguration,
} from "../lib/layout-config";
import {
  activateLayout,
  archiveLayout,
  createEnvironment,
  createInterfaceMapItem,
  duplicateLayout,
  getLayout,
  listInterfaceMap,
  listEnvironments,
  listLayouts,
  restoreLayout,
  saveLayout,
  updateEnvironment,
  updateInterfaceMapItem,
  updateLayoutMetadata,
} from "../lib/layouts.server";
import { modules } from "../lib/navigation";
import { createFeedback } from "../lib/feedback.server";
import {
  activateAiPrompt,
  getAiRuntime,
  listAiPrompts,
  saveAiPromptVersion,
  updateAiConfiguration,
} from "../lib/ai.server";
import type { Route } from "./+types/godmode";

export function meta() {
  return [{ title: "GREENSIGN Godmode · Layout Studio" }];
}
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url),
    layouts = await listLayouts(),
    selected = await getLayout(url.searchParams.get("version"));
  return {
    layouts,
    selected,
    environments: await listEnvironments(),
    interfaceMap: await listInterfaceMap(),
    aiRuntime: await getAiRuntime(),
    aiPrompts: await listAiPrompts(),
  };
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
  if (intent === "feedback") {
    await createFeedback(
      String(form.get("note") ?? ""),
      "/gm_RH",
      JSON.parse(String(form.get("context") ?? "{}")),
    );
    return { ok: true };
  }
  if (intent === "layout-activate")
    await activateLayout(String(form.get("id")));
  else if (intent === "layout-archive")
    await archiveLayout(String(form.get("id")));
  else if (intent === "layout-metadata")
    await updateLayoutMetadata(
      String(form.get("id")),
      String(form.get("family") ?? ""),
      String(form.get("notes") ?? ""),
    );
  else if (intent === "layout-restore") {
    const created = await restoreLayout(String(form.get("id")));
    return { ok: true, createdId: created.id };
  } else if (intent === "layout-duplicate") {
    const created = await duplicateLayout(
      String(form.get("id")),
      String(form.get("name") ?? ""),
    );
    return { ok: true, createdId: created.id };
  } else if (intent === "environment-create") {
    await createEnvironment(stringValues(form));
  } else if (intent === "environment-update")
    await updateEnvironment(String(form.get("id")), stringValues(form));
  else if (intent === "map-create") {
    await createInterfaceMapItem(stringValues(form));
  } else if (intent === "map-update")
    await updateInterfaceMapItem(String(form.get("id")), stringValues(form));
  else if (intent === "ai-setting") {
    const raw = String(form.get("value") ?? "");
    await updateAiConfiguration(
      String(form.get("key")),
      raw === "true" ? true : raw === "false" ? false : raw,
    );
  } else if (intent === "ai-prompt-save") {
    const created = await saveAiPromptVersion({
      key: String(form.get("key")),
      model: String(form.get("model") ?? "gpt-5.6-terra"),
      reasoning: String(form.get("reasoning") ?? "low"),
      instructions: String(form.get("instructions") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
    return { ok: true, createdId: created.id };
  } else if (intent === "ai-prompt-activate")
    await activateAiPrompt(String(form.get("id")));
  else throw new Response("Unsupported Godmode action", { status: 400 });
  return { ok: true };
}

function stringValues(form: FormData) {
  return Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, String(value)]),
  );
}

const fonts = [
  "Inter",
  "Arial",
  "Georgia",
  "Courier New",
  "Trebuchet MS",
  "Verdana",
];
type ColorKey = "accent" | "background" | "panel" | "text" | "muted" | "border";
const colors: [ColorKey, string][] = [
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
  const {
      layouts,
      selected,
      environments,
      interfaceMap,
      aiRuntime,
      aiPrompts,
    } =
      useLoaderData<typeof loader>(),
    fetcher = useFetcher<{ ok: boolean; createdId?: string }>(),
    navigate = useNavigate(),
    [config, setConfig] = useState<LayoutConfiguration>(
      normalizeLayout(selected.configuration),
    ),
    [family, setFamily] = useState(selected.family),
    [notes, setNotes] = useState(""),
    [activePicker, setActivePicker] = useState<string>(),
    [feedbackPoint, setFeedbackPoint] = useState<{ x: number; y: number }>();
  useEffect(() => {
    setConfig(normalizeLayout(selected.configuration));
    setFamily(selected.family);
    setNotes("");
  }, [selected.id]);
  useEffect(() => {
    if (fetcher.data?.createdId)
      navigate(`/gm_RH?version=${fetcher.data.createdId}`);
  }, [fetcher.data, navigate]);
  useEffect(() => {
    function capture(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]"))
        return;
      event.preventDefault();
      setFeedbackPoint({ x: event.clientX, y: event.clientY });
    }
    window.addEventListener("contextmenu", capture);
    return () => window.removeEventListener("contextmenu", capture);
  }, []);
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
          <a href="#ai-control">AI CONTROL</a>
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
            <EditorSection title="SHARED TAGS">
              <div className="gm-tag-editor">
                {config.tags.map((tag, index) => (
                  <div key={`${tag.key}-${index}`}>
                    <input
                      aria-label={`Tag ${index + 1} label`}
                      value={tag.label}
                      onChange={(event) =>
                        update(
                          "tags",
                          config.tags.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  label: event.target.value.toUpperCase(),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label={`Tag ${index + 1} color`}
                      type="color"
                      value={tag.color}
                      onChange={(event) =>
                        update(
                          "tags",
                          config.tags.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, color: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <code>{tag.key}</code>
                    <button
                      className="gm-secondary"
                      onClick={() =>
                        update(
                          "tags",
                          config.tags.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                    >
                      REMOVE
                    </button>
                  </div>
                ))}
                <button
                  className="gm-secondary"
                  onClick={() => {
                    const index = config.tags.length + 1;
                    update("tags", [
                      ...config.tags,
                      {
                        key: `custom-${index}`,
                        label: `CUSTOM ${index}`,
                        color: config.accent,
                      },
                    ]);
                  }}
                >
                  + ADD TAG
                </button>
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
                <PreviewElement
                  id="navigation"
                  label="Navigation"
                  active={activePicker}
                  setActive={setActivePicker}
                  config={config}
                  update={update}
                  className="gm-preview-nav"
                >
                  GREENSIGN <span>Dashboard</span>
                  <span>Projects</span>
                  <button>QUICK ADD</button>
                </PreviewElement>
                <div className="gm-preview-body">
                  <PreviewElement
                    id="heading"
                    label="Heading + text"
                    active={activePicker}
                    setActive={setActivePicker}
                    config={config}
                    update={update}
                  >
                    <small>PROJECT</small>
                    <h2>INTERFACE PREVIEW</h2>
                    {config.showSubtitles && (
                      <p>
                        Click any outlined preview element to edit its colors
                        directly in context.
                      </p>
                    )}
                  </PreviewElement>
                  <div className="gm-preview-cards">
                    {[1, 2, 3].map((item) => (
                      <PreviewElement
                        as="article"
                        id={`card-${item}`}
                        label={`Card ${item}`}
                        key={item}
                        active={activePicker}
                        setActive={setActivePicker}
                        config={config}
                        update={update}
                      >
                        <b>CARD {item}</b>
                        <strong>{item * 12}</strong>
                        <button>OPEN</button>
                      </PreviewElement>
                    ))}
                  </div>
                </div>
              </div>
            </EditorSection>
          </div>
        </div>
        <AiControlPanel
          runtime={aiRuntime}
          prompts={aiPrompts}
          submit={submit}
        />
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
                  <details className="gm-inline-editor">
                    <summary>EDIT VERSION DETAILS</summary>
                    <form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="layout-metadata"
                      />
                      <input type="hidden" name="id" value={item.id} />
                      <label>
                        FAMILY
                        <input name="family" defaultValue={item.family} />
                      </label>
                      <label>
                        NOTES
                        <textarea
                          name="notes"
                          defaultValue={item.notes ?? ""}
                        />
                      </label>
                      <button className="gm-secondary">SAVE DETAILS</button>
                    </form>
                  </details>
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
                  {item.status !== "active" && (
                    <button
                      onClick={() =>
                        submit({ intent: "layout-archive", id: item.id })
                      }
                    >
                      ARCHIVE
                    </button>
                  )}
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
              <form method="post" key={environment.id}>
                <input type="hidden" name="intent" value="environment-update" />
                <input type="hidden" name="id" value={environment.id} />
                <label>
                  NAME
                  <input name="name" defaultValue={environment.name} />
                </label>
                <label>
                  SLUG
                  <input name="slug" defaultValue={environment.slug} />
                </label>
                <label>
                  LABEL
                  <input name="label" defaultValue={environment.label} />
                </label>
                <label>
                  STATUS
                  <select name="status" defaultValue={environment.status}>
                    <option value="active">ACTIVE</option>
                    <option value="preview">PREVIEW</option>
                    <option value="suspended">SUSPENDED</option>
                  </select>
                </label>
                <label>
                  ACCENT
                  <input
                    name="accent"
                    type="color"
                    defaultValue={environment.accent}
                  />
                </label>
                <label>
                  ENVIRONMENT URL
                  <input name="url" defaultValue={environment.url} />
                </label>
                <label>
                  NOTES
                  <textarea
                    name="notes"
                    defaultValue={environment.notes ?? ""}
                  />
                </label>
                <div className="gm-form-actions">
                  <button className="gm-secondary">SAVE ENVIRONMENT</button>
                  <a href={environment.url || "/app/dashboard"}>OPEN →</a>
                </div>
              </form>
            ))}
            <form method="post" className="gm-new-card">
              <input type="hidden" name="intent" value="environment-create" />
              <h3>NEW ENVIRONMENT</h3>
              <label>
                NAME
                <input name="name" required />
              </label>
              <label>
                SLUG
                <input name="slug" required />
              </label>
              <label>
                LABEL
                <input name="label" defaultValue="Preview" />
              </label>
              <label>
                STATUS
                <select name="status" defaultValue="preview">
                  <option value="active">ACTIVE</option>
                  <option value="preview">PREVIEW</option>
                  <option value="suspended">SUSPENDED</option>
                </select>
              </label>
              <label>
                ACCENT
                <input name="accent" type="color" defaultValue="#87ff4f" />
              </label>
              <label>
                ENVIRONMENT URL
                <input name="url" placeholder="https://…" />
              </label>
              <label>
                NOTES
                <textarea name="notes" />
              </label>
              <button className="gm-primary">CREATE ENVIRONMENT</button>
            </form>
          </div>
        </section>
        <section className="gm-library" id="map">
          <div className="gm-section-head">
            <div>
              <span>LAYOUT COVERAGE</span>
              <h2>INTERFACE MAP</h2>
            </div>
          </div>
          <div className="gm-map-editor">
            {interfaceMap.map((item) => (
              <form method="post" key={item.id}>
                <input type="hidden" name="intent" value="map-update" />
                <input type="hidden" name="id" value={item.id} />
                <label>
                  LABEL
                  <input name="label" defaultValue={item.label} />
                </label>
                <label>
                  GROUP
                  <input name="group" defaultValue={item.group} />
                </label>
                <label>
                  REGION
                  <select name="region" defaultValue={item.region}>
                    <option value="topbar">TOP BAR</option>
                    <option value="workspace">WORKSPACE</option>
                    <option value="bottombar">BOTTOM BAR</option>
                    <option value="popover">POPOVER</option>
                    <option value="drawer">DRAWER</option>
                  </select>
                </label>
                <label>
                  ROUTE
                  <input name="route" defaultValue={item.route} />
                </label>
                <label>
                  NOTES
                  <input name="notes" defaultValue={item.notes ?? ""} />
                </label>
                <label className="gm-check">
                  <input
                    name="enabled"
                    type="checkbox"
                    value="true"
                    defaultChecked={item.enabled}
                  />{" "}
                  ENABLED
                </label>
                <div className="gm-form-actions">
                  <button className="gm-secondary">SAVE MAP ITEM</button>
                  <a href={item.route}>OPEN ROUTE →</a>
                </div>
              </form>
            ))}
            <form method="post" className="gm-new-card">
              <input type="hidden" name="intent" value="map-create" />
              <h3>NEW INTERFACE ITEM</h3>
              <label>
                KEY
                <input name="key" required />
              </label>
              <label>
                LABEL
                <input name="label" required />
              </label>
              <label>
                GROUP
                <input name="group" defaultValue="Custom" />
              </label>
              <label>
                REGION
                <select name="region" defaultValue="workspace">
                  <option value="topbar">TOP BAR</option>
                  <option value="workspace">WORKSPACE</option>
                  <option value="bottombar">BOTTOM BAR</option>
                  <option value="popover">POPOVER</option>
                  <option value="drawer">DRAWER</option>
                </select>
              </label>
              <label>
                ROUTE
                <input name="route" defaultValue="/app/dashboard" />
              </label>
              <label>
                NOTES
                <input name="notes" />
              </label>
              <input type="hidden" name="enabled" value="true" />
              <button className="gm-primary">ADD INTERFACE ITEM</button>
            </form>
          </div>
        </section>
      </main>
      {feedbackPoint && (
        <GodmodeFeedback
          point={feedbackPoint}
          close={() => setFeedbackPoint(undefined)}
        />
      )}
    </div>
  );
}
function AiControlPanel({
  runtime,
  prompts,
  submit,
}: {
  runtime: {
    enabled: boolean;
    cloudApproved: boolean;
    keyConfigured: boolean;
    provider: string;
    bulkModel: string;
    reasoningModel: string;
    approvalMode: string;
    externalActions: string;
  };
  prompts: {
    id: string;
    key: string;
    version: number;
    status: string;
    model: string;
    reasoning: string;
    instructions: string;
    notes: string;
    createdAt: Date;
  }[];
  submit: (data: Record<string, string>) => void;
}) {
  const active = prompts.filter((prompt) => prompt.status === "active"),
    archived = prompts.filter((prompt) => prompt.status !== "active");
  return (
    <section className="gm-library gm-ai-control" id="ai-control">
      <div className="gm-section-head">
        <div>
          <span>APPROVAL-FIRST INTELLIGENCE</span>
          <h2>AI CONTROL CENTER</h2>
        </div>
        <b>{runtime.enabled ? "LIVE AI READY" : "OFFLINE MODE"}</b>
      </div>
      <div className="gm-ai-runtime-grid">
        <article className={runtime.enabled ? "ready" : "offline"}>
          <span>PROCESSING STATE</span>
          <h3>{runtime.provider.toUpperCase()}</h3>
          <p>
            Cloud permission: {runtime.cloudApproved ? "approved" : "blocked"}
            <br />
            Server key: {runtime.keyConfigured ? "configured" : "not configured"}
            <br />
            External actions: {runtime.externalActions.toLowerCase()}
          </p>
          <button
            className={runtime.cloudApproved ? "gm-secondary" : "gm-primary"}
            onClick={() =>
              submit({
                intent: "ai-setting",
                key: "ai:cloudApproved",
                value: String(!runtime.cloudApproved),
              })
            }
          >
            {runtime.cloudApproved
              ? "REVOKE CLOUD DOCUMENT APPROVAL"
              : "APPROVE CLOUD DOCUMENT PROCESSING"}
          </button>
          <small>
            Approval only enables requests after OPENAI_API_KEY is securely set
            on the server. Keys are never entered or displayed here.
          </small>
        </article>
        <form method="post">
          <input type="hidden" name="intent" value="ai-setting" />
          <input type="hidden" name="key" value="ai:bulkModel" />
          <span>HIGH-VOLUME MODEL</span>
          <h3>EXTRACTION + CLASSIFICATION</h3>
          <label>
            MODEL ID
            <input name="value" defaultValue={runtime.bulkModel} />
          </label>
          <button className="gm-secondary">SAVE MODEL ROUTE</button>
        </form>
        <form method="post">
          <input type="hidden" name="intent" value="ai-setting" />
          <input type="hidden" name="key" value="ai:reasoningModel" />
          <span>REASONING MODEL</span>
          <h3>SCOPE + COMMERCIAL REVIEW</h3>
          <label>
            MODEL ID
            <input name="value" defaultValue={runtime.reasoningModel} />
          </label>
          <button className="gm-secondary">SAVE MODEL ROUTE</button>
        </form>
      </div>
      <div className="gm-ai-policy">
        <b>IMMUTABLE SAFETY BOUNDARY</b>
        <span>{runtime.approvalMode}</span>
        <span>
          No generated content can send, publish, delete, commit funds, or alter
          approved values.
        </span>
      </div>
      <div className="gm-ai-prompts">
        {active.map((prompt) => (
          <form method="post" key={prompt.id}>
            <input type="hidden" name="intent" value="ai-prompt-save" />
            <input type="hidden" name="key" value={prompt.key} />
            <header>
              <div>
                <span>{prompt.key.replaceAll("-", " ")}</span>
                <h3>PROMPT V{prompt.version}</h3>
              </div>
              <b>ACTIVE</b>
            </header>
            <div className="gm-ai-prompt-meta">
              <label>
                MODEL
                <select name="model" defaultValue={prompt.model}>
                  <option value="gpt-5.6-luna">GPT-5.6 LUNA</option>
                  <option value="gpt-5.6-terra">GPT-5.6 TERRA</option>
                  <option value="gpt-5.6-sol">GPT-5.6 SOL</option>
                </select>
              </label>
              <label>
                REASONING
                <select name="reasoning" defaultValue={prompt.reasoning}>
                  <option value="none">NONE</option>
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              </label>
            </div>
            <label>
              INSTRUCTIONS
              <textarea
                name="instructions"
                rows={7}
                defaultValue={prompt.instructions}
              />
            </label>
            <label>
              VERSION NOTES
              <input
                name="notes"
                defaultValue={prompt.notes}
                placeholder="Why this prompt changed"
              />
            </label>
            <button className="gm-primary">SAVE AS NEW ACTIVE VERSION</button>
          </form>
        ))}
      </div>
      {archived.length > 0 && (
        <details className="gm-ai-history">
          <summary>{archived.length} ARCHIVED PROMPT VERSIONS</summary>
          <div>
            {archived.map((prompt) => (
              <article key={prompt.id}>
                <div>
                  <b>
                    {prompt.key.toUpperCase()} · V{prompt.version}
                  </b>
                  <span>
                    {prompt.model} · {prompt.reasoning} ·{" "}
                    {utcTimestamp(prompt.createdAt)}
                  </span>
                </div>
                <button
                  className="gm-secondary"
                  onClick={() =>
                    submit({ intent: "ai-prompt-activate", id: prompt.id })
                  }
                >
                  ACTIVATE VERSION
                </button>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function GodmodeFeedback({
  point,
  close,
}: {
  point: { x: number; y: number };
  close: () => void;
}) {
  const fetcher = useFetcher(),
    [note, setNote] = useState("");
  return (
    <form
      className="feedback-composer gm-feedback"
      style={{
        left: Math.max(8, Math.min(point.x, window.innerWidth - 360)),
        top: Math.max(8, Math.min(point.y, window.innerHeight - 220)),
      }}
      onSubmit={(event) => {
        event.preventDefault();
        fetcher.submit(
          {
            intent: "feedback",
            note,
            context: JSON.stringify({
              viewport: `${window.innerWidth}x${window.innerHeight}`,
              url: window.location.href,
              surface: "Godmode",
            }),
          },
          { method: "post" },
        );
        close();
      }}
    >
      <div className="eyebrow">FLAG GODMODE ITEM</div>
      <textarea
        autoFocus
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Describe the interface change…"
      />
      <div className="feedback-meta">
        Godmode route, viewport, and timestamp will be attached.
      </div>
      <div className="dialog-actions">
        <button type="button" className="gm-secondary" onClick={close}>
          CANCEL
        </button>
        <button className="gm-primary" disabled={!note.trim()}>
          SAVE NOTE
        </button>
      </div>
    </form>
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
function PreviewElement({
  as = "div",
  id,
  label,
  active,
  setActive,
  config,
  update,
  className,
  children,
}: {
  as?: "div" | "article";
  id: string;
  label: string;
  active?: string;
  setActive: (value?: string) => void;
  config: LayoutConfiguration;
  update: (key: ColorKey, value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const Tag = as;
  return (
    <Tag
      className={`${className ?? ""} gm-preview-editable ${active === id ? "selected" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        setActive(id);
      }}
    >
      <span className="gm-preview-label">EDIT {label.toUpperCase()}</span>
      {children}
      {active === id && (
        <div
          className="gm-inline-palette"
          onClick={(event) => event.stopPropagation()}
        >
          <header>
            <b>{label.toUpperCase()}</b>
            <button type="button" onClick={() => setActive(undefined)}>
              ×
            </button>
          </header>
          {colors.map(([key, colorLabel]) => (
            <label key={key}>
              <input
                type="color"
                value={String(config[key])}
                onChange={(event) => update(key, event.target.value as never)}
              />
              <span>{colorLabel}</span>
              <code>{String(config[key])}</code>
            </label>
          ))}
        </div>
      )}
    </Tag>
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

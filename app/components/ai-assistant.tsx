import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";
import {
  aiCapabilityCatalog,
  type AiAssistOutput,
} from "../lib/ai-types";

type Runtime = {
  enabled: boolean;
  cloudApproved: boolean;
  keyConfigured: boolean;
  provider: string;
  bulkModel: string;
  reasoningModel: string;
  approvalMode: string;
  externalActions: string;
};

type Suggestion = {
  id: string;
  projectId: string | null;
  capability: string;
  title: string;
  summary: string;
  confidence: number;
  payload: unknown;
  evidence: unknown;
  status: string;
  createdAt: Date | string;
};

type Job = {
  id: string;
  projectId: string | null;
  capability: string;
  status: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  createdAt: Date | string;
};

export function AiAssistant({
  open,
  close,
  capability,
  projectId,
  projectLabel,
  runtime,
  suggestions,
  jobs,
  initialInstruction,
}: {
  open: boolean;
  close: () => void;
  capability: string;
  projectId?: string;
  projectLabel?: string;
  runtime: Runtime;
  suggestions: Suggestion[];
  jobs: Job[];
  initialInstruction?: string;
}) {
  const fetcher = useFetcher<{
      ok: boolean;
      aiSuggestionId?: string;
      message?: string;
    }>(),
    [instruction, setInstruction] = useState(initialInstruction ?? ""),
    definition =
      aiCapabilityCatalog.find((item) => item[0] === capability) ??
      aiCapabilityCatalog.find((item) => item[0] === "project-intelligence")!;
  useEffect(() => {
    if (initialInstruction) setInstruction(initialInstruction);
  }, [initialInstruction]);
  const relevantSuggestions = useMemo(
      () =>
        suggestions
          .filter((item) =>
            projectId
              ? item.projectId === projectId
              : !item.projectId || item.capability === capability,
          )
          .filter(
            (item) =>
              item.capability === capability || item.capability === "command",
          )
          .slice(0, 12),
      [suggestions, projectId, capability],
    ),
    latestJob = jobs.find(
      (job) =>
        job.capability === capability &&
        (projectId ? job.projectId === projectId : true),
    ),
    busy = fetcher.state !== "idle";
  if (!open) return null;
  function run(event: React.FormEvent) {
    event.preventDefault();
    fetcher.submit(
      {
        intent: "ai-run",
        capability,
        projectId: projectId ?? "",
        instruction:
          instruction.trim() ||
          `Review ${projectLabel ?? "this workspace"} and prepare the most useful ${definition[1].toLowerCase()} draft.`,
      },
      { method: "post" },
    );
  }
  return (
    <div className="ai-backdrop" role="presentation" onMouseDown={close}>
      <aside
        className="ai-drawer"
        aria-label="GREENSIGN AI assistant"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ai-drawer-head">
          <div>
            <span>GREENSIGN COPILOT</span>
            <h2>{definition[1].toUpperCase()}</h2>
            <p>{projectLabel ?? "Company workspace"}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close AI assistant">
            ×
          </button>
        </header>

        <div className={`ai-runtime ${runtime.enabled ? "live" : "offline"}`}>
          <b>{runtime.enabled ? "LIVE AI READY" : "OFFLINE REVIEW MODE"}</b>
          <span>
            {runtime.enabled
              ? `${runtime.provider} · ${definition[2]}`
              : !runtime.cloudApproved
                ? "Cloud document processing is not approved"
                : "OPENAI_API_KEY is not configured"}
          </span>
          <small>{runtime.approvalMode}. External actions are blocked.</small>
        </div>

        <form className="ai-request" onSubmit={run}>
          <label>
            WHAT SHOULD THE COPILOT PREPARE?
            <textarea
              autoFocus
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={`Example: review the scope and prepare a bid package for ${projectLabel ?? "this project"}`}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "REVIEWING LINKED DATA…" : "GENERATE REVIEW DRAFT"}
          </button>
          <small>
            Source documents are treated as untrusted evidence. Generated work
            cannot leave GREENSIGN without a separate approval.
          </small>
        </form>

        {latestJob && (
          <div className="ai-job-summary">
            <span>LATEST RUN</span>
            <b>{latestJob.status.toUpperCase()}</b>
            <small>
              {latestJob.provider} · {latestJob.model || "offline"} ·{" "}
              {latestJob.latencyMs} ms ·{" "}
              {latestJob.inputTokens + latestJob.outputTokens} tokens
            </small>
          </div>
        )}

        <section className="ai-suggestions">
          <div className="ai-section-head">
            <div>
              <span>APPROVAL QUEUE</span>
              <h3>GENERATED DRAFTS</h3>
            </div>
            <b>{relevantSuggestions.length}</b>
          </div>
          {relevantSuggestions.map((suggestion) => {
            const output = suggestion.payload as AiAssistOutput;
            return (
              <article className={`ai-suggestion ${suggestion.status}`} key={suggestion.id}>
                <div className="ai-suggestion-title">
                  <div>
                    <span>{suggestion.status.toUpperCase()}</span>
                    <h4>{suggestion.title}</h4>
                  </div>
                  <b>{suggestion.confidence}%</b>
                </div>
                <p>{suggestion.summary}</p>
                <details>
                  <summary>REVIEW RECOMMENDATIONS AND DRAFT</summary>
                  <div className="ai-recommendations">
                    {(output.recommendations ?? []).map((item, index) => (
                      <div key={`${item.title}-${index}`}>
                        <span className={`priority ${item.priority}`}>
                          {item.priority}
                        </span>
                        <b>{item.title}</b>
                        <p>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  {output.draft && (
                    <div className="ai-draft-preview">
                      <span>DRAFT RECORD</span>
                      <b>{output.draft.title}</b>
                      <p>{output.draft.detail}</p>
                      <small>
                        {output.draft.toolKey.toUpperCase()} ·{" "}
                        {output.draft.scopeIds.length} scopes ·{" "}
                        {output.draft.partnerIds.length} partners ·{" "}
                        {output.draft.blocks.length} blocks
                      </small>
                    </div>
                  )}
                  {(output.evidence ?? []).length > 0 && (
                    <div className="ai-evidence">
                      <span>SOURCE EVIDENCE</span>
                      {output.evidence.map((item, index) => (
                        <div key={`${item.documentId}-${index}`}>
                          {item.documentId ? (
                            <Link
                              to={`/resource/document/${item.documentId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.fileName} · {item.page}
                            </Link>
                          ) : (
                            <b>{item.fileName}</b>
                          )}
                          <p>{item.quote || "No source excerpt was returned."}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
                {suggestion.status === "pending" && (
                  <div className="ai-actions">
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        fetcher.submit(
                          {
                            intent: "ai-review",
                            id: suggestion.id,
                            status: "rejected",
                          },
                          { method: "post" },
                        )
                      }
                    >
                      REJECT
                    </button>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        fetcher.submit(
                          { intent: "ai-apply", id: suggestion.id },
                          { method: "post" },
                        )
                      }
                    >
                      ACCEPT AS DRAFT
                    </button>
                  </div>
                )}
                {suggestion.status === "accepted" && (
                  <div className="ai-applied">ACCEPTED · WORKFLOW DRAFT CREATED</div>
                )}
              </article>
            );
          })}
          {!relevantSuggestions.length && (
            <div className="ai-empty">
              <b>NO GENERATED DRAFTS YET</b>
              <span>Ask the copilot to review the current workflow.</span>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

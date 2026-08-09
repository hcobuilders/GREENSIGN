export type AiEvidence = {
  documentId: string;
  fileName: string;
  page: string;
  quote: string;
};

export type AiDraft = {
  toolKey: string;
  type: string;
  title: string;
  detail: string;
  dueDate: string;
  total: number;
  scopeIds: string[];
  partnerIds: string[];
  blocks: string[];
  fields: { key: string; value: string }[];
};

export type AiAssistOutput = {
  title: string;
  summary: string;
  confidence: number;
  recommendations: {
    title: string;
    detail: string;
    priority: "low" | "medium" | "high";
  }[];
  evidence: AiEvidence[];
  draft: AiDraft;
};

export const aiCapabilityCatalog = [
  ["project-intake", "Project intake review", "gpt-5.6-luna"],
  ["project-intelligence", "Project intelligence", "gpt-5.6-terra"],
  ["subcontractors", "Trade partner matching", "gpt-5.6-luna"],
  ["solicitations", "Bid package builder", "gpt-5.6-terra"],
  ["proposal-designer", "Proposal copilot", "gpt-5.6-terra"],
  ["rfis", "RFI drafting", "gpt-5.6-terra"],
  ["contracts", "Commitment review", "gpt-5.6-terra"],
  ["risk", "Scope and risk review", "gpt-5.6-terra"],
  ["submittals", "Submittal log builder", "gpt-5.6-luna"],
  ["procurement", "Procurement review", "gpt-5.6-terra"],
  ["schedule", "Schedule reasoning", "gpt-5.6-terra"],
  ["closeout", "Closeout readiness", "gpt-5.6-luna"],
  ["change-risk", "Change event review", "gpt-5.6-terra"],
  ["command", "Natural language command planner", "gpt-5.6-luna"],
] as const;

import { describe, expect, it } from "vitest";
import { aiCapabilityCatalog } from "./ai-types";
import { aiOutputSchema, buildOfflineSuggestion } from "./ai.server";

const context = {
  project: {
    id: "project-1",
    companyId: "company-1",
    code: "26-100",
    name: "AI Test Project",
    status: "planning",
    phase: "preconstruction",
    owner: "Estimator",
    startDate: "2026-09-01",
    dueDate: "2026-08-28",
    completionDate: null,
    data: { estimatedValue: 2500000 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  documents: [
    {
      id: "document-1",
      fileName: "specifications.pdf",
      documentType: "specification",
      extractedText: "DIVISION 03 - CONCRETE. Provide cast-in-place concrete.",
      parsedData: {},
      status: "parsed",
    },
  ],
  records: [
    {
      id: "scope-1",
      companyId: "company-1",
      projectId: "project-1",
      toolKey: "risk",
      type: "scope-item",
      state: "draft",
      revision: 1,
      payload: { title: "03 00 00 Concrete" },
      createdAt: new Date(),
    },
  ],
  partners: [
    {
      id: "partner-1",
      name: "Concrete Partner",
      status: "qualified",
      primaryTrade: "Concrete",
      licenseState: "FL",
      prequalification: {},
    },
  ],
};

describe("GREENSIGN AI foundation", () => {
  it("covers every construction workflow with a client-visible capability", () => {
    expect(aiCapabilityCatalog.map((item) => item[0])).toEqual(
      expect.arrayContaining([
        "project-intake",
        "project-intelligence",
        "subcontractors",
        "solicitations",
        "proposal-designer",
        "rfis",
        "contracts",
        "risk",
        "submittals",
        "procurement",
        "schedule",
        "closeout",
        "change-risk",
        "command",
      ]),
    );
  });

  it("builds a linked approval draft when cloud AI is unavailable", () => {
    const suggestion = buildOfflineSuggestion(
      "solicitations",
      "Prepare a concrete bid package",
      context as never,
    );
    expect(suggestion.draft.toolKey).toBe("solicitations");
    expect(suggestion.draft.type).toBe("bid-package");
    expect(suggestion.draft.scopeIds).toEqual(["scope-1"]);
    expect(suggestion.draft.partnerIds).toEqual(["partner-1"]);
    expect(suggestion.evidence[0]).toMatchObject({
      documentId: "document-1",
      fileName: "specifications.pdf",
    });
    expect(suggestion.summary).toContain("offline assistant");
  });

  it("uses a strict structured output contract", () => {
    expect(aiOutputSchema.additionalProperties).toBe(false);
    expect(aiOutputSchema.required).toContain("draft");
    expect(aiOutputSchema.properties.draft.additionalProperties).toBe(false);
  });
});

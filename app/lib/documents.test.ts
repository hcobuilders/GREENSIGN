import { describe, expect, it } from "vitest";
import { parseProjectText } from "./documents.server";
import {
  MAX_PROJECT_DOCUMENT_BYTES,
  MAX_PROJECT_DOCUMENT_MB,
  projectDocumentLimitError,
} from "./document-limits";

describe("project document parsing", () => {
  it("uses a shared 100 MB per-file limit", () => {
    expect(MAX_PROJECT_DOCUMENT_MB).toBe(100);
    expect(MAX_PROJECT_DOCUMENT_BYTES).toBe(104_857_600);
    expect(projectDocumentLimitError("plans.pdf")).toBe(
      "plans.pdf exceeds the 100 MB per-file limit",
    );
  });

  it("extracts confirmation fields, ISO dates, values, and division scopes", () => {
    const parsed = parseProjectText(
      [
        "PROJECT NUMBER: 26-099",
        "PROJECT NAME: Test Project",
        "OWNER: HCO Builders",
        "ARCHITECT: Test Studio",
        "ADDRESS: 123 Main Street, Tampa, FL 33602",
        "BID DUE: 2026-09-30",
        "ESTIMATED VALUE: $2,750,000",
        "DIVISION 03 - CONCRETE",
        "09 29 00 Gypsum Board",
      ].join("\n"),
      "test-specifications.txt",
    );

    expect(parsed.projectNumber).toBe("26-099");
    expect(parsed.projectName).toBe("Test Project");
    expect(parsed.bidDueDate).toBe("2026-09-30");
    expect(parsed.estimatedValue).toBe(2_750_000);
    expect(parsed.scopes.map((scope) => scope.code)).toEqual([
      "03 00 00",
      "09 29 00",
    ]);
  });
});

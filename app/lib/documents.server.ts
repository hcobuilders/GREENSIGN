import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "./db.server";
import { projectDocuments, projects, workflowRecords } from "./schema.server";
import { ensureFoundationCompany, getProject } from "./projects.server";

export type ParsedScope = { code: string; title: string; source: string };
export type ParsedProjectData = {
  projectNumber?: string;
  projectName?: string;
  projectOwner?: string;
  architect?: string;
  address?: string;
  bidDueDate?: string;
  startDate?: string;
  completionDate?: string;
  estimatedValue?: number;
  scopes: ParsedScope[];
  confidence: number;
  sourceFiles: string[];
};

const textMimeTypes = new Set([
  "text/plain",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);

async function extractText(file: File, buffer: ArrayBuffer) {
  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const document = await getDocument({ data: new Uint8Array(buffer) })
      .promise;
    const pages: string[] = [];
    for (
      let pageNumber = 1;
      pageNumber <= Math.min(document.numPages, 250);
      pageNumber++
    ) {
      const page = await document.getPage(pageNumber),
        content = await page.getTextContent();
      pages.push(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
      );
    }
    return pages.join("\n").slice(0, 500000);
  }
  if (
    textMimeTypes.has(file.type) ||
    /\.(txt|csv|json|xml|md)$/i.test(file.name)
  )
    return new TextDecoder().decode(buffer).slice(0, 500000);
  return `Document: ${file.name}\nNo embedded text was available. Use the confirmation fields to complete project information.`;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const match = value.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!match) return undefined;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

export function parseProjectText(
  text: string,
  fileName: string,
): ParsedProjectData {
  const cleaned = text.replace(/\u0000/g, " "),
    lines = cleaned
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  const projectNumber = firstMatch(cleaned, [
    /project\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9-]{3,20})/i,
    /\b(\d{2}-\d{3})\b/,
  ]);
  const projectName = firstMatch(cleaned, [
    /project\s*name\s*[:#-]?\s*([^\n\r]{3,100})/i,
    /title\s*[:#-]?\s*([^\n\r]{3,100})/i,
  ]);
  const projectOwner = firstMatch(cleaned, [
    /(?:project\s*)?owner\s*[:#-]?\s*([^\n\r]{3,100})/i,
  ]);
  const architect = firstMatch(cleaned, [
    /architect\s*[:#-]?\s*([^\n\r]{3,100})/i,
    /design\s*professional\s*[:#-]?\s*([^\n\r]{3,100})/i,
  ]);
  const address = firstMatch(cleaned, [
    /(\d{1,6}\s+[A-Za-z0-9 .'-]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)[^\n\r]{0,80}\b[A-Z]{2}\s+\d{5}(?:-\d{4})?)/i,
  ]);
  const bidDueDate = normalizeDate(
    firstMatch(cleaned, [
      /(?:bid|proposal)\s*(?:due|date)\s*[:#-]?\s*((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}))/i,
    ]),
  );
  const startDate = normalizeDate(
    firstMatch(cleaned, [
      /(?:construction\s*)?start\s*(?:date)?\s*[:#-]?\s*((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}))/i,
    ]),
  );
  const completionDate = normalizeDate(
    firstMatch(cleaned, [
      /(?:substantial\s*)?completion\s*(?:date)?\s*[:#-]?\s*((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}))/i,
    ]),
  );
  const amount = firstMatch(cleaned, [
    /(?:estimated|construction|project)\s*(?:value|cost)\s*[:#-]?\s*\$?([\d,]+(?:\.\d{2})?)/i,
  ]);
  const scopes: ParsedScope[] = [];
  for (const line of lines) {
    const match = line.match(/\b(\d{2})\s?(\d{2})\s?(\d{2})\s+(.{3,100})/);
    if (match) {
      const code = `${match[1]} ${match[2]} ${match[3]}`,
        title = match[4].replace(/\s{2,}/g, " ").trim();
      if (!scopes.some((scope) => scope.code === code))
        scopes.push({ code, title, source: fileName });
    } else {
      const division = line.match(
        /^(?:DIVISION\s+)?(\d{2})\s*(?:[-–—:]\s*|\s+)(.{3,100})$/i,
      );
      if (division) {
        const code = `${division[1]} 00 00`,
          title = division[2].replace(/\s{2,}/g, " ").trim();
        if (!scopes.some((scope) => scope.code === code))
          scopes.push({ code, title, source: fileName });
      }
    }
    if (scopes.length >= 20) break;
  }
  const values = [
    projectNumber,
    projectName,
    projectOwner,
    architect,
    address,
    bidDueDate,
    startDate,
    completionDate,
    amount,
  ];
  return {
    projectNumber,
    projectName,
    projectOwner,
    architect,
    address,
    bidDueDate,
    startDate,
    completionDate,
    estimatedValue: amount ? Number(amount.replace(/,/g, "")) : undefined,
    scopes,
    confidence: Math.min(
      98,
      35 + values.filter(Boolean).length * 7 + Math.min(scopes.length, 5) * 3,
    ),
    sourceFiles: [fileName],
  };
}

function mergeParsed(items: ParsedProjectData[]): ParsedProjectData {
  const scopes = items
    .flatMap((item) => item.scopes)
    .filter(
      (scope, index, array) =>
        array.findIndex((candidate) => candidate.code === scope.code) === index,
    );
  const pick = <K extends keyof ParsedProjectData>(key: K) =>
    items.find((item) => item[key])?.[key];
  return {
    projectNumber: pick("projectNumber") as string | undefined,
    projectName: pick("projectName") as string | undefined,
    projectOwner: pick("projectOwner") as string | undefined,
    architect: pick("architect") as string | undefined,
    address: pick("address") as string | undefined,
    bidDueDate: pick("bidDueDate") as string | undefined,
    startDate: pick("startDate") as string | undefined,
    completionDate: pick("completionDate") as string | undefined,
    estimatedValue: pick("estimatedValue") as number | undefined,
    scopes,
    confidence: items.length
      ? Math.round(
          items.reduce((sum, item) => sum + item.confidence, 0) / items.length,
        )
      : 0,
    sourceFiles: items.flatMap((item) => item.sourceFiles),
  };
}

export async function ingestProjectDocuments(projectId: string, files: File[]) {
  const project = await getProject(projectId);
  if (!project) throw new Response("Project not found", { status: 404 });
  const company = await ensureFoundationCompany(),
    db = getDatabase(),
    parsedItems: ParsedProjectData[] = [];
  for (const file of files.filter((file) => file.size > 0)) {
    if (file.size > 25 * 1024 * 1024)
      throw new Response(`${file.name} exceeds the 25 MB prototype limit`, {
        status: 400,
      });
    const buffer = await file.arrayBuffer(),
      text = await extractText(file, buffer),
      parsed = parseProjectText(text, file.name);
    parsedItems.push(parsed);
    await db.insert(projectDocuments).values({
      companyId: company.id,
      projectId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      documentType: /spec/i.test(file.name)
        ? "specification"
        : /draw|plan|sheet/i.test(file.name)
          ? "drawing"
          : "project-document",
      content: Buffer.from(buffer).toString("base64"),
      extractedText: text,
      parsedData: parsed,
      status: "parsed",
    });
  }
  const currentData = (project.data ?? {}) as Record<string, unknown>,
    currentIntake = (currentData.intake ?? {}) as Record<string, unknown>,
    previousParsed = currentIntake.parsed as ParsedProjectData | undefined,
    merged = mergeParsed([
      ...(previousParsed?.sourceFiles?.length ? [previousParsed] : []),
      ...parsedItems,
    ]),
    data = {
      ...currentData,
      intake: {
        status: "awaiting-confirmation",
        parsed: merged,
        updatedAt: new Date().toISOString(),
      },
      location: merged.address || currentData.location || "",
      projectOwner: merged.projectOwner || currentData.projectOwner || "",
      architect: merged.architect || currentData.architect || "",
      estimatedValue: merged.estimatedValue || currentData.estimatedValue || 0,
    };
  await db
    .update(projects)
    .set({
      code: merged.projectNumber || project.code,
      name: merged.projectName || project.name,
      status: "draft",
      phase: "document review",
      dueDate: merged.bidDueDate || project.dueDate,
      startDate: merged.startDate || project.startDate,
      completionDate: merged.completionDate || project.completionDate,
      data,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
  return merged;
}

export async function listProjectDocuments() {
  const company = await ensureFoundationCompany();
  return getDatabase()
    .select({
      id: projectDocuments.id,
      projectId: projectDocuments.projectId,
      fileName: projectDocuments.fileName,
      mimeType: projectDocuments.mimeType,
      size: projectDocuments.size,
      documentType: projectDocuments.documentType,
      extractedText: projectDocuments.extractedText,
      parsedData: projectDocuments.parsedData,
      status: projectDocuments.status,
      createdAt: projectDocuments.createdAt,
    })
    .from(projectDocuments)
    .where(eq(projectDocuments.companyId, company.id))
    .orderBy(asc(projectDocuments.createdAt));
}

export async function getProjectDocumentContent(id: string) {
  const company = await ensureFoundationCompany(),
    [document] = await getDatabase()
      .select()
      .from(projectDocuments)
      .where(
        and(
          eq(projectDocuments.id, id),
          eq(projectDocuments.companyId, company.id),
        ),
      )
      .limit(1);
  return document;
}

export async function confirmProjectIntake(
  projectId: string,
  values: Record<string, unknown>,
) {
  const project = await getProject(projectId);
  if (!project) throw new Response("Project not found", { status: 404 });
  const company = await ensureFoundationCompany(),
    db = getDatabase(),
    currentData = (project.data ?? {}) as Record<string, unknown>,
    rawAddress = values.address,
    structuredAddress =
      rawAddress && typeof rawAddress === "object"
        ? (rawAddress as Record<string, unknown>)
        : {
            formatted: String(rawAddress ?? currentData.location ?? ""),
            street: "",
            city: "",
            state: "",
            zip: "",
          },
    address = String(structuredAddress.formatted ?? currentData.location ?? ""),
    scopes = Array.isArray(values.scopes)
      ? (values.scopes as ParsedScope[])
      : [];
  await db
    .update(projects)
    .set({
      code: String(values.code || project.code),
      name: String(values.name || project.name),
      status: "planning",
      phase: "preconstruction",
      owner: String(values.owner || project.owner),
      startDate: String(values.startDate || "") || null,
      dueDate: String(values.dueDate || "") || null,
      completionDate: String(values.completionDate || "") || null,
      data: {
        ...currentData,
        location: address,
        address: structuredAddress,
        projectOwner: String(
          values.projectOwner ?? currentData.projectOwner ?? "",
        ),
        architect: String(values.architect ?? currentData.architect ?? ""),
        estimatedValue: Number(
          values.estimatedValue ?? currentData.estimatedValue ?? 0,
        ),
        intake: {
          ...((currentData.intake as Record<string, unknown>) ?? {}),
          status: "confirmed",
          confirmedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
  await db
    .update(projectDocuments)
    .set({ status: "confirmed" })
    .where(eq(projectDocuments.projectId, projectId));
  const existing = await db
    .select()
    .from(workflowRecords)
    .where(
      and(
        eq(workflowRecords.projectId, projectId),
        eq(workflowRecords.toolKey, "risk"),
      ),
    );
  const existingCodes = new Set(
    existing.map((record) =>
      String((record.payload as Record<string, unknown>).code ?? ""),
    ),
  );
  const additions = scopes.filter((scope) => !existingCodes.has(scope.code));
  if (additions.length)
    await db.insert(workflowRecords).values(
      additions.map((scope) => ({
        companyId: company.id,
        projectId,
        toolKey: "risk",
        type: "scope-item",
        state: "draft",
        payload: {
          title: `${scope.code} ${scope.title}`,
          detail: `Parsed from ${scope.source}`,
          code: scope.code,
          sourceDocument: scope.source,
        },
      })),
    );
}

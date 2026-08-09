import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "./db.server";
import { companies, feedbackItems } from "./schema.server";

async function companyId() {
  const db = getDatabase();
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, "hco-builders"))
    .limit(1);
  if (!company) throw new Response("Company not found", { status: 404 });
  return company.id;
}

export async function listFeedback() {
  const db = getDatabase(),
    id = await companyId();
  return db
    .select()
    .from(feedbackItems)
    .where(eq(feedbackItems.companyId, id))
    .orderBy(desc(feedbackItems.createdAt));
}

export async function createFeedback(
  note: string,
  page: string,
  context: Record<string, unknown>,
) {
  if (!note.trim())
    throw new Response("Feedback note is required", { status: 400 });
  const db = getDatabase(),
    id = await companyId();
  await db
    .insert(feedbackItems)
    .values({ companyId: id, note: note.trim(), page, context });
}

export async function updateFeedbackStatus(
  itemId: string,
  status: "flagged" | "implemented",
) {
  const db = getDatabase(),
    id = await companyId();
  await db
    .update(feedbackItems)
    .set({ status })
    .where(and(eq(feedbackItems.id, itemId), eq(feedbackItems.companyId, id)));
}

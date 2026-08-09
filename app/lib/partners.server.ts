import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "./db.server";
import { tradePartners } from "./schema.server";
import { ensureFoundationCompany } from "./projects.server";

const foundationPartners = [
  {
    name: "Apex Electrical",
    status: "qualified",
    primaryTrade: "Electrical",
    email: "estimating@apexe.com",
    phone: "813-555-0124",
    licenseNumber: "EC13011842",
    licenseState: "FL",
    licenseExpires: "2027-06-30",
    address: {
      formatted: "4010 N Lois Ave, Tampa, FL 33614",
      street: "4010 N Lois Ave",
      city: "Tampa",
      state: "FL",
      zip: "33614",
    },
    prequalification: {
      bondingCapacity: 12000000,
      safetyRating: "A",
      insuranceStatus: "current",
      approvedLimit: 5000000,
    },
    pastProjects: ["PHSC Science Lab", "Oakfield Trails Phase 1"],
    notes: "Preferred electrical bidder.",
  },
  {
    name: "Suncoast Mechanical",
    status: "review due",
    primaryTrade: "HVAC",
    email: "bids@suncoastmech.com",
    phone: "727-555-0188",
    licenseNumber: "CMC1250941",
    licenseState: "FL",
    licenseExpires: "2026-09-15",
    address: {
      formatted: "2250 34th St N, St. Petersburg, FL 33713",
      street: "2250 34th St N",
      city: "St. Petersburg",
      state: "FL",
      zip: "33713",
    },
    prequalification: {
      bondingCapacity: 8500000,
      safetyRating: "B",
      insuranceStatus: "review due",
      approvedLimit: 3500000,
    },
    pastProjects: ["JHACH Central Plant"],
    notes: "Insurance renewal required before award.",
  },
  {
    name: "Gulf Coast Interiors",
    status: "qualified",
    primaryTrade: "Drywall",
    email: "estimating@gci.build",
    phone: "813-555-0151",
    licenseNumber: "CGC1531022",
    licenseState: "FL",
    licenseExpires: "2027-02-28",
    address: {
      formatted: "1720 E 7th Ave, Tampa, FL 33605",
      street: "1720 E 7th Ave",
      city: "Tampa",
      state: "FL",
      zip: "33605",
    },
    prequalification: {
      bondingCapacity: 6000000,
      safetyRating: "A",
      insuranceStatus: "current",
      approvedLimit: 2500000,
    },
    pastProjects: ["Harvest Club", "K-Bar Ranch"],
    notes: "Strong healthcare interiors experience.",
  },
];

async function ensurePartners() {
  const db = getDatabase(),
    company = await ensureFoundationCompany(),
    rows = await db
      .select()
      .from(tradePartners)
      .where(eq(tradePartners.companyId, company.id))
      .limit(1);
  if (!rows.length)
    await db.insert(tradePartners).values(
      foundationPartners.map((partner) => ({
        ...partner,
        companyId: company.id,
      })),
    );
  return company;
}
export async function listTradePartners() {
  const company = await ensurePartners();
  return getDatabase()
    .select()
    .from(tradePartners)
    .where(eq(tradePartners.companyId, company.id))
    .orderBy(asc(tradePartners.name));
}
export async function getTradePartner(id: string) {
  const company = await ensurePartners();
  const [partner] = await getDatabase()
    .select()
    .from(tradePartners)
    .where(
      and(eq(tradePartners.id, id), eq(tradePartners.companyId, company.id)),
    )
    .limit(1);
  return partner;
}
const json = (value: FormDataEntryValue | null, fallback: unknown) => {
  try {
    return JSON.parse(String(value ?? ""));
  } catch {
    return fallback;
  }
};
export async function createTradePartner(form: FormData) {
  const company = await ensurePartners(),
    [created] = await getDatabase()
      .insert(tradePartners)
      .values({
        companyId: company.id,
        name: String(form.get("name") || "New trade partner"),
        status: String(form.get("status") || "review due"),
        primaryTrade: String(form.get("primaryTrade") || "Unassigned"),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
        licenseNumber: String(form.get("licenseNumber") || ""),
        licenseState: String(form.get("licenseState") || ""),
        licenseExpires: String(form.get("licenseExpires") || "") || null,
        address: json(form.get("address"), {}),
        prequalification: json(form.get("prequalification"), {}),
        pastProjects: json(form.get("pastProjects"), []),
        notes: String(form.get("notes") || ""),
      })
      .returning();
  return created;
}
export async function updateTradePartner(
  id: string,
  patch: Record<string, unknown>,
) {
  const company = await ensurePartners(),
    allowed = new Set([
      "name",
      "status",
      "primaryTrade",
      "email",
      "phone",
      "licenseNumber",
      "licenseState",
      "licenseExpires",
      "address",
      "prequalification",
      "pastProjects",
      "notes",
    ]),
    safe = Object.fromEntries(
      Object.entries(patch).filter(([key]) => allowed.has(key)),
    );
  await getDatabase()
    .update(tradePartners)
    .set({ ...safe, updatedAt: new Date() })
    .where(
      and(eq(tradePartners.id, id), eq(tradePartners.companyId, company.id)),
    );
}

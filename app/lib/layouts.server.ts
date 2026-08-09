import { asc, desc, eq, max } from "drizzle-orm";
import { getDatabase } from "./db.server";
import {
  interfaceMapItems,
  layoutVersions,
  managedEnvironments,
} from "./schema.server";
import {
  defaultLayout,
  normalizeLayout,
  type LayoutConfiguration,
} from "./layout-config";
import { globalLinks, modules, settingsLinks } from "./navigation";

async function ensureDefault() {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(layoutVersions)
    .orderBy(asc(layoutVersions.createdAt))
    .limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(layoutVersions)
    .values({
      family: "GREENSIGN Default",
      version: 1,
      status: "active",
      configuration: defaultLayout,
      notes: "Foundation layout",
    })
    .returning();
  return created;
}
export async function listLayouts() {
  await ensureDefault();
  return getDatabase()
    .select()
    .from(layoutVersions)
    .orderBy(desc(layoutVersions.createdAt));
}
export async function getLayout(id?: string | null) {
  const db = getDatabase();
  await ensureDefault();
  if (id) {
    const [selected] = await db
      .select()
      .from(layoutVersions)
      .where(eq(layoutVersions.id, id))
      .limit(1);
    if (selected)
      return {
        ...selected,
        configuration: normalizeLayout(selected.configuration),
      };
  }
  const [active] = await db
    .select()
    .from(layoutVersions)
    .where(eq(layoutVersions.status, "active"))
    .orderBy(desc(layoutVersions.createdAt))
    .limit(1);
  const fallback = active ?? (await ensureDefault());
  return {
    ...fallback,
    configuration: normalizeLayout(fallback.configuration),
  };
}
async function nextVersion(family: string) {
  const [row] = await getDatabase()
    .select({ value: max(layoutVersions.version) })
    .from(layoutVersions)
    .where(eq(layoutVersions.family, family));
  return Number(row?.value ?? 0) + 1;
}
export async function saveLayout(
  family: string,
  configuration: LayoutConfiguration,
  notes: string,
  parentId?: string | null,
) {
  const version = await nextVersion(family);
  const [created] = await getDatabase()
    .insert(layoutVersions)
    .values({
      family: family.trim() || "Untitled Layout",
      version,
      status: "draft",
      configuration: normalizeLayout(configuration),
      notes,
      parentId: parentId || null,
    })
    .returning();
  return created;
}
export async function activateLayout(id: string) {
  const db = getDatabase();
  await db
    .update(layoutVersions)
    .set({ status: "archived" })
    .where(eq(layoutVersions.status, "active"));
  await db
    .update(layoutVersions)
    .set({ status: "active" })
    .where(eq(layoutVersions.id, id));
}
export async function archiveLayout(id: string) {
  const selected = await getLayout(id);
  if (selected.status === "active")
    throw new Response(
      "Activate another layout before archiving the live version",
      { status: 400 },
    );
  await getDatabase()
    .update(layoutVersions)
    .set({ status: "archived" })
    .where(eq(layoutVersions.id, id));
}
export async function updateLayoutMetadata(
  id: string,
  family: string,
  notes: string,
) {
  await getDatabase()
    .update(layoutVersions)
    .set({ family: family.trim() || "Untitled Layout", notes })
    .where(eq(layoutVersions.id, id));
}
export async function restoreLayout(id: string) {
  const source = await getLayout(id);
  const created = await saveLayout(
    source.family,
    source.configuration as LayoutConfiguration,
    `Restored from version ${source.version}`,
    source.id,
  );
  await activateLayout(created.id);
  return created;
}
export async function duplicateLayout(id: string, name: string) {
  const source = await getLayout(id);
  return saveLayout(
    name || `${source.family} Copy`,
    source.configuration as LayoutConfiguration,
    `Duplicated from ${source.family} v${source.version}`,
    source.id,
  );
}

async function ensureEnvironments() {
  const db = getDatabase(),
    existing = await db.select().from(managedEnvironments).limit(1);
  if (!existing.length)
    await db.insert(managedEnvironments).values({
      name: "GREENSIGN Development",
      slug: "greensign-dev",
      label: "Development",
      status: "active",
      accent: "#87ff4f",
      url: "http://localhost:3000/app/dashboard",
      notes: "Local development environment configuration.",
    });
}
export async function listEnvironments() {
  await ensureEnvironments();
  return getDatabase()
    .select()
    .from(managedEnvironments)
    .orderBy(asc(managedEnvironments.name));
}
export async function createEnvironment(values: Record<string, string>) {
  await ensureEnvironments();
  const [created] = await getDatabase()
    .insert(managedEnvironments)
    .values({
      name: values.name || "New Environment",
      slug: (values.slug || `environment-${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-"),
      label: values.label || "Preview",
      status: values.status || "active",
      accent: values.accent || "#87ff4f",
      url: values.url || "",
      notes: values.notes || "",
    })
    .returning();
  return created;
}
export async function updateEnvironment(
  id: string,
  values: Record<string, string>,
) {
  await getDatabase()
    .update(managedEnvironments)
    .set({
      name: values.name,
      slug: values.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      label: values.label,
      status: values.status,
      accent: values.accent,
      url: values.url,
      notes: values.notes,
      updatedAt: new Date(),
    })
    .where(eq(managedEnvironments.id, id));
}

const baseMap = [
  ...globalLinks.map((item) => ({
    key: `global-${item[0]}`,
    label: item[1],
    route: `/app/${item[0]}`,
    group: "Global Navigation",
    region: "topbar",
  })),
  ...modules.map((item) => ({
    key: `tool-${item[0]}`,
    label: item[2],
    route: `/app/tools/${item[0]}`,
    group: "Project Tools",
    region: "workspace",
  })),
  ...settingsLinks.map((item) => ({
    key: `setting-${item[0]}`,
    label: item[1],
    route: `/app/settings/${item[0]}`,
    group: "Settings",
    region: "workspace",
  })),
  {
    key: "global-command",
    label: "Global Command",
    route: "/app/dashboard",
    group: "Global Frame",
    region: "bottombar",
  },
  {
    key: "godmode-layout",
    label: "Layout Studio",
    route: "/gm_RH#studio",
    group: "Godmode",
    region: "workspace",
  },
  {
    key: "godmode-versions",
    label: "Versions",
    route: "/gm_RH#versions",
    group: "Godmode",
    region: "workspace",
  },
  {
    key: "godmode-environments",
    label: "Environments",
    route: "/gm_RH#environments",
    group: "Godmode",
    region: "workspace",
  },
  {
    key: "godmode-map",
    label: "Interface Map",
    route: "/gm_RH#map",
    group: "Godmode",
    region: "workspace",
  },
];
async function ensureInterfaceMap() {
  const db = getDatabase(),
    existing = await db.select().from(interfaceMapItems).limit(1);
  if (!existing.length)
    await db.insert(interfaceMapItems).values(
      baseMap.map((item) => ({
        ...item,
        enabled: true,
        notes: "",
        configuration: {},
      })),
    );
}
export async function listInterfaceMap() {
  await ensureInterfaceMap();
  return getDatabase()
    .select()
    .from(interfaceMapItems)
    .orderBy(asc(interfaceMapItems.group), asc(interfaceMapItems.label));
}
export async function createInterfaceMapItem(values: Record<string, string>) {
  await ensureInterfaceMap();
  const [created] = await getDatabase()
    .insert(interfaceMapItems)
    .values({
      key: values.key || `custom-${Date.now()}`,
      label: values.label || "New interface item",
      route: values.route || "/app/dashboard",
      group: values.group || "Custom",
      region: values.region || "workspace",
      enabled: values.enabled !== "false",
      notes: values.notes || "",
      configuration: {},
    })
    .returning();
  return created;
}
export async function updateInterfaceMapItem(
  id: string,
  values: Record<string, string>,
) {
  await getDatabase()
    .update(interfaceMapItems)
    .set({
      label: values.label,
      route: values.route,
      group: values.group,
      region: values.region,
      enabled: values.enabled === "true",
      notes: values.notes,
      updatedAt: new Date(),
    })
    .where(eq(interfaceMapItems.id, id));
}

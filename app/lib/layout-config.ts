export type TagDefinition = { key: string; label: string; color: string };
export type LayoutConfiguration = {
  accent: string;
  background: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  fontFamily: string;
  fontScale: number;
  density: number;
  cornerRadius: number;
  navHeight: number;
  projectRail: number;
  informationPane: number;
  cardColumns: number;
  contentMode: "full" | "contained";
  headingsUppercase: boolean;
  showSubtitles: boolean;
  showEnvironmentBar: boolean;
  toolLayouts: Record<string, "split" | "wide" | "stacked">;
  tags: TagDefinition[];
};
export const defaultTags: TagDefinition[] = [
  { key: "draft", label: "FOR APPROVAL", color: "#ffb657" },
  { key: "planning", label: "PLANNING", color: "#79aef2" },
  { key: "bidding", label: "BIDDING", color: "#ffcf5a" },
  { key: "pricing", label: "PRICING", color: "#ff9f43" },
  { key: "active", label: "ACTIVE", color: "#87ff4f" },
  { key: "on hold", label: "ON HOLD", color: "#ff7b72" },
  { key: "complete", label: "COMPLETE", color: "#a7b0a9" },
  { key: "qualified", label: "QUALIFIED", color: "#87ff4f" },
  { key: "review due", label: "REVIEW DUE", color: "#ff9f43" },
];
export const defaultLayout: LayoutConfiguration = {
  accent: "#87ff4f",
  background: "#090b0a",
  panel: "#111512",
  text: "#edf3ee",
  muted: "#8b968e",
  border: "#29312b",
  fontFamily: "Inter",
  fontScale: 1,
  density: 1,
  cornerRadius: 0,
  navHeight: 56,
  projectRail: 220,
  informationPane: 390,
  cardColumns: 2,
  contentMode: "full",
  headingsUppercase: true,
  showSubtitles: true,
  showEnvironmentBar: true,
  toolLayouts: {},
  tags: defaultTags,
};
export function normalizeLayout(value: unknown): LayoutConfiguration {
  const incoming = (value ?? {}) as Partial<LayoutConfiguration>;
  return {
    ...defaultLayout,
    ...incoming,
    toolLayouts: {
      ...defaultLayout.toolLayouts,
      ...(incoming.toolLayouts ?? {}),
    },
    tags:
      Array.isArray(incoming.tags) && incoming.tags.length
        ? incoming.tags.map((tag) => ({
            key: String(tag.key).toLowerCase(),
            label: String(tag.label).toUpperCase(),
            color: String(tag.color),
          }))
        : defaultTags,
  };
}

import { describe, expect, it } from "vitest";
import { globalLinks, modules, settingsLinks } from "./navigation";

describe("GREENSIGN navigation",()=>{
  it("keeps every construction tool addressable exactly once",()=>{
    expect(modules).toHaveLength(12);
    expect(new Set(modules.map(module=>module[0])).size).toBe(modules.length);
  });

  it("keeps quick access and private controls out of navigation data",()=>{
    const labels=[...globalLinks,...settingsLinks,...modules].flat().join(" ").toLowerCase();
    expect(labels).not.toContain("quick add");
    expect(labels).not.toContain("godmode");
    expect(labels).not.toContain("gm_rh");
  });
});

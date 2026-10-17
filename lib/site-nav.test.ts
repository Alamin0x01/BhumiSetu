import { describe, expect, it } from "vitest";
import { buildSiteNav, isNavActive, isReportPath } from "./site-nav";

describe("buildSiteNav", () => {
  it("points Reports and the sandbox call to action at the featured case", () => {
    const nav = buildSiteNav("DEMO-CASE-002");
    expect(nav.items.map((item) => [item.label, item.href])).toEqual([
      ["Overview", "/"],
      ["Demo Cases", "/cases"],
      ["Import", "/import"],
      ["Reports", "/cases/DEMO-CASE-002/report"],
    ]);
    expect(nav.sandboxHref).toBe("/cases/DEMO-CASE-002#sandbox");
  });
});

describe("isReportPath", () => {
  it("matches only the two report routes", () => {
    expect(isReportPath("/cases/DEMO-CASE-001/report")).toBe(true);
    expect(isReportPath("/import/case/report")).toBe(true);
    expect(isReportPath("/cases/DEMO-CASE-001")).toBe(false);
    expect(isReportPath("/cases")).toBe(false);
    expect(isReportPath("/import/case")).toBe(false);
  });
});

describe("isNavActive", () => {
  const active = (pathname: string | null) =>
    (["overview", "cases", "import", "reports"] as const).filter((key) =>
      isNavActive(key, pathname),
    );

  it("highlights exactly one item per route", () => {
    expect(active("/")).toEqual(["overview"]);
    expect(active("/cases")).toEqual(["cases"]);
    expect(active("/cases/DEMO-CASE-003")).toEqual(["cases"]);
    expect(active("/import")).toEqual(["import"]);
    expect(active("/import/case")).toEqual(["import"]);
    expect(active("/cases/DEMO-CASE-003/report")).toEqual(["reports"]);
    expect(active("/import/case/report")).toEqual(["reports"]);
  });

  it("highlights nothing for unknown routes or while the path is unknown", () => {
    expect(active("/missing")).toEqual([]);
    expect(active("/casesx")).toEqual([]);
    expect(active(null)).toEqual([]);
  });
});

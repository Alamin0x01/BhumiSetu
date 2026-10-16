import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoCases } from "@/data/cases";
import { compareDagReferences } from "@/lib/comparison";
import { CaseSummary } from "./case-summary";
import { CaseTabs } from "./case-tabs";

function summaryHtml(caseIndex: number) {
  const records = demoCases[caseIndex].records;
  return renderToStaticMarkup(
    <CaseSummary records={records} result={compareDagReferences(records)} />,
  );
}

describe("CaseSummary", () => {
  it("shows the counts with text labels", () => {
    const html = summaryHtml(1);
    for (const label of [
      "Comparison summary",
      "Source records",
      "Linked pairs compared",
      "Dag-reference findings",
      "Evidence incomplete",
      "Skipped or incomplete",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Needs human review");
  });

  it("states when nothing needs attention", () => {
    const html = summaryHtml(0);
    expect(html).toContain("None found");
    expect(html).toContain("No missing references");
    expect(html).not.toContain("Needs human review");
  });

  it("flags evidence-incomplete and skipped counts for the missing-link case", () => {
    const html = summaryHtml(2);
    expect(html).toContain("Referenced record not in case");
    expect(html).toContain("See skipped comparisons");
  });
});

describe("CaseTabs", () => {
  const html = renderToStaticMarkup(
    <CaseTabs
      overview={<p>Overview content</p>}
      records={<p>Records content</p>}
      timeline={<p>Timeline content</p>}
      sandbox={<p>Sandbox content</p>}
    />,
  );

  it("renders an accessible tablist with the four tabs", () => {
    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(4);
    expect((html.match(/role="tabpanel"/g) ?? []).length).toBe(4);
    for (const label of ["Overview", "Source records", "Timeline", "Sandbox"]) {
      expect(html).toContain(label);
    }
  });

  it("selects Overview first and hides the other panels", () => {
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect((html.match(/aria-selected="false"/g) ?? []).length).toBe(3);
    expect((html.match(/ hidden=""/g) ?? []).length).toBe(3);
  });

  it("uses roving tabindex so only the selected tab is in the tab order", () => {
    expect((html.match(/tabindex="0"/g) ?? []).length).toBe(1);
    expect((html.match(/tabindex="-1"/g) ?? []).length).toBe(3);
  });
});

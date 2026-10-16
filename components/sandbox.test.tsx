import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoCases } from "@/data/cases";
import { runSandbox } from "@/lib/sandbox";
import { Sandbox, SandboxResults } from "./sandbox";

const records = demoCases[1].records;
const drafts = (overrides: Record<number, string> = {}) =>
  records.map((record, index) => overrides[index] ?? record.dagReference);

function resultsHtml(overrides: Record<number, string>, stale: boolean) {
  const result = runSandbox(records, drafts(overrides));
  if (!result.ok) throw new Error("expected a valid run");
  return renderToStaticMarkup(<SandboxResults run={result.run} stale={stale} />);
}

describe("Sandbox", () => {
  const html = renderToStaticMarkup(<Sandbox records={records} />);

  it("shows the simulation-only safety notice", () => {
    expect(html).toContain(
      "Simulation only. Original records are unchanged. This is not an official correction or ownership verification.",
    );
  });

  it("offers one labelled dag input per record, prefilled with the source value", () => {
    for (const record of records) {
      expect(html).toContain(`Dag reference for ${record.id}`);
    }
    expect((html.match(/<input /g) ?? []).length).toBe(records.length);
    expect((html.match(/value="518"/g) ?? []).length).toBe(2);
    expect((html.match(/value="581"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('aria-invalid="true"');
  });

  it("has Run comparison and Reset sandbox buttons and no results before a run", () => {
    expect(html).toContain("Run comparison");
    expect(html).toContain("Reset sandbox");
    expect(html).toContain("No simulation has been run yet");
    expect(html).not.toContain("Simulated results");
  });

  it("never renders reviewer notes", () => {
    expect(html).not.toContain("Reviewer notes");
  });
});

describe("SandboxResults", () => {
  it("shows the source finding when nothing was edited", () => {
    const html = resultsHtml({}, false);
    expect(html).toContain("Simulated results");
    expect(html).toContain("Up to date");
    expect(html).toContain("DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03");
    expect(html).toContain("Unchanged");
  });

  it("shows moved findings, evidence IDs, and source versus working values", () => {
    const html = resultsHtml({ 2: "518" }, false);
    expect(html).toContain("DAG_REFERENCE_MISMATCH:DEMO-REC-002-03:DEMO-REC-002-04");
    expect(html).not.toContain("DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03");
    expect(html).toContain('href="#record-DEMO-REC-002-03"');
    expect(html).toContain("Source value:");
    expect(html).toContain("Working-copy value:");
    expect(html).toContain("Edited");
    expect(html).toContain("Simulated finding");
    expect(html).toContain("not proof of fraud or invalid ownership");
  });

  it("shows counts for findings, compared, skipped, and validation issues", () => {
    const html = resultsHtml({ 2: "518" }, false);
    for (const label of [
      "Findings in working copy",
      "Pairs compared",
      "Skipped or incomplete",
      "Validation issues",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("says no mismatch was found when both later records are 518", () => {
    const html = resultsHtml({ 2: "518", 3: "518" }, false);
    expect(html).toContain("No dag mismatch found among comparable linked records.");
    expect(html).not.toContain("Simulated finding");
    expect(html).toContain("Nothing here verifies");
    expect(html).toContain("ownership or any other field");
  });

  it("labels results as stale after an edit", () => {
    const html = resultsHtml({ 2: "518" }, true);
    expect(html).toContain("Stale: run comparison again");
    expect(html).toContain("do not reflect your latest");
    expect(html).not.toContain("Up to date");
  });

  it("never renders reviewer notes", () => {
    expect(resultsHtml({ 2: "518" }, false)).not.toContain("Reviewer notes");
  });
});

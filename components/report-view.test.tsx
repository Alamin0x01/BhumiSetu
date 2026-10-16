import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoCases, type DemoCase } from "@/data/cases";
import { createReport, serializeReport, type ReportNotesInput, type TimeContext } from "@/lib/report";
import type { ReviewNote } from "@/lib/review";
import { BuiltInReport } from "./builtin-report";
import { ExportReportAction } from "./export-report-action";
import { ImportedReport } from "./imported-report";
import { ReportPanel } from "./report-panel";
import { ReportView } from "./report-view";

const time: TimeContext = {
  now: new Date("2026-10-15T10:30:45.123Z"),
  timeZone: "Asia/Dhaka",
  offsetMinutes: 360,
};
const caseTwo = demoCases[1];
const caseThree = demoCases[2];
const FINDING = "DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03";
const note = (over: Partial<ReviewNote> = {}): ReviewNote => ({
  id: "n1",
  caseId: caseTwo.id,
  findingId: FINDING,
  label: "Reviewed",
  note: "Looks like a transcription difference",
  savedAt: "2026-10-14T09:00:00.000Z",
  ...over,
});
const notes = (list: ReviewNote[], status: ReportNotesInput["status"] = "ok"): ReportNotesInput => ({ status, notes: list, discarded: 0 });
const view = (demoCase: DemoCase, origin: "built-in" | "imported", input: ReportNotesInput | null) =>
  renderToStaticMarkup(<ReportView report={createReport({ demoCase, origin, time, notes: input })} />);

describe("ReportView", () => {
  const report = createReport({ demoCase: caseTwo, origin: "built-in", time, notes: notes([note()]) });
  const html = renderToStaticMarkup(<ReportView report={report} />);

  it("shows the header facts, declaration, scope, and counts from the snapshot", () => {
    expect(html).toContain("BhumiSetu review report");
    expect(html).toContain(caseTwo.title);
    expect(html).toContain(report.generatedAt);
    expect(html).toContain("2026-10-15T16:30:45+06:00 (Asia/Dhaka, UTC+06:00)");
    expect(html).toContain("Report schema version");
    expect(html).toContain("Synthetic data declaration");
    expect(html).toContain("Uses synthetic records. Not official verification or legal advice.");
    expect(html).toContain("Scope of this report");
    expect(html).toContain("Not checked or verified");
    expect(html).toContain("Simulated (sandbox) values are never part of a report.");
    expect(html).toContain("Linked pairs compared");
  });

  it("shows findings with evidence IDs, original and normalized values, assumptions, and limitation", () => {
    expect(html).toContain(FINDING);
    expect(html).toContain("Evidence record");
    expect(html).toContain("Original value");
    expect(html).toContain("Normalized value");
    expect(html).toContain("&quot;518&quot;");
    expect(html).toContain("&quot;581&quot;");
    expect(html).toContain("Comparability assumptions");
    expect(html).toContain("not proof of fraud or invalid ownership");
  });

  it("shows review notes with the browser-local statement and never marks the finding resolved", () => {
    expect(html).toContain("Looks like a transcription difference");
    expect(html).toContain("2026-10-14T09:00:00.000Z");
    expect(html).toContain("Current label: Reviewed");
    expect(html).toContain("The finding remains reported whatever its label.");
    expect(html).toContain("not a tamper-proof audit trail");
    expect(html).not.toMatch(/resolved by|finding resolved|marked resolved/i);
  });

  it("uses print-friendly structure: repeating table headers and no-split blocks", () => {
    expect((html.match(/<thead/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('scope="col"');
    expect(html).toContain("break-inside-avoid");
    expect(html).toContain("print:border-0");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
  });

  it("lists every source record with raw values", () => {
    for (const record of caseTwo.records) expect(html).toContain(record.id);
    expect(html).toContain("Source records (as stored)");
    expect(html).toContain("Same-parcel IDs");
  });

  it("reports missing links as Evidence incomplete and skipped comparisons", () => {
    const three = view(caseThree, "built-in", notes([]));
    expect(three).toContain("Evidence incomplete");
    expect(three).toContain("DEMO-REC-003-03");
    expect(three).toContain("LINKED_RECORD_MISSING");
    expect(three).toContain("No dag mismatch found among comparable linked records.");
  });

  it("explains unreadable notes and ignored entries", () => {
    const corrupt = view(caseTwo, "built-in", { status: "corrupt", notes: [], discarded: 0 });
    expect(corrupt).toContain("Storage status: corrupt");
    expect(corrupt).toContain("could not be read, so none are included");
    const partly = renderToStaticMarkup(
      <ReportView report={createReport({ demoCase: caseTwo, origin: "built-in", time, notes: { status: "ok", notes: [], discarded: 2 } })} />,
    );
    expect(partly).toContain("2 invalid saved entries were ignored");
  });

  it("shows no notes for imported reports", () => {
    const imp = view(caseTwo, "imported", notes([note({ note: "SECRET" })]));
    expect(imp).toContain("Imported cases do not use reviewer notes");
    expect(imp).toContain("Imported case (temporary browser session)");
    expect(imp).not.toContain("SECRET");
    expect(imp).not.toContain("Current label");
  });

  it("renders imported and note text as text, never as HTML", () => {
    const records = structuredClone([...caseTwo.records]);
    records[0].surveyContext = "<img src=x onerror=alert(1)>";
    records[1].documentReference = "<script>alert(1)</script>";
    const hostile: DemoCase = { ...caseTwo, title: "<b>Bold</b> title", description: "<i>x</i>", records };
    const out = view(hostile, "built-in", notes([note({ note: "<a href=javascript:1>click</a>" })]));
    for (const raw of ["<b>Bold</b>", "<img", "<script>", "<i>x</i>", "<a href=javascript"]) {
      expect(out).not.toContain(raw);
    }
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out).toContain("&lt;b&gt;Bold&lt;/b&gt; title");
  });

  it("shows Bangla digits and leading zeros exactly", () => {
    const records = structuredClone([...caseTwo.records]);
    records[0].dagReference = "\u09E6\u09EB\u09E7\u09EE";
    records[1].dagReference = "0518";
    const out = view({ ...caseTwo, records }, "built-in", notes([]));
    expect(out).toContain("&quot;\u09E6\u09EB\u09E7\u09EE&quot;");
    expect(out).toContain("&quot;0518&quot;");
  });

  it("renders the same facts as the JSON for one snapshot", () => {
    const parsed = JSON.parse(serializeReport(report));
    expect(html).toContain(parsed.generatedAt);
    expect(html).toContain(parsed.case.id);
    expect(html).toContain(parsed.dagComparison.findings[0].id);
    expect(html).toContain(parsed.reviewNotes.perFinding[0].history[0].note);
    expect(html).toContain(parsed.sourceRecords[2].id);
  });
});

describe("report panel and entry points", () => {
  const report = createReport({ demoCase: caseTwo, origin: "built-in", time, notes: notes([]) });

  it("asks for an explicit snapshot before download or print", () => {
    const html = renderToStaticMarkup(<ReportPanel buildReport={() => report} backHref="/cases/DEMO-CASE-002" backLabel="Back to case" />);
    expect(html).toContain("Generate report preview");
    expect(html).toContain("Download report JSON");
    expect(html).toContain("Print report");
    expect(html).toContain("Save as PDF");
    expect(html).toContain("No report generated yet");
    expect((html.match(/disabled=""/g) ?? []).length).toBe(2);
    expect(html).toContain("print:hidden");
  });

  it("built-in report page renders without reading storage until a snapshot is requested", () => {
    const html = renderToStaticMarkup(<BuiltInReport demoCase={caseTwo} />);
    expect(html).toContain("Back to case");
    expect(html).toContain("Generate report preview");
  });

  it("imported report handles an empty session clearly", () => {
    const html = renderToStaticMarkup(<ImportedReport />);
    expect(html).toContain("nothing to report");
    expect(html).toContain('href="/import"');
    expect(html).not.toContain("Generate report preview");
  });

  it("export action links to the report page", () => {
    const html = renderToStaticMarkup(<ExportReportAction href="/cases/DEMO-CASE-002/report" />);
    expect(html).toContain("Export review report");
    expect(html).toContain('href="/cases/DEMO-CASE-002/report"');
  });
});

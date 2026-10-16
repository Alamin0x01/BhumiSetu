import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { demoCases, type DemoCase, type SourceRecord } from "@/data/cases";
import { compareDagReferences, RECORD_DIFFERENCE_LIMITATION } from "./comparison";
import { reportExportAvailability, REPORT_SANDBOX_MESSAGE } from "./case-tabs";
import {
  createReport,
  currentTimeContext,
  IMPORTED_NOTES_STATEMENT,
  REPORT_NOTES_STATEMENT,
  REPORT_SCHEMA_VERSION,
  reportFileName,
  sanitizeForFileName,
  serializeReport,
  type ReportNotesInput,
  type TimeContext,
} from "./report";
import { parseReviewNotes, readReviewNotes, REVIEW_STORAGE_KEY, type ReviewNote, type ReviewStorage } from "./review";
import { createSandboxState, sandboxReducer } from "./sandbox";

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
  label: "Needs review",
  note: "Check the original register",
  savedAt: "2026-10-14T09:00:00.000Z",
  ...over,
});
const okNotes = (notes: ReviewNote[], discarded = 0): ReportNotesInput => ({ status: "ok", notes, discarded });
const builtIn = (demoCase: DemoCase = caseTwo, notes: ReportNotesInput | null = okNotes([])) =>
  createReport({ demoCase, origin: "built-in", time, notes });
const imported = (demoCase: DemoCase = caseTwo, notes: ReportNotesInput | null = null) =>
  createReport({ demoCase, origin: "imported", time, notes });

function fakeStorage(raw?: string): ReviewStorage {
  const data = new Map<string, string>(raw === undefined ? [] : [[REVIEW_STORAGE_KEY, raw]]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("report metadata", () => {
  it("has a schema version and a timestamp with timezone", () => {
    const report = builtIn();
    expect(report.reportSchemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.generatedAt).toBe("2026-10-15T10:30:45.123Z");
    expect(report.generatedAtLocal).toBe("2026-10-15T16:30:45+06:00");
    expect(report.timeZone).toBe("Asia/Dhaka");
    expect(report.utcOffset).toBe("+06:00");
  });

  it.each([
    [0, "+00:00", "2026-10-15T10:30:45+00:00"],
    [-330, "-05:30", "2026-10-15T05:00:45-05:30"],
    [330, "+05:30", "2026-10-15T16:00:45+05:30"],
  ])("formats offset %i minutes as %s", (offsetMinutes, offset, local) => {
    const report = createReport({ demoCase: caseTwo, origin: "built-in", time: { ...time, offsetMinutes }, notes: null });
    expect(report.utcOffset).toBe(offset);
    expect(report.generatedAtLocal).toBe(local);
  });

  it("reads the current time context from the environment", () => {
    const context = currentTimeContext(new Date("2026-01-01T00:00:00.000Z"));
    expect(context.timeZone.length).toBeGreaterThan(0);
    expect(Number.isInteger(context.offsetMinutes)).toBe(true);
  });

  it("only includes an application version that package.json really defines, and no ruleset version", () => {
    const report = builtIn();
    expect(report.application).toEqual({ name: packageJson.name, packageVersion: packageJson.version });
    expect(JSON.stringify(report)).not.toMatch(/ruleset/i);
  });

  it("states the case, its origin, and the synthetic declaration with its limits", () => {
    const built = builtIn();
    expect(built.case).toEqual({ id: caseTwo.id, title: caseTwo.title, description: caseTwo.description, origin: "built-in", recordCount: 4 });
    expect(built.syntheticData.declaredSynthetic).toBe(true);
    expect(built.syntheticData.limitations).toEqual(["Uses synthetic records. Not official verification or legal advice."]);

    const imp = imported();
    expect(imp.case.origin).toBe("imported");
    expect(imp.syntheticData.statement).toContain("user-provided");
    expect(imp.syntheticData.limitations.join(" ")).toContain("does not anonymize data and does not detect personal information");
  });

  it("limits its scope to the dag-reference and missing-link checks", () => {
    const report = builtIn();
    expect(report.scope.checks.map((check) => check.name)).toEqual(["Dag-reference comparison", "Missing-link check"]);
    expect(report.scope.checks[0].ruleId).toBe("DAG_REFERENCE_MISMATCH");
    expect(report.scope.notChecked.join(" ")).toMatch(/Ownership, document authenticity, fraud, and legal status are not verified/);
  });
});

describe("findings and evidence", () => {
  it("includes the engine's findings with evidence, assumptions, and limitation", () => {
    const report = builtIn();
    expect(report.dagComparison.findings).toEqual(compareDagReferences(caseTwo.records).findings);
    const [finding] = report.dagComparison.findings;
    expect(finding.id).toBe(FINDING);
    expect(finding.sourceRecordIds).toEqual(["DEMO-REC-002-02", "DEMO-REC-002-03"]);
    expect(finding.values.map((value) => [value.recordId, value.original, value.normalized])).toEqual([
      ["DEMO-REC-002-02", "518", "518"],
      ["DEMO-REC-002-03", "581", "581"],
    ]);
    expect(finding.comparabilityAssumptions).toHaveLength(5);
    expect(finding.limitation).toBe(RECORD_DIFFERENCE_LIMITATION);
  });

  it("reports compared, skipped/incomplete, validation-issue, finding, and evidence-incomplete counts", () => {
    expect(builtIn().counts).toEqual({
      sourceRecords: 4,
      linkedPairsCompared: 3,
      skippedOrIncomplete: 0,
      validationIssues: 0,
      dagReferenceFindings: 1,
      evidenceIncomplete: 0,
    });
    const three = builtIn(caseThree);
    expect(three.counts).toMatchObject({ linkedPairsCompared: 1, skippedOrIncomplete: 1, dagReferenceFindings: 0, evidenceIncomplete: 1 });
    expect(three.dagComparison.skipped.map((item) => item.reason)).toEqual(["LINKED_RECORD_MISSING"]);
  });

  it("includes missing-link results labelled Evidence incomplete", () => {
    const report = builtIn(caseThree);
    expect(report.missingLinks.label).toBe("Evidence incomplete");
    expect(report.missingLinks.items).toEqual([{ referencingRecordId: "DEMO-REC-003-02", missingRecordId: "DEMO-REC-003-03" }]);
    expect(builtIn().missingLinks.items).toEqual([]);
  });

  it("reports data-validation issues such as duplicate record IDs", () => {
    const duplicate: DemoCase = { ...caseTwo, records: [...caseTwo.records, structuredClone(caseTwo.records[0])] };
    const report = builtIn(duplicate);
    expect(report.counts.validationIssues).toBe(1);
    expect(report.dagComparison.validationIssues[0].code).toBe("DUPLICATE_RECORD_ID");
  });
});

describe("source records stay original", () => {
  it("copies raw values exactly and never changes the fixtures", () => {
    const records: SourceRecord[] = structuredClone([...caseTwo.records]);
    records[0].dagReference = " ০৫১৮ ";
    records[1].dagReference = "0518/1";
    const custom: DemoCase = { ...caseTwo, records };
    const before = JSON.stringify(demoCases);
    const report = builtIn(custom);
    expect(report.sourceRecords.map((record) => record.dagReference)).toEqual([" ০৫১৮ ", "0518/1", "581", "581"]);
    expect(report.sourceRecords[0]).not.toBe(records[0]);
    expect(JSON.stringify(demoCases)).toBe(before);
  });

  it("works on frozen input and returns a deeply frozen snapshot", () => {
    const frozen = structuredClone(caseTwo) as DemoCase;
    const freeze = (value: unknown) => {
      if (typeof value === "object" && value !== null) { Object.values(value).forEach(freeze); Object.freeze(value); }
    };
    freeze(frozen);
    const report = builtIn(frozen);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.sourceRecords[0].area)).toBe(true);
    expect(Object.isFrozen(report.dagComparison.findings[0].values)).toBe(true);
    expect(() => {
      (report.case as { id: string }).id = "changed";
    }).toThrow(TypeError);
  });
});

describe("review notes", () => {
  it("includes only notes for this case's current findings", () => {
    const report = builtIn(caseTwo, okNotes([
      note({ id: "mine", note: "mine only" }),
      note({ id: "other-case", caseId: "DEMO-CASE-001", note: "SECRET other case" }),
      note({ id: "stale", findingId: "DAG_REFERENCE_MISMATCH:OLD:RECORDS", note: "SECRET stale finding" }),
    ]));
    expect(report.reviewNotes.perFinding).toHaveLength(1);
    expect(report.reviewNotes.perFinding[0].history.map((entry) => entry.id)).toEqual(["mine"]);
    expect(JSON.stringify(report)).not.toContain("SECRET");
  });

  it("keeps labels, timestamps, and history in saved order", () => {
    const report = builtIn(caseTwo, okNotes([
      note({ id: "a", label: "Needs review", savedAt: "2026-10-14T09:00:00.000Z", note: "first" }),
      note({ id: "b", label: "Reviewed", savedAt: "2026-10-14T10:00:00.000Z", note: "second" }),
    ]));
    const entry = report.reviewNotes.perFinding[0];
    expect(entry.history.map((item) => [item.label, item.savedAt, item.note])).toEqual([
      ["Needs review", "2026-10-14T09:00:00.000Z", "first"],
      ["Reviewed", "2026-10-14T10:00:00.000Z", "second"],
    ]);
    expect(entry.currentLabel).toBe("Reviewed");
  });

  it("never treats a Reviewed label as resolving the finding", () => {
    const report = builtIn(caseTwo, okNotes([note({ label: "Reviewed" })]));
    expect(report.reviewNotes.perFinding[0].currentLabel).toBe("Reviewed");
    expect(report.reviewNotes.perFinding[0].findingRemainsReported).toBe(true);
    expect(report.dagComparison.findings.map((finding) => finding.id)).toEqual([FINDING]);
    expect(report.counts.dagReferenceFindings).toBe(1);
    expect(report.reviewNotes.statement).toContain("never resolves, removes, or changes a computed finding");
  });

  it("states that notes are browser-local, unauthenticated, and not a tamper-proof audit trail", () => {
    const statement = builtIn().reviewNotes.statement;
    expect(statement).toBe(REPORT_NOTES_STATEMENT);
    expect(statement).toMatch(/only in the reviewer's browser/);
    expect(statement).toMatch(/unauthenticated/);
    expect(statement).toMatch(/not a tamper-proof audit trail/);
  });

  it("lists findings without notes with an empty history", () => {
    expect(builtIn().reviewNotes.perFinding).toEqual([
      { findingId: FINDING, currentLabel: null, findingRemainsReported: true, history: [] },
    ]);
  });

  it("handles corrupt stored notes safely", () => {
    const state = readReviewNotes(fakeStorage("{oops"));
    const report = builtIn(caseTwo, { status: state.status === "ok" ? "ok" : state.status, notes: state.notes, discarded: state.discarded });
    expect(report.reviewNotes.storageStatus).toBe("corrupt");
    expect(report.reviewNotes.included).toBe(false);
    expect(report.reviewNotes.perFinding[0].history).toEqual([]);
    expect(report.dagComparison.findings).toHaveLength(1);
  });

  it("ignores invalid saved entries, keeps valid ones, and records how many were ignored", () => {
    const raw = JSON.stringify({ version: 1, notes: [note({ id: "good" }), { ...note({ id: "bad" }), label: "Resolved" }, "junk"] });
    const state = parseReviewNotes(raw);
    const report = builtIn(caseTwo, { status: "ok", notes: state.notes, discarded: state.discarded });
    expect(report.reviewNotes.invalidEntriesIgnored).toBe(2);
    expect(report.reviewNotes.perFinding[0].history.map((entry) => entry.id)).toEqual(["good"]);
  });

  it("reports unavailable storage without throwing", () => {
    const state = readReviewNotes(null);
    const report = builtIn(caseTwo, { status: "unavailable", notes: state.notes, discarded: 0 });
    expect(report.reviewNotes.storageStatus).toBe("unavailable");
    expect(report.reviewNotes.included).toBe(false);
  });

  it("imported reports never include notes, even if some are passed in", () => {
    const report = imported(caseTwo, okNotes([note({ note: "SECRET built-in note" })]));
    expect(report.reviewNotes).toMatchObject({ included: false, source: "none", storageStatus: "not-applicable", perFinding: [] });
    expect(report.reviewNotes.statement).toBe(IMPORTED_NOTES_STATEMENT);
    expect(JSON.stringify(report)).not.toContain("SECRET");
  });
});

describe("one snapshot per export", () => {
  it("serializes to JSON that equals the snapshot", () => {
    const report = builtIn(caseTwo, okNotes([note()]));
    const text = serializeReport(report);
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(report)));
    expect(text.endsWith("\n")).toBe(true);
  });

  it("keeps an earlier snapshot unchanged when a later one is generated", () => {
    const first = builtIn(caseTwo, okNotes([]));
    const firstText = serializeReport(first);
    createReport({ demoCase: caseTwo, origin: "built-in", time: { ...time, now: new Date("2026-10-16T00:00:00.000Z") }, notes: okNotes([note()]) });
    expect(serializeReport(first)).toBe(firstText);
    expect(first.generatedAt).toBe("2026-10-15T10:30:45.123Z");
  });

  it("excludes sandbox values: reports are built from the original records only", () => {
    let state = createSandboxState(caseTwo.records);
    state = sandboxReducer(caseTwo.records, state, { type: "edit", index: 2, value: "SANDBOX-999" });
    state = sandboxReducer(caseTwo.records, state, { type: "run" });
    expect(state.run?.rows[2].workingDag).toBe("SANDBOX-999");

    const report = builtIn();
    const text = serializeReport(report);
    expect(text).not.toContain("SANDBOX-999");
    expect(report.sourceRecords[2].dagReference).toBe("581");
    expect(Object.keys(report)).not.toContain("sandbox");
  });

  it("turns export off on the Sandbox tab with an explanation, and on elsewhere", () => {
    expect(reportExportAvailability("sandbox")).toEqual({ enabled: false, message: "Reports currently cover source records, not simulations." });
    expect(REPORT_SANDBOX_MESSAGE).toBe("Reports currently cover source records, not simulations.");
    for (const tab of ["overview", "records", "timeline"] as const) {
      expect(reportExportAvailability(tab)).toEqual({ enabled: true, message: null });
    }
  });
});

describe("file names", () => {
  it.each([
    ["../../etc/passwd", "etc-passwd"],
    ["<script>alert(1)</script>", "script-alert-1-script"],
    ["DEMO CASE 002", "DEMO-CASE-002"],
    ["a/b\\c:d*e?f", "a-b-c-d-e-f"],
    ["...", "case"],
    ["", "case"],
    ["\u09AE\u09BE\u09AE\u09B2\u09BE", "case"],
    ["--.weird.--", "weird"],
  ])("sanitizes %j to %j", (input, expected) => {
    expect(sanitizeForFileName(input)).toBe(expected);
  });

  it("limits length", () => {
    expect(sanitizeForFileName("x".repeat(200)).length).toBeLessThanOrEqual(60);
  });

  it("builds case-specific names from only safe characters", () => {
    expect(reportFileName(builtIn())).toBe("bhumisetu-report-built-in-DEMO-CASE-002-20261015T103045Z.json");
    const hostile = createReport({
      demoCase: { ...caseTwo, id: '../x"; rm -rf /<b>' },
      origin: "imported",
      time,
      notes: null,
    });
    const name = reportFileName(hostile);
    expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(name).toBe("bhumisetu-report-imported-x-rm-rf-b-20261015T103045Z.json");
    expect(name).not.toContain("..");
  });
});

describe("report code stays local and away from sandbox state", () => {
  const files = [
    "./report.ts",
    "./download.ts",
    "../components/report-view.tsx",
    "../components/report-panel.tsx",
    "../components/builtin-report.tsx",
    "../components/imported-report.tsx",
    "../components/export-report-action.tsx",
  ];
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

  it.each(files)("%s has no network, eval, HTML injection, logging, or external URLs", (file) => {
    expect(read(file)).not.toMatch(
      /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|\beval\(|new Function|dangerouslySetInnerHTML|innerHTML|console\.|https?:\/\//,
    );
  });

  it.each(files.filter((file) => !file.includes("builtin-report")))(
    "%s never touches browser storage",
    (file) => {
      expect(read(file)).not.toMatch(
        /\blocalStorage\.|window\.localStorage|sessionStorage|indexedDB|readReviewNotes|getItem\(|setItem\(|removeItem\(/,
      );
    },
  );

  it.each(files)("%s does not import sandbox state", (file) => {
    expect(read(file)).not.toMatch(/from "(@\/lib|\.)\/sandbox"/);
  });
});

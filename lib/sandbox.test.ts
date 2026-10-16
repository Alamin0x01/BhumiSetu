import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoCases, type SourceRecord } from "@/data/cases";
import { compareDagReferences } from "./comparison";
import {
  applyDagEdits,
  createSandboxState,
  createWorkingCopy,
  MAX_DAG_LENGTH,
  runSandbox,
  sandboxReducer,
  validateDagInput,
  type SandboxAction,
  type SandboxState,
} from "./sandbox";

const records: readonly SourceRecord[] = demoCases[1].records;

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

function play(actions: SandboxAction[], source: readonly SourceRecord[] = records) {
  return actions.reduce<SandboxState>(
    (state, action) => sandboxReducer(source, state, action),
    createSandboxState(source),
  );
}

const edit = (index: number, value: string): SandboxAction => ({
  type: "edit",
  index,
  value,
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("demo case 2 baseline", () => {
  it("has the dag values 518, 518, 581, 581", () => {
    expect(records.map((record) => record.dagReference)).toEqual([
      "518",
      "518",
      "581",
      "581",
    ]);
  });

  it("runs the real comparison engine when nothing is edited", () => {
    const result = runSandbox(records, createSandboxState(records).drafts);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.comparison).toEqual(compareDagReferences(records));
    expect(ids(result.run.comparison.findings)).toEqual([
      "DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03",
    ]);
    expect(result.run.rows.every((row) => !row.changed)).toBe(true);
  });
});

describe("source records stay unchanged", () => {
  it("never mutates the originals, even when they are frozen", () => {
    const frozen = deepFreeze(structuredClone([...records]));
    const before = JSON.stringify(frozen);

    expect(() =>
      play([edit(2, "518"), { type: "run" }, edit(3, "518"), { type: "run" }], frozen),
    ).not.toThrow();
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it("edits a deep copy, not the source objects", () => {
    const working = applyDagEdits(records, ["1", "2", "3", "4"]);
    expect(working.map((record) => record.dagReference)).toEqual(["1", "2", "3", "4"]);
    expect(working[0]).not.toBe(records[0]);
    expect(working[0].area).not.toBe(records[0].area);
    expect(working[0].partyIds).not.toBe(records[0].partyIds);
    expect(records.map((record) => record.dagReference)).toEqual([
      "518",
      "518",
      "581",
      "581",
    ]);
    expect(createWorkingCopy(records)).toEqual(records);
  });

  it("only changes dag references in the working copy", () => {
    const working = applyDagEdits(records, ["A", "B", "C", "D"]);
    const withoutDag = (record: SourceRecord) => ({ ...record, dagReference: "" });
    expect(working.map(withoutDag)).toEqual(records.map(withoutDag));
  });
});

describe("what-if runs", () => {
  it("moves the mismatch to the next linked pair when only the mutation is changed", () => {
    const state = play([edit(2, "518"), { type: "run" }]);
    const comparison = state.run?.comparison;
    expect(comparison?.comparedCount).toBe(3);
    expect(ids(comparison?.findings ?? [])).toEqual([
      "DAG_REFERENCE_MISMATCH:DEMO-REC-002-03:DEMO-REC-002-04",
    ]);
    expect(comparison?.findings[0].values.map((value) => value.original)).toEqual([
      "518",
      "581",
    ]);
  });

  it("finds no mismatch when both later records are changed to 518", () => {
    const state = play([edit(2, "518"), edit(3, "518"), { type: "run" }]);
    expect(state.run?.comparison.findings).toEqual([]);
    expect(state.run?.comparison.comparedCount).toBe(3);
    expect(state.run?.comparison.skipped).toEqual([]);
    expect(state.run?.comparison.validationIssues).toEqual([]);
  });

  it("reports source versus working-copy values for every record", () => {
    const state = play([edit(2, "518"), { type: "run" }]);
    expect(state.run?.rows).toEqual([
      { recordId: "DEMO-REC-002-01", originalDag: "518", workingDag: "518", changed: false },
      { recordId: "DEMO-REC-002-02", originalDag: "518", workingDag: "518", changed: false },
      { recordId: "DEMO-REC-002-03", originalDag: "581", workingDag: "518", changed: true },
      { recordId: "DEMO-REC-002-04", originalDag: "581", workingDag: "581", changed: false },
    ]);
  });

  it("preserves leading zeros and punctuation exactly as typed", () => {
    const state = play([edit(0, "0518/1"), { type: "run" }]);
    expect(state.run?.rows[0].workingDag).toBe("0518/1");
    const finding = state.run?.comparison.findings.find((item) =>
      item.sourceRecordIds.includes("DEMO-REC-002-01"),
    );
    expect(finding?.values.find((value) => value.recordId === "DEMO-REC-002-01")).toEqual({
      recordId: "DEMO-REC-002-01",
      original: "0518/1",
      normalized: "0518/1",
    });
  });

  it("treats Bangla digits and surrounding spaces as the same dag value", () => {
    const state = play([edit(2, " ৫১৮ "), { type: "run" }]);
    const pair = state.run?.comparison.findings.map((finding) => finding.id);
    expect(pair).toEqual(["DAG_REFERENCE_MISMATCH:DEMO-REC-002-03:DEMO-REC-002-04"]);
  });
});

describe("validation", () => {
  it.each([["", "empty"], ["   ", "whitespace only"]])(
    "rejects %j (%s)",
    (value) => {
      expect(validateDagInput(value)).toMatch(/Enter a dag reference/);
    },
  );

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(validateDagInput("9".repeat(MAX_DAG_LENGTH))).toBeNull();
    expect(validateDagInput("9".repeat(MAX_DAG_LENGTH + 1))).toMatch(/at most 100/);
  });

  it("blocks comparison for invalid input and returns inline errors by position", () => {
    const result = runSandbox(records, ["518", "", "581", "x".repeat(101)]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toBeNull();
    expect(result.errors[1]).toMatch(/Enter a dag reference/);
    expect(result.errors[2]).toBeNull();
    expect(result.errors[3]).toMatch(/at most 100/);
  });

  it("does not run or replace results when the reducer is asked to run invalid input", () => {
    const blocked = play([edit(1, "   "), { type: "run" }]);
    expect(blocked.run).toBeNull();
    expect(blocked.blocked).toBe(true);

    const afterRun = play([{ type: "run" }, edit(1, ""), { type: "run" }]);
    expect(afterRun.blocked).toBe(true);
    expect(afterRun.stale).toBe(true);
    expect(ids(afterRun.run?.comparison.findings ?? [])).toEqual([
      "DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03",
    ]);
  });

  it("clears the blocked flag after the input is fixed and run", () => {
    const state = play([edit(1, ""), { type: "run" }, edit(1, "518"), { type: "run" }]);
    expect(state.blocked).toBe(false);
    expect(state.run).not.toBeNull();
  });
});

describe("stale results and reset", () => {
  it("marks results stale after an edit that follows a run, until the next run", () => {
    const ran = play([{ type: "run" }]);
    expect(ran.stale).toBe(false);

    const edited = sandboxReducer(records, ran, edit(2, "518"));
    expect(edited.stale).toBe(true);
    expect(edited.run).toBe(ran.run);

    const rerun = sandboxReducer(records, edited, { type: "run" });
    expect(rerun.stale).toBe(false);
  });

  it("marks stale even when an edit restores the original text", () => {
    const state = play([{ type: "run" }, edit(2, "518"), edit(2, "581")]);
    expect(state.stale).toBe(true);
  });

  it("is not stale when nothing has been run yet", () => {
    expect(play([edit(2, "518")]).stale).toBe(false);
  });

  it("reset restores the original values and clears the simulation", () => {
    const state = play([
      edit(2, "518"),
      edit(3, "oops"),
      { type: "run" },
      edit(0, "000"),
      { type: "reset" },
    ]);
    expect(state.drafts).toEqual(["518", "518", "581", "581"]);
    expect(state.run).toBeNull();
    expect(state.stale).toBe(false);
    expect(state.blocked).toBe(false);
  });

  it("ignores edits to a record that does not exist", () => {
    const state = createSandboxState(records);
    expect(sandboxReducer(records, state, edit(99, "1"))).toBe(state);
  });
});

describe("in-memory only", () => {
  it("does not touch browser storage in the sandbox code", () => {
    for (const file of ["./sandbox.ts", "../components/sandbox.tsx"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|lib\/review/);
    }
  });
});

import type { SourceRecord } from "@/data/cases";
import { compareDagReferences, type DagComparisonResult } from "./comparison";

export const MAX_DAG_LENGTH = 100;

export type SandboxRow = {
  recordId: string;
  originalDag: string;
  workingDag: string;
  changed: boolean;
};

export type SandboxRun = {
  rows: SandboxRow[];
  comparison: DagComparisonResult;
};

export function validateDagInput(value: string): string | null {
  if (value.trim().length === 0) return "Enter a dag reference.";
  if (value.length > MAX_DAG_LENGTH) {
    return `Use at most ${MAX_DAG_LENGTH} characters (currently ${value.length}).`;
  }
  return null;
}

export function validateDrafts(drafts: readonly string[]): (string | null)[] {
  return drafts.map(validateDagInput);
}

/** Deep copy so sandbox edits can never reach the source records. */
export function createWorkingCopy(
  records: readonly SourceRecord[],
): SourceRecord[] {
  return structuredClone([...records]);
}

/** Working copy with only the dag references replaced; values are kept exactly as typed. */
export function applyDagEdits(
  records: readonly SourceRecord[],
  drafts: readonly string[],
): SourceRecord[] {
  return createWorkingCopy(records).map((record, index) => ({
    ...record,
    dagReference: drafts[index] ?? record.dagReference,
  }));
}

export function runSandbox(
  records: readonly SourceRecord[],
  drafts: readonly string[],
):
  | { ok: true; run: SandboxRun }
  | { ok: false; errors: (string | null)[] } {
  const errors = validateDrafts(drafts);
  if (errors.some((error) => error !== null)) return { ok: false, errors };

  const working = applyDagEdits(records, drafts);
  return {
    ok: true,
    run: {
      rows: records.map((record, index) => ({
        recordId: record.id,
        originalDag: record.dagReference,
        workingDag: working[index].dagReference,
        changed: working[index].dagReference !== record.dagReference,
      })),
      comparison: compareDagReferences(working),
    },
  };
}

export type SandboxState = {
  drafts: string[];
  run: SandboxRun | null;
  /** True once an edit has happened after a run, until the next run. */
  stale: boolean;
  /** True when the last Run was refused because an input was invalid. */
  blocked: boolean;
};

export type SandboxAction =
  | { type: "edit"; index: number; value: string }
  | { type: "run" }
  | { type: "reset" };

export function createSandboxState(
  records: readonly SourceRecord[],
): SandboxState {
  return {
    drafts: records.map((record) => record.dagReference),
    run: null,
    stale: false,
    blocked: false,
  };
}

export function sandboxReducer(
  records: readonly SourceRecord[],
  state: SandboxState,
  action: SandboxAction,
): SandboxState {
  switch (action.type) {
    case "edit": {
      if (action.index < 0 || action.index >= state.drafts.length) return state;
      return {
        ...state,
        drafts: state.drafts.map((draft, index) =>
          index === action.index ? action.value : draft,
        ),
        stale: state.run !== null,
        blocked: false,
      };
    }
    case "run": {
      const result = runSandbox(records, state.drafts);
      if (!result.ok) return { ...state, blocked: true };
      return { ...state, run: result.run, stale: false, blocked: false };
    }
    case "reset":
      return createSandboxState(records);
  }
}

import type { DemoCase } from "@/data/cases";
import type { ImportIssue, ImportResult } from "./import-schema";

export type ImportPhase = "idle" | "selected" | "validating" | "invalid" | "valid";

export type ImportState = {
  /** Bumped on every new selection so late results from an older selection are ignored. */
  token: number;
  phase: ImportPhase;
  file: { name: string; size: number } | null;
  issues: ImportIssue[];
  demoCase: DemoCase | null;
};

export type ImportAction =
  | { type: "select"; file: { name: string; size: number } }
  | { type: "clear-selection" }
  | { type: "validate-start"; token: number }
  | { type: "validate-done"; token: number; result: ImportResult };

export const initialImportState: ImportState = {
  token: 0,
  phase: "idle",
  file: null,
  issues: [],
  demoCase: null,
};

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case "select":
      return {
        token: state.token + 1,
        phase: "selected",
        file: action.file,
        issues: [],
        demoCase: null,
      };
    case "clear-selection":
      return { ...initialImportState, token: state.token + 1 };
    case "validate-start":
      if (action.token !== state.token || state.file === null) return state;
      return { ...state, phase: "validating", issues: [], demoCase: null };
    case "validate-done":
      if (action.token !== state.token || state.phase !== "validating") {
        return state;
      }
      return action.result.ok
        ? { ...state, phase: "valid", issues: [], demoCase: action.result.demoCase }
        : { ...state, phase: "invalid", issues: action.result.issues, demoCase: null };
  }
}

import { describe, expect, it } from "vitest";
import { demoCases } from "@/data/cases";
import {
  importReducer,
  initialImportState,
  type ImportAction,
  type ImportState,
} from "./import-session";
import { parseImportText, serializeSample, type ImportResult } from "./import-schema";
import {
  clearImportedCase,
  getImportedCase,
  setImportedCase,
  subscribeImportedCase,
} from "./imported-case-store";

const valid = (): ImportResult => parseImportText(serializeSample());
const invalid = (): ImportResult => parseImportText("{");
const file = (name: string) => ({ name, size: 100 });

function play(actions: ImportAction[], start: ImportState = initialImportState) {
  return actions.reduce(importReducer, start);
}

describe("import session", () => {
  it("moves through select, validate, and a valid result", () => {
    const selected = play([{ type: "select", file: file("a.json") }]);
    expect(selected).toMatchObject({ phase: "selected", token: 1 });

    const done = play(
      [
        { type: "validate-start", token: 1 },
        { type: "validate-done", token: 1, result: valid() },
      ],
      selected,
    );
    expect(done.phase).toBe("valid");
    expect(done.demoCase?.id).toBe("DEMO-CASE-002");
  });

  it("records problems from an invalid file and keeps no case", () => {
    const state = play([
      { type: "select", file: file("a.json") },
      { type: "validate-start", token: 1 },
      { type: "validate-done", token: 1, result: invalid() },
    ]);
    expect(state.phase).toBe("invalid");
    expect(state.issues[0].path).toBe("file");
    expect(state.demoCase).toBeNull();
  });

  it("a new selection invalidates the previous validation result", () => {
    const validated = play([
      { type: "select", file: file("a.json") },
      { type: "validate-start", token: 1 },
      { type: "validate-done", token: 1, result: valid() },
    ]);
    expect(validated.phase).toBe("valid");

    const next = importReducer(validated, { type: "select", file: file("b.json") });
    expect(next).toMatchObject({ phase: "selected", token: 2, demoCase: null, issues: [] });
  });

  it("a new selection also clears an earlier failure", () => {
    const failed = play([
      { type: "select", file: file("a.json") },
      { type: "validate-start", token: 1 },
      { type: "validate-done", token: 1, result: invalid() },
    ]);
    const next = importReducer(failed, { type: "select", file: file("b.json") });
    expect(next.issues).toEqual([]);
    expect(next.phase).toBe("selected");
  });

  it("ignores an older asynchronous read that finishes after a newer selection", () => {
    const state = play([
      { type: "select", file: file("a.json") },
      { type: "validate-start", token: 1 },
      { type: "select", file: file("b.json") },
      { type: "validate-done", token: 1, result: valid() },
    ]);
    expect(state).toMatchObject({ phase: "selected", token: 2, demoCase: null });
    expect(state.file?.name).toBe("b.json");
  });

  it("ignores a stale result even while the newer file is being validated", () => {
    const state = play([
      { type: "select", file: file("a.json") },
      { type: "validate-start", token: 1 },
      { type: "select", file: file("b.json") },
      { type: "validate-start", token: 2 },
      { type: "validate-done", token: 1, result: valid() },
    ]);
    expect(state.phase).toBe("validating");
    expect(state.demoCase).toBeNull();

    const finished = importReducer(state, { type: "validate-done", token: 2, result: invalid() });
    expect(finished.phase).toBe("invalid");
  });

  it("ignores results that arrive when nothing is being validated", () => {
    const selected = play([{ type: "select", file: file("a.json") }]);
    expect(importReducer(selected, { type: "validate-done", token: 1, result: valid() })).toBe(selected);
    expect(importReducer(initialImportState, { type: "validate-start", token: 0 })).toBe(initialImportState);
  });

  it("clearing the selection resets and invalidates in-flight reads", () => {
    const state = play([
      { type: "select", file: file("a.json") },
      { type: "validate-start", token: 1 },
      { type: "clear-selection" },
      { type: "validate-done", token: 1, result: valid() },
    ]);
    expect(state.phase).toBe("idle");
    expect(state.file).toBeNull();
    expect(state.demoCase).toBeNull();
  });
});

describe("imported case store", () => {
  it("holds the case in memory only, notifies listeners, and clears", () => {
    const result = valid();
    if (!result.ok) throw new Error("expected ok");
    let calls = 0;
    const unsubscribe = subscribeImportedCase(() => {
      calls += 1;
    });

    expect(getImportedCase()).toBeNull();
    setImportedCase(result.demoCase);
    expect(getImportedCase()?.id).toBe("DEMO-CASE-002");
    clearImportedCase();
    expect(getImportedCase()).toBeNull();
    expect(calls).toBe(2);

    unsubscribe();
    setImportedCase(result.demoCase);
    expect(calls).toBe(2);
    clearImportedCase();
  });

  it("freezes the imported copy but never the built-in fixtures", () => {
    const result = valid();
    if (!result.ok) throw new Error("expected ok");
    setImportedCase(result.demoCase);
    expect(Object.isFrozen(getImportedCase())).toBe(true);
    expect(Object.isFrozen(getImportedCase()?.records[0])).toBe(true);
    expect(Object.isFrozen(demoCases[1])).toBe(false);
    expect(Object.isFrozen(demoCases[1].records[0])).toBe(false);
    clearImportedCase();
  });
});

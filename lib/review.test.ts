import { describe, expect, it } from "vitest";
import {
  addReviewNote,
  MAX_NOTE_LENGTH,
  notesForFinding,
  parseReviewNotes,
  readReviewNotes,
  resetReviewNotes,
  REVIEW_STORAGE_KEY,
  type ReviewNote,
  type ReviewStorage,
} from "./review";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: ReviewStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { storage, data };
}

const throwingStorage = (failOn: "getItem" | "setItem" | "removeItem") => {
  const { storage } = fakeStorage();
  return {
    ...storage,
    [failOn]: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  } as ReviewStorage;
};

function note(overrides: Partial<ReviewNote> = {}): ReviewNote {
  return {
    id: "note-1",
    caseId: "CASE-1",
    findingId: "FINDING-1",
    label: "Needs review",
    note: "Check the original register.",
    savedAt: "2026-10-15T10:00:00.000Z",
    ...overrides,
  };
}

const serialize = (notes: unknown[]) => JSON.stringify({ version: 1, notes });

describe("parseReviewNotes", () => {
  it("treats missing data as an empty, healthy store", () => {
    expect(parseReviewNotes(null)).toEqual({
      status: "ok",
      notes: [],
      discarded: 0,
    });
  });

  it("accepts valid notes", () => {
    const result = parseReviewNotes(serialize([note()]));
    expect(result.status).toBe("ok");
    expect(result.notes).toEqual([note()]);
    expect(result.discarded).toBe(0);
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a JSON string", '"hello"'],
    ["JSON null", "null"],
    ["an array", "[]"],
    ["the wrong version", JSON.stringify({ version: 2, notes: [] })],
    ["a non-array notes field", JSON.stringify({ version: 1, notes: {} })],
  ])("reports %s as corrupt", (_name, raw) => {
    expect(parseReviewNotes(raw)).toEqual({
      status: "corrupt",
      notes: [],
      discarded: 0,
    });
  });

  it("discards and counts invalid entries but keeps valid ones", () => {
    const result = parseReviewNotes(
      serialize([
        note({ id: "good" }),
        { ...note({ id: "bad-label" }), label: "Resolved" },
        { ...note({ id: "no-finding" }), findingId: "" },
        { ...note({ id: "blank-note" }), note: "   " },
        { ...note({ id: "bad-date" }), savedAt: "yesterday" },
        { ...note({ id: "non-iso-date" }), savedAt: "2026-10-15" },
        { ...note({ id: "too-long" }), note: "x".repeat(MAX_NOTE_LENGTH + 1) },
        { ...note({ id: "wrong-type" }), caseId: 7 },
        "not an object",
        null,
      ]),
    );
    expect(result.status).toBe("ok");
    expect(result.notes.map((entry) => entry.id)).toEqual(["good"]);
    expect(result.discarded).toBe(9);
  });
});

describe("readReviewNotes", () => {
  it("reports unavailable storage", () => {
    expect(readReviewNotes(null).status).toBe("unavailable");
    expect(readReviewNotes(throwingStorage("getItem")).status).toBe(
      "unavailable",
    );
  });

  it("reads saved notes from storage", () => {
    const { storage } = fakeStorage({
      [REVIEW_STORAGE_KEY]: serialize([note()]),
    });
    expect(readReviewNotes(storage).notes).toEqual([note()]);
  });

  it("reports corrupt saved data", () => {
    const { storage } = fakeStorage({ [REVIEW_STORAGE_KEY]: "{oops" });
    expect(readReviewNotes(storage).status).toBe("corrupt");
  });
});

describe("addReviewNote", () => {
  const input = {
    caseId: "CASE-1",
    findingId: "FINDING-1",
    label: "Reviewed",
    note: "  Looks like a transcription difference.  ",
  };
  const options = {
    now: () => new Date("2026-10-15T12:30:00.000Z"),
    createId: () => "note-fixed",
  };

  it("saves a timestamped note with the case and finding IDs", () => {
    const { storage, data } = fakeStorage();
    const result = addReviewNote(storage, input, options);

    expect(result).toEqual({
      ok: true,
      saved: {
        id: "note-fixed",
        caseId: "CASE-1",
        findingId: "FINDING-1",
        label: "Reviewed",
        note: "Looks like a transcription difference.",
        savedAt: "2026-10-15T12:30:00.000Z",
      },
      notes: [expect.objectContaining({ id: "note-fixed" })],
    });
    expect(JSON.parse(data.get(REVIEW_STORAGE_KEY) ?? "null")).toEqual({
      version: 1,
      notes: [expect.objectContaining({ findingId: "FINDING-1" })],
    });
  });

  it("appends and keeps earlier history instead of overwriting it", () => {
    const { storage } = fakeStorage({
      [REVIEW_STORAGE_KEY]: serialize([note({ id: "first" })]),
    });
    const result = addReviewNote(storage, input, options);

    expect(result.ok).toBe(true);
    const saved = readReviewNotes(storage).notes;
    expect(saved.map((entry) => entry.id)).toEqual(["first", "note-fixed"]);
  });

  it("keeps notes for different findings separate", () => {
    const { storage } = fakeStorage();
    addReviewNote(storage, { ...input, findingId: "F-1" }, options);
    addReviewNote(
      storage,
      { ...input, findingId: "F-2" },
      { ...options, createId: () => "note-2" },
    );
    const notes = readReviewNotes(storage).notes;
    expect(notesForFinding(notes, "F-1")).toHaveLength(1);
    expect(notesForFinding(notes, "F-2")[0].id).toBe("note-2");
  });

  it("rejects an unknown label, an empty note, and an oversized note", () => {
    const { storage, data } = fakeStorage();
    expect(addReviewNote(storage, { ...input, label: "Resolved" }).ok).toBe(false);
    expect(addReviewNote(storage, { ...input, note: "   " }).ok).toBe(false);
    expect(
      addReviewNote(storage, { ...input, note: "x".repeat(MAX_NOTE_LENGTH + 1) }).ok,
    ).toBe(false);
    expect(data.size).toBe(0);
  });

  it("rejects a missing case or finding ID", () => {
    const { storage } = fakeStorage();
    expect(addReviewNote(storage, { ...input, caseId: "" }).ok).toBe(false);
    expect(addReviewNote(storage, { ...input, findingId: " " }).ok).toBe(false);
  });

  it("does not save when storage is unavailable", () => {
    expect(addReviewNote(null, input).ok).toBe(false);
    expect(addReviewNote(throwingStorage("getItem"), input).ok).toBe(false);
  });

  it("reports a write failure instead of throwing", () => {
    const result = addReviewNote(throwingStorage("setItem"), input);
    expect(result.ok).toBe(false);
  });

  it("refuses to overwrite corrupt saved data", () => {
    const { storage, data } = fakeStorage({ [REVIEW_STORAGE_KEY]: "{oops" });
    const result = addReviewNote(storage, input);

    expect(result.ok).toBe(false);
    expect(data.get(REVIEW_STORAGE_KEY)).toBe("{oops");
  });
});

describe("resetReviewNotes", () => {
  it("removes saved notes", () => {
    const { storage, data } = fakeStorage({
      [REVIEW_STORAGE_KEY]: serialize([note()]),
    });
    expect(resetReviewNotes(storage)).toEqual({ ok: true });
    expect(data.has(REVIEW_STORAGE_KEY)).toBe(false);
  });

  it("clears corrupt saved data so saving works again", () => {
    const { storage } = fakeStorage({ [REVIEW_STORAGE_KEY]: "{oops" });
    resetReviewNotes(storage);
    expect(readReviewNotes(storage).status).toBe("ok");
  });

  it("reports unavailable or blocked storage", () => {
    expect(resetReviewNotes(null).ok).toBe(false);
    expect(resetReviewNotes(throwingStorage("removeItem")).ok).toBe(false);
  });
});

describe("notesForFinding", () => {
  it("returns only the notes for that finding, in saved order", () => {
    const notes = [
      note({ id: "1", findingId: "A" }),
      note({ id: "2", findingId: "B" }),
      note({ id: "3", findingId: "A" }),
    ];
    expect(notesForFinding(notes, "A").map((entry) => entry.id)).toEqual(["1", "3"]);
  });
});

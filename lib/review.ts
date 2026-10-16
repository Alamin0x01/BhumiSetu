export const REVIEW_STORAGE_KEY = "bhumisetu.reviewNotes.v1";
export const REVIEW_LABELS = ["Needs review", "Reviewed"] as const;
export const MAX_NOTE_LENGTH = 2000;

export type ReviewLabel = (typeof REVIEW_LABELS)[number];

export type ReviewNote = {
  id: string;
  caseId: string;
  findingId: string;
  label: ReviewLabel;
  note: string;
  /** ISO 8601 UTC timestamp from the browser clock; not tamper-proof. */
  savedAt: string;
};

export type ReviewStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ReviewNotesState = {
  status: "ok" | "corrupt" | "unavailable";
  notes: ReviewNote[];
  /** Saved entries that failed validation and are ignored. */
  discarded: number;
};

function isReviewLabel(value: unknown): value is ReviewLabel {
  return REVIEW_LABELS.some((label) => label === value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isReviewNote(value: unknown): value is ReviewNote {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (
    !isNonEmptyString(entry.id) ||
    !isNonEmptyString(entry.caseId) ||
    !isNonEmptyString(entry.findingId) ||
    !isReviewLabel(entry.label) ||
    !isNonEmptyString(entry.note) ||
    entry.note.length > MAX_NOTE_LENGTH ||
    typeof entry.savedAt !== "string"
  ) {
    return false;
  }
  const savedAt = new Date(entry.savedAt);
  return !Number.isNaN(savedAt.getTime()) && savedAt.toISOString() === entry.savedAt;
}

export function parseReviewNotes(raw: string | null): ReviewNotesState {
  if (raw === null) return { status: "ok", notes: [], discarded: 0 };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { status: "corrupt", notes: [], discarded: 0 };
  }

  const container = data as { version?: unknown; notes?: unknown } | null;
  if (
    typeof container !== "object" ||
    container === null ||
    container.version !== 1 ||
    !Array.isArray(container.notes)
  ) {
    return { status: "corrupt", notes: [], discarded: 0 };
  }

  const notes = container.notes.filter(isReviewNote);
  return {
    status: "ok",
    notes,
    discarded: container.notes.length - notes.length,
  };
}

export function readReviewNotes(
  storage: ReviewStorage | null,
): ReviewNotesState {
  if (!storage) return { status: "unavailable", notes: [], discarded: 0 };
  try {
    return parseReviewNotes(storage.getItem(REVIEW_STORAGE_KEY));
  } catch {
    return { status: "unavailable", notes: [], discarded: 0 };
  }
}

export type SaveReviewNoteInput = {
  caseId: string;
  findingId: string;
  label: string;
  note: string;
};

export type SaveReviewNoteResult =
  | { ok: true; saved: ReviewNote; notes: ReviewNote[] }
  | { ok: false; error: string };

type SaveOptions = { now?: () => Date; createId?: () => string };

function defaultCreateId(): string {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Appends a note; existing history is kept and never rewritten. */
export function addReviewNote(
  storage: ReviewStorage | null,
  input: SaveReviewNoteInput,
  options: SaveOptions = {},
): SaveReviewNoteResult {
  if (!isNonEmptyString(input.caseId) || !isNonEmptyString(input.findingId)) {
    return { ok: false, error: "A case ID and finding ID are required." };
  }
  if (!isReviewLabel(input.label)) {
    return { ok: false, error: "Choose a review label." };
  }
  const note = input.note.trim();
  if (note.length === 0) {
    return { ok: false, error: "Enter a note before saving." };
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Notes can be at most ${MAX_NOTE_LENGTH} characters.`,
    };
  }

  const existing = readReviewNotes(storage);
  if (existing.status === "unavailable" || !storage) {
    return {
      ok: false,
      error: "Browser storage is unavailable, so the note was not saved.",
    };
  }
  if (existing.status === "corrupt") {
    return {
      ok: false,
      error:
        "Saved notes in this browser are unreadable. Reset local notes before saving a new one.",
    };
  }

  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? defaultCreateId;
  const saved: ReviewNote = {
    id: createId(),
    caseId: input.caseId,
    findingId: input.findingId,
    label: input.label,
    note,
    savedAt: now().toISOString(),
  };
  const notes = [...existing.notes, saved];

  try {
    storage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({ version: 1, notes }));
  } catch {
    return {
      ok: false,
      error: "The note could not be saved. Browser storage may be full or blocked.",
    };
  }
  return { ok: true, saved, notes };
}

export function resetReviewNotes(
  storage: ReviewStorage | null,
): { ok: true } | { ok: false; error: string } {
  if (!storage) {
    return { ok: false, error: "Browser storage is unavailable." };
  }
  try {
    storage.removeItem(REVIEW_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, error: "Local notes could not be reset." };
  }
}

export function notesForFinding(
  notes: readonly ReviewNote[],
  findingId: string,
): ReviewNote[] {
  return notes.filter((note) => note.findingId === findingId);
}

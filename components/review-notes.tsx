"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  addReviewNote,
  MAX_NOTE_LENGTH,
  notesForFinding,
  parseReviewNotes,
  resetReviewNotes,
  REVIEW_LABELS,
  REVIEW_STORAGE_KEY,
  type ReviewLabel,
  type ReviewNotesState,
  type ReviewStorage,
} from "@/lib/review";
import { Badge, secondaryButtonClass } from "./ui";

const CHANGE_EVENT = "bhumisetu:review-notes-changed";
const LOADING = "\u0000loading";
const UNAVAILABLE = "\u0000unavailable";

function getStorage(): ReviewStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): string | null {
  const storage = getStorage();
  if (!storage) return UNAVAILABLE;
  try {
    return storage.getItem(REVIEW_STORAGE_KEY);
  } catch {
    return UNAVAILABLE;
  }
}

function getServerSnapshot(): string | null {
  return LOADING;
}

/** Returns null until the browser storage has been read. */
function useReviewNotes(): ReviewNotesState | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (raw === LOADING) return null;
    if (raw === UNAVAILABLE) {
      return { status: "unavailable", notes: [], discarded: 0 };
    }
    return parseReviewNotes(raw);
  }, [raw]);
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const primaryButtonClass =
  "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none motion-reduce:transition-none";

function StorageWarning({ state }: { state: ReviewNotesState }) {
  if (state.status === "unavailable") {
    return (
      <p role="alert" className="text-sm text-amber-950">
        This browser blocked local storage. Notes cannot be saved or shown.
      </p>
    );
  }
  if (state.status === "corrupt") {
    return (
      <p role="alert" className="text-sm text-amber-950">
        Saved notes in this browser are unreadable and are not shown. Use
        &ldquo;Reset local notes&rdquo; below before saving new notes.
      </p>
    );
  }
  if (state.discarded > 0) {
    return (
      <p role="status" className="text-sm text-amber-950">
        {state.discarded} saved {state.discarded === 1 ? "entry was" : "entries were"}{" "}
        invalid and ignored. Saving a note drops them.
      </p>
    );
  }
  return null;
}

function LabelBadge({ label }: { label: ReviewLabel | null | undefined }) {
  if (label === "Needs review") return <Badge tone="amber">Needs review</Badge>;
  if (label === "Reviewed") return <Badge tone="emerald">Reviewed</Badge>;
  return <Badge tone="slate">{label === undefined ? "Loading notes" : "No review label yet"}</Badge>;
}

export function ReviewNotes({
  caseId,
  findingId,
}: {
  caseId: string;
  findingId: string;
}) {
  const state = useReviewNotes();
  const baseId = useId();
  const [label, setLabel] = useState<ReviewLabel>("Needs review");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const history = state ? notesForFinding(state.notes, findingId) : [];
  const currentLabel =
    history.length > 0 ? history[history.length - 1].label : null;
  const canSave = state?.status === "ok";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addReviewNote(getStorage(), {
      caseId,
      findingId,
      label,
      note,
    });
    if (!result.ok) {
      setSaved(false);
      setError(result.error);
      return;
    }
    notifyChange();
    setNote("");
    setError(null);
    setSaved(true);
  }

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id={`${baseId}-heading`}
          className="text-base font-semibold text-slate-900"
        >
          Reviewer notes
        </h4>
        <LabelBadge label={state === null ? undefined : currentLabel} />
      </div>
      <p className="text-sm leading-6 text-slate-700">
        A review label does not remove or resolve the computed finding.
      </p>

      {state && <StorageWarning state={state} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-900">
            Review label
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {REVIEW_LABELS.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-150 hover:bg-slate-50 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:font-semibold motion-reduce:transition-none"
              >
                <input
                  type="radio"
                  name={`${baseId}-label`}
                  value={option}
                  checked={label === option}
                  onChange={() => setLabel(option)}
                  className="accent-emerald-700"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${baseId}-note`}
            className="text-sm font-medium text-slate-900"
          >
            Note
          </label>
          <textarea
            id={`${baseId}-note`}
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            rows={3}
            onChange={(event) => {
              setNote(event.target.value);
              if (error) setError(null);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-150 hover:border-slate-400 motion-reduce:transition-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!canSave} className={primaryButtonClass}>
            Save note
          </button>
          <p role="status" className="min-h-5 text-sm font-semibold text-emerald-800">
            {saved ? "Note saved" : ""}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-amber-950">
            {error}
          </p>
        )}
      </form>

      {history.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Note history (oldest first)
          </p>
          <ol className="mt-2 flex flex-col gap-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2 text-slate-700">
                  <time dateTime={entry.savedAt}>
                    {new Date(entry.savedAt).toLocaleString()}
                  </time>
                  <LabelBadge label={entry.label} />
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words">{entry.note}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export function ResetReviewNotes() {
  const state = useReviewNotes();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  function handleConfirm() {
    const result = resetReviewNotes(getStorage());
    setConfirming(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    notifyChange();
    setMessage({ kind: "success", text: "All local reviewer notes were deleted." });
  }

  const noteCount = state?.notes.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      {state && state.status !== "ok" && <StorageWarning state={state} />}
      {!confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setConfirming(true);
            }}
            className={secondaryButtonClass}
          >
            Reset local notes
          </button>
          <span className="text-sm text-slate-700">
            {state === null
              ? "Loading local notes"
              : `${noteCount} saved ${noteCount === 1 ? "note" : "notes"} in this browser`}
          </span>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Confirm reset of local notes"
          className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4"
        >
          <p className="text-sm font-medium text-amber-950">
            Delete all saved reviewer notes in this browser? This cannot be
            undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-amber-950 motion-reduce:transition-none"
            >
              Yes, delete all local notes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <p role="status" className="min-h-5 text-sm font-medium text-emerald-800">
        {message?.kind === "success" ? message.text : ""}
      </p>
      {message?.kind === "error" && (
        <p role="alert" className="text-sm font-medium text-amber-950">
          {message.text}
        </p>
      )}
    </div>
  );
}

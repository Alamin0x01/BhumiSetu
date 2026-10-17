"use client";

import { useRouter } from "next/navigation";
import { useReducer, useRef, type ChangeEvent } from "react";
import {
  importReducer,
  initialImportState,
} from "@/lib/import-session";
import {
  checkFileMeta,
  formatBytes,
  MAX_FILE_BYTES,
  parseImportText,
  SAMPLE_FILE_NAME,
  serializeSample,
  type ImportResult,
} from "@/lib/import-schema";
import { setImportedCase } from "@/lib/imported-case-store";
import { Badge, cardClass, primaryButtonClass, secondaryButtonClass } from "./ui";

const disabledStyle =
  "disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none";

function downloadSample() {
  const blob = new Blob([serializeSample()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = SAMPLE_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportPanel() {
  const router = useRouter();
  const fileRef = useRef<File | null>(null);
  const [state, dispatch] = useReducer(importReducer, initialImportState);

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    fileRef.current = file;
    if (!file) {
      dispatch({ type: "clear-selection" });
      return;
    }
    dispatch({ type: "select", file: { name: file.name, size: file.size } });
  }

  async function handleValidate() {
    const file = fileRef.current;
    if (!file) return;
    const token = state.token;
    dispatch({ type: "validate-start", token });

    const metaIssues = checkFileMeta({ name: file.name, size: file.size });
    let result: ImportResult;
    if (metaIssues.length > 0) {
      result = { ok: false, issues: metaIssues };
    } else {
      try {
        result = parseImportText(await file.text());
      } catch {
        result = {
          ok: false,
          issues: [{ path: "file", message: "could not be read in this browser." }],
        };
      }
    }
    dispatch({ type: "validate-done", token, result });
  }

  function handleOpen() {
    if (state.phase !== "valid" || !state.demoCase) return;
    setImportedCase(state.demoCase);
    router.push("/import/case");
  }

  const statusText =
    state.phase === "idle"
      ? "No file selected."
      : state.phase === "selected"
        ? "File selected. Choose \u201cValidate Dataset\u201d to check it."
        : state.phase === "validating"
          ? "Validating the file in this browser\u2026"
          : state.phase === "valid"
            ? "Case Workspace Ready. Open it in step 3."
            : "";

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="import-sample-heading"
        className={`${cardClass} flex flex-col gap-3 p-5 sm:p-6`}
      >
        <h2 id="import-sample-heading" className="text-xl font-semibold tracking-tight text-slate-900">
          1. Get a reference dataset
        </h2>
        <p className="max-w-3xl text-base leading-7 text-slate-700">
          The reference dataset is generated in the browser from a built-in
          synthetic fixture, using exactly the import schema.
        </p>
        <div>
          <button type="button" onClick={downloadSample} className={secondaryButtonClass}>
            Download Reference Dataset
          </button>
        </div>
      </section>

      <section
        aria-labelledby="import-file-heading"
        className={`${cardClass} flex flex-col gap-4 p-5 sm:p-6`}
      >
        <h2 id="import-file-heading" className="text-xl font-semibold tracking-tight text-slate-900">
          2. Choose and validate a dataset
        </h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="import-file" className="text-sm font-medium text-slate-900">
            Review dataset file (one .json file, up to {formatBytes(MAX_FILE_BYTES)})
          </label>
          <input
            id="import-file"
            type="file"
            accept=".json,application/json"
            onChange={handleSelect}
            aria-describedby="import-file-hint"
            className="block w-full max-w-xl rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-900"
          />
          <p id="import-file-hint" className="text-sm text-slate-700">
            {state.file
              ? `Selected: ${state.file.name} (${formatBytes(state.file.size)})`
              : "The file is read in this browser only. It is not uploaded."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={state.file === null || state.phase === "validating"}
            className={`${primaryButtonClass} ${disabledStyle}`}
          >
            Validate Dataset
          </button>
          <p role="status" className="min-h-6 text-sm font-semibold text-slate-900">
            {statusText}
          </p>
        </div>

        {state.phase === "invalid" && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-4 text-amber-950"
          >
            <h3 className="text-base font-semibold">
              Validation failed: {state.issues.length}{" "}
              {state.issues.length === 1 ? "problem" : "problems"}
            </h3>
            <p className="mt-1 text-sm">
              Nothing was imported. Fix the file and validate it again.
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {state.issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`} className="break-words">
                  <span className="font-mono font-semibold">{issue.path}</span>:{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.phase === "valid" && state.demoCase && (
          <div className="rounded-xl border border-emerald-300 border-l-4 border-l-emerald-600 bg-emerald-50 p-4 text-emerald-950">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="emerald">Case Workspace Ready</Badge>
              <span className="text-sm">Validation passed. Preview (text only)</span>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="font-medium">Case title</dt>
              <dd className="break-words">{state.demoCase.title}</dd>
              <dt className="font-medium">Case ID</dt>
              <dd className="break-words font-mono">{state.demoCase.id}</dd>
              <dt className="font-medium">Records</dt>
              <dd>{state.demoCase.records.length}</dd>
            </dl>
          </div>
        )}
      </section>

      <section
        aria-labelledby="import-open-heading"
        className={`${cardClass} flex flex-col gap-3 p-5 sm:p-6`}
      >
        <h2 id="import-open-heading" className="text-xl font-semibold tracking-tight text-slate-900">
          3. Open the case workspace
        </h2>
        <p id="import-open-hint" className="max-w-3xl text-base leading-7 text-slate-700">
          Available after a successful validation. The case stays in memory for
          this browser session only and is cleared when you reload the page.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpen}
            disabled={state.phase !== "valid"}
            aria-describedby="import-open-hint"
            className={`${primaryButtonClass} ${disabledStyle}`}
          >
            Open Case Workspace
          </button>
        </div>
      </section>
    </div>
  );
}

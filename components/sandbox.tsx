"use client";

import { useId, useReducer, useState } from "react";
import type { SourceRecord } from "@/data/cases";
import { documentTypeLabels } from "@/lib/evidence";
import {
  createSandboxState,
  sandboxReducer,
  validateDrafts,
  type SandboxAction,
  type SandboxRun,
  type SandboxState,
} from "@/lib/sandbox";
import { skipReasonLabels } from "./dag-comparison";
import { EvidenceLink } from "./evidence-link";
import {
  Badge,
  cardClass,
  primaryButtonClass,
  SectionHeading,
  secondaryButtonClass,
} from "./ui";

function Quoted({ value }: { value: string }) {
  return (
    <code className="whitespace-pre-wrap break-all rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 ring-1 ring-slate-200">
      {`"${value}"`}
    </code>
  );
}

export function SandboxResults({
  run,
  stale,
}: {
  run: SandboxRun;
  stale: boolean;
}) {
  const { comparison, rows } = run;
  const originalOf = (recordId: string) =>
    rows.find((row) => row.recordId === recordId)?.originalDag ?? "";
  const counts = [
    { label: "Findings in working copy", value: comparison.findings.length },
    { label: "Pairs compared", value: comparison.comparedCount },
    { label: "Skipped or incomplete", value: comparison.skipped.length },
    { label: "Validation issues", value: comparison.validationIssues.length },
  ];

  return (
    <section
      aria-labelledby="sandbox-results-heading"
      className={`${cardClass} flex flex-col gap-5 p-5 lg:p-6`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3
          id="sandbox-results-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Simulated results
        </h3>
        <Badge tone="slate">Simulation</Badge>
        {stale ? (
          <Badge tone="amber">Stale: run comparison again</Badge>
        ) : (
          <Badge tone="emerald">Up to date</Badge>
        )}
      </div>
      {stale && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950">
          These results are from an earlier run and do not reflect your latest
          edits. Run the comparison again to refresh them.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((count) => (
          <div
            key={count.label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <dt className="text-sm font-medium text-slate-700">{count.label}</dt>
            <dd className="mt-1 text-3xl font-semibold text-slate-900">
              {count.value}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <h4 className="text-base font-semibold text-slate-900">
          Source versus working-copy dag references
        </h4>
        <div
          role="region"
          aria-label="Source versus working-copy values, scrollable"
          tabIndex={0}
          className="mt-2 overflow-x-auto rounded-lg border border-slate-200"
        >
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Source and working-copy dag references used in this run
            </caption>
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold text-slate-900">Record</th>
                <th scope="col" className="px-4 py-2 font-semibold text-slate-900">Source value</th>
                <th scope="col" className="px-4 py-2 font-semibold text-slate-900">Working-copy value</th>
                <th scope="col" className="px-4 py-2 font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.recordId}-${index}`} className="border-t border-slate-200">
                  <th scope="row" className="px-4 py-2 font-normal">
                    <EvidenceLink recordId={row.recordId} />
                  </th>
                  <td className="px-4 py-2"><Quoted value={row.originalDag} /></td>
                  <td className="px-4 py-2"><Quoted value={row.workingDag} /></td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {row.changed ? "Edited" : "Unchanged"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {comparison.validationIssues.length > 0 && (
        <div className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 px-5 py-4 text-amber-950">
          <h4 className="text-base font-semibold">Data-validation issues</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {comparison.validationIssues.map((issue) => (
              <li key={`${issue.code}:${issue.recordId}`}>
                <span className="font-mono">{issue.code}</span>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.findings.length === 0 ? (
        <p className="rounded-lg border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-4 text-base font-medium text-slate-900">
          No dag mismatch found among comparable linked records.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comparison.findings.map((finding) => (
            <li
              key={finding.id}
              className="rounded-xl border border-slate-200 border-t-4 border-t-amber-400 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">Simulated finding: review needed</Badge>
                <span className="font-mono text-sm text-slate-700">
                  {finding.ruleId}
                </span>
              </div>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">
                Dag reference differs in the working copy:{" "}
                {finding.sourceRecordIds[0]} and {finding.sourceRecordIds[1]}
              </h4>
              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                Finding ID: {finding.id}
              </p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {finding.values.map((value) => (
                  <div
                    key={value.recordId}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <dt className="text-sm font-medium text-slate-700">
                      Evidence record: <EvidenceLink recordId={value.recordId} />
                    </dt>
                    <dd className="mt-2 flex flex-col gap-1.5 text-sm text-slate-900">
                      <span>
                        Source value: <Quoted value={originalOf(value.recordId)} />
                      </span>
                      <span>
                        Working-copy value: <Quoted value={value.original} />
                      </span>
                      <span className="text-slate-700">
                        Normalized: <Quoted value={value.normalized} />
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-base leading-7 text-slate-900">
                {finding.explanation}
              </p>
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-900">
                <span className="font-semibold">Limitation:</span>{" "}
                {finding.limitation}
              </p>
            </li>
          ))}
        </ul>
      )}

      {comparison.skipped.length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-slate-900">
            Skipped or incomplete comparisons
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {comparison.skipped.map((item) => (
              <li key={item.recordIds.join(":")}>
                <span className="font-mono">
                  {item.recordIds[0]} and {item.recordIds[1]}
                </span>
                : {skipReasonLabels[item.reason]}. {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm leading-6 text-slate-700">
        Only dag-reference comparison is implemented. Nothing here verifies
        ownership or any other field.
      </p>
    </section>
  );
}

export function Sandbox({ records }: { records: readonly SourceRecord[] }) {
  const baseId = useId();
  const [state, dispatch] = useReducer(
    (current: SandboxState, action: SandboxAction) =>
      sandboxReducer(records, current, action),
    records,
    createSandboxState,
  );
  const [announcement, setAnnouncement] = useState("");

  const errors = validateDrafts(state.drafts);
  const invalidCount = errors.filter((error) => error !== null).length;
  const editedCount = state.drafts.filter(
    (draft, index) => draft !== records[index].dagReference,
  ).length;

  function handleRun() {
    const next = sandboxReducer(records, state, { type: "run" });
    dispatch({ type: "run" });
    setAnnouncement(
      next.blocked || !next.run
        ? ""
        : `Comparison finished. ${next.run.comparison.findings.length} finding${next.run.comparison.findings.length === 1 ? "" : "s"} in the working copy.`,
    );
  }

  function handleReset() {
    dispatch({ type: "reset" });
    setAnnouncement("Sandbox reset. Original values restored.");
  }

  const statusText = state.stale
    ? "Results are out of date after your edit. Run the comparison again."
    : announcement;

  return (
    <section aria-labelledby="sandbox-heading" className="flex flex-col gap-5">
      <SectionHeading
        id="sandbox-heading"
        description="Change dag references in a temporary working copy, then rerun the same comparison engine on every eligible linked pair. Only dag references can be edited."
      >
        What-if sandbox
      </SectionHeading>

      <div
        role="note"
        aria-label="Simulation notice"
        className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 px-5 py-4 text-amber-950"
      >
        <p className="text-base font-semibold">
          Simulation only. Original records are unchanged. This is not an
          official correction or ownership verification.
        </p>
        <p className="mt-1 text-sm">
          Edits stay in this page&apos;s memory only. They are not saved, and
          reviewer notes are never attached to simulated findings.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleRun();
        }}
        className="flex flex-col gap-4"
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {records.map((record, index) => {
            const inputId = `${baseId}-dag-${index}`;
            const error = errors[index];
            const edited = state.drafts[index] !== record.dagReference;
            return (
              <li
                key={`${record.id}-${index}`}
                className={`${cardClass} flex flex-col gap-2 p-4`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="slate">
                    {documentTypeLabels[record.documentType]}
                  </Badge>
                  <span className="font-mono text-sm text-slate-700">
                    {record.id}
                  </span>
                </div>
                <label
                  htmlFor={inputId}
                  className="text-sm font-medium text-slate-900"
                >
                  Dag reference for {record.id}
                </label>
                <input
                  id={inputId}
                  type="text"
                  value={state.drafts[index]}
                  onChange={(event) => {
                    setAnnouncement("");
                    dispatch({
                      type: "edit",
                      index,
                      value: event.target.value,
                    });
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={error !== null}
                  aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-base text-slate-900 transition-colors duration-150 motion-reduce:transition-none ${
                    error
                      ? "border-amber-600 bg-amber-50"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                />
                <p id={`${inputId}-hint`} className="text-sm text-slate-700">
                  Source value: <Quoted value={record.dagReference} />
                  {edited && (
                    <span className="ml-2 font-semibold text-emerald-900">
                      Edited
                    </span>
                  )}
                </p>
                {error && (
                  <p
                    id={`${inputId}-error`}
                    role="alert"
                    className="text-sm font-medium text-amber-950"
                  >
                    Error: {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primaryButtonClass}>
            Run comparison
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={secondaryButtonClass}
          >
            Reset sandbox
          </button>
          <p className="text-sm text-slate-700">
            {editedCount} of {records.length} dag references edited
          </p>
        </div>

        <p
          role="status"
          className="min-h-6 text-sm font-semibold text-slate-900"
        >
          {statusText}
        </p>
        {state.blocked && (
          <p role="alert" className="text-sm font-semibold text-amber-950">
            Comparison not run: fix {invalidCount} invalid dag reference
            {invalidCount === 1 ? "" : "s"} first.
          </p>
        )}
      </form>

      {state.run ? (
        <SandboxResults run={state.run} stale={state.stale} />
      ) : (
        <p className={`${cardClass} p-5 text-base text-slate-700`}>
          No simulation has been run yet. Edit a dag reference if you like, then
          choose &ldquo;Run comparison&rdquo;.
        </p>
      )}
    </section>
  );
}

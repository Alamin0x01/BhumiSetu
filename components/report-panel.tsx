"use client";

import Link from "next/link";
import { useState } from "react";
import { downloadTextFile } from "@/lib/download";
import {
  reportFileName,
  serializeReport,
  type ReviewReport,
} from "@/lib/report";
import { ReportView } from "./report-view";
import {
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
  textLinkClass,
} from "./ui";

export function ReportPanel({
  buildReport,
  backHref,
  backLabel,
}: {
  /** Called once per export action; the result is the only data the preview, JSON, and print use. */
  buildReport: () => ReviewReport;
  backHref: string;
  backLabel: string;
}) {
  const [snapshot, setSnapshot] = useState<ReviewReport | null>(null);
  const [message, setMessage] = useState("");

  function handleGenerate() {
    const next = buildReport();
    setSnapshot(next);
    setMessage(`Snapshot generated at ${next.generatedAtLocal} (${next.timeZone}).`);
  }

  function handleDownload() {
    if (!snapshot) return;
    downloadTextFile(
      reportFileName(snapshot),
      serializeReport(snapshot),
      "application/json",
    );
    setMessage("Report JSON saved from the current snapshot.");
  }

  const storageStatus = snapshot?.reviewNotes.storageStatus;

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:gap-0 print:p-0">
        <div className="flex flex-col gap-6 print:hidden">
          <Link href={backHref} className={`${textLinkClass} w-fit text-base`}>
            {backLabel}
          </Link>

          <header className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Export review report
            </h1>
            <p className="mt-3 text-lg leading-8 text-slate-700">
              Generate a snapshot of this case&apos;s source records, computed
              findings, and evidence. The preview, the JSON file, and the print
              view all use that same snapshot, which is created in this browser
              only.
            </p>
          </header>

          <section
            aria-labelledby="report-actions-heading"
            className={`${cardClass} flex flex-col gap-4 p-5 sm:p-6`}
          >
            <h2
              id="report-actions-heading"
              className="text-xl font-semibold tracking-tight text-slate-900"
            >
              Snapshot and export
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                className={primaryButtonClass}
              >
                {snapshot ? "Refresh snapshot" : "Generate report preview"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={snapshot === null}
                className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Download report JSON
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={snapshot === null}
                className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Print report
              </button>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-700">
              Printing opens your browser&apos;s print dialog; choose
              &ldquo;Save as PDF&rdquo; there to keep a PDF. Notes saved after a
              snapshot are not included until you refresh it.
            </p>
            <p role="status" className="min-h-6 text-sm font-semibold text-slate-900">
              {message}
            </p>
            {snapshot && (
              <p className="break-all text-sm text-slate-700">
                File name: <span className="font-mono">{reportFileName(snapshot)}</span>
              </p>
            )}
            {(storageStatus === "corrupt" || storageStatus === "unavailable") && (
              <p
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-950"
              >
                {storageStatus === "unavailable"
                  ? "This browser blocked local storage, so no reviewer notes are included in this report."
                  : "Saved reviewer notes in this browser are unreadable, so no notes are included in this report."}
              </p>
            )}
          </section>
        </div>

        {snapshot ? (
          <ReportView report={snapshot} />
        ) : (
          <p className={`${cardClass} p-5 text-base text-slate-700 print:hidden`}>
            No report generated yet. Choose &ldquo;Generate report
            preview&rdquo; to see the report before you download or print it.
          </p>
        )}
      </main>
    </div>
  );
}

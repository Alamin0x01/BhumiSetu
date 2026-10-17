"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createReport, currentTimeContext } from "@/lib/report";
import {
  getImportedCase,
  subscribeImportedCase,
} from "@/lib/imported-case-store";
import { ReportPanel } from "./report-panel";
import { cardClass, primaryButtonClass, textLinkClass } from "./ui";

const getServerCase = () => null;

/** Imported cases: never reads or includes reviewer notes. */
export function ImportedReport() {
  const demoCase = useSyncExternalStore(
    subscribeImportedCase,
    getImportedCase,
    getServerCase,
  );

  if (!demoCase) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
          <Link href="/cases" className={`${textLinkClass} w-fit text-base`}>
            Back to Case Library
          </Link>
          <section className={`${cardClass} flex flex-col gap-3 p-6`}>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Export review report
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">
              No imported case is open in this browser session, so there is
              nothing to report. Imported data is kept in memory only and is
              cleared when the page is reloaded.
            </p>
            <div>
              <Link href="/import" className={primaryButtonClass}>
                Import Review Dataset
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <ReportPanel
      backHref="/import/case"
      backLabel="Back to Case Workspace"
      buildReport={() =>
        createReport({
          demoCase,
          origin: "imported",
          time: currentTimeContext(),
          notes: null,
        })
      }
    />
  );
}

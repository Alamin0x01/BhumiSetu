"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import type { DemoCase } from "@/data/cases";
import { compareDagReferences } from "@/lib/comparison";
import {
  clearImportedCase,
  getImportedCase,
  subscribeImportedCase,
} from "@/lib/imported-case-store";
import { CaseSummary } from "./case-summary";
import { CaseTabs } from "./case-tabs";
import { DagComparison } from "./dag-comparison";
import { ExportReportAction } from "./export-report-action";
import {
  EvidenceCompleteness,
  EvidenceTable,
  EvidenceTimeline,
} from "./evidence-view";
import { SourceRecordCards } from "./record-cards";
import {
  Badge,
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
  textLinkClass,
} from "./ui";

const getServerCase = () => null;

function NoticeCard({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      <p className="mt-1 max-w-3xl text-base leading-7 text-slate-700">
        {children}
      </p>
    </section>
  );
}

export function ImportedCaseView({
  demoCase,
  onClear,
}: {
  demoCase: DemoCase;
  onClear: () => void;
}) {
  const comparison = compareDagReferences(demoCase.records);

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/cases" className={`${textLinkClass} w-fit text-base`}>
          Back to demo cases
        </Link>

        <header className={`${cardClass} p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="slate">Imported Review Workspace</Badge>
            <p className="break-all font-mono text-sm text-slate-700">
              {demoCase.id}
            </p>
            <p className="text-sm text-slate-700">
              {demoCase.records.length} imported records
            </p>
          </div>
          <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {demoCase.title}
          </h1>
          <p className="mt-3 max-w-3xl break-words text-lg leading-8 text-slate-700">
            {demoCase.description}
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <ExportReportAction href="/import/case/report" />
            <button type="button" onClick={onClear} className={secondaryButtonClass}>
              Clear imported case
            </button>
            <Link href="/import" className={secondaryButtonClass}>
              Import another file
            </Link>
          </div>
        </header>

        <section
          role="note"
          aria-label="Imported case notice"
          className="rounded-xl border border-emerald-200 border-l-4 border-l-emerald-700 bg-emerald-50 px-5 py-3 shadow-sm"
        >
          <p className="text-base font-medium text-emerald-950">
            Imported synthetic case. Temporary browser session. Not official
            verification or legal advice.
          </p>
          <p className="mt-1 text-sm text-emerald-950">
            The synthetic declaration in the file is user-provided. BhumiSetu
            does not check imported data for personal information.
          </p>
        </section>

        <CaseSummary records={demoCase.records} result={comparison} />

        <CaseTabs
          overview={
            <div className="flex flex-col gap-8">
              <DagComparison
                result={comparison}
                caseId={demoCase.id}
                showReviewNotes={false}
              />
              <EvidenceCompleteness records={demoCase.records} />
              <NoticeCard heading="Reviewer notes are not available here">
                Reviewer-note editing is not available for imported cases in
                this milestone, and imported findings never use saved reviewer
                notes. Reference cases keep their local reviewer notes
                unchanged.
              </NoticeCard>
            </div>
          }
          records={
            <div className="flex flex-col gap-8">
              <EvidenceTable records={demoCase.records} />
              <SourceRecordCards
                records={demoCase.records}
                description="Imported records, shown exactly as provided."
              />
            </div>
          }
          timeline={<EvidenceTimeline records={demoCase.records} />}
          sandbox={
            <NoticeCard heading="The what-if sandbox is not available here">
              Sandbox controls are not available for imported cases in this
              milestone. The sandbox is unchanged on the reference cases.
            </NoticeCard>
          }
        />
      </main>
    </div>
  );
}

export function ImportedCaseEmpty({ justCleared }: { justCleared: boolean }) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/cases" className={`${textLinkClass} w-fit text-base`}>
          Back to Case Library
        </Link>
        <section className={`${cardClass} flex flex-col gap-3 p-6`}>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Imported Review Workspace
          </h1>
          <p role="status" className="min-h-6 text-base font-semibold text-emerald-900">
            {justCleared ? "Imported case cleared." : ""}
          </p>
          <p className="max-w-3xl text-lg leading-8 text-slate-700">
            No imported case is open in this browser session. Imported data is
            kept in memory only and is cleared when the page is reloaded.
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

export function ImportedCaseWorkspace() {
  const demoCase = useSyncExternalStore(
    subscribeImportedCase,
    getImportedCase,
    getServerCase,
  );
  const [cleared, setCleared] = useState(false);

  if (!demoCase) return <ImportedCaseEmpty justCleared={cleared} />;
  return (
    <ImportedCaseView
      demoCase={demoCase}
      onClear={() => {
        clearImportedCase();
        setCleared(true);
      }}
    />
  );
}

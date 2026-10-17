import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseSummary } from "@/components/case-summary";
import { CaseTabs } from "@/components/case-tabs";
import { DagComparison, LocalNotesNotice } from "@/components/dag-comparison";
import { Disclaimer } from "@/components/disclaimer";
import { ExportReportAction } from "@/components/export-report-action";
import { Sandbox } from "@/components/sandbox";
import {
  EvidenceCompleteness,
  EvidenceTable,
  EvidenceTimeline,
} from "@/components/evidence-view";
import { SourceRecordCards } from "@/components/record-cards";
import { Badge, cardClass, textLinkClass } from "@/components/ui";
import { demoCases } from "@/data/cases";
import { compareDagReferences } from "@/lib/comparison";

// Case data is static; this silences Next's dev-only "URL data outside Suspense" insight.
export const instant = false;

export function generateStaticParams() {
  return demoCases.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/cases/[id]">): Promise<Metadata> {
  const { id } = await params;
  const demoCase = demoCases.find((item) => item.id === id);
  return { title: demoCase ? `${demoCase.id} | BhumiSetu` : "Case not found" };
}

export default async function CaseDetailPage({
  params,
}: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const demoCase = demoCases.find((item) => item.id === id);

  if (!demoCase) {
    notFound();
  }

  const comparison = compareDagReferences(demoCase.records);

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/cases" className={`${textLinkClass} w-fit text-base`}>
          Back to Case Library
        </Link>

        <header className={`${cardClass} p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="emerald">Reference Case</Badge>
            <p className="font-mono text-sm text-slate-700">{demoCase.id}</p>
            <p className="text-sm text-slate-700">
              {demoCase.records.length} source records
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {demoCase.title}
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-700">
            {demoCase.description}
          </p>
          <div className="mt-4">
            <ExportReportAction href={`/cases/${demoCase.id}/report`} />
          </div>
        </header>

        <Disclaimer />

        <CaseSummary records={demoCase.records} result={comparison} />

        <CaseTabs
          overview={
            <div className="flex flex-col gap-8">
              <DagComparison result={comparison} caseId={demoCase.id} />
              <EvidenceCompleteness records={demoCase.records} />
              <LocalNotesNotice />
            </div>
          }
          records={
            <div className="flex flex-col gap-8">
              <EvidenceTable records={demoCase.records} />
              <SourceRecordCards records={demoCase.records} />
            </div>
          }
          timeline={<EvidenceTimeline records={demoCase.records} />}
          sandbox={<Sandbox records={demoCase.records} />}
        />
      </main>
    </div>
  );
}

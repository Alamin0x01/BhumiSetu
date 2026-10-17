import type { SourceRecord } from "@/data/cases";
import type { DagComparisonResult } from "@/lib/comparison";
import { findMissingLinks } from "@/lib/evidence";
import { SectionHeading } from "./ui";

export function CaseSummary({
  records,
  result,
}: {
  records: readonly SourceRecord[];
  result: DagComparisonResult;
}) {
  const missingCount = findMissingLinks(records).length;
  const findingCount = result.findings.length;
  const skippedCount = result.skipped.length;

  const tiles = [
    {
      label: "Source records",
      value: records.length,
      note: "Documents in this case",
      attention: false,
    },
    {
      label: "Linked pairs compared",
      value: result.comparedCount,
      note: "Explicit same-parcel links",
      attention: false,
    },
    {
      label: "Dag-reference findings",
      value: findingCount,
      note: findingCount > 0 ? "Needs human review" : "None found",
      attention: findingCount > 0,
    },
    {
      label: "Evidence incomplete",
      value: missingCount,
      note: missingCount > 0 ? "Referenced record not in case" : "No missing references",
      attention: missingCount > 0,
    },
    {
      label: "Skipped or incomplete",
      value: skippedCount,
      note: skippedCount > 0 ? "See skipped comparisons" : "None",
      attention: skippedCount > 0,
    },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <SectionHeading id="summary-heading">Comparison summary</SectionHeading>
      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={`rounded-xl border p-4 shadow-sm ${
              tile.attention
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <dt className="text-sm font-medium text-slate-700">{tile.label}</dt>
            <dd className="mt-1 text-3xl font-semibold text-slate-900">
              {tile.value}
            </dd>
            <dd className="mt-1 text-sm text-slate-700">{tile.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

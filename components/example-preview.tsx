import { demoCases } from "@/data/cases";
import {
  compareDagReferences,
  RECORD_DIFFERENCE_LIMITATION,
} from "@/lib/comparison";
import { documentTypeLabels } from "@/lib/evidence";
import { Badge } from "./ui";

export const FEATURED_CASE_ID = "DEMO-CASE-002";

function count(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Compact preview built from the real case data and the real comparison engine. */
export function ExamplePreview() {
  const featured = demoCases.find((item) => item.id === FEATURED_CASE_ID);
  const dalil = featured?.records.find((record) => record.documentType === "dalil");
  const mutation = featured?.records.find(
    (record) =>
      record.documentType === "mutation" &&
      dalil !== undefined &&
      record.relatedRecordIds.includes(dalil.id),
  );
  if (!featured || !dalil || !mutation) return null;

  const comparison = compareDagReferences(featured.records);
  const pairFinding = comparison.findings.find(
    (finding) =>
      finding.sourceRecordIds.includes(dalil.id) &&
      finding.sourceRecordIds.includes(mutation.id),
  );

  return (
    <section
      aria-labelledby="example-heading"
      className="rounded-xl bg-white p-5 text-slate-900 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="emerald">Synthetic example</Badge>
        <span className="font-mono text-sm text-slate-700">{featured.id}</span>
      </div>
      <h2 id="example-heading" className="mt-3 text-lg font-semibold">
        Linked dalil versus mutation
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {[dalil, mutation].map((record) => (
          <div
            key={record.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <dt className="text-sm font-semibold text-slate-900">
              {documentTypeLabels[record.documentType]}
            </dt>
            <dd className="mt-0.5 break-words font-mono text-xs text-slate-700">
              {record.id}
            </dd>
            <dd className="mt-2 text-sm text-slate-700">Dag reference</dd>
            <dd className="font-mono text-2xl font-semibold">
              {`"${record.dagReference}"`}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        {pairFinding ? (
          <Badge tone="amber">Record difference: review needed</Badge>
        ) : (
          <Badge tone="emerald">No dag mismatch for this pair</Badge>
        )}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Computed by the same comparison engine as the case pages:{" "}
        {count(comparison.comparedCount, "linked pair", "linked pairs")}{" "}
        compared, {count(comparison.findings.length, "dag finding", "dag findings")}{" "}
        in this case. {RECORD_DIFFERENCE_LIMITATION}
      </p>
    </section>
  );
}

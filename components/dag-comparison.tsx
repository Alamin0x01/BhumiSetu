import type {
  ComparedValue,
  DagComparisonResult,
  SkipReason,
} from "@/lib/comparison";
import { EvidenceLink } from "./evidence-link";
import { ResetReviewNotes, ReviewNotes } from "./review-notes";
import { Badge, cardClass, SectionHeading } from "./ui";

export const skipReasonLabels: Record<SkipReason, string> = {
  SELF_REFERENCE: "Self-reference",
  SAME_PARCEL_NOT_DECLARED: "Same parcel not declared",
  LINKED_RECORD_MISSING: "Linked record missing",
  AMBIGUOUS_RECORD_ID: "Ambiguous record ID",
  INCOMPLETE_FIELDS: "Incomplete fields",
  SCOPE_DIFFERS: "Different mouza ID or survey context",
};

const subheadingClass = "text-lg font-semibold text-slate-900";

function QuotedValue({ value }: { value: string }) {
  return (
    <code className="whitespace-pre-wrap break-all rounded bg-white px-1.5 py-0.5 font-mono text-slate-900 ring-1 ring-slate-200">
      {`"${value}"`}
    </code>
  );
}

function EvidenceValue({ value }: { value: ComparedValue }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <dt className="text-sm font-medium text-slate-700">
        Evidence record: <EvidenceLink recordId={value.recordId} />
      </dt>
      <dd className="mt-2 flex flex-col gap-1.5 text-sm text-slate-900">
        <span>
          Original: <QuotedValue value={value.original} />
        </span>
        <span className="text-slate-700">
          Normalized: <QuotedValue value={value.normalized} />
        </span>
      </dd>
    </div>
  );
}

export function DagComparison({
  result,
  caseId,
  showReviewNotes = true,
}: {
  result: DagComparisonResult;
  caseId: string;
  /** Off for imported cases, which never read or write saved reviewer notes. */
  showReviewNotes?: boolean;
}) {
  return (
    <section
      aria-labelledby="dag-comparison-heading"
      className="flex flex-col gap-5"
    >
      <SectionHeading
        id="dag-comparison-heading"
        description="Computed from the source records. Only dag-reference comparison is implemented: no other field is compared, and nothing here verifies ownership or any other part of a record."
      >
        Dag-reference comparison
      </SectionHeading>

      {result.validationIssues.length > 0 && (
        <div className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 px-5 py-4 text-amber-950">
          <h3 className={subheadingClass}>Data-validation issues</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
            {result.validationIssues.map((issue) => (
              <li key={`${issue.code}:${issue.recordId}`}>
                <span className="font-mono text-sm">{issue.code}</span>:{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.findings.length === 0 ? (
        <div className={`${cardClass} border-l-4 border-l-emerald-600 p-5`}>
          <p className="text-base font-medium text-slate-900">
            No dag mismatch found among comparable linked records.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {result.findings.map((finding) => (
            <li
              key={finding.id}
              className={`${cardClass} overflow-hidden border-t-4 border-t-amber-400`}
            >
              <div
                className={`grid gap-6 p-5 lg:p-6 ${showReviewNotes ? "lg:grid-cols-2" : ""}`}
              >
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="amber">Record difference: review needed</Badge>
                    <span className="font-mono text-sm text-slate-700">
                      {finding.ruleId}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Dag reference differs: {finding.sourceRecordIds[0]} and{" "}
                    {finding.sourceRecordIds[1]}
                  </h3>
                  <p className="break-all font-mono text-xs text-slate-700">
                    Finding ID: {finding.id}
                  </p>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <EvidenceValue value={finding.values[0]} />
                    <EvidenceValue value={finding.values[1]} />
                  </dl>
                  <p className="text-base leading-7 text-slate-900">
                    {finding.explanation}
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Comparability assumptions
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                      {finding.comparabilityAssumptions.map((assumption) => (
                        <li key={assumption}>{assumption}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-900">
                    <span className="font-semibold">Limitation:</span>{" "}
                    {finding.limitation}
                  </p>
                </div>
                {showReviewNotes && (
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:p-5">
                    <ReviewNotes caseId={caseId} findingId={finding.id} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.skipped.length > 0 && (
        <div className={`${cardClass} p-5`}>
          <h3 className={subheadingClass}>Skipped or incomplete comparisons</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
            {result.skipped.map((item) => (
              <li key={item.recordIds.join(":")}>
                <span className="font-mono text-sm">
                  {item.recordIds[0]} and {item.recordIds[1]}
                </span>
                : {skipReasonLabels[item.reason]}. {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

    </section>
  );
}

export function LocalNotesNotice() {
  return (
    <section aria-labelledby="local-notes-heading" className={`${cardClass} p-5`}>
      <h2 id="local-notes-heading" className={subheadingClass}>
        Human review notes: local to this browser
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
        Reviewer notes are saved only in this browser&apos;s localStorage for
        this demo. They are not authenticated, not shared, and not a
        tamper-proof audit trail.
      </p>
      <div className="mt-3">
        <ResetReviewNotes />
      </div>
    </section>
  );
}

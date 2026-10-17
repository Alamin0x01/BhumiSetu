import type { ReactNode } from "react";
import type { SourceRecord } from "@/data/cases";
import {
  buildTimeline,
  documentTypeLabels,
  findMissingLinks,
} from "@/lib/evidence";
import { EvidenceLink } from "./evidence-link";
import { Badge, cardClass, SectionHeading } from "./ui";

function RelatedIds({
  ids,
  knownIds,
}: {
  ids: readonly string[];
  knownIds: ReadonlySet<string>;
}) {
  if (ids.length === 0) return <>None</>;
  return (
    <ul className="flex flex-col gap-1">
      {ids.map((id) => (
        <li key={id}>
          {knownIds.has(id) ? (
            <EvidenceLink recordId={id} />
          ) : (
            <span>
              <span className="font-mono text-sm">{id}</span>{" "}
              <span className="font-medium text-amber-900">
                (not in this case)
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EvidenceTable({
  records,
}: {
  records: readonly SourceRecord[];
}) {
  const knownIds = new Set(records.map((record) => record.id));
  const rows: { label: string; cell: (record: SourceRecord) => ReactNode }[] = [
    { label: "Document type", cell: (r) => documentTypeLabels[r.documentType] },
    { label: "Document reference", cell: (r) => r.documentReference },
    { label: "Document date", cell: (r) => r.documentDate },
    { label: "Mouza ID", cell: (r) => r.mouzaId },
    { label: "Survey context", cell: (r) => r.surveyContext },
    { label: "Dag reference", cell: (r) => r.dagReference },
    { label: "Area", cell: (r) => `${r.area.value} ${r.area.unit}` },
    {
      label: "Related record IDs",
      cell: (r) => <RelatedIds ids={r.relatedRecordIds} knownIds={knownIds} />,
    },
  ];

  return (
    <section aria-labelledby="evidence-table-heading">
      <SectionHeading
        id="evidence-table-heading"
        description="Records side by side with values exactly as stored. Nothing here is highlighted, scored, or interpreted."
      >
        Source-record comparison table
      </SectionHeading>
      <div
        role="region"
        aria-label="Source-record comparison table, scrollable"
        tabIndex={0}
        className={`${cardClass} mt-4 overflow-x-auto`}
      >
        <table className="min-w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Source records compared field by field
          </caption>
          <thead>
            <tr className="bg-slate-50">
              <th
                scope="col"
                className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900"
              >
                Field
              </th>
              {records.map((record, index) => (
                <th
                  key={`${record.id}-${index}`}
                  scope="col"
                  className="min-w-48 px-4 py-3 align-top font-semibold text-slate-900"
                >
                  <EvidenceLink recordId={record.id} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-200">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3 align-top font-medium text-slate-700"
                >
                  {row.label}
                </th>
                {records.map((record, index) => (
                  <td
                    key={`${record.id}-${index}`}
                    className="whitespace-pre-wrap break-words px-4 py-3 align-top text-slate-900"
                  >
                    {row.cell(record)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EvidenceCompleteness({
  records,
}: {
  records: readonly SourceRecord[];
}) {
  const missingLinks = findMissingLinks(records);

  return (
    <section aria-labelledby="completeness-heading" className="flex flex-col gap-4">
      <SectionHeading id="completeness-heading">
        Missing-link results
      </SectionHeading>
      {missingLinks.length === 0 ? (
        <div className={`${cardClass} border-l-4 border-l-emerald-600 p-5`}>
          <p className="text-base font-medium text-slate-900">
            No missing related-record references found in this case.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <Badge tone="amber">Evidence incomplete</Badge>
          <p className="mt-3 max-w-3xl text-base leading-7">
            A related record ID is referenced but is not included in this
            case. This is a data-completeness check only, not a
            finding of fraud or invalid ownership.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-base">
            {missingLinks.map((link) => (
              <li key={`${link.referencingRecordId}:${link.missingRecordId}`}>
                <EvidenceLink recordId={link.referencingRecordId} /> references{" "}
                <span className="font-mono text-sm">{link.missingRecordId}</span>
                , which is not in this case.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TimelineItem({
  record,
  knownIds,
}: {
  record: SourceRecord;
  knownIds: ReadonlySet<string>;
}) {
  return (
    <li className={`${cardClass} relative p-4`}>
      <span
        aria-hidden="true"
        className="absolute -left-[1.95rem] top-5 h-3 w-3 rounded-full border-2 border-emerald-700 bg-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        <time
          dateTime={record.documentDate}
          className="text-base font-semibold text-slate-900"
        >
          {record.documentDate}
        </time>
        <Badge tone="slate">{documentTypeLabels[record.documentType]}</Badge>
        <span className="text-sm text-slate-700">{record.documentReference}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        Record <EvidenceLink recordId={record.id} />
      </p>
      <div className="mt-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">
          Lists related records:{" "}
        </span>
        <RelatedIds ids={record.relatedRecordIds} knownIds={knownIds} />
      </div>
    </li>
  );
}

export function EvidenceTimeline({
  records,
}: {
  records: readonly SourceRecord[];
}) {
  const { dated, undated } = buildTimeline(records);
  const knownIds = new Set(records.map((record) => record.id));

  return (
    <section aria-labelledby="timeline-heading">
      <SectionHeading
        id="timeline-heading"
        description="Records ordered by the document date each one states. Links follow explicit related-record IDs only. This is not verified ownership: no dates, transfers, or missing events are inferred."
      >
        <span className="capitalize">Document evidence timeline</span>
      </SectionHeading>
      <ol className="ml-3 mt-6 flex flex-col gap-4 border-l-2 border-slate-300 pl-6">
        {dated.map((record, index) => (
          <TimelineItem
            key={`${record.id}-${index}`}
            record={record}
            knownIds={knownIds}
          />
        ))}
      </ol>
      {undated.length > 0 && (
        <div className={`${cardClass} mt-6 p-5`}>
          <p className="text-base font-semibold text-slate-900">
            Records without a valid document date (not placed on the timeline)
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {undated.map((record, index) => (
              <li key={`${record.id}-${index}`}>
                <EvidenceLink recordId={record.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

import type { ReactNode } from "react";
import type { SourceRecord } from "@/data/cases";
import { documentTypeLabels, recordAnchorId } from "@/lib/evidence";
import { cardClass, SectionHeading } from "./ui";

function formatIds(ids: readonly string[]) {
  return ids.length > 0 ? ids.join(", ") : "None";
}

export function RecordCard({ record }: { record: SourceRecord }) {
  const fields: { label: string; value: ReactNode }[] = [
    { label: "Record ID", value: record.id },
    { label: "Document type", value: documentTypeLabels[record.documentType] },
    { label: "Document reference", value: record.documentReference },
    {
      label: "Document date",
      value: <time dateTime={record.documentDate}>{record.documentDate}</time>,
    },
    { label: "Mouza ID", value: record.mouzaId },
    { label: "Survey context", value: record.surveyContext },
    { label: "Dag reference", value: record.dagReference },
    { label: "Area", value: `${record.area.value} ${record.area.unit}` },
    { label: "Party IDs", value: formatIds(record.partyIds) },
    { label: "Related records", value: formatIds(record.relatedRecordIds) },
  ];

  return (
    <li
      id={recordAnchorId(record.id)}
      tabIndex={-1}
      className={`${cardClass} flex scroll-mt-6 flex-col gap-4 p-5 outline-none transition-shadow duration-150 focus:ring-2 focus:ring-emerald-700 target:ring-2 target:ring-emerald-700 motion-reduce:transition-none`}
    >
      <h3 className="break-words text-lg font-semibold text-slate-900">
        {documentTypeLabels[record.documentType]}: {record.documentReference}
      </h3>
      <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {fields.map((field) => (
          <div key={field.label} className="contents">
            <dt className="font-medium text-slate-700">{field.label}</dt>
            <dd className="break-words text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export function SourceRecordCards({
  records,
  description = "Seeded synthetic records, shown as stored.",
}: {
  records: readonly SourceRecord[];
  description?: string;
}) {
  return (
    <section aria-labelledby="records-heading">
      <SectionHeading id="records-heading" description={description}>
        Source-record cards ({records.length})
      </SectionHeading>
      <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {records.map((record, index) => (
          <RecordCard key={`${record.id}-${index}`} record={record} />
        ))}
      </ul>
    </section>
  );
}

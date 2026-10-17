import type { ReactNode } from "react";
import { documentTypeLabels } from "@/lib/evidence";
import type { ReviewReport } from "@/lib/report";

function Q({ value }: { value: string }) {
  return (
    <code className="whitespace-pre-wrap break-all font-mono text-[0.95em]">
      {`"${value}"`}
    </code>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8 print:mt-6">
      <h3
        id={id}
        className="border-b border-slate-300 pb-1 text-lg font-semibold text-slate-900 print:break-after-avoid"
      >
        {title}
      </h3>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[10rem_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="font-medium text-slate-700">{item.label}</dt>
          <dd className="break-words text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const th = "px-3 py-2 text-left font-semibold text-slate-900";
const td = "px-3 py-2 align-top text-slate-900 break-words";

/** Print-friendly report. It only formats the snapshot it is given; nothing is recomputed here. */
export function ReportView({ report }: { report: ReviewReport }) {
  const notes = report.reviewNotes;
  const notesByFinding = new Map(
    notes.perFinding.map((entry) => [entry.findingId, entry]),
  );

  return (
    <article
      aria-labelledby="report-title"
      className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          BhumiSetu review report
        </p>
        <h2
          id="report-title"
          className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {report.case.title}
        </h2>
        <p className="mt-2 break-words text-base leading-7 text-slate-700">
          {report.case.description}
        </p>
        <div className="mt-4">
          <Facts
            items={[
              { label: "Case ID", value: <span className="font-mono">{report.case.id}</span> },
              {
                label: "Case origin",
                value:
                  report.case.origin === "imported"
                    ? "Imported case (temporary browser session)"
                    : "Reference case",
              },
              { label: "Source records", value: report.case.recordCount },
              { label: "Report schema version", value: report.reportSchemaVersion },
              {
                label: "Generated (UTC)",
                value: <time dateTime={report.generatedAt}>{report.generatedAt}</time>,
              },
              {
                label: "Generated (local)",
                value: `${report.generatedAtLocal} (${report.timeZone}, UTC${report.utcOffset})`,
              },
              {
                label: "Application",
                value: `${report.application.name}, package version ${report.application.packageVersion}`,
              },
            ]}
          />
        </div>
      </header>

      <section
        role="note"
        aria-label="Synthetic data declaration"
        className="mt-6 break-inside-avoid rounded-lg border border-emerald-300 border-l-4 border-l-emerald-700 bg-emerald-50 p-4 print:bg-white"
      >
        <p className="text-base font-semibold text-emerald-950">
          Synthetic data declaration
        </p>
        <p className="mt-1 text-sm leading-6 text-emerald-950">
          {report.syntheticData.statement}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-emerald-950">
          {report.syntheticData.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <Section id="report-scope" title="Scope of this report">
        <p className="text-sm leading-6">
          This report covers the source records as stored and the following
          checks only.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
          {report.scope.checks.map((check) => (
            <li key={check.name}>
              <span className="font-semibold">{check.name}</span>
              {check.ruleId && (
                <>
                  {" "}
                  (<span className="font-mono">{check.ruleId}</span>)
                </>
              )}
              : {check.description}
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold">Not checked or verified</p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
          {report.scope.notChecked.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm leading-6 text-slate-700">
          Simulated (sandbox) values are never part of a report.
        </p>
      </Section>

      <Section id="report-counts" title="Counts">
        <Facts
          items={[
            { label: "Source records", value: report.counts.sourceRecords },
            { label: "Linked pairs compared", value: report.counts.linkedPairsCompared },
            { label: "Skipped or incomplete", value: report.counts.skippedOrIncomplete },
            { label: "Validation issues", value: report.counts.validationIssues },
            { label: "Dag-reference findings", value: report.counts.dagReferenceFindings },
            { label: "Evidence incomplete", value: report.counts.evidenceIncomplete },
          ]}
        />
      </Section>

      <Section id="report-findings" title="Dag-reference findings">
        {report.dagComparison.findings.length === 0 && (
          <p className="text-sm">
            No dag mismatch found among comparable linked records.
          </p>
        )}
        {report.dagComparison.findings.map((finding) => {
          const entry = notesByFinding.get(finding.id);
          return (
            <div
              key={finding.id}
              className="break-inside-avoid rounded-lg border border-slate-300 border-t-4 border-t-amber-500 p-4"
            >
              <p className="text-sm font-semibold">
                Record difference: review needed{" "}
                <span className="font-mono font-normal">({finding.ruleId})</span>
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                Finding ID: {finding.id}
              </p>
              <table className="mt-3 w-full border-collapse text-sm">
                <caption className="sr-only">Evidence for {finding.id}</caption>
                <thead className="bg-slate-100 print:bg-white">
                  <tr>
                    <th scope="col" className={th}>Evidence record</th>
                    <th scope="col" className={th}>Original value</th>
                    <th scope="col" className={th}>Normalized value</th>
                  </tr>
                </thead>
                <tbody>
                  {finding.values.map((value) => (
                    <tr key={value.recordId} className="border-t border-slate-300 break-inside-avoid">
                      <th scope="row" className={`${td} text-left font-mono font-normal`}>
                        {value.recordId}
                      </th>
                      <td className={td}><Q value={value.original} /></td>
                      <td className={td}><Q value={value.normalized} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm leading-6">{finding.explanation}</p>
              <p className="mt-2 text-sm font-semibold">Comparability assumptions</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm leading-6">
                {finding.comparabilityAssumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-6">
                <span className="font-semibold">Limitation:</span> {finding.limitation}
              </p>
              {entry && (
                <div className="mt-3 border-t border-slate-300 pt-2">
                  <p className="text-sm font-semibold">
                    Review notes (browser-local){" "}
                    <span className="font-normal">
                      Current label: {entry.currentLabel ?? "none"}. The finding
                      remains reported whatever its label.
                    </span>
                  </p>
                  {entry.history.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-700">No notes saved for this finding.</p>
                  ) : (
                    <ol className="mt-1 flex flex-col gap-1.5 text-sm">
                      {entry.history.map((note) => (
                        <li key={note.id} className="break-inside-avoid break-words">
                          <time dateTime={note.savedAt} className="font-mono text-xs">
                            {note.savedAt}
                          </time>{" "}
                          <span className="font-semibold">{note.label}:</span>{" "}
                          <span className="whitespace-pre-wrap">{note.note}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {report.dagComparison.validationIssues.length > 0 && (
          <div className="break-inside-avoid">
            <p className="text-sm font-semibold">Data-validation issues</p>
            <ul className="list-disc space-y-0.5 pl-5 text-sm leading-6">
              {report.dagComparison.validationIssues.map((issue) => (
                <li key={`${issue.code}:${issue.recordId}`} className="break-words">
                  <span className="font-mono">{issue.code}</span>: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.dagComparison.skipped.length > 0 && (
          <div className="break-inside-avoid">
            <p className="text-sm font-semibold">Skipped or incomplete comparisons</p>
            <ul className="list-disc space-y-0.5 pl-5 text-sm leading-6">
              {report.dagComparison.skipped.map((item) => (
                <li key={item.recordIds.join(":")} className="break-words">
                  <span className="font-mono">
                    {item.recordIds[0]} and {item.recordIds[1]}
                  </span>
                  : <span className="font-mono">{item.reason}</span>. {item.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section id="report-missing" title="Missing-link results">
        {report.missingLinks.items.length === 0 ? (
          <p className="text-sm">No missing related-record references found in this case.</p>
        ) : (
          <>
            <p className="text-sm font-semibold">{report.missingLinks.label}</p>
            <p className="text-sm leading-6">{report.missingLinks.note}</p>
            <ul className="list-disc space-y-0.5 pl-5 text-sm leading-6">
              {report.missingLinks.items.map((item) => (
                <li key={`${item.referencingRecordId}:${item.missingRecordId}`} className="break-words">
                  <span className="font-mono">{item.referencingRecordId}</span> references{" "}
                  <span className="font-mono">{item.missingRecordId}</span>, which is not in this case.
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section id="report-notes" title="Review notes">
        <p className="text-sm leading-6">{notes.statement}</p>
        {notes.source === "browser-localStorage" && (
          <p className="text-sm leading-6">
            Storage status: {notes.storageStatus}.{" "}
            {notes.storageStatus === "ok"
              ? "Notes shown are limited to this case's current findings."
              : "Saved notes could not be read, so none are included."}
            {notes.invalidEntriesIgnored > 0 &&
              ` ${notes.invalidEntriesIgnored} invalid saved ${notes.invalidEntriesIgnored === 1 ? "entry was" : "entries were"} ignored.`}
          </p>
        )}
      </Section>

      <Section id="report-records" title="Source records (as stored)">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Source records with raw values</caption>
            <thead className="bg-slate-100 print:bg-white">
              <tr>
                <th scope="col" className={th}>Record ID</th>
                <th scope="col" className={th}>Type</th>
                <th scope="col" className={th}>Document reference</th>
                <th scope="col" className={th}>Date</th>
                <th scope="col" className={th}>Mouza ID</th>
                <th scope="col" className={th}>Dag reference</th>
                <th scope="col" className={th}>Area</th>
              </tr>
            </thead>
            <tbody>
              {report.sourceRecords.map((record, index) => (
                <tr key={`${record.id}-${index}`} className="border-t border-slate-300 break-inside-avoid">
                  <th scope="row" className={`${td} text-left font-mono font-normal`}>{record.id}</th>
                  <td className={td}>{documentTypeLabels[record.documentType]}</td>
                  <td className={td}>{record.documentReference}</td>
                  <td className={td}>{record.documentDate}</td>
                  <td className={td}>{record.mouzaId}</td>
                  <td className={td}><Q value={record.dagReference} /></td>
                  <td className={td}>{`${record.area.value} ${record.area.unit}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm font-semibold">Other record fields</p>
        <ul className="flex flex-col gap-2">
          {report.sourceRecords.map((record, index) => (
            <li
              key={`${record.id}-${index}`}
              className="break-inside-avoid rounded-md border border-slate-300 p-3"
            >
              <p className="break-all font-mono text-xs font-semibold">
                {record.id} ({documentTypeLabels[record.documentType]})
              </p>
              <div className="mt-1">
                <Facts
                  items={[
                    { label: "Survey context", value: record.surveyContext === "" ? "(empty)" : record.surveyContext },
                    { label: "Party IDs", value: record.partyIds.length > 0 ? record.partyIds.join(", ") : "None" },
                    { label: "Related record IDs", value: record.relatedRecordIds.length > 0 ? record.relatedRecordIds.join(", ") : "None" },
                    { label: "Same-parcel IDs", value: record.comparisonScope.sameParcelRecordIds.length > 0 ? record.comparisonScope.sameParcelRecordIds.join(", ") : "None" },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <footer className="mt-8 border-t border-slate-300 pt-3 text-xs leading-5 text-slate-700">
        Uses synthetic records. Not official verification or legal advice.
        Report schema version {report.reportSchemaVersion}, generated{" "}
        {report.generatedAt} for case {report.case.id}.
      </footer>
    </article>
  );
}

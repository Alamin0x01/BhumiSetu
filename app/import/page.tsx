import type { Metadata } from "next";
import Link from "next/link";
import { ImportPanel } from "@/components/import-panel";
import { cardClass, textLinkClass } from "@/components/ui";
import {
  formatBytes,
  MAX_FILE_BYTES,
  MAX_IDENTIFIER_LENGTH,
  MAX_RECORDS,
  MAX_REFERENCES,
  MAX_TEXT_LENGTH,
} from "@/lib/import-schema";

export const metadata: Metadata = {
  title: "Import Review Dataset | BhumiSetu",
  description:
    "Validate a JSON review dataset and open it as a case workspace in this browser.",
};

export default function ImportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/cases" className={`${textLinkClass} w-fit text-base`}>
          Back to Case Library
        </Link>

        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Import Review Dataset
          </h1>
          <p className="mt-3 text-lg leading-8 text-slate-700">
            Validate a small JSON dataset, inspect its records, and run the same
            dag-reference and missing-link checks as the reference cases.
          </p>
        </header>

        <section
          aria-labelledby="import-safety-heading"
          className="rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-5 text-amber-950"
        >
          <h2 id="import-safety-heading" className="text-lg font-semibold">
            Synthetic data only
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7">
            <li>
              Import synthetic records only. The <code className="font-mono">synthetic: true</code>{" "}
              declaration in the file is provided by you; BhumiSetu cannot tell
              whether a file contains personal information. It does not
              anonymize data or detect personal data.
            </li>
            <li>
              The file is read in this browser only. The app does not upload it
              or save it. The imported case stays in memory and is cleared when
              you reload the page.
            </li>
            <li>
              Imported cases do not use or change saved reviewer notes, and they
              never replace the reference cases.
            </li>
          </ul>
        </section>

        <ImportPanel />

        <section
          aria-labelledby="import-limits-heading"
          className={`${cardClass} p-5 sm:p-6`}
        >
          <h2 id="import-limits-heading" className="text-lg font-semibold text-slate-900">
            File limits
          </h2>
          <ul className="mt-2 grid gap-x-8 gap-y-1 text-base leading-7 text-slate-700 md:grid-cols-2">
            <li className="list-inside list-disc">One .json file, at most {formatBytes(MAX_FILE_BYTES)}</li>
            <li className="list-inside list-disc">Exactly one case with 1 to {MAX_RECORDS} records</li>
            <li className="list-inside list-disc">At most {MAX_REFERENCES} related-record references per record</li>
            <li className="list-inside list-disc">IDs and dag references: up to {MAX_IDENTIFIER_LENGTH} characters</li>
            <li className="list-inside list-disc">Other free text: up to {MAX_TEXT_LENGTH} characters</li>
            <li className="list-inside list-disc">Unknown fields are rejected, nothing is repaired</li>
          </ul>
          <p className="mt-3 text-sm text-slate-700">
            The schema is documented in the project README.
          </p>
        </section>
      </main>
    </div>
  );
}

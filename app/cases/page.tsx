import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { Badge, interactiveCardClass, textLinkClass } from "@/components/ui";
import { demoCases } from "@/data/cases";

export const metadata: Metadata = {
  title: "Demo Cases | BhumiSetu",
  description: "Synthetic demo cases for the BhumiSetu prototype.",
};

export default function CasesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className={`${textLinkClass} w-fit text-base`}>
          Back to home
        </Link>

        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Demo cases
          </h1>
          <p className="mt-3 text-lg leading-8 text-slate-700">
            Seeded sample scenarios for the prototype. Open a case to view its
            synthetic source records.
          </p>
        </header>

        <Disclaimer />

        <ul
          aria-label="Synthetic demo cases"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {demoCases.map((demoCase) => (
            <li
              key={demoCase.id}
              className={`${interactiveCardClass} relative flex flex-col gap-3 p-6 focus-within:ring-2 focus-within:ring-emerald-700`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="emerald">Synthetic demo</Badge>
                <p className="font-mono text-sm text-slate-700">{demoCase.id}</p>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                {demoCase.title}
              </h2>
              <p className="text-base leading-7 text-slate-700">
                {demoCase.description}
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-sm font-medium text-slate-800">
                  {demoCase.records.length} synthetic documents
                </p>
                <Link
                  href={`/cases/${demoCase.id}`}
                  aria-label={`View source records for ${demoCase.id}`}
                  className={`${textLinkClass} text-base after:absolute after:inset-0 after:content-['']`}
                >
                  View source records
                  <span aria-hidden="true"> &rarr;</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

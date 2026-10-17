import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { ExamplePreview, FEATURED_CASE_ID } from "@/components/example-preview";
import { Badge, cardClass } from "@/components/ui";

const features = [
  {
    title: "Record Comparison",
    status: "Partial: dag reference only",
    tone: "slate",
    description:
      "Compares dag references between records that the synthetic data explicitly links as the same parcel. No other field is compared.",
  },
  {
    title: "Missing-Link Check",
    status: "Available",
    tone: "emerald",
    description:
      "Flags related record IDs that are not in the case as \"Evidence incomplete\". A data-completeness check, not a verdict.",
  },
  {
    title: "Document Evidence Timeline",
    status: "Available",
    tone: "emerald",
    description:
      "Orders each case's records by their stated document date and follows explicit related-record links. Not verified ownership.",
  },
  {
    title: "Human Review",
    status: "Available: local notes only",
    tone: "emerald",
    description:
      "Label a finding \"Needs review\" or \"Reviewed\" and keep notes. Notes stay in this browser, and a label never resolves a finding.",
  },
  {
    title: "What-if Sandbox",
    status: "Available: simulation only",
    tone: "emerald",
    description:
      "Edit dag references in a temporary copy and rerun the same comparison. Original records are never changed.",
  },
] as const;

const limitations = [
  "Only dag-reference comparison is implemented. Names, areas, dates, and parties are not compared.",
  "Findings are record differences for human review, not verdicts. Nothing here verifies ownership, document authenticity, or legal status.",
  "Review notes stay in this browser. They are not authenticated and not a tamper-proof audit trail.",
  "Synthetic data only: no database, OCR, or real land records.",
];

const ctaBase =
  "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-base font-semibold transition-colors duration-150 focus-visible:outline-emerald-200 motion-reduce:transition-none";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-md sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
            <div>
              <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/60 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                Evidence-first land record review
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                BhumiSetu
              </h1>
              <p className="mt-3 text-xl font-medium text-emerald-300 sm:text-2xl">
                Land Record Consistency &amp; Review Assistant
              </p>
              <p className="mt-4 max-w-xl text-lg leading-8 text-slate-200">
                Compare linked land records, inspect discrepancies, and
                document human review.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/cases/${FEATURED_CASE_ID}#sandbox`}
                  className={`${ctaBase} bg-emerald-400 text-slate-950 shadow-sm hover:bg-emerald-300`}
                >
                  Try interactive sandbox
                </Link>
                <Link
                  href="/cases"
                  className={`${ctaBase} border border-slate-400 text-white hover:bg-white/10`}
                >
                  Browse demo cases
                </Link>
              </div>
            </div>
            <ExamplePreview />
          </div>
        </section>

        <Disclaimer />

        <section aria-labelledby="features-heading">
          <h2
            id="features-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            What it does today
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li
                key={feature.title}
                className={`${cardClass} flex flex-col gap-3 p-5`}
              >
                <Badge tone={feature.tone}>{feature.status}</Badge>
                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-base leading-7 text-slate-700">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="scope-heading"
          className={`${cardClass} p-5 sm:p-6`}
        >
          <h2
            id="scope-heading"
            className="text-xl font-semibold tracking-tight text-slate-900"
          >
            Scope &amp; limitations
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-700">
            In scope: dag-reference comparison between records the synthetic data
            explicitly links as the same parcel, shown with evidence for human
            review.
          </p>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-base leading-7 text-slate-700 md:grid-cols-2">
            {limitations.map((item) => (
              <li key={item} className="list-inside list-disc">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

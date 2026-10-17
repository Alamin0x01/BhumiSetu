import Link from "next/link";
import { buildSiteNav, REPO_URL, TAGLINE } from "@/lib/site-nav";
import { BrandMark } from "./brand-mark";
import { FEATURED_CASE_ID } from "./example-preview";

const linkClass =
  "inline-flex items-center gap-1.5 rounded text-sm text-slate-300 transition-colors duration-150 hover:text-white focus-visible:outline-emerald-300 motion-reduce:transition-none";

const headingClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-100";

const scope = [
  "Dag-reference comparison on explicitly linked records",
  "Missing-link and document-timeline checks",
  "Human review notes, kept in this browser",
  "Synthetic data only: no database, OCR, or real land records",
];

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SiteFooter() {
  const { items, sandboxHref } = buildSiteNav(FEATURED_CASE_ID);
  const overview = items.find((item) => item.key === "overview")!;
  const cases = items.find((item) => item.key === "cases")!;
  const importItem = items.find((item) => item.key === "import")!;
  const reports = items.find((item) => item.key === "reports")!;

  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-900 print:hidden">
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="flex w-fit items-center gap-3 rounded-lg focus-visible:outline-emerald-300"
            >
              <BrandMark id="site-footer-brand" className="h-8 w-auto shrink-0" />
              <span className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-tight text-white">
                  Bhumi<span className="text-emerald-400">Setu</span>
                </span>
                <span className="text-[11px] font-medium tracking-wide text-slate-300">
                  {TAGLINE}
                </span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Compare linked land records, inspect discrepancies, and document
              human review.
            </p>
            <span className="mt-4 inline-flex w-fit items-center rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-100">
              Demo environment
            </span>
          </div>

          <nav aria-labelledby="footer-platform-heading">
            <h2 id="footer-platform-heading" className={headingClass}>
              Platform
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li><Link href={overview.href} className={linkClass}>Overview</Link></li>
              <li><Link href={cases.href} className={linkClass}>Demo Cases</Link></li>
              <li><Link href={sandboxHref} className={linkClass}>Interactive Sandbox</Link></li>
              <li><Link href={importItem.href} className={linkClass}>Import Synthetic Case</Link></li>
              <li><Link href={reports.href} className={linkClass}>Review Reports</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-resources-heading">
            <h2 id="footer-resources-heading" className={headingClass}>
              Resources
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li><ExternalLink href={REPO_URL}>GitHub repository</ExternalLink></li>
              <li><ExternalLink href={`${REPO_URL}#readme`}>README and import schema</ExternalLink></li>
              <li><ExternalLink href={`${REPO_URL}/issues`}>Report an issue</ExternalLink></li>
            </ul>
          </nav>

          <section aria-labelledby="footer-scope-heading">
            <h2 id="footer-scope-heading" className={headingClass}>
              Project scope
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {scope.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-slate-300 lg:flex-row lg:items-center lg:justify-between">
          <p>Built for LandTech Innovation Hackathon 2026</p>
          <p>Uses synthetic records. Not official verification or legal advice.</p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { buildSiteNav, REPO_URL, TAGLINE, WORKSPACE_DESCRIPTION } from "@/lib/site-nav";
import { BrandMark } from "./brand-mark";
import { FEATURED_CASE_ID } from "./example-preview";

const linkClass =
  "inline-flex items-center gap-1.5 rounded text-sm text-slate-300 transition-colors duration-150 hover:text-white focus-visible:outline-emerald-300 motion-reduce:transition-none";

const headingClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-100";

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
  const { items } = buildSiteNav(FEATURED_CASE_ID);
  const overview = items.find((item) => item.key === "overview")!;
  const cases = items.find((item) => item.key === "cases")!;
  const importItem = items.find((item) => item.key === "import")!;
  const reports = items.find((item) => item.key === "reports")!;
  const featuredCase = `/cases/${FEATURED_CASE_ID}`;

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
              {WORKSPACE_DESCRIPTION}
            </p>
            <span className="mt-4 inline-flex w-fit items-center rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-100">
              Review Workspace
            </span>
          </div>

          <nav aria-labelledby="footer-platform-heading">
            <h2 id="footer-platform-heading" className={headingClass}>
              Platform
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li><Link href={overview.href} className={linkClass}>Overview</Link></li>
              <li><Link href={cases.href} className={linkClass}>Cases</Link></li>
              <li><Link href={importItem.href} className={linkClass}>Import</Link></li>
              <li><Link href={reports.href} className={linkClass}>Reports</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-capabilities-heading">
            <h2 id="footer-capabilities-heading" className={headingClass}>
              Capabilities
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li><Link href={`${featuredCase}#records`} className={linkClass}>Evidence Analysis</Link></li>
              <li><Link href={`${featuredCase}#overview`} className={linkClass}>Record Comparison</Link></li>
              <li><Link href={`${featuredCase}#overview`} className={linkClass}>Review Workflow</Link></li>
              <li><Link href={reports.href} className={linkClass}>Report Export</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-resources-heading">
            <h2 id="footer-resources-heading" className={headingClass}>
              Resources
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li><ExternalLink href={`${REPO_URL}#readme`}>Documentation</ExternalLink></li>
              <li><ExternalLink href={REPO_URL}>Repository</ExternalLink></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-slate-300 lg:flex-row lg:items-center lg:justify-between">
          <p>BhumiSetu. {TAGLINE}.</p>
          <p>
            Uses synthetic records. Not official verification or legal advice.{" "}
            <Link href="/#scope" className="rounded font-medium text-emerald-300 underline underline-offset-2 hover:text-emerald-200 focus-visible:outline-emerald-300">
              Scope &amp; Limitations
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { NavLinks, NavLinksView } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-900 print:hidden">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80 focus-visible:outline-emerald-300 motion-reduce:transition-none"
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-400 text-base font-bold text-slate-950"
          >
            B
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            BhumiSetu
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-100 md:inline-flex">
            Demo environment
          </span>
          <Suspense fallback={<NavLinksView pathname={null} />}>
            <NavLinks />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

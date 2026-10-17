import { Suspense } from "react";
import { buildSiteNav } from "@/lib/site-nav";
import { FEATURED_CASE_ID } from "./example-preview";
import { SiteNav, SiteNavView } from "./site-nav";

export function SiteHeader() {
  const nav = buildSiteNav(FEATURED_CASE_ID);
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900 shadow-lg shadow-slate-950/20 backdrop-blur-md supports-[backdrop-filter]:bg-slate-900/90 print:hidden">
      <Suspense fallback={<SiteNavView {...nav} pathname={null} />}>
        <SiteNav {...nav} />
      </Suspense>
    </header>
  );
}

export const REPO_URL = "https://github.com/Alamin0x01/BhumiSetu";
export const TAGLINE = "Evidence-First Land Record Review";
export const PRODUCT_DESCRIPTION =
  "Compare linked land records, inspect discrepancies, review supporting evidence, and manage structured review workflows.";
export const WORKSPACE_DESCRIPTION =
  "BhumiSetu is a modern workspace for land record review, evidence inspection, consistency analysis, and structured review workflows.";

export type NavKey = "overview" | "cases" | "import" | "reports";

export type NavItem = { key: NavKey; label: string; href: string };

export type SiteNav = {
  items: NavItem[];
  /** The built-in case whose Sandbox tab the primary call to action opens. */
  sandboxHref: string;
};

export function buildSiteNav(featuredCaseId: string): SiteNav {
  return {
    items: [
      { key: "overview", label: "Overview", href: "/" },
      { key: "cases", label: "Case Library", href: "/cases" },
      { key: "import", label: "Import", href: "/import" },
      { key: "reports", label: "Reports", href: `/cases/${featuredCaseId}/report` },
    ],
    sandboxHref: `/cases/${featuredCaseId}#sandbox`,
  };
}

const REPORT_PATH = /^\/(?:cases\/[^/]+|import\/case)\/report\/?$/;

export function isReportPath(pathname: string): boolean {
  return REPORT_PATH.test(pathname);
}

/** One item is active at a time: report pages belong to Reports, not to their parent section. */
export function isNavActive(key: NavKey, pathname: string | null): boolean {
  if (pathname === null) return false;
  if (key === "reports") return isReportPath(pathname);
  if (isReportPath(pathname)) return false;
  if (key === "overview") return pathname === "/";
  const base = key === "cases" ? "/cases" : "/import";
  return pathname === base || pathname.startsWith(`${base}/`);
}

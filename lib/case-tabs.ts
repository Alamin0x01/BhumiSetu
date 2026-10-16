import { recordAnchorId } from "./evidence";

export const CASE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "records", label: "Source records" },
  { id: "timeline", label: "Timeline" },
  { id: "sandbox", label: "Sandbox" },
] as const;

export type CaseTabId = (typeof CASE_TABS)[number]["id"];

export const REPORT_SANDBOX_MESSAGE =
  "Reports currently cover source records, not simulations.";

/** Review reports never include sandbox values, so export is off while the Sandbox tab is active. */
export function reportExportAvailability(tab: CaseTabId): {
  enabled: boolean;
  message: string | null;
} {
  return tab === "sandbox"
    ? { enabled: false, message: REPORT_SANDBOX_MESSAGE }
    : { enabled: true, message: null };
}

/** The fragment without "#", percent-decoded; malformed escapes are kept as typed. */
export function hashTarget(hash: string): string {
  const raw = hash.replace(/^#/, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Tab for a URL fragment: a tab ID, a source-record anchor (Source records), or Overview. */
export function tabFromHash(hash: string): CaseTabId {
  const target = hashTarget(hash);
  if (target.startsWith(recordAnchorId(""))) return "records";
  return CASE_TABS.find((tab) => tab.id === target)?.id ?? "overview";
}

import packageJson from "../package.json";
import type { DemoCase, SourceRecord } from "@/data/cases";
import {
  compareDagReferences,
  DAG_REFERENCE_MISMATCH,
  type ComparisonFinding,
  type DataValidationIssue,
  type SkippedComparison,
} from "./comparison";
import { findMissingLinks, type MissingLink } from "./evidence";
import type { ReviewLabel, ReviewNote } from "./review";

export const REPORT_SCHEMA_VERSION = "1";

export const REPORT_NOTES_STATEMENT =
  "Reviewer notes are stored only in the reviewer's browser (localStorage). They are unauthenticated, can be edited or cleared by anyone with access to that browser, and are not a tamper-proof audit trail. A review label (\"Needs review\" or \"Reviewed\") never resolves, removes, or changes a computed finding.";

export const IMPORTED_NOTES_STATEMENT =
  "Imported cases do not use reviewer notes. Saved reviewer notes for built-in cases are never read or included in an imported-case report.";

export type ReportOrigin = "built-in" | "imported";

export type TimeContext = {
  now: Date;
  timeZone: string;
  /** Minutes east of UTC, for example 360 for UTC+06:00. */
  offsetMinutes: number;
};

export type ReportNotesInput = {
  status: "ok" | "corrupt" | "unavailable";
  notes: readonly ReviewNote[];
  /** Saved entries that failed storage validation and were ignored. */
  discarded: number;
};

export type ReportFindingNotes = {
  findingId: string;
  currentLabel: ReviewLabel | null;
  findingRemainsReported: true;
  history: ReviewNote[];
};

export type ReportNotes = {
  included: boolean;
  source: "browser-localStorage" | "none";
  storageStatus: "ok" | "corrupt" | "unavailable" | "not-applicable";
  invalidEntriesIgnored: number;
  statement: string;
  perFinding: ReportFindingNotes[];
};

export type ReviewReport = {
  reportSchemaVersion: typeof REPORT_SCHEMA_VERSION;
  generatedAt: string;
  generatedAtLocal: string;
  timeZone: string;
  utcOffset: string;
  application: { name: string; packageVersion: string };
  case: {
    id: string;
    title: string;
    description: string;
    origin: ReportOrigin;
    recordCount: number;
  };
  syntheticData: {
    declaredSynthetic: true;
    statement: string;
    limitations: string[];
  };
  scope: {
    checks: { name: string; ruleId?: string; description: string }[];
    notChecked: string[];
  };
  counts: {
    sourceRecords: number;
    linkedPairsCompared: number;
    skippedOrIncomplete: number;
    validationIssues: number;
    dagReferenceFindings: number;
    evidenceIncomplete: number;
  };
  sourceRecords: SourceRecord[];
  dagComparison: {
    findings: ComparisonFinding[];
    skipped: SkippedComparison[];
    validationIssues: DataValidationIssue[];
  };
  missingLinks: { label: "Evidence incomplete"; note: string; items: MissingLink[] };
  reviewNotes: ReportNotes;
};

export type CreateReportInput = {
  demoCase: DemoCase;
  origin: ReportOrigin;
  time: TimeContext;
  /** Ignored unless the origin is built-in. Imported reports never include notes. */
  notes: ReportNotesInput | null;
};

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const rest = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${rest}`;
}

export function currentTimeContext(now: Date = new Date()): TimeContext {
  let timeZone = "UTC";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // Keep the UTC fallback.
  }
  return { now, timeZone, offsetMinutes: -now.getTimezoneOffset() };
}

function buildNotes(
  origin: ReportOrigin,
  caseId: string,
  findingIds: readonly string[],
  notes: ReportNotesInput | null,
): ReportNotes {
  if (origin !== "built-in" || notes === null) {
    return {
      included: false,
      source: "none",
      storageStatus: "not-applicable",
      invalidEntriesIgnored: 0,
      statement:
        origin === "imported"
          ? IMPORTED_NOTES_STATEMENT
          : "No reviewer notes were supplied for this report.",
      perFinding: [],
    };
  }

  const usable = notes.status === "ok" ? notes.notes : [];
  return {
    included: notes.status === "ok",
    source: "browser-localStorage",
    storageStatus: notes.status,
    invalidEntriesIgnored: notes.discarded,
    statement: REPORT_NOTES_STATEMENT,
    perFinding: findingIds.map((findingId) => {
      const history = usable
        .filter((note) => note.caseId === caseId && note.findingId === findingId)
        .map((note) => ({ ...note }));
      return {
        findingId,
        currentLabel: history.length > 0 ? history[history.length - 1].label : null,
        findingRemainsReported: true as const,
        history,
      };
    }),
  };
}

/** One immutable snapshot: the JSON file and the print view both render this same object. */
export function createReport({
  demoCase,
  origin,
  time,
  notes,
}: CreateReportInput): ReviewReport {
  const records = structuredClone([...demoCase.records]);
  const comparison = compareDagReferences(records);
  const missing = findMissingLinks(records);
  const findingIds = comparison.findings.map((finding) => finding.id);

  const report: ReviewReport = {
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: time.now.toISOString(),
    generatedAtLocal: `${new Date(time.now.getTime() + time.offsetMinutes * 60_000)
      .toISOString()
      .slice(0, 19)}${formatOffset(time.offsetMinutes)}`,
    timeZone: time.timeZone,
    utcOffset: formatOffset(time.offsetMinutes),
    application: {
      name: packageJson.name,
      packageVersion: packageJson.version,
    },
    case: {
      id: demoCase.id,
      title: demoCase.title,
      description: demoCase.description,
      origin,
      recordCount: records.length,
    },
    syntheticData: {
      declaredSynthetic: true,
      statement:
        origin === "imported"
          ? "The importer required synthetic: true in the file. This declaration is user-provided."
          : "These records are hand-written fictional fixtures shipped with the application.",
      limitations: [
        ...(origin === "imported"
          ? [
              "The synthetic declaration is not proof that the data contains no personal information. BhumiSetu does not anonymize data and does not detect personal information.",
            ]
          : []),
        "Uses synthetic records. Not official verification or legal advice.",
      ],
    },
    scope: {
      checks: [
        {
          name: "Dag-reference comparison",
          ruleId: DAG_REFERENCE_MISMATCH,
          description:
            "Compares dag references between records the data explicitly declares as the same parcel, with matching mouza ID and survey context.",
        },
        {
          name: "Missing-link check",
          description:
            "Reports related record IDs that are not in the case as evidence incomplete.",
        },
      ],
      notChecked: [
        "Names, areas, dates, and parties are not compared.",
        "Ownership, document authenticity, fraud, and legal status are not verified.",
      ],
    },
    counts: {
      sourceRecords: records.length,
      linkedPairsCompared: comparison.comparedCount,
      skippedOrIncomplete: comparison.skipped.length,
      validationIssues: comparison.validationIssues.length,
      dagReferenceFindings: comparison.findings.length,
      evidenceIncomplete: missing.length,
    },
    sourceRecords: records,
    dagComparison: {
      findings: [...comparison.findings],
      skipped: [...comparison.skipped],
      validationIssues: [...comparison.validationIssues],
    },
    missingLinks: {
      label: "Evidence incomplete",
      note: "A data-completeness check only, not a finding of fraud or invalid ownership.",
      items: missing,
    },
    reviewNotes: buildNotes(origin, demoCase.id, findingIds, notes),
  };

  return deepFreeze(structuredClone(report));
}

export function serializeReport(report: ReviewReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** Keeps letters, digits, dot, underscore, and hyphen only, so any ID is safe as a file name part. */
export function sanitizeForFileName(value: string, maxLength = 60): string {
  const cleaned = value
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+/, "")
    .slice(0, maxLength)
    .replace(/[-._]+$/, "");
  return cleaned === "" ? "case" : cleaned;
}

export function reportFileName(
  report: Pick<ReviewReport, "generatedAt"> & {
    case: Pick<ReviewReport["case"], "id" | "origin">;
  },
): string {
  const stamp = report.generatedAt.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `bhumisetu-report-${report.case.origin}-${sanitizeForFileName(report.case.id)}-${stamp}.json`;
}

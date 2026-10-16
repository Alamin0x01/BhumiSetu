import type { SourceRecord } from "@/data/cases";

export const DAG_REFERENCE_MISMATCH = "DAG_REFERENCE_MISMATCH";

export const RECORD_DIFFERENCE_LIMITATION =
  "This is a record difference, not proof of fraud or invalid ownership.";

export type ComparedValue = {
  recordId: string;
  original: string;
  normalized: string;
};

export type ComparisonFinding = {
  id: string;
  ruleId: typeof DAG_REFERENCE_MISMATCH;
  /** Sorted by plain string order so the pair is the same whichever record declared it. */
  sourceRecordIds: readonly [string, string];
  fieldName: "dagReference";
  values: readonly [ComparedValue, ComparedValue];
  explanation: string;
  comparabilityAssumptions: readonly string[];
  limitation: string;
};

export type DataValidationIssue = {
  code: "DUPLICATE_RECORD_ID";
  recordId: string;
  occurrences: number;
  message: string;
};

export type SkipReason =
  | "SELF_REFERENCE"
  | "SAME_PARCEL_NOT_DECLARED"
  | "LINKED_RECORD_MISSING"
  | "AMBIGUOUS_RECORD_ID"
  | "INCOMPLETE_FIELDS"
  | "SCOPE_DIFFERS";

export type SkippedComparison = {
  recordIds: readonly [string, string];
  reason: SkipReason;
  message: string;
};

export type DagComparisonResult = {
  findings: readonly ComparisonFinding[];
  /** Linked pairs that were fully comparable, whether or not their dag references differ. */
  comparedCount: number;
  skipped: readonly SkippedComparison[];
  validationIssues: readonly DataValidationIssue[];
};

/** Trims surrounding whitespace and maps Bangla digits to English digits; nothing else changes. */
export function normalizeRecordValue(value: string): string {
  return value
    .trim()
    .replace(/[\u09E6-\u09EF]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x09e6),
    );
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizedFields(record: SourceRecord) {
  return {
    mouzaId: normalizeRecordValue(record.mouzaId),
    surveyContext: normalizeRecordValue(record.surveyContext),
    dagReference: normalizeRecordValue(record.dagReference),
  };
}

/**
 * Flags dag-reference differences only between records linked by an explicit
 * same-parcel relationship; it never compares records by mouza alone.
 * Every linked pair is either compared or reported as skipped with a reason.
 */
export function compareDagReferences(
  records: readonly SourceRecord[],
): DagComparisonResult {
  const recordsById = new Map<string, SourceRecord[]>();
  for (const record of records) {
    const group = recordsById.get(record.id);
    if (group) group.push(record);
    else recordsById.set(record.id, [record]);
  }

  const validationIssues = [...recordsById]
    .filter(([, group]) => group.length > 1)
    .map(
      ([recordId, group]): DataValidationIssue => ({
        code: "DUPLICATE_RECORD_ID",
        recordId,
        occurrences: group.length,
        message: `Record ID "${recordId}" is used by ${group.length} records. Comparisons involving it were skipped and no record was chosen.`,
      }),
    )
    .sort((a, b) => compareStrings(a.recordId, b.recordId));

  // One entry per unordered pair, so reciprocal or repeated links are examined once.
  const pairs = new Map<
    string,
    { ids: readonly [string, string]; declared: boolean }
  >();
  for (const record of records) {
    for (const relatedId of record.relatedRecordIds) {
      const ids: readonly [string, string] =
        record.id <= relatedId
          ? [record.id, relatedId]
          : [relatedId, record.id];
      const key = `${ids[0]}:${ids[1]}`;
      const declared =
        record.comparisonScope.sameParcelRecordIds.includes(relatedId);
      const existing = pairs.get(key);
      if (!existing) pairs.set(key, { ids, declared });
      else if (declared) existing.declared = true;
    }
  }

  const findings: ComparisonFinding[] = [];
  const skipped: SkippedComparison[] = [];
  let comparedCount = 0;

  const sortedPairs = [...pairs].sort(([a], [b]) => compareStrings(a, b));
  for (const [, { ids, declared }] of sortedPairs) {
    const [firstId, secondId] = ids;
    const skip = (reason: SkipReason, message: string) => {
      skipped.push({ recordIds: ids, reason, message });
    };

    if (firstId === secondId) {
      skip("SELF_REFERENCE", `Record ${firstId} lists itself as a related record.`);
      continue;
    }
    if (!declared) {
      skip(
        "SAME_PARCEL_NOT_DECLARED",
        `${firstId} and ${secondId} are related, but the data does not declare them as the same parcel.`,
      );
      continue;
    }

    const missingIds = ids.filter((id) => !recordsById.has(id));
    if (missingIds.length > 0) {
      skip(
        "LINKED_RECORD_MISSING",
        `Linked record ${missingIds.join(" and ")} is not in the record set.`,
      );
      continue;
    }

    const ambiguousIds = ids.filter((id) => recordsById.get(id)!.length > 1);
    if (ambiguousIds.length > 0) {
      skip(
        "AMBIGUOUS_RECORD_ID",
        `Record ID ${ambiguousIds.join(" and ")} is used by more than one record, so no record was chosen.`,
      );
      continue;
    }

    const first = recordsById.get(firstId)![0];
    const second = recordsById.get(secondId)![0];
    const firstFields = normalizedFields(first);
    const secondFields = normalizedFields(second);

    const emptyFields = [first, second].flatMap((record) =>
      Object.entries(normalizedFields(record))
        .filter(([, value]) => !value)
        .map(([name]) => `${record.id}.${name}`),
    );
    if (emptyFields.length > 0) {
      skip(
        "INCOMPLETE_FIELDS",
        `Empty after trimming: ${emptyFields.join(", ")}.`,
      );
      continue;
    }

    if (
      firstFields.mouzaId !== secondFields.mouzaId ||
      firstFields.surveyContext !== secondFields.surveyContext
    ) {
      skip(
        "SCOPE_DIFFERS",
        "Mouza ID or survey context differs, so the records are not treated as comparable.",
      );
      continue;
    }

    comparedCount += 1;
    if (firstFields.dagReference === secondFields.dagReference) continue;

    const toValue = (source: SourceRecord): ComparedValue => ({
      recordId: source.id,
      original: source.dagReference,
      normalized: normalizeRecordValue(source.dagReference),
    });
    const values: [ComparedValue, ComparedValue] = [
      toValue(first),
      toValue(second),
    ];

    findings.push({
      id: `${DAG_REFERENCE_MISMATCH}:${firstId}:${secondId}`,
      ruleId: DAG_REFERENCE_MISMATCH,
      sourceRecordIds: [firstId, secondId],
      fieldName: "dagReference",
      values,
      explanation: `Dag reference differs between related records ${firstId} and ${secondId} after normalization: "${values[0].normalized}" vs "${values[1].normalized}".`,
      comparabilityAssumptions: [
        "Both records exist in the supplied record set.",
        "The synthetic data explicitly declares the relationship as the same parcel.",
        `Mouza IDs match after normalization: "${firstFields.mouzaId}".`,
        `Survey contexts match after normalization: "${firstFields.surveyContext}".`,
        "Both records have non-empty mouza IDs, survey contexts, and dag references.",
      ],
      limitation: RECORD_DIFFERENCE_LIMITATION,
    });
  }

  return { findings, comparedCount, skipped, validationIssues };
}

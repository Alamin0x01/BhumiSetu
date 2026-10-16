import type { DocumentType, SourceRecord } from "@/data/cases";

export const documentTypeLabels: Record<DocumentType, string> = {
  dalil: "Dalil",
  khatian: "Khatian",
  mutation: "Mutation",
};

export function recordAnchorId(recordId: string): string {
  return `record-${recordId}`;
}

export type MissingLink = {
  referencingRecordId: string;
  missingRecordId: string;
};

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Related record IDs that point outside the supplied records; nothing is inferred about them. */
export function findMissingLinks(
  records: readonly SourceRecord[],
): MissingLink[] {
  const knownIds = new Set(records.map((record) => record.id));
  const links = new Map<string, MissingLink>();

  for (const record of records) {
    for (const relatedId of record.relatedRecordIds) {
      if (knownIds.has(relatedId)) continue;
      links.set(JSON.stringify([record.id, relatedId]), {
        referencingRecordId: record.id,
        missingRecordId: relatedId,
      });
    }
  }

  return [...links.values()].sort(
    (a, b) =>
      compareStrings(a.referencingRecordId, b.referencingRecordId) ||
      compareStrings(a.missingRecordId, b.missingRecordId),
  );
}

export type EvidenceTimelineData = {
  dated: SourceRecord[];
  undated: SourceRecord[];
};

export function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/** Orders by the recorded document date; records without a valid date are listed apart, never guessed. */
export function buildTimeline(
  records: readonly SourceRecord[],
): EvidenceTimelineData {
  const dated = records.filter((record) => isRealIsoDate(record.documentDate));
  const undated = records.filter(
    (record) => !isRealIsoDate(record.documentDate),
  );

  dated.sort(
    (a, b) =>
      compareStrings(a.documentDate, b.documentDate) ||
      compareStrings(a.id, b.id),
  );
  undated.sort((a, b) => compareStrings(a.id, b.id));

  return { dated, undated };
}

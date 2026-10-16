import {
  AREA_UNITS,
  DOCUMENT_TYPES,
  demoCases,
  type ComparisonScope,
  type DemoCase,
  type SourceRecord,
} from "@/data/cases";
import { isRealIsoDate } from "./evidence";

export const SCHEMA_VERSION = "1";
export const SUPPORTED_SCHEMA_VERSIONS: readonly string[] = [SCHEMA_VERSION];
export const MAX_FILE_BYTES = 256 * 1024;
export const MIN_RECORDS = 1;
export const MAX_RECORDS = 50;
export const MAX_REFERENCES = 20;
export const MAX_IDENTIFIER_LENGTH = 100;
export const MAX_TEXT_LENGTH = 500;
export const SAMPLE_FILE_NAME = "bhumisetu-sample-import.json";
export const SAMPLE_CASE_ID = "DEMO-CASE-002";

const MAX_ISSUES = 50;
const MAX_DEPTH = 8;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

// `satisfies` keeps these lists in step with the application types.
const ENVELOPE_FIELDS = ["schemaVersion", "synthetic", "case"] as const;
const CASE_FIELDS = Object.keys({
  id: true,
  title: true,
  description: true,
  records: true,
} satisfies Record<keyof DemoCase, true>);
const RECORD_FIELDS = Object.keys({
  id: true,
  documentType: true,
  documentReference: true,
  documentDate: true,
  mouzaId: true,
  surveyContext: true,
  dagReference: true,
  area: true,
  partyIds: true,
  relatedRecordIds: true,
  comparisonScope: true,
} satisfies Record<keyof SourceRecord, true>);
const AREA_FIELDS = Object.keys({
  value: true,
  unit: true,
} satisfies Record<keyof SourceRecord["area"], true>);
const SCOPE_FIELDS = Object.keys({
  sameParcelRecordIds: true,
} satisfies Record<keyof ComparisonScope, true>);

export type ImportIssue = { path: string; message: string };

export type ImportResult =
  | { ok: true; demoCase: DemoCase }
  | { ok: false; issues: ImportIssue[] };

export type ImportEnvelope = {
  schemaVersion: typeof SCHEMA_VERSION;
  synthetic: true;
  case: DemoCase;
};

type Obj = Record<string, unknown>;

function createCollector() {
  const issues: ImportIssue[] = [];
  let total = 0;
  return {
    add(path: string, message: string) {
      total += 1;
      if (issues.length < MAX_ISSUES) issues.push({ path, message });
    },
    get count() {
      return total;
    },
    finish(): ImportIssue[] {
      if (total > issues.length) {
        issues.push({
          path: "(more)",
          message: `${total - issues.length} more problems are not shown.`,
        });
      }
      return issues;
    },
  };
}

type Collector = ReturnType<typeof createCollector>;

const hasOwn = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

function asObject(value: unknown): Obj | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Obj)
    : null;
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function join(path: string, key: string): string {
  const shown = truncate(key);
  return path === "" ? shown : `${path}.${shown}`;
}

/** Rejects unsafe keys anywhere in the parsed tree before any application object is built. */
function scanUnsafeKeys(
  value: unknown,
  path: string,
  depth: number,
  collector: Collector,
) {
  if (typeof value !== "object" || value === null) return;
  if (depth > MAX_DEPTH) {
    collector.add(path || "(root)", "nesting is too deep.");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "object" && item !== null) {
        scanUnsafeKeys(item, `${path}[${index}]`, depth + 1, collector);
      }
    });
    return;
  }
  const object = value as Obj;
  for (const key of Object.keys(object)) {
    if (UNSAFE_KEYS.has(key)) {
      collector.add(join(path, key), "unsafe key is not allowed. Remove it.");
    } else {
      scanUnsafeKeys(object[key], join(path, key), depth + 1, collector);
    }
  }
}

function checkFields(
  object: Obj,
  allowed: readonly string[],
  path: string,
  collector: Collector,
) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      collector.add(
        join(path, key),
        `unknown field. Remove it; allowed fields are: ${allowed.join(", ")}.`,
      );
    }
  }
  for (const key of allowed) {
    if (!hasOwn(object, key)) {
      collector.add(join(path, key), "required field is missing.");
    }
  }
}

type StringRule = { max: number; allowEmpty?: boolean };
const IDENTIFIER: StringRule = { max: MAX_IDENTIFIER_LENGTH };
const TEXT: StringRule = { max: MAX_TEXT_LENGTH };
const OPTIONAL_TEXT: StringRule = { max: MAX_TEXT_LENGTH, allowEmpty: true };

function checkString(
  value: unknown,
  path: string,
  rule: StringRule,
  collector: Collector,
): string | null {
  if (typeof value !== "string" || (!rule.allowEmpty && value.trim() === "")) {
    collector.add(
      path,
      rule.allowEmpty ? "expected a string." : "expected a non-empty string.",
    );
    return null;
  }
  if (value.length > rule.max) {
    collector.add(
      path,
      `expected at most ${rule.max} characters (got ${value.length}).`,
    );
    return null;
  }
  return value;
}

function readString(
  object: Obj,
  key: string,
  path: string,
  rule: StringRule,
  collector: Collector,
): string | null {
  if (!hasOwn(object, key)) return null;
  return checkString(object[key], join(path, key), rule, collector);
}

function readStringArray(
  object: Obj,
  key: string,
  path: string,
  collector: Collector,
): string[] | null {
  if (!hasOwn(object, key)) return null;
  const here = join(path, key);
  const value = object[key];
  if (!Array.isArray(value)) {
    collector.add(here, "expected an array of strings.");
    return null;
  }
  if (value.length > MAX_REFERENCES) {
    collector.add(
      here,
      `expected at most ${MAX_REFERENCES} entries (got ${value.length}).`,
    );
    return null;
  }
  const items: string[] = [];
  let valid = true;
  value.forEach((item, index) => {
    const text = checkString(item, `${here}[${index}]`, IDENTIFIER, collector);
    if (text === null) valid = false;
    else items.push(text);
  });
  return valid ? items : null;
}

function readEnum<T extends string>(
  object: Obj,
  key: string,
  path: string,
  allowed: readonly T[],
  collector: Collector,
): T | null {
  if (!hasOwn(object, key)) return null;
  const match = allowed.find((option) => option === object[key]);
  if (match === undefined) {
    collector.add(join(path, key), `expected one of: ${allowed.join(", ")}.`);
    return null;
  }
  return match;
}

function readDate(
  object: Obj,
  key: string,
  path: string,
  collector: Collector,
): string | null {
  if (!hasOwn(object, key)) return null;
  const value = object[key];
  if (typeof value !== "string" || !isRealIsoDate(value)) {
    collector.add(
      join(path, key),
      "expected a valid calendar date in YYYY-MM-DD format.",
    );
    return null;
  }
  return value;
}

function readArea(
  object: Obj,
  path: string,
  collector: Collector,
): SourceRecord["area"] | null {
  if (!hasOwn(object, "area")) return null;
  const here = join(path, "area");
  const area = asObject(object.area);
  if (!area) {
    collector.add(here, "expected an object with value and unit.");
    return null;
  }
  checkFields(area, AREA_FIELDS, here, collector);
  let value: string | null = null;
  if (hasOwn(area, "value")) {
    const raw = area.value;
    if (
      typeof raw !== "string" ||
      raw.length > MAX_IDENTIFIER_LENGTH ||
      !/^\d+(\.\d+)?$/.test(raw)
    ) {
      collector.add(
        join(here, "value"),
        'expected a decimal string such as "12.50".',
      );
    } else {
      value = raw;
    }
  }
  const unit = readEnum(area, "unit", here, AREA_UNITS, collector);
  return value !== null && unit !== null ? { value, unit } : null;
}

function readScope(
  object: Obj,
  path: string,
  collector: Collector,
): ComparisonScope | null {
  if (!hasOwn(object, "comparisonScope")) return null;
  const here = join(path, "comparisonScope");
  const scope = asObject(object.comparisonScope);
  if (!scope) {
    collector.add(here, "expected an object with sameParcelRecordIds.");
    return null;
  }
  checkFields(scope, SCOPE_FIELDS, here, collector);
  const ids = readStringArray(scope, "sameParcelRecordIds", here, collector);
  return ids ? { sameParcelRecordIds: ids } : null;
}

function validateRecord(
  raw: unknown,
  path: string,
  collector: Collector,
): SourceRecord | null {
  const object = asObject(raw);
  if (!object) {
    collector.add(path, "expected an object.");
    return null;
  }
  checkFields(object, RECORD_FIELDS, path, collector);

  const id = readString(object, "id", path, IDENTIFIER, collector);
  const documentType = readEnum(object, "documentType", path, DOCUMENT_TYPES, collector);
  const documentReference = readString(object, "documentReference", path, IDENTIFIER, collector);
  const documentDate = readDate(object, "documentDate", path, collector);
  const mouzaId = readString(object, "mouzaId", path, IDENTIFIER, collector);
  const surveyContext = readString(object, "surveyContext", path, OPTIONAL_TEXT, collector);
  const dagReference = readString(object, "dagReference", path, IDENTIFIER, collector);
  const area = readArea(object, path, collector);
  const partyIds = readStringArray(object, "partyIds", path, collector);
  const relatedRecordIds = readStringArray(object, "relatedRecordIds", path, collector);
  const comparisonScope = readScope(object, path, collector);

  if (relatedRecordIds && comparisonScope) {
    comparisonScope.sameParcelRecordIds.forEach((targetId, index) => {
      if (!relatedRecordIds.includes(targetId)) {
        collector.add(
          `${path}.comparisonScope.sameParcelRecordIds[${index}]`,
          "must also be listed in relatedRecordIds.",
        );
      }
    });
  }

  if (
    id === null ||
    documentType === null ||
    documentReference === null ||
    documentDate === null ||
    mouzaId === null ||
    surveyContext === null ||
    dagReference === null ||
    area === null ||
    partyIds === null ||
    relatedRecordIds === null ||
    comparisonScope === null
  ) {
    return null;
  }
  return {
    id,
    documentType,
    documentReference,
    documentDate,
    mouzaId,
    surveyContext,
    dagReference,
    area,
    partyIds,
    relatedRecordIds,
    comparisonScope,
  };
}

function validateCase(
  raw: unknown,
  path: string,
  collector: Collector,
): DemoCase | null {
  if (Array.isArray(raw)) {
    collector.add(path, "expected exactly one case object, not a list of cases.");
    return null;
  }
  const object = asObject(raw);
  if (!object) {
    collector.add(path, "expected exactly one case object.");
    return null;
  }
  checkFields(object, CASE_FIELDS, path, collector);

  const id = readString(object, "id", path, IDENTIFIER, collector);
  const title = readString(object, "title", path, TEXT, collector);
  const description = readString(object, "description", path, TEXT, collector);

  let records: SourceRecord[] | null = null;
  if (hasOwn(object, "records")) {
    const here = join(path, "records");
    const list = object.records;
    if (!Array.isArray(list)) {
      collector.add(here, "expected an array of records.");
    } else if (list.length < MIN_RECORDS || list.length > MAX_RECORDS) {
      collector.add(
        here,
        `expected between ${MIN_RECORDS} and ${MAX_RECORDS} records (got ${list.length}).`,
      );
    } else {
      const firstSeen = new Map<string, number>();
      const built: (SourceRecord | null)[] = list.map((item, index) => {
        const record = validateRecord(item, `${here}[${index}]`, collector);
        if (record) {
          const first = firstSeen.get(record.id);
          if (first === undefined) firstSeen.set(record.id, index);
          else {
            collector.add(
              `${here}[${index}].id`,
              `duplicate record ID (first used at ${here}[${first}].id). Record IDs must be unique within the case.`,
            );
          }
        }
        return record;
      });
      if (built.every((record): record is SourceRecord => record !== null)) {
        records = built as SourceRecord[];
      }
    }
  }

  if (id === null || title === null || description === null || records === null) {
    return null;
  }
  return { id, title, description, records };
}

export function validateImportEnvelope(data: unknown): ImportResult {
  const collector = createCollector();

  scanUnsafeKeys(data, "", 0, collector);
  if (collector.count > 0) return { ok: false, issues: collector.finish() };

  const root = asObject(data);
  if (!root) {
    collector.add(
      "(root)",
      "expected a JSON object with schemaVersion, synthetic, and case.",
    );
    return { ok: false, issues: collector.finish() };
  }
  checkFields(root, ENVELOPE_FIELDS, "", collector);

  if (hasOwn(root, "schemaVersion")) {
    const version = root.schemaVersion;
    if (typeof version !== "string") {
      collector.add("schemaVersion", `expected the string "${SCHEMA_VERSION}".`);
    } else if (!SUPPORTED_SCHEMA_VERSIONS.includes(version)) {
      collector.add(
        "schemaVersion",
        `unsupported version "${truncate(version, 20)}". Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.map((item) => `"${item}"`).join(", ")}.`,
      );
    }
  }
  if (hasOwn(root, "synthetic") && root.synthetic !== true) {
    collector.add(
      "synthetic",
      "must be exactly true. Only data declared as synthetic can be imported.",
    );
  }

  const demoCase = hasOwn(root, "case")
    ? validateCase(root.case, "case", collector)
    : null;

  if (collector.count > 0 || !demoCase) {
    return { ok: false, issues: collector.finish() };
  }
  return { ok: true, demoCase };
}

export function formatBytes(bytes: number): string {
  return `${Number((bytes / 1024).toFixed(1))} KiB`;
}

/** Cheap checks on the selected file before it is read. */
export function checkFileMeta(file: { name: string; size: number }): ImportIssue[] {
  const issues: ImportIssue[] = [];
  if (!/\.json$/i.test(file.name)) {
    issues.push({ path: "file", message: "expected a .json file." });
  }
  if (file.size > MAX_FILE_BYTES) {
    issues.push({
      path: "file",
      message: `is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_FILE_BYTES)}.`,
    });
  }
  return issues;
}

/** Parses and validates import text. The text is never executed or logged. */
export function parseImportText(text: string): ImportResult {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_FILE_BYTES) {
    return {
      ok: false,
      issues: [
        {
          path: "file",
          message: `is too large (${formatBytes(bytes)}). The limit is ${formatBytes(MAX_FILE_BYTES)}.`,
        },
      ],
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      issues: [
        {
          path: "file",
          message:
            "is not valid JSON. Check for a missing comma, quote, or bracket.",
        },
      ],
    };
  }
  return validateImportEnvelope(data);
}

/** The downloadable sample: a built-in fixture written in the import schema. */
export function createSampleEnvelope(): ImportEnvelope {
  const fixture =
    demoCases.find((item) => item.id === SAMPLE_CASE_ID) ?? demoCases[0];
  return {
    schemaVersion: SCHEMA_VERSION,
    synthetic: true,
    case: structuredClone({
      id: fixture.id,
      title: fixture.title,
      description: fixture.description,
      records: [...fixture.records],
    }),
  };
}

export function serializeSample(): string {
  return `${JSON.stringify(createSampleEnvelope(), null, 2)}\n`;
}

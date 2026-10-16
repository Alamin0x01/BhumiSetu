import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoCases } from "@/data/cases";
import { compareDagReferences } from "./comparison";
import { findMissingLinks } from "./evidence";
import {
  checkFileMeta,
  createSampleEnvelope,
  MAX_FILE_BYTES,
  MAX_IDENTIFIER_LENGTH,
  MAX_RECORDS,
  MAX_REFERENCES,
  MAX_TEXT_LENGTH,
  parseImportText,
  SAMPLE_CASE_ID,
  serializeSample,
  type ImportResult,
} from "./import-schema";

type Rec = Record<string, unknown>;
type Envelope = Rec & { case: Rec & { records: Rec[] } };

const sample = (): Envelope => JSON.parse(serializeSample()) as Envelope;
const run = (value: unknown) => parseImportText(JSON.stringify(value));
const lines = (result: ImportResult) =>
  result.ok ? [] : result.issues.map((issue) => `${issue.path}: ${issue.message}`);
const expectIssue = (result: ImportResult, path: string, message: string | RegExp) => {
  expect(result.ok).toBe(false);
  const match = lines(result).find((line) => line.startsWith(`${path}: `));
  expect(match, `no issue for ${path}; got ${lines(result).join(" | ")}`).toBeDefined();
  if (typeof message === "string") expect(match).toContain(message);
  else expect(match).toMatch(message);
};
const fixtureCase = demoCases.find((item) => item.id === SAMPLE_CASE_ID)!;

describe("sample file", () => {
  it("is the built-in fixture written in the exact import schema", () => {
    const envelope = createSampleEnvelope();
    expect(envelope.schemaVersion).toBe("1");
    expect(envelope.synthetic).toBe(true);
    expect(envelope.case).toEqual({
      id: fixtureCase.id,
      title: fixtureCase.title,
      description: fixtureCase.description,
      records: fixtureCase.records,
    });
    expect(Object.keys(sample())).toEqual(["schemaVersion", "synthetic", "case"]);
    expect(JSON.parse(serializeSample())).toEqual(JSON.parse(JSON.stringify(envelope)));
  });

  it("validates and imports without changes", () => {
    const result = parseImportText(serializeSample());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.demoCase).toEqual(fixtureCase);
    expect(result.demoCase.records).toHaveLength(4);
  });
});

describe("file-level problems", () => {
  it.each(["", "{", "not json", "{'a': 1}"])("rejects malformed JSON %j without echoing it", (text) => {
    const result = parseImportText(text);
    expect(result.ok).toBe(false);
    expect(lines(result)).toEqual(["file: is not valid JSON. Check for a missing comma, quote, or bracket."]);
  });

  it("rejects oversized text and oversized or non-.json files", () => {
    const big = parseImportText("x".repeat(MAX_FILE_BYTES + 1));
    expectIssue(big, "file", "is too large");
    expect(checkFileMeta({ name: "a.json", size: MAX_FILE_BYTES + 1 })).toHaveLength(1);
    expect(checkFileMeta({ name: "a.json", size: MAX_FILE_BYTES })).toEqual([]);
    expect(checkFileMeta({ name: "a.txt", size: 10 })[0].message).toContain(".json");
    expect(checkFileMeta({ name: "A.JSON", size: 10 })).toEqual([]);
  });

  it("accepts a valid file of exactly the size limit", () => {
    const json = serializeSample();
    const padded = json + " ".repeat(MAX_FILE_BYTES - new TextEncoder().encode(json).length);
    expect(new TextEncoder().encode(padded).length).toBe(MAX_FILE_BYTES);
    expect(parseImportText(padded).ok).toBe(true);
  });

  it.each([null, [], "text", 7])("rejects a non-object root %j", (root) => {
    expectIssue(run(root), "(root)", "expected a JSON object");
  });
});

describe("envelope", () => {
  it("rejects an unsupported or non-string schemaVersion", () => {
    const wrong = sample();
    wrong.schemaVersion = "2";
    expectIssue(run(wrong), "schemaVersion", 'unsupported version "2". Supported versions: "1".');
    const numeric = sample();
    numeric.schemaVersion = 1;
    expectIssue(run(numeric), "schemaVersion", 'expected the string "1".');
    const missing = sample();
    delete missing.schemaVersion;
    expectIssue(run(missing), "schemaVersion", "required field is missing.");
  });

  it.each([false, "true", 1, null])("rejects synthetic = %j", (value) => {
    const envelope = sample();
    envelope.synthetic = value;
    expectIssue(run(envelope), "synthetic", "must be exactly true");
  });

  it("rejects a missing synthetic declaration and unknown envelope fields", () => {
    const envelope = sample();
    delete envelope.synthetic;
    envelope.extra = 1;
    const result = run(envelope);
    expectIssue(result, "synthetic", "required field is missing.");
    expectIssue(result, "extra", "unknown field");
  });

  it("requires exactly one case object", () => {
    const list = sample();
    list.case = [list.case] as unknown as Envelope["case"];
    expectIssue(run(list), "case", "exactly one case object, not a list");
    const missing = sample();
    delete (missing as Rec).case;
    expectIssue(run(missing), "case", "required field is missing.");
  });
});

describe("case and record fields", () => {
  it("enforces the 1 to 50 record limits", () => {
    const none = sample();
    none.case.records = [];
    expectIssue(run(none), "case.records", "expected between 1 and 50 records (got 0).");

    const many = sample();
    many.case.records = Array.from({ length: MAX_RECORDS + 1 }, (_, i) => ({
      ...structuredClone(many.case.records[0]),
      id: `R-${i}`,
    }));
    expectIssue(run(many), "case.records", `got ${MAX_RECORDS + 1}`);

    const max = sample();
    max.case.records = Array.from({ length: MAX_RECORDS }, (_, i) => ({
      ...structuredClone(max.case.records[0]),
      id: `R-${i}`,
      relatedRecordIds: [],
      comparisonScope: { sameParcelRecordIds: [] },
    }));
    expect(run(max).ok).toBe(true);
  });

  it("reports missing fields with the full path", () => {
    const envelope = sample();
    delete envelope.case.records[2].dagReference;
    expectIssue(run(envelope), "case.records[2].dagReference", "required field is missing.");
  });

  it.each([
    ["a number", 518],
    ["an empty string", ""],
    ["a whitespace-only string", "   "],
    ["null", null],
    ["an object", {}],
  ])("rejects a dag reference that is %s", (_name, value) => {
    const envelope = sample();
    envelope.case.records[2].dagReference = value;
    expectIssue(run(envelope), "case.records[2].dagReference", "expected a non-empty string.");
  });

  it("rejects wrong types elsewhere", () => {
    const envelope = sample();
    envelope.case.records[0].partyIds = "PARTY-1";
    envelope.case.records[1].relatedRecordIds = [1];
    envelope.case.title = 5;
    const result = run(envelope);
    expectIssue(result, "case.records[0].partyIds", "expected an array of strings.");
    expectIssue(result, "case.records[1].relatedRecordIds[0]", "expected a non-empty string.");
    expectIssue(result, "case.title", "expected a non-empty string.");
  });

  it("rejects unknown fields at every level", () => {
    const envelope = sample();
    envelope.case.owner = "x";
    envelope.case.records[1].ownerName = "x";
    (envelope.case.records[1].area as Rec).currency = "x";
    (envelope.case.records[1].comparisonScope as Rec).inferred = true;
    const result = run(envelope);
    expectIssue(result, "case.owner", "unknown field. Remove it; allowed fields are: id, title, description, records.");
    expectIssue(result, "case.records[1].ownerName", "unknown field");
    expectIssue(result, "case.records[1].area.currency", "unknown field");
    expectIssue(result, "case.records[1].comparisonScope.inferred", "unknown field");
  });

  it("rejects duplicate record IDs without merging them", () => {
    const envelope = sample();
    envelope.case.records[3].id = envelope.case.records[0].id;
    expectIssue(run(envelope), "case.records[3].id", "duplicate record ID (first used at case.records[0].id)");
  });

  it("rejects unsupported document types", () => {
    const envelope = sample();
    envelope.case.records[0].documentType = "deed";
    expectIssue(run(envelope), "case.records[0].documentType", "expected one of: dalil, khatian, mutation.");
  });

  it.each(["2020-02-30", "2019-02-29", "15/01/2020", "2020-1-1", "", " 2020-01-01", "2020-13-01"])(
    "rejects the invalid date %j",
    (date) => {
      const envelope = sample();
      envelope.case.records[0].documentDate = date;
      expectIssue(run(envelope), "case.records[0].documentDate", "valid calendar date in YYYY-MM-DD");
    },
  );

  it("accepts a real leap-day date", () => {
    const envelope = sample();
    envelope.case.records[0].documentDate = "2020-02-29";
    expect(run(envelope).ok).toBe(true);
  });

  it.each(["12.5.0", "-1", "abc", " 5", "5 ", ".5", "5.", "1e3", 12.5, null])(
    "rejects the area value %j",
    (value) => {
      const envelope = sample();
      (envelope.case.records[0].area as Rec).value = value;
      expectIssue(run(envelope), "case.records[0].area.value", 'expected a decimal string such as "12.50".');
    },
  );

  it("accepts decimal area strings and rejects unsupported units", () => {
    for (const value of ["8", "8.00", "0.05", "007.50"]) {
      const ok = sample();
      (ok.case.records[0].area as Rec).value = value;
      expect(run(ok).ok, value).toBe(true);
    }
    const bad = sample();
    (bad.case.records[0].area as Rec).unit = "bigha";
    expectIssue(run(bad), "case.records[0].area.unit", "expected one of: decimal, acre.");
    const noUnit = sample();
    delete (noUnit.case.records[0].area as Rec).unit;
    expectIssue(run(noUnit), "case.records[0].area.unit", "required field is missing.");
  });

  it("enforces identifier, dag, and text length limits", () => {
    const long = "9".repeat(MAX_IDENTIFIER_LENGTH + 1);
    const envelope = sample();
    envelope.case.id = long;
    envelope.case.records[0].id = long;
    envelope.case.records[0].dagReference = long;
    envelope.case.records[0].partyIds = [long];
    envelope.case.title = "t".repeat(MAX_TEXT_LENGTH + 1);
    envelope.case.records[1].surveyContext = "s".repeat(MAX_TEXT_LENGTH + 1);
    const result = run(envelope);
    expectIssue(result, "case.id", "expected at most 100 characters (got 101).");
    expectIssue(result, "case.records[0].id", "at most 100");
    expectIssue(result, "case.records[0].dagReference", "at most 100");
    expectIssue(result, "case.records[0].partyIds[0]", "at most 100");
    expectIssue(result, "case.title", "at most 500");
    expectIssue(result, "case.records[1].surveyContext", "at most 500");

    const edge = sample();
    edge.case.records[0].dagReference = "9".repeat(MAX_IDENTIFIER_LENGTH);
    edge.case.title = "t".repeat(MAX_TEXT_LENGTH);
    expect(run(edge).ok).toBe(true);
  });

  it("limits related-record references to 20 per record", () => {
    const over = sample();
    over.case.records[0].relatedRecordIds = Array.from({ length: MAX_REFERENCES + 1 }, (_, i) => `X-${i}`);
    expectIssue(run(over), "case.records[0].relatedRecordIds", "at most 20 entries (got 21)");
    const at = sample();
    at.case.records[0].relatedRecordIds = Array.from({ length: MAX_REFERENCES }, (_, i) => `X-${i}`);
    expect(run(at).ok).toBe(true);
  });

  it("requires same-parcel declarations to be listed as related records", () => {
    const envelope = sample();
    envelope.case.records[0].comparisonScope = { sameParcelRecordIds: ["DEMO-REC-002-02"] };
    expectIssue(
      run(envelope),
      "case.records[0].comparisonScope.sameParcelRecordIds[0]",
      "must also be listed in relatedRecordIds.",
    );
  });

  it("caps the number of reported problems", () => {
    const envelope = sample();
    envelope.case.records = Array.from({ length: 40 }, (_, i) => ({ id: `R-${i}` }));
    const issues = lines(run(envelope));
    expect(issues.length).toBeLessThanOrEqual(51);
    expect(issues[issues.length - 1]).toMatch(/^\(more\): \d+ more problems are not shown\.$/);
  });
});

describe("raw strings are preserved", () => {
  it("keeps leading zeros, punctuation, whitespace, and Bangla digits exactly", () => {
    const values = ["0518", "০৫১৮", "518/1", " ৫১৮-ক ", "007"];
    const envelope = sample();
    values.forEach((value, index) => {
      if (envelope.case.records[index]) envelope.case.records[index].dagReference = value;
    });
    envelope.case.records = envelope.case.records.slice(0, 4);
    envelope.case.records[0].dagReference = "0518";
    envelope.case.records[1].dagReference = "০৫১৮";
    envelope.case.records[2].dagReference = "518/1";
    envelope.case.records[3].dagReference = " ৫১৮-ক ";
    const result = run(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.demoCase.records.map((record) => record.dagReference)).toEqual([
      "0518",
      "০৫১৮",
      "518/1",
      " ৫১৮-ক ",
    ]);
  });

  it("lets the existing engine treat Bangla digits as English digits but keep leading zeros", () => {
    const same = sample();
    same.case.records[0].dagReference = "\u09EB\u09E7\u09EE";
    same.case.records[1].dagReference = "518";
    const sameResult = run(same);
    if (!sameResult.ok) throw new Error("expected ok");
    expect(
      compareDagReferences(sameResult.demoCase.records).findings.map((finding) => finding.id),
    ).toEqual(["DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03"]);

    const zero = sample();
    zero.case.records[0].dagReference = "0518";
    const zeroResult = run(zero);
    if (!zeroResult.ok) throw new Error("expected ok");
    const findings = compareDagReferences(zeroResult.demoCase.records).findings;
    expect(findings.map((finding) => finding.id)).toContain(
      "DAG_REFERENCE_MISMATCH:DEMO-REC-002-01:DEMO-REC-002-02",
    );
    expect(findings.find((finding) => finding.sourceRecordIds.includes("DEMO-REC-002-01"))?.values[0].original).toBe("0518");
  });
});

describe("missing related records", () => {
  it("are accepted and reported by the existing missing-link checker", () => {
    const envelope = sample();
    envelope.case.records[1].relatedRecordIds = ["DEMO-REC-002-01", "GHOST-RECORD"];
    envelope.case.records[1].comparisonScope = { sameParcelRecordIds: ["DEMO-REC-002-01", "GHOST-RECORD"] };
    const result = run(envelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findMissingLinks(result.demoCase.records)).toEqual([
      { referencingRecordId: "DEMO-REC-002-02", missingRecordId: "GHOST-RECORD" },
    ]);
    const comparison = compareDagReferences(result.demoCase.records);
    expect(comparison.skipped.map((item) => item.reason)).toContain("LINKED_RECORD_MISSING");
  });
});

describe("unsafe keys", () => {
  const base = serializeSample();

  it("rejects __proto__ before building anything and does not pollute prototypes", () => {
    const text = base.replace('"synthetic": true', '"synthetic": true,\n  "__proto__": { "polluted": "yes" }');
    expect(text).not.toBe(base);
    const result = parseImportText(text);
    expect(result.ok).toBe(false);
    expect(lines(result)).toEqual(["__proto__: unsafe key is not allowed. Remove it."]);
    expect(({} as Rec).polluted).toBeUndefined();
  });

  it("rejects constructor and prototype keys at any depth", () => {
    const envelope = sample();
    (envelope.case.records[0].area as Rec).prototype = {};
    const text = JSON.stringify(envelope).replace(
      '"relatedRecordIds":[]',
      '"relatedRecordIds":[],"constructor":{"prototype":{}}',
    );
    const result = parseImportText(text);
    expect(result.ok).toBe(false);
    const found = lines(result);
    expect(found.some((line) => line.startsWith("case.records[0].area.prototype: unsafe key"))).toBe(true);
    expect(found.some((line) => line.includes("constructor: unsafe key"))).toBe(true);
    expect(found.every((line) => line.includes("unsafe key"))).toBe(true);
  });

  it("rejects extremely deep nesting", () => {
    const deep = '{"a":'.repeat(20) + "1" + "}".repeat(20);
    expectIssue(parseImportText(deep), "a.a.a.a.a.a.a.a.a", "nesting is too deep.");
  });
});

describe("imports do not touch fixtures", () => {
  it("builds new objects and leaves the built-in cases unchanged", () => {
    const before = JSON.stringify(demoCases);
    const result = parseImportText(serializeSample());
    if (!result.ok) throw new Error("expected ok");
    compareDagReferences(result.demoCase.records);
    expect(result.demoCase).not.toBe(fixtureCase);
    expect(result.demoCase.records[0]).not.toBe(fixtureCase.records[0]);
    expect(result.demoCase.records[0].area).not.toBe(fixtureCase.records[0].area);
    expect(JSON.stringify(demoCases)).toBe(before);
  });

  it("computes findings with the existing engine", () => {
    const result = parseImportText(serializeSample());
    if (!result.ok) throw new Error("expected ok");
    expect(compareDagReferences(result.demoCase.records)).toEqual(
      compareDagReferences(fixtureCase.records),
    );
    expect(
      compareDagReferences(result.demoCase.records).findings.map((finding) => finding.id),
    ).toEqual(["DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03"]);
  });
});

describe("import code stays local, text-only, and away from saved notes", () => {
  const files = [
    "./import-schema.ts",
    "./import-session.ts",
    "./imported-case-store.ts",
    "../components/import-panel.tsx",
    "../components/imported-case.tsx",
  ];

  it.each(files)("%s has no storage, network, eval, or HTML injection", (file) => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    expect(source).not.toMatch(
      /localStorage|sessionStorage|indexedDB|lib\/review|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|\beval\(|new Function|dangerouslySetInnerHTML|innerHTML|console\.|https?:\/\//,
    );
  });
});

import { describe, expect, it } from "vitest";
import { demoCases, type SourceRecord } from "@/data/cases";
import {
  compareDagReferences,
  normalizeRecordValue,
  RECORD_DIFFERENCE_LIMITATION,
} from "./comparison";

function makeRecord(
  id: string,
  overrides: Partial<SourceRecord> = {},
): SourceRecord {
  return {
    id,
    documentType: "dalil",
    documentReference: `REF-${id}`,
    documentDate: "2020-01-01",
    mouzaId: "MZ-1",
    surveyContext: "RS sheet 1",
    dagReference: "100",
    area: { value: "1.00", unit: "decimal" },
    partyIds: [],
    relatedRecordIds: [],
    comparisonScope: { sameParcelRecordIds: [] },
    ...overrides,
  };
}

/** Record A explicitly links to record B as the same parcel. */
function linkedPair(
  a: Partial<SourceRecord> = {},
  b: Partial<SourceRecord> = {},
): SourceRecord[] {
  return [
    makeRecord("A", {
      relatedRecordIds: ["B"],
      comparisonScope: { sameParcelRecordIds: ["B"] },
      ...a,
    }),
    makeRecord("B", b),
  ];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("normalizeRecordValue", () => {
  it("converts Bangla digits to English digits", () => {
    expect(normalizeRecordValue("৫১৮")).toBe("518");
    expect(normalizeRecordValue("০১২৩৪৫৬৭৮৯")).toBe("0123456789");
  });

  it("trims surrounding whitespace only", () => {
    expect(normalizeRecordValue("  412 \n")).toBe("412");
    expect(normalizeRecordValue("41 2")).toBe("41 2");
  });

  it("preserves leading zeros and punctuation", () => {
    expect(normalizeRecordValue(" ০০৫-১/ক ")).toBe("005-1/ক");
    expect(normalizeRecordValue("0518")).toBe("0518");
    expect(normalizeRecordValue("518/1")).toBe("518/1");
  });
});

describe("compareDagReferences", () => {
  it("reports no finding when linked dag references match", () => {
    const result = compareDagReferences(linkedPair());
    expect(result.findings).toEqual([]);
    expect(result.comparedCount).toBe(1);
    expect(result.skipped).toEqual([]);
    expect(result.validationIssues).toEqual([]);
  });

  it("reports one complete finding when linked dag references differ", () => {
    const result = compareDagReferences(
      linkedPair({ dagReference: "518" }, { dagReference: "581" }),
    );

    expect(result.comparedCount).toBe(1);
    expect(result.findings).toHaveLength(1);
    const [finding] = result.findings;
    expect(finding.id).toBe("DAG_REFERENCE_MISMATCH:A:B");
    expect(finding.ruleId).toBe("DAG_REFERENCE_MISMATCH");
    expect(finding.sourceRecordIds).toEqual(["A", "B"]);
    expect(finding.fieldName).toBe("dagReference");
    expect(finding.values).toEqual([
      { recordId: "A", original: "518", normalized: "518" },
      { recordId: "B", original: "581", normalized: "581" },
    ]);
    expect(finding.explanation).toContain('"518"');
    expect(finding.explanation).toContain('"581"');
    expect(finding.comparabilityAssumptions.length).toBeGreaterThan(0);
    expect(finding.comparabilityAssumptions.join(" ")).toContain("same parcel");
    expect(finding.limitation).toBe(RECORD_DIFFERENCE_LIMITATION);
    expect(finding.limitation).toContain("not proof of fraud");
  });

  it("treats Bangla and English digits as the same value", () => {
    const result = compareDagReferences(
      linkedPair({ dagReference: "৫১৮" }, { dagReference: "518" }),
    );
    expect(result.findings).toEqual([]);
    expect(result.comparedCount).toBe(1);
  });

  it("keeps original values while reporting normalized Bangla digits", () => {
    const result = compareDagReferences(
      linkedPair({ dagReference: " ৫১৮ " }, { dagReference: "৫১৯" }),
    );
    expect(result.findings[0].values).toEqual([
      { recordId: "A", original: " ৫১৮ ", normalized: "518" },
      { recordId: "B", original: "৫১৯", normalized: "519" },
    ]);
  });

  it("ignores surrounding whitespace when comparing", () => {
    const result = compareDagReferences(
      linkedPair({ dagReference: " 518\t" }, { dagReference: "518" }),
    );
    expect(result.findings).toEqual([]);
  });

  it("does not drop leading zeros", () => {
    const result = compareDagReferences(
      linkedPair({ dagReference: "0518" }, { dagReference: "518" }),
    );
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].values[0]).toEqual({
      recordId: "A",
      original: "0518",
      normalized: "0518",
    });
  });

  it("does not drop punctuation", () => {
    expect(
      compareDagReferences(
        linkedPair({ dagReference: "518/1" }, { dagReference: "518" }),
      ).findings,
    ).toHaveLength(1);
    expect(
      compareDagReferences(
        linkedPair({ dagReference: "518-1" }, { dagReference: "518/1" }),
      ).findings,
    ).toHaveLength(1);
  });

  it("skips pairs with a different mouza ID", () => {
    const result = compareDagReferences(
      linkedPair({}, { dagReference: "200", mouzaId: "MZ-2" }),
    );
    expect(result.findings).toEqual([]);
    expect(result.comparedCount).toBe(0);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      "SCOPE_DIFFERS",
    ]);
  });

  it("skips pairs with a different survey context", () => {
    const result = compareDagReferences(
      linkedPair({}, { dagReference: "200", surveyContext: "SA sheet 9" }),
    );
    expect(result.findings).toEqual([]);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      "SCOPE_DIFFERS",
    ]);
  });

  it.each(["mouzaId", "surveyContext", "dagReference"] as const)(
    "skips pairs with an empty %s",
    (field) => {
      const result = compareDagReferences(
        linkedPair({ [field]: "  " }, { dagReference: "200" }),
      );
      expect(result.findings).toEqual([]);
      expect(result.comparedCount).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe("INCOMPLETE_FIELDS");
      expect(result.skipped[0].message).toContain(`A.${field}`);
    },
  );

  it("does not compare records that only share a mouza", () => {
    const result = compareDagReferences([
      makeRecord("A", { dagReference: "1" }),
      makeRecord("B", { dagReference: "2" }),
      makeRecord("C", { dagReference: "3" }),
    ]);
    expect(result.findings).toEqual([]);
    expect(result.comparedCount).toBe(0);
    expect(result.skipped).toEqual([]);
  });

  it("skips related records that are not declared as the same parcel", () => {
    const result = compareDagReferences([
      makeRecord("A", { relatedRecordIds: ["B"] }),
      makeRecord("B", { dagReference: "200" }),
    ]);
    expect(result.findings).toEqual([]);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      "SAME_PARCEL_NOT_DECLARED",
    ]);
  });

  it("ignores a same-parcel declaration that is not a related record", () => {
    const result = compareDagReferences([
      makeRecord("A", { comparisonScope: { sameParcelRecordIds: ["B"] } }),
      makeRecord("B", { dagReference: "200" }),
    ]);
    expect(result.findings).toEqual([]);
    expect(result.comparedCount).toBe(0);
    expect(result.skipped).toEqual([]);
  });

  it("skips a link to a record that does not exist", () => {
    const [recordA] = linkedPair({ dagReference: "100" });
    const result = compareDagReferences([recordA]);
    expect(result.findings).toEqual([]);
    expect(result.comparedCount).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe("LINKED_RECORD_MISSING");
    expect(result.skipped[0].recordIds).toEqual(["A", "B"]);
    expect(result.skipped[0].message).toContain("B");
  });

  it("skips a record that links to itself", () => {
    const result = compareDagReferences([
      makeRecord("A", {
        relatedRecordIds: ["A"],
        comparisonScope: { sameParcelRecordIds: ["A"] },
      }),
    ]);
    expect(result.findings).toEqual([]);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      "SELF_REFERENCE",
    ]);
  });

  it("reports one finding for reciprocal links", () => {
    const result = compareDagReferences([
      makeRecord("A", {
        dagReference: "100",
        relatedRecordIds: ["B"],
        comparisonScope: { sameParcelRecordIds: ["B"] },
      }),
      makeRecord("B", {
        dagReference: "200",
        relatedRecordIds: ["A"],
        comparisonScope: { sameParcelRecordIds: ["A"] },
      }),
    ]);
    expect(result.findings).toHaveLength(1);
    expect(result.comparedCount).toBe(1);
  });

  it("reports one finding for a repeated related ID", () => {
    const result = compareDagReferences([
      makeRecord("A", {
        dagReference: "100",
        relatedRecordIds: ["B", "B"],
        comparisonScope: { sameParcelRecordIds: ["B", "B"] },
      }),
      makeRecord("B", { dagReference: "200" }),
    ]);
    expect(result.findings).toHaveLength(1);
    expect(result.comparedCount).toBe(1);
  });

  it("treats a pair as declared when only one side declares it", () => {
    const result = compareDagReferences([
      makeRecord("A", { dagReference: "100", relatedRecordIds: ["B"] }),
      makeRecord("B", {
        dagReference: "200",
        relatedRecordIds: ["A"],
        comparisonScope: { sameParcelRecordIds: ["A"] },
      }),
    ]);
    expect(result.findings).toHaveLength(1);
    expect(result.skipped).toEqual([]);
  });

  it("gives the same result whatever the input order", () => {
    const records = [
      makeRecord("C", {
        dagReference: "300",
        relatedRecordIds: ["B"],
        comparisonScope: { sameParcelRecordIds: ["B"] },
      }),
      makeRecord("A", {
        dagReference: "100",
        relatedRecordIds: ["B", "Z"],
        comparisonScope: { sameParcelRecordIds: ["B", "Z"] },
      }),
      makeRecord("B", { dagReference: "200", relatedRecordIds: ["A"] }),
    ];
    const forward = compareDagReferences(records);
    const reversed = compareDagReferences([...records].reverse());

    expect(reversed).toEqual(forward);
    expect(forward.findings.map((finding) => finding.id)).toEqual([
      "DAG_REFERENCE_MISMATCH:A:B",
      "DAG_REFERENCE_MISMATCH:B:C",
    ]);
    expect(forward.skipped.map((item) => item.reason)).toEqual([
      "LINKED_RECORD_MISSING",
    ]);
  });

  it("is deterministic across repeated calls", () => {
    const records = linkedPair({ dagReference: "1" }, { dagReference: "2" });
    expect(compareDagReferences(records)).toEqual(compareDagReferences(records));
  });

  it("does not mutate source records", () => {
    const records = linkedPair({ dagReference: " ৫১৮ " }, { dagReference: "519" });
    const before = structuredClone(records);
    deepFreeze(records);

    expect(() => compareDagReferences(records)).not.toThrow();
    expect(records).toEqual(before);
  });

  describe("duplicate record IDs", () => {
    const records = [
      makeRecord("A", {
        dagReference: "100",
        relatedRecordIds: ["B"],
        comparisonScope: { sameParcelRecordIds: ["B"] },
      }),
      makeRecord("B", { dagReference: "200" }),
      makeRecord("B", { dagReference: "300" }),
    ];

    it("reports them as a data-validation issue", () => {
      const result = compareDagReferences(records);
      expect(result.validationIssues).toEqual([
        {
          code: "DUPLICATE_RECORD_ID",
          recordId: "B",
          occurrences: 2,
          message: expect.stringContaining('"B"'),
        },
      ]);
    });

    it("does not choose a record or produce a finding", () => {
      const result = compareDagReferences(records);
      expect(result.findings).toEqual([]);
      expect(result.comparedCount).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe("AMBIGUOUS_RECORD_ID");
      expect(result.skipped[0].recordIds).toEqual(["A", "B"]);
    });

    it("reports duplicates even when the ID is not linked", () => {
      const result = compareDagReferences([makeRecord("X"), makeRecord("X")]);
      expect(result.validationIssues).toHaveLength(1);
      expect(result.validationIssues[0].occurrences).toBe(2);
      expect(result.skipped).toEqual([]);
    });
  });
});

describe("demo case data", () => {
  const allRecords = demoCases.flatMap((demoCase) => demoCase.records);

  it("has unique record IDs", () => {
    const ids = allRecords.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("links within the case, except the one deliberately missing reference in case 3", () => {
    for (const demoCase of demoCases) {
      const ids = new Set(demoCase.records.map((record) => record.id));
      for (const record of demoCase.records) {
        for (const relatedId of record.relatedRecordIds) {
          if (demoCase.id !== "DEMO-CASE-003") {
            expect(ids.has(relatedId)).toBe(true);
          }
        }
        for (const sameParcelId of record.comparisonScope.sameParcelRecordIds) {
          expect(record.relatedRecordIds).toContain(sameParcelId);
        }
      }
    }
  });

  it("finds no mismatch in the comparable and missing-evidence cases", () => {
    const [caseOne, , caseThree] = demoCases.map((demoCase) =>
      compareDagReferences(demoCase.records),
    );
    expect(caseOne.findings).toEqual([]);
    expect(caseOne.comparedCount).toBe(2);
    expect(caseThree.findings).toEqual([]);
    expect(caseThree.comparedCount).toBe(1);
    expect(caseThree.skipped.map((item) => item.reason)).toEqual([
      "LINKED_RECORD_MISSING",
    ]);
  });

  it("finds exactly one dag mismatch in the dag-reference case", () => {
    const result = compareDagReferences(demoCases[1].records);
    expect(result.comparedCount).toBe(3);
    expect(result.skipped).toEqual([]);
    expect(result.validationIssues).toEqual([]);
    expect(result.findings.map((finding) => finding.id)).toEqual([
      "DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03",
    ]);
    expect(result.findings[0].values.map((value) => value.original)).toEqual([
      "518",
      "581",
    ]);
  });

  it("reports no validation issues for any case", () => {
    for (const demoCase of demoCases) {
      expect(compareDagReferences(demoCase.records).validationIssues).toEqual(
        [],
      );
    }
  });
});

import { describe, expect, it } from "vitest";
import { demoCases, type SourceRecord } from "@/data/cases";
import { buildTimeline, findMissingLinks, recordAnchorId } from "./evidence";

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

describe("findMissingLinks", () => {
  it("returns nothing when every related ID exists", () => {
    expect(
      findMissingLinks([
        makeRecord("A", { relatedRecordIds: ["B"] }),
        makeRecord("B"),
      ]),
    ).toEqual([]);
  });

  it("reports the referencing record and the missing ID", () => {
    expect(
      findMissingLinks([makeRecord("A", { relatedRecordIds: ["GONE"] })]),
    ).toEqual([{ referencingRecordId: "A", missingRecordId: "GONE" }]);
  });

  it("reports each missing reference once, in a stable order", () => {
    const records = [
      makeRecord("B", { relatedRecordIds: ["Z", "Y", "Z"] }),
      makeRecord("A", { relatedRecordIds: ["Z", "B"] }),
    ];
    const expected = [
      { referencingRecordId: "A", missingRecordId: "Z" },
      { referencingRecordId: "B", missingRecordId: "Y" },
      { referencingRecordId: "B", missingRecordId: "Z" },
    ];
    expect(findMissingLinks(records)).toEqual(expected);
    expect(findMissingLinks([...records].reverse())).toEqual(expected);
  });

  it("does not infer links from matching mouza, names, or dates", () => {
    expect(
      findMissingLinks([
        makeRecord("A", { partyIds: ["P1"] }),
        makeRecord("B", { partyIds: ["P1"] }),
      ]),
    ).toEqual([]);
  });

  it("finds exactly one missing reference in demo case 3 and none elsewhere", () => {
    expect(findMissingLinks(demoCases[0].records)).toEqual([]);
    expect(findMissingLinks(demoCases[1].records)).toEqual([]);
    expect(findMissingLinks(demoCases[2].records)).toEqual([
      {
        referencingRecordId: "DEMO-REC-003-02",
        missingRecordId: "DEMO-REC-003-03",
      },
    ]);
  });
});

describe("buildTimeline", () => {
  it("orders records by document date, then ID", () => {
    const { dated, undated } = buildTimeline([
      makeRecord("C", { documentDate: "2021-05-01" }),
      makeRecord("B", { documentDate: "2019-01-01" }),
      makeRecord("A", { documentDate: "2019-01-01" }),
    ]);
    expect(dated.map((record) => record.id)).toEqual(["A", "B", "C"]);
    expect(undated).toEqual([]);
  });

  it("keeps records without a valid date apart instead of guessing", () => {
    const { dated, undated } = buildTimeline([
      makeRecord("A", { documentDate: "" }),
      makeRecord("B", { documentDate: "2019-02-30" }),
      makeRecord("C", { documentDate: "15/01/2019" }),
      makeRecord("D", { documentDate: "2019-01-15" }),
    ]);
    expect(dated.map((record) => record.id)).toEqual(["D"]);
    expect(undated.map((record) => record.id)).toEqual(["A", "B", "C"]);
  });

  it("does not mutate its input or change record values", () => {
    const records = [
      makeRecord("B", { documentDate: "2020-01-01", dagReference: " ০৫১ " }),
      makeRecord("A", { documentDate: "2019-01-01" }),
    ];
    const before = structuredClone(records);
    const { dated } = buildTimeline(records);

    expect(records).toEqual(before);
    expect(dated[1]).toBe(records[0]);
  });
});

describe("recordAnchorId", () => {
  it("builds a stable anchor ID", () => {
    expect(recordAnchorId("DEMO-REC-001-01")).toBe("record-DEMO-REC-001-01");
  });
});

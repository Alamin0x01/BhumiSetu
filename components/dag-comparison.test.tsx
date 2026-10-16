import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SourceRecord } from "@/data/cases";
import { demoCases } from "@/data/cases";
import { compareDagReferences } from "@/lib/comparison";
import { DagComparison } from "./dag-comparison";

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

function render(records: SourceRecord[]) {
  return renderToStaticMarkup(
    <DagComparison result={compareDagReferences(records)} caseId="TEST-CASE" />,
  );
}

const linkedA = {
  relatedRecordIds: ["B"],
  comparisonScope: { sameParcelRecordIds: ["B"] },
};

describe("DagComparison", () => {
  it("shows the heading and says only dag-reference comparison is implemented", () => {
    const html = render([makeRecord("A", linkedA), makeRecord("B")]);
    expect(html).toContain("Dag-reference comparison");
    expect(html).toContain("Only dag-reference comparison");
    expect(html).toContain("is implemented");
    expect(html).toContain("nothing here verifies");
    expect(html).toContain("ownership");
  });

  it("shows the no-mismatch message when there are no findings", () => {
    const html = render([makeRecord("A", linkedA), makeRecord("B")]);
    expect(html).toContain(
      "No dag mismatch found among comparable linked records.",
    );
    expect(html).not.toContain("Finding ID");
    expect(html).not.toContain("Data-validation issues");
  });

  it("shows evidence IDs, original values, explanation, assumptions, and limitation", () => {
    const html = render([
      makeRecord("A", { ...linkedA, dagReference: " ৫১৮ " }),
      makeRecord("B", { dagReference: "0519" }),
    ]);

    expect(html).not.toContain("No dag mismatch found");
    expect(html).toContain("DAG_REFERENCE_MISMATCH");
    expect(html).toContain("DAG_REFERENCE_MISMATCH:A:B");
    expect(html).toContain("Original:");
    expect(html).toContain(" ৫১৮ ");
    expect(html).toContain("0519");
    expect(html).toContain("Dag reference differs between related records A and B");
    expect(html).toContain("Comparability assumptions");
    expect(html).toContain("same parcel");
    expect(html).toContain("Limitation:");
    expect(html).toContain("not proof of fraud or invalid ownership");
  });

  it("shows data-validation issues and skipped comparisons for duplicate record IDs", () => {
    const html = render([
      makeRecord("A", linkedA),
      makeRecord("B"),
      makeRecord("B", { dagReference: "300" }),
    ]);

    expect(html).toContain("Data-validation issues");
    expect(html).toContain("DUPLICATE_RECORD_ID");
    expect(html).toContain("is used by 2 records");
    expect(html).toContain("Skipped or incomplete comparisons");
    expect(html).toContain("Ambiguous record ID");
    expect(html).not.toContain("Finding ID");
  });

  it("renders the seeded dag-reference case with one finding and no issues", () => {
    const html = render([...demoCases[1].records]);
    expect(html).toContain("DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03");
    expect(html).not.toContain("Data-validation issues");
    expect(html).not.toContain("Skipped or incomplete comparisons");
  });

  it("renders the seeded comparable case with the no-mismatch message", () => {
    const html = render([...demoCases[0].records]);
    expect(html).toContain(
      "No dag mismatch found among comparable linked records.",
    );
  });
});

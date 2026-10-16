import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoCases, type SourceRecord } from "@/data/cases";
import {
  EvidenceCompleteness,
  EvidenceTable,
  EvidenceTimeline,
} from "./evidence-view";

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

describe("EvidenceTable", () => {
  it("shows every requested field with the stored values", () => {
    const html = renderToStaticMarkup(
      <EvidenceTable
        records={[
          makeRecord("A", { dagReference: " ০৫১ ", relatedRecordIds: ["B"] }),
          makeRecord("B", { documentType: "mutation", mouzaId: "MZ-9" }),
        ]}
      />,
    );
    for (const label of [
      "Document type",
      "Document date",
      "Mouza ID",
      "Survey context",
      "Dag reference",
      "Area",
      "Related record IDs",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(" ০৫১ ");
    expect(html).toContain("Mutation");
    expect(html).toContain('href="#record-A"');
    expect(html).toContain('href="#record-B"');
  });

  it("marks related IDs that are not in the case", () => {
    const html = renderToStaticMarkup(
      <EvidenceTable records={[makeRecord("A", { relatedRecordIds: ["GONE"] })]} />,
    );
    expect(html).toContain("GONE");
    expect(html).toContain("not in this case");
  });
});

describe("EvidenceCompleteness", () => {
  it("says Evidence incomplete with the referencing record and missing ID", () => {
    const html = renderToStaticMarkup(
      <EvidenceCompleteness records={demoCases[2].records} />,
    );
    expect(html).toContain("Evidence incomplete");
    expect(html).toContain("DEMO-REC-003-02");
    expect(html).toContain("DEMO-REC-003-03");
    expect(html).toContain("not a finding of fraud or invalid ownership");
  });

  it("shows no warning when nothing is missing", () => {
    const html = renderToStaticMarkup(
      <EvidenceCompleteness records={demoCases[0].records} />,
    );
    expect(html).not.toContain("Evidence incomplete");
    expect(html).toContain("No missing related-record references found");
  });
});

describe("EvidenceTimeline", () => {
  it("is labelled as a document evidence timeline, not verified ownership", () => {
    const html = renderToStaticMarkup(
      <EvidenceTimeline records={demoCases[0].records} />,
    );
    expect(html).toContain("Document evidence timeline");
    expect(html).toContain("not verified ownership");
  });

  it("orders cards by date and links explicit references", () => {
    const html = renderToStaticMarkup(
      <EvidenceTimeline
        records={[
          makeRecord("LATE", {
            documentDate: "2021-01-01",
            relatedRecordIds: ["EARLY"],
          }),
          makeRecord("EARLY", { documentDate: "2019-01-01" }),
        ]}
      />,
    );
    expect(html.indexOf("2019-01-01")).toBeLessThan(html.indexOf("2021-01-01"));
    expect(html).toContain('href="#record-EARLY"');
  });

  it("does not invent a node for a missing referenced record", () => {
    const html = renderToStaticMarkup(
      <EvidenceTimeline records={demoCases[2].records} />,
    );
    expect(html).toContain("DEMO-REC-003-03");
    expect(html).toContain("not in this case");
    expect(html).not.toContain('href="#record-DEMO-REC-003-03"');
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBe(
      demoCases[2].records.length,
    );
  });

  it("lists records without a valid date apart", () => {
    const html = renderToStaticMarkup(
      <EvidenceTimeline records={[makeRecord("NODATE", { documentDate: "" })]} />,
    );
    expect(html).toContain("without a valid document date");
  });
});

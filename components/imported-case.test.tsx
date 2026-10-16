import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compareDagReferences } from "@/lib/comparison";
import { parseImportText, serializeSample } from "@/lib/import-schema";
import { DagComparison } from "./dag-comparison";
import { ImportedCaseEmpty, ImportedCaseView } from "./imported-case";

type Rec = Record<string, unknown>;
type Envelope = Rec & { case: Rec & { records: Rec[] } };

function importCase(edit: (envelope: Envelope) => void = () => {}) {
  const envelope = JSON.parse(serializeSample()) as Envelope;
  edit(envelope);
  const result = parseImportText(JSON.stringify(envelope));
  if (!result.ok) throw new Error("expected a valid import");
  return result.demoCase;
}

const render = (demoCase: ReturnType<typeof importCase>) =>
  renderToStaticMarkup(<ImportedCaseView demoCase={demoCase} onClear={() => {}} />);

describe("ImportedCaseView", () => {
  const html = render(importCase());

  it("shows the temporary-session notice and the personal-data limitation", () => {
    expect(html).toContain(
      "Imported synthetic case. Temporary browser session. Not official verification or legal advice.",
    );
    expect(html).toContain("does not check imported data for personal information");
  });

  it("offers Clear imported case and Import another file", () => {
    expect(html).toContain("Clear imported case");
    expect(html).toContain("Import another file");
    expect(html).toContain('href="/import"');
    expect(html).toContain("Back to demo cases");
  });

  it("reuses the findings, summary, table, cards, and timeline", () => {
    expect(html).toContain("DAG_REFERENCE_MISMATCH:DEMO-REC-002-02:DEMO-REC-002-03");
    expect(html).toContain("Comparison summary");
    expect(html).toContain("Source-record comparison table");
    expect(html).toContain("Source-record cards (4)");
    expect(html).toContain("Document evidence timeline");
    expect(html).toContain("Missing-link results");
    expect(html).toContain("4 imported records");
  });

  it("omits reviewer-note editing and sandbox controls, with an explanation", () => {
    expect(html).not.toContain("Save note");
    expect(html).not.toContain("Review label");
    expect(html).not.toContain("Reset local notes");
    expect(html).not.toContain("Run comparison");
    expect(html).not.toContain("Dag reference for DEMO-REC");
    expect(html).toContain("Reviewer notes are not available here");
    expect(html).toContain("The what-if sandbox is not available here");
  });

  it("flags a missing related record as Evidence incomplete", () => {
    const withGhost = render(
      importCase((envelope) => {
        envelope.case.records[1].relatedRecordIds = ["DEMO-REC-002-01", "GHOST-RECORD"];
        envelope.case.records[1].comparisonScope = {
          sameParcelRecordIds: ["DEMO-REC-002-01", "GHOST-RECORD"],
        };
      }),
    );
    expect(withGhost).toContain("Evidence incomplete");
    expect(withGhost).toContain("GHOST-RECORD");
    expect(withGhost).toContain("not in this case");
  });

  it("renders imported text as text, never as HTML", () => {
    const hostile = render(
      importCase((envelope) => {
        envelope.case.title = '<img src=x onerror="alert(1)">';
        envelope.case.description = "<script>alert(1)</script>";
        envelope.case.records[0].surveyContext = "<b>bold</b>";
      }),
    );
    expect(hostile).not.toContain("<img");
    expect(hostile).not.toContain("<script>");
    expect(hostile).not.toContain("<b>bold</b>");
    expect(hostile).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("shows raw dag values, including leading zeros and Bangla digits", () => {
    const raw = render(
      importCase((envelope) => {
        envelope.case.records[0].dagReference = "0518";
        envelope.case.records[1].dagReference = "\u09EB\u09E7\u09EE";
      }),
    );
    expect(raw).toContain("0518");
    expect(raw).toContain("\u09EB\u09E7\u09EE");
  });
});

describe("DagComparison without reviewer notes", () => {
  it("keeps the finding and its limitation but drops the notes column", () => {
    const demoCase = importCase();
    const html = renderToStaticMarkup(
      <DagComparison
        result={compareDagReferences(demoCase.records)}
        caseId={demoCase.id}
        showReviewNotes={false}
      />,
    );
    expect(html).toContain("DAG_REFERENCE_MISMATCH");
    expect(html).toContain("not proof of fraud or invalid ownership");
    expect(html).not.toContain("Reviewer notes");
    expect(html).not.toContain("Save note");
  });
});

describe("ImportedCaseEmpty", () => {
  it("handles direct navigation without imported data", () => {
    const html = renderToStaticMarkup(<ImportedCaseEmpty justCleared={false} />);
    expect(html).toContain("No imported case is open in this browser session");
    expect(html).toContain("cleared when the page is reloaded");
    expect(html).toContain('href="/import"');
    expect(html).not.toContain("Imported case cleared.");
  });

  it("confirms a clear", () => {
    expect(renderToStaticMarkup(<ImportedCaseEmpty justCleared />)).toContain(
      "Imported case cleared.",
    );
  });
});

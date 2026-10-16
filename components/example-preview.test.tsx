import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoCases } from "@/data/cases";
import { compareDagReferences } from "@/lib/comparison";
import { ExamplePreview, FEATURED_CASE_ID } from "./example-preview";

const html = renderToStaticMarkup(<ExamplePreview />);
const featured = demoCases.find((item) => item.id === FEATURED_CASE_ID)!;

describe("ExamplePreview", () => {
  it("is labelled as a synthetic example from the featured demo case", () => {
    expect(FEATURED_CASE_ID).toBe("DEMO-CASE-002");
    expect(html).toContain("Synthetic example");
    expect(html).toContain(FEATURED_CASE_ID);
  });

  it("shows the linked dalil and mutation records with their stored dag values", () => {
    const dalil = featured.records.find((record) => record.documentType === "dalil")!;
    const mutation = featured.records.find((record) => record.documentType === "mutation")!;
    expect(html).toContain(dalil.id);
    expect(html).toContain(mutation.id);
    expect(html).toContain(`&quot;${dalil.dagReference}&quot;`);
    expect(html).toContain(`&quot;${mutation.dagReference}&quot;`);
    expect(dalil.dagReference).toBe("518");
    expect(mutation.dagReference).toBe("581");
  });

  it("takes its counts and status from the comparison engine", () => {
    const result = compareDagReferences(featured.records);
    expect(html).toContain(`${result.comparedCount} linked pairs compared`);
    expect(html).toContain(
      `${result.findings.length} dag ${result.findings.length === 1 ? "finding" : "findings"}`,
    );
    expect(html).toContain("Record difference: review needed");
    expect(html).toContain("not proof of fraud or invalid ownership");
  });
});

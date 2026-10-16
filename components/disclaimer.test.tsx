import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Disclaimer } from "./disclaimer";

describe("Disclaimer", () => {
  const html = renderToStaticMarkup(<Disclaimer />);

  it("shows the single concise synthetic-records note", () => {
    expect(html).toContain(
      "Uses synthetic records. Not official verification or legal advice.",
    );
    expect(html).toContain('role="note"');
  });

  it("does not repeat the older two-line wording", () => {
    expect(html).not.toContain("Synthetic-data prototype");
    expect((html.match(/<p /g) ?? []).length).toBe(1);
  });
});

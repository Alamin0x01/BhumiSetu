import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSiteNav, REPO_URL, WORKSPACE_DESCRIPTION } from "@/lib/site-nav";
import { SiteFooter } from "./site-footer";
import { SiteNavView } from "./site-nav";

const nav = buildSiteNav("DEMO-CASE-002");
const render = (pathname: string | null) =>
  renderToStaticMarkup(<SiteNavView {...nav} pathname={pathname} />);

describe("SiteNavView", () => {
  it("renders the brand, subtitle, links, and the sandbox call to action", () => {
    const html = render("/");
    expect(html).toContain('aria-label="Main"');
    expect(html).toContain("Evidence-First Land Record Review");
    for (const label of ["Overview", "Case Library", "Import", "Reports", "GitHub"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('href="/cases/DEMO-CASE-002#sandbox"');
    expect(html).toContain("Try Interactive Sandbox");
  });

  it("marks only the current route with aria-current", () => {
    const html = render("/cases/DEMO-CASE-002");
    // Desktop and mobile lists each render the link once.
    expect(html.match(/aria-current="page"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-current="page"[^>]*>Case Library</);
  });

  it("opens GitHub in a new tab safely", () => {
    const html = render("/");
    expect(html).toContain(`href="${REPO_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("starts with the mobile menu collapsed and wired to its button", () => {
    const html = render("/");
    expect(html).toContain('aria-expanded="false"');
    const panelId = /aria-controls="([^"]+)"/.exec(html)?.[1];
    expect(panelId).toBeTruthy();
    expect(html).toMatch(new RegExp(`id="${panelId}"[^>]*hidden`));
  });
});

describe("SiteFooter", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  it("has the brand, platform, capabilities, and resources sections", () => {
    for (const heading of ["Platform", "Capabilities", "Resources"]) {
      expect(html).toContain(`>${heading}<`);
    }
    expect(html).toContain("Evidence-First Land Record Review");
    expect(html).toContain(WORKSPACE_DESCRIPTION);
  });

  it("ends with the product line and the synthetic-records disclaimer", () => {
    expect(html).not.toContain("Hackathon");
    expect(html).toContain(
      "Uses synthetic records. Not official verification or legal advice.",
    );
  });

  it("links the scope section and external resources correctly", () => {
    expect(html).toContain('href="/#scope"');
    expect(html).toContain(`href="${REPO_URL}"`);
    expect(html).toContain(`href="${REPO_URL}#readme"`);
    expect(html).not.toMatch(/target="_blank"(?![^>]*noopener)/);
  });
});

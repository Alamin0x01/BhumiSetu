import { describe, expect, it } from "vitest";
import { CASE_TABS, hashTarget, tabFromHash } from "./case-tabs";

describe("tabFromHash", () => {
  it("defaults to Overview for no or unknown fragments", () => {
    expect(tabFromHash("")).toBe("overview");
    expect(tabFromHash("#")).toBe("overview");
    expect(tabFromHash("#nonsense")).toBe("overview");
  });

  it("maps each tab ID, with or without the leading #", () => {
    for (const tab of CASE_TABS) {
      expect(tabFromHash(`#${tab.id}`)).toBe(tab.id);
      expect(tabFromHash(tab.id)).toBe(tab.id);
    }
  });

  it("opens Source records for a source-record anchor", () => {
    expect(tabFromHash("#record-DEMO-REC-002-03")).toBe("records");
    expect(tabFromHash("#record-DEMO%2DREC")).toBe("records");
  });

  it("does not throw on a malformed percent escape", () => {
    expect(() => tabFromHash("#%E0%A4%A")).not.toThrow();
    expect(tabFromHash("#%E0%A4%A")).toBe("overview");
    expect(hashTarget("#record-%E0%A4%A")).toBe("record-%E0%A4%A");
  });

  it("offers the four tabs in order", () => {
    expect(CASE_TABS.map((tab) => tab.label)).toEqual([
      "Overview",
      "Source records",
      "Timeline",
      "Sandbox",
    ]);
  });
});

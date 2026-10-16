"use client";

import type { DemoCase } from "@/data/cases";
import { createReport, currentTimeContext } from "@/lib/report";
import { readReviewNotes, type ReviewStorage } from "@/lib/review";
import { ReportPanel } from "./report-panel";

function getStorage(): ReviewStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Built-in cases: includes only this case's saved reviewer notes, validated by the existing storage checks. */
export function BuiltInReport({ demoCase }: { demoCase: DemoCase }) {
  return (
    <ReportPanel
      backHref={`/cases/${demoCase.id}`}
      backLabel="Back to case"
      buildReport={() => {
        const state = readReviewNotes(getStorage());
        return createReport({
          demoCase,
          origin: "built-in",
          time: currentTimeContext(),
          notes: {
            status: state.status,
            notes: state.notes,
            discarded: state.discarded,
          },
        });
      }}
    />
  );
}

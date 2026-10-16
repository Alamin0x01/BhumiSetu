"use client";

import type { ReactNode } from "react";
import { recordAnchorId } from "@/lib/evidence";

export const SHOW_RECORD_EVENT = "bhumisetu:show-record";

/** Shows the referenced source record (switching tabs if needed); falls back to a normal anchor jump. */
export function EvidenceLink({
  recordId,
  children,
}: {
  recordId: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={`#${recordAnchorId(recordId)}`}
      onClick={(event) => {
        const showEvent = new CustomEvent<string>(SHOW_RECORD_EVENT, {
          detail: recordId,
          cancelable: true,
        });
        // A listener cancels the event once it has shown the record.
        if (!window.dispatchEvent(showEvent)) event.preventDefault();
      }}
      className="rounded font-mono text-sm font-medium text-emerald-800 underline underline-offset-2 transition-colors duration-150 hover:text-emerald-950 motion-reduce:transition-none"
    >
      {children ?? recordId}
    </a>
  );
}

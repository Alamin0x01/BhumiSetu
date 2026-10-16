"use client";

import Link from "next/link";
import { reportExportAvailability } from "@/lib/case-tabs";
import { useActiveCaseTab } from "./case-tabs";
import { secondaryButtonClass } from "./ui";

/** Links to the report page, or explains why export is off while the Sandbox tab is active. */
export function ExportReportAction({ href }: { href: string }) {
  const availability = reportExportAvailability(useActiveCaseTab());

  if (!availability.enabled) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled
          aria-describedby="export-report-hint"
          className={`${secondaryButtonClass} w-fit disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Export review report
        </button>
        <p id="export-report-hint" className="text-sm text-slate-700">
          {availability.message}
        </p>
      </div>
    );
  }
  return (
    <Link href={href} className={secondaryButtonClass}>
      Export review report
    </Link>
  );
}

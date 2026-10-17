import type { Metadata } from "next";
import { ImportedReport } from "@/components/imported-report";

export const metadata: Metadata = {
  title: "Imported Workspace Report | BhumiSetu",
  description: "A review report for the temporary imported review workspace.",
};

export default function ImportedReportPage() {
  return <ImportedReport />;
}

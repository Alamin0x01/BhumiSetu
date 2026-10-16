import type { Metadata } from "next";
import { ImportedReport } from "@/components/imported-report";

export const metadata: Metadata = {
  title: "Imported Case Report | BhumiSetu",
  description: "A review report for the temporary imported synthetic case.",
};

export default function ImportedReportPage() {
  return <ImportedReport />;
}

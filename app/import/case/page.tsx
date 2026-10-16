import type { Metadata } from "next";
import { ImportedCaseWorkspace } from "@/components/imported-case";

export const metadata: Metadata = {
  title: "Imported Case | BhumiSetu",
  description: "A temporary, in-memory imported synthetic case.",
};

export default function ImportedCasePage() {
  return <ImportedCaseWorkspace />;
}

import type { Metadata } from "next";
import { ImportedCaseWorkspace } from "@/components/imported-case";

export const metadata: Metadata = {
  title: "Imported Review Workspace | BhumiSetu",
  description: "A temporary, in-memory case workspace for an imported review dataset.",
};

export default function ImportedCasePage() {
  return <ImportedCaseWorkspace />;
}

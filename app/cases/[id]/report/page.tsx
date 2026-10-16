import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuiltInReport } from "@/components/builtin-report";
import { demoCases } from "@/data/cases";

// Case data is static; this silences Next's dev-only "URL data outside Suspense" insight.
export const instant = false;

export function generateStaticParams() {
  return demoCases.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/cases/[id]/report">): Promise<Metadata> {
  const { id } = await params;
  const demoCase = demoCases.find((item) => item.id === id);
  return {
    title: demoCase ? `Report ${demoCase.id} | BhumiSetu` : "Case not found",
  };
}

export default async function CaseReportPage({
  params,
}: PageProps<"/cases/[id]/report">) {
  const { id } = await params;
  const demoCase = demoCases.find((item) => item.id === id);

  if (!demoCase) {
    notFound();
  }

  return <BuiltInReport demoCase={demoCase} />;
}

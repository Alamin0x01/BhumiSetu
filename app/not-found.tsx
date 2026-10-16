import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-lg text-slate-700">
          This page does not exist in the demo.
        </p>
        <Disclaimer />
        <Link
          href="/cases"
          className="w-fit rounded text-base font-medium text-emerald-800 underline underline-offset-4 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          View demo cases
        </Link>
      </main>
    </div>
  );
}

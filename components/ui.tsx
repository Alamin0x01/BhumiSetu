import type { ReactNode } from "react";

export const cardClass =
  "rounded-xl border border-slate-200 bg-white shadow-sm";

export const interactiveCardClass = `${cardClass} transition duration-150 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0`;

export const textLinkClass =
  "rounded font-medium text-emerald-800 underline underline-offset-2 transition-colors duration-150 hover:text-emerald-950 motion-reduce:transition-none";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-emerald-800 motion-reduce:transition-none";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:bg-slate-50 motion-reduce:transition-none";

const badgeTones = {
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-900",
  amber: "border-amber-300 bg-amber-50 text-amber-950",
  slate: "border-slate-300 bg-slate-100 text-slate-800",
} as const;

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  id,
  children,
  description,
}: {
  id: string;
  children: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div>
      <h2
        id={id}
        className="text-xl font-semibold tracking-tight text-slate-900"
      >
        {children}
      </h2>
      {description && (
        <p className="mt-1 max-w-3xl text-base leading-7 text-slate-700">
          {description}
        </p>
      )}
    </div>
  );
}

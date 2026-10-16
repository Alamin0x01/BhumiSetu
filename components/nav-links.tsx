"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/cases", label: "Demo cases" },
  { href: "/import", label: "Import synthetic case" },
];

export function NavLinksView({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active =
          pathname !== null &&
          (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href));
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-emerald-300 motion-reduce:transition-none ${
                active
                  ? "bg-white/10 font-semibold text-white underline decoration-emerald-400 decoration-2 underline-offset-8"
                  : "font-medium text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NavLinks() {
  return <NavLinksView pathname={usePathname()} />;
}

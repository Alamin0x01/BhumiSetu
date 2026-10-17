"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { isNavActive, REPO_URL, TAGLINE, type NavItem } from "@/lib/site-nav";
import { BrandMark } from "./brand-mark";

type NavProps = { items: NavItem[]; sandboxHref: string };

const focusRing = "focus-visible:outline-emerald-300";

const ctaClass =
  "inline-flex items-center justify-center rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-colors duration-150 hover:bg-emerald-300 focus-visible:outline-emerald-200 motion-reduce:transition-none";

function linkClass(active: boolean, size: "desktop" | "mobile") {
  const sizing =
    size === "desktop" ? "px-3 py-2 text-sm" : "px-3 py-3 text-base";
  const state = active
    ? "bg-white/10 font-semibold text-white underline decoration-emerald-400 decoration-2 underline-offset-8"
    : "font-medium text-slate-200 hover:bg-white/10 hover:text-white";
  return `flex items-center gap-1.5 rounded-lg transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${sizing} ${state}`;
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function GithubLink({ size }: { size: "desktop" | "mobile" }) {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass(false, size)}
    >
      GitHub
      <ExternalIcon />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SiteNavView({
  items,
  sandboxHref,
  pathname,
}: NavProps & { pathname: string | null }) {
  // The menu is open only for the page it was opened on, so navigating closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const pageKey = pathname ?? "";
  const open = openAt === pageKey;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpenAt(null);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      close();
      buttonRef.current?.focus();
    }
  }

  return (
    <nav aria-label="Main" onKeyDown={onKeyDown}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className={`flex min-w-0 items-center gap-3 rounded-lg py-1 pr-2 transition-opacity duration-150 hover:opacity-85 motion-reduce:transition-none ${focusRing}`}
        >
          <BrandMark id="site-nav-brand" className="h-8 w-auto shrink-0" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-white">
              Bhumi<span className="text-emerald-400">Setu</span>
            </span>
            <span className="text-[11px] font-medium tracking-wide text-slate-300 max-[399px]:hidden">
              {TAGLINE}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-3 lg:flex">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = isNavActive(item.key, pathname);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={linkClass(active, "desktop")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <GithubLink size="desktop" />
            </li>
          </ul>
          <Link href={sandboxHref} className={ctaClass}>
            Try Interactive Sandbox
          </Link>
        </div>

        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpenAt(open ? null : pageKey)}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-100 transition-colors duration-150 hover:bg-white/10 motion-reduce:transition-none lg:hidden ${focusRing}`}
        >
          <span className="sr-only">Main menu</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div id={panelId} hidden={!open} className="border-t border-white/10 lg:hidden">
        <div className="mx-auto flex max-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-6">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isNavActive(item.key, pathname);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                    className={linkClass(active, "mobile")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <GithubLink size="mobile" />
            </li>
          </ul>
          <Link
            href={sandboxHref}
            onClick={close}
            className={`${ctaClass} py-3 text-base`}
          >
            Try Interactive Sandbox
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function SiteNav(props: NavProps) {
  return <SiteNavView {...props} pathname={usePathname()} />;
}

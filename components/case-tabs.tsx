"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  CASE_TABS,
  hashTarget,
  tabFromHash,
  type CaseTabId,
} from "@/lib/case-tabs";
import { recordAnchorId } from "@/lib/evidence";
import { SHOW_RECORD_EVENT } from "./evidence-link";

const HASH_EVENT = "bhumisetu:hash-changed";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(HASH_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(HASH_EVENT, onChange);
  };
}

function getHash() {
  return window.location.hash;
}

function getServerHash() {
  return "";
}

/** The URL fragment is the source of truth, so direct links and back/forward work. */
function navigate(fragment: string, mode: "push" | "replace") {
  const target = `#${fragment}`;
  if (window.location.hash !== target) {
    if (mode === "push") window.history.pushState(null, "", target);
    else window.history.replaceState(null, "", target);
  }
  window.dispatchEvent(new Event(HASH_EVENT));
}

/** The tab the URL fragment currently selects. */
export function useActiveCaseTab(): CaseTabId {
  return tabFromHash(
    useSyncExternalStore(subscribeToHash, getHash, getServerHash),
  );
}

export function CaseTabs(content: Record<CaseTabId, ReactNode>) {
  const baseId = useId();
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const active = tabFromHash(hash);
  const [focusSeq, setFocusSeq] = useState(0);
  const tabRefs = useRef<Partial<Record<CaseTabId, HTMLButtonElement | null>>>(
    {},
  );

  useEffect(() => {
    function onShowRecord(event: Event) {
      const recordId = (event as CustomEvent<unknown>).detail;
      if (typeof recordId !== "string") return;
      event.preventDefault();
      navigate(recordAnchorId(recordId), "push");
      setFocusSeq((count) => count + 1);
    }
    window.addEventListener(SHOW_RECORD_EVENT, onShowRecord);
    return () => window.removeEventListener(SHOW_RECORD_EVENT, onShowRecord);
  }, []);

  useEffect(() => {
    const anchorId = hashTarget(hash);
    if (!anchorId.startsWith(recordAnchorId(""))) return;
    const target = document.getElementById(anchorId);
    if (!target) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [hash, focusSeq]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = CASE_TABS.findIndex((tab) => tab.id === active);
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % CASE_TABS.length;
    else if (event.key === "ArrowLeft") {
      next = (index - 1 + CASE_TABS.length) % CASE_TABS.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = CASE_TABS.length - 1;
    else return;
    event.preventDefault();
    navigate(CASE_TABS[next].id, "replace");
    tabRefs.current[CASE_TABS[next].id]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Case sections"
        onKeyDown={handleKeyDown}
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {CASE_TABS.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => navigate(tab.id, "push")}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm transition-colors duration-150 motion-reduce:transition-none sm:flex-none sm:px-6 ${
                selected
                  ? "bg-emerald-700 font-semibold text-white shadow-sm"
                  : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {CASE_TABS.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
          className="mt-6"
        >
          {content[tab.id]}
        </div>
      ))}
    </div>
  );
}

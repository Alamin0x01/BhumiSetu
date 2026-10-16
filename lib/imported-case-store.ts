import type { DemoCase } from "@/data/cases";

// Module state only: it survives in-app navigation and is gone after a reload.
let current: DemoCase | null = null;
const listeners = new Set<() => void>();

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function getImportedCase(): DemoCase | null {
  return current;
}

export function setImportedCase(demoCase: DemoCase) {
  current = deepFreeze(demoCase);
  emit();
}

export function clearImportedCase() {
  current = null;
  emit();
}

export function subscribeImportedCase(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

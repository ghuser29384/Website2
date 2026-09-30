"use client";

import { useSyncExternalStore, type ReactNode } from "react";

let available = false;
let pending: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const snapshot = () => available;
const serverSnapshot = () => false;

function publish(next: boolean) {
  if (available === next) return;
  available = next;
  for (const listener of listeners) listener();
}

function refresh() {
  if (document.visibilityState === "hidden") { publish(false); return; }
  if (pending) return;
  pending = fetch("/api/navigation/evidence", {
    credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(5000),
  }).then(async (response) => {
    const data: unknown = response.ok ? await response.json() : null;
    const show = Boolean(data && typeof data === "object" && !Array.isArray(data) &&
      (data as Record<string, unknown>).available === true);
    publish(listeners.size > 0 && document.visibilityState !== "hidden" && show);
  }).catch(() => publish(false)).finally(() => { pending = null; });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    timer = setInterval(refresh, 60000);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
      available = false;
    }
  };
}

/** Hidden during SSR, pending reads, empty ledgers, and failures. No persistent cache. */
export function EvidenceNavGate({ children }: { children: ReactNode }) {
  const show = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return show ? <>{children}</> : null;
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type {
  RecommendationEventType,
  RecommendationOpportunityType,
} from "@/lib/recommendation-learning";

const OPEN_DELAY_MS = 750;
const MIN_DWELL_MS = 4_000;
const MAX_DWELL_MS = 30 * 60 * 1_000;

function eventId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`.slice(0, 160);
}

function postSignal(
  signal: {
    opportunityType: RecommendationOpportunityType;
    opportunityId: string;
    eventType: RecommendationEventType;
    dwellMs?: number;
    surface: string;
  },
  beacon = false,
) {
  const body = JSON.stringify({
    events: [
      {
        opportunityType: signal.opportunityType,
        opportunityId: signal.opportunityId,
        eventType: signal.eventType,
        dwellMs: signal.dwellMs ?? 0,
        idempotencyKey: eventId(signal.eventType),
        metadata: { surface: signal.surface },
      },
    ],
  });

  if (beacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(
      "/api/live-now/feedback",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }

  void fetch("/api/live-now/feedback", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function getTrackableSurface(pathname: string, query: URLSearchParams) {
  const offerMatch = pathname.match(/^\/offers\/([0-9a-f-]{36})\/?$/i);
  if (offerMatch) {
    return {
      opportunityType: "offer" as const,
      opportunityId: offerMatch[1],
      openEvent: "open" as const,
      surface: "offer_detail",
    };
  }

  if (pathname === "/donation-offsets" || pathname === "/donation-offsets/") {
    const poolId = (query.get("pool") ?? "").trim();
    if (/^[0-9a-f-]{36}$/i.test(poolId)) {
      return {
        opportunityType: "donation_pool" as const,
        opportunityId: poolId,
        openEvent: "open" as const,
        surface: "donation_pool",
      };
    }
  }

  if (pathname === "/offers" || pathname === "/offers/") {
    const cause = (query.get("cause") ?? "").trim().slice(0, 120);
    if (cause) {
      return {
        opportunityType: "cause_topic" as const,
        opportunityId: cause,
        openEvent: "cause_view" as const,
        surface: "cause_directory",
      };
    }
  }

  return null;
}

export function RecommendationLearningTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  useEffect(() => {
    const surface = getTrackableSurface(pathname, new URLSearchParams(queryString));
    if (!surface) return;

    const startedAt = performance.now();
    let openRecorded = false;
    let dwellRecorded = false;
    const openTimer = window.setTimeout(() => {
      openRecorded = true;
      postSignal({
        opportunityType: surface.opportunityType,
        opportunityId: surface.opportunityId,
        eventType: surface.openEvent,
        surface: surface.surface,
      });
    }, OPEN_DELAY_MS);

    const recordDwell = () => {
      if (!openRecorded || dwellRecorded || surface.openEvent === "cause_view") return;
      const dwellMs = Math.min(MAX_DWELL_MS, Math.max(0, Math.round(performance.now() - startedAt)));
      if (dwellMs < MIN_DWELL_MS) return;
      dwellRecorded = true;
      postSignal(
        {
          opportunityType: surface.opportunityType,
          opportunityId: surface.opportunityId,
          eventType: "dwell",
          dwellMs,
          surface: surface.surface,
        },
        true,
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") recordDwell();
    };
    document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });

    return () => {
      window.clearTimeout(openTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      recordDwell();
    };
  }, [pathname, queryString]);

  return null;
}

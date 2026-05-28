"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { usePathname, useSearchParams } from "next/navigation";

import type { FunnelEventType } from "@/lib/growth";

function inferClickEvent(target: HTMLAnchorElement): FunnelEventType | null {
  const href = target.href;

  if (target.closest(".growth-hero") && target.classList.contains("button-primary")) {
    return "hero_primary_cta_clicked";
  }

  if (href.includes("every.org")) return "donation_route_clicked";
  if (href.includes("/login")) return "sign_in_started";
  if (href.includes("/signup")) return "signup_start";
  if (href.includes("/cohort")) return "cohort_interest_started";
  if (href.includes("/offers?view=examples")) return "worked_example_opened";
  if (href.includes("/offers/new") && href.includes("example=")) return "clone_example_action";
  if (href.includes("/offers/new")) return "create_trade_started";
  if (href.includes("/dashboard#wish-profile")) return "wish_profile_started";
  if (href.includes("/background-networking#concierge-intake")) return "intro_requested";
  if (href.includes("/priority-correction-fund")) return "donation_logged";
  if (href.includes("/mpgf/contribute")) return "evidence_submission_started";
  if (href.includes("/mpgf")) return "public_good_action_logged";

  return null;
}

function postFunnelEvent(eventType: FunnelEventType, metadata: Record<string, unknown>) {
  const body = JSON.stringify({
    eventType,
    metadata,
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/funnel-events", blob);
    return;
  }

  fetch("/api/funnel-events", {
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => {
    // Analytics must never block primary product flows.
  });
}

function getWebVitalValueBucket(metricName: string, value: number) {
  if (!Number.isFinite(value)) return "unknown";

  if (metricName === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs_improvement";
    return "poor";
  }

  if (metricName === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs_improvement";
    return "poor";
  }

  if (metricName === "INP") {
    if (value <= 200) return "good";
    if (value <= 500) return "needs_improvement";
    return "poor";
  }

  return "other";
}

export function FunnelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useReportWebVitals((metric) => {
    if (!["CLS", "INP", "LCP"].includes(metric.name)) {
      return;
    }

    postFunnelEvent("performance_metric_recorded", {
      metricName: metric.name,
      metricRating: metric.rating,
      metricValueBucket: getWebVitalValueBucket(metric.name, metric.value),
      navigationType: metric.navigationType,
    });
  });

  useEffect(() => {
    postFunnelEvent("page_view", {
      search: searchParams.toString(),
    });

    if (pathname.startsWith("/offers/examples/")) {
      postFunnelEvent("worked_example_opened", {
        exampleId: pathname.split("/").pop() ?? "",
      });
    }

    if (pathname === "/login") {
      postFunnelEvent("sign_in_started", {
        search: searchParams.toString(),
      });
    }

    if ((pathname === "/offers" || pathname === "/wish-registry") && searchParams.get("search")) {
      postFunnelEvent("registry_search_executed", {
        query: searchParams.get("search"),
      });
    }

    if (pathname.startsWith("/cohort/")) {
      postFunnelEvent("partner_page_view", {
        partnerSlug: pathname.split("/").pop() ?? "",
      });
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }

      const inferredEvent = inferClickEvent(target);
      if (!inferredEvent) {
        return;
      }

      postFunnelEvent(inferredEvent, {
        href: target.href,
        label: target.textContent?.replace(/\s+/g, " ").trim() ?? "",
      });
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}

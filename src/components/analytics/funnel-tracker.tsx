"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { usePathname, useSearchParams } from "next/navigation";

import {
  ANALYTICS_OPT_OUT_COOKIE_NAME,
  buildPrivacySafeSearchMetadata,
  sanitizeFunnelEventPath,
  type FunnelEventType,
} from "@/lib/growth";

function inferClickEvent(target: HTMLAnchorElement): FunnelEventType | null {
  const href = target.href;

  if (target.closest(".growth-hero") && target.classList.contains("button-primary")) {
    return "hero_primary_cta_clicked";
  }

  if (href.includes("every.org")) return "donation_route_clicked";
  if (href.includes("/login")) return "sign_in_started";
  if (href.includes("/signup")) return "signup_start";
  if (href.includes("/cohort")) return "cohort_interest_started";
  if (href.includes("/worked-examples") || href.includes("/offers?view=examples")) {
    return "worked_example_opened";
  }
  if (target.dataset.intakeRoute) return "marketplace_intake_triage_routed";
  if (href.includes("/offers/new") && href.includes("template=")) {
    return "marketplace_seed_template_selected";
  }
  if (href.includes("/offers/new") && href.includes("example=")) return "clone_example_action";
  if (href.includes("/offers/new")) return "create_trade_started";
  if (href.includes("/dashboard#wish-profile")) return "wish_profile_started";
  if (href.includes("/background-networking#concierge-intake")) return "intro_requested";
  if (href.includes("/priority-correction-fund")) return "donation_logged";
  if (href.includes("/mpgf/contribute")) return "evidence_submission_started";
  if (href.includes("/mpgf")) return "public_good_action_logged";

  return null;
}

function normalizeMarketplaceTab(value: string | null) {
  if (value === "live" || value === "templates" || value === "demo" || value === "public_goods") {
    return value;
  }
  if (value === "worked_examples" || value === "worked-examples" || value === "examples") {
    return "worked_examples";
  }
  if (
    value === "external_crecm" ||
    value === "rounds" ||
    value === "crecm" ||
    value === "mpgf" ||
    value === "public-goods"
  ) {
    return "public_goods";
  }
  return "default";
}

function inferTemplateKind(value: string | null) {
  if (value === "offset" || value === "donation-offset") return "donation_offset";
  if (value === "pledge" || value === "pledge-swap") return "pledge_swap";
  return "reviewed_seed_template";
}

function getTemplateMetadata(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    const mode = url.searchParams.get("mode");
    const template = url.searchParams.get("template");

    return {
      generatedBy: "reviewed_seed_template",
      liveMetricEligible: false,
      mode: mode ?? "",
      routeFamily: "marketplace",
      template: template ?? "",
      templateKind: inferTemplateKind(mode),
    };
  } catch {
    return {
      generatedBy: "reviewed_seed_template",
      liveMetricEligible: false,
      routeFamily: "marketplace",
      templateKind: "reviewed_seed_template",
    };
  }
}

function postFunnelEvent(eventType: FunnelEventType, metadata: Record<string, unknown>) {
  if (
    document.cookie
      .split(";")
      .some((cookie) => {
        const entry = cookie.trim();
        return (
          entry === `${ANALYTICS_OPT_OUT_COOKIE_NAME}=1` ||
          entry === `${ANALYTICS_OPT_OUT_COOKIE_NAME}=true`
        );
      })
  ) {
    return;
  }

  const body = JSON.stringify({
    eventType,
    metadata,
    path: window.location.pathname,
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
    const searchMetadata = buildPrivacySafeSearchMetadata(searchParams);

    postFunnelEvent("page_view", searchMetadata);

    if (pathname === "/offers") {
      const marketplaceTab = normalizeMarketplaceTab(
        searchParams.get("tab") ?? searchParams.get("view"),
      );
      const searchParamKeys = Array.isArray(searchMetadata.searchParamKeys)
        ? searchMetadata.searchParamKeys
        : [];
      const filterKeys = searchParamKeys.filter(
        (key) => !["tab", "view", "page", "pageSize", "page_size"].includes(String(key)),
      );

      postFunnelEvent("marketplace_tab_viewed", {
        ...searchMetadata,
        marketplaceTab,
        routeFamily: "marketplace",
      });

      if (filterKeys.length || searchMetadata.queryPresent) {
        postFunnelEvent("marketplace_filter_applied", {
          ...searchMetadata,
          filterKeys,
          marketplaceTab,
          routeFamily: "marketplace",
        });
      }
    }

    if (pathname.startsWith("/offers/examples/")) {
      postFunnelEvent("worked_example_opened", {
        exampleId: pathname.split("/").pop() ?? "",
      });
    }

    if (pathname === "/offers/new" && searchParams.get("template")) {
      postFunnelEvent(
        "marketplace_create_from_template_started",
        getTemplateMetadata(window.location.href),
      );
    }

    if (pathname === "/login") {
      postFunnelEvent("sign_in_started", buildPrivacySafeSearchMetadata(searchParams));
    }

    if ((pathname === "/offers" || pathname === "/wish-registry") && searchParams.get("search")) {
      postFunnelEvent("registry_search_executed", buildPrivacySafeSearchMetadata(searchParams));
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
        href: sanitizeFunnelEventPath(target.href),
        label: target.textContent?.replace(/\s+/g, " ").trim() ?? "",
        ...(inferredEvent === "marketplace_seed_template_selected"
          ? getTemplateMetadata(target.href)
          : {}),
        ...(inferredEvent === "marketplace_intake_triage_routed"
          ? {
              intakeRoute: target.dataset.intakeRoute ?? "unknown",
              liveMetricEligible: false,
              routeEligible: target.dataset.routeEligible === "true",
              routeFamily: "marketplace",
            }
          : {}),
      });
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}

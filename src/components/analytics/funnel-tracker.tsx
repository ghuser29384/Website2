"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { FunnelEventType } from "@/lib/growth";

function inferClickEvent(href: string): FunnelEventType | null {
  if (href.includes("/signup")) return "signup_start";
  if (href.includes("/cohort")) return "landing_cta_click";
  if (href.includes("/offers?view=examples")) return "worked_example_view";
  if (href.includes("/offers/new") && href.includes("example=")) return "clone_example_action";
  if (href.includes("/background-networking#concierge-intake")) return "intro_requested";
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

export function FunnelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    postFunnelEvent("page_view", {
      search: searchParams.toString(),
    });

    if (pathname.startsWith("/offers/examples/")) {
      postFunnelEvent("worked_example_view", {
        exampleId: pathname.split("/").pop() ?? "",
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

      const inferredEvent = inferClickEvent(target.href);
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

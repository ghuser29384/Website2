"use client";

import { useEffect, type ReactNode } from "react";

const CAMPAIGN = "donation_upgrade_billboard_2026";
const ANONYMOUS_ID_KEY = "moral_trade_campaign_anon_v1";

type CampaignEventType = "landing_view" | "create_click";
type CampaignVariant = "changes_where" | "changes_first" | "counterfactual_ea";

function getAnonymousId() {
  try {
    const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;
    const next = window.crypto.randomUUID();
    window.localStorage.setItem(ANONYMOUS_ID_KEY, next);
    return next;
  } catch {
    return window.crypto.randomUUID();
  }
}

function recordCampaignEvent(eventType: CampaignEventType, variant: CampaignVariant) {
  const payload = JSON.stringify({
    anonymousId: getAnonymousId(),
    campaign: CAMPAIGN,
    eventType,
    medium: "out_of_home",
    source: "billboard",
    variant,
  });

  if (typeof navigator.sendBeacon === "function") {
    const accepted = navigator.sendBeacon(
      "/api/campaign-events",
      new Blob([payload], { type: "application/json" }),
    );
    if (accepted) return;
  }

  void fetch("/api/campaign-events", {
    body: payload,
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  });
}

export function DonationUpgradeCampaignTracker({
  variant,
}: {
  variant: CampaignVariant;
}) {
  useEffect(() => {
    recordCampaignEvent("landing_view", variant);
  }, [variant]);

  return null;
}

export function DonationUpgradeCampaignLink({
  children,
  className,
  href,
  variant,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  variant: CampaignVariant;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => recordCampaignEvent("create_click", variant)}
    >
      {children}
    </a>
  );
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { OfferPlaneItem } from "@/lib/offer-plane";

import { VisualOfferCard, type VisualOfferEntry } from "./offer-visual-card";
import styles from "./offer-visual-card.module.css";

interface OfferPlaneResponse {
  items: OfferPlaneItem[];
  liveOffersAvailable: boolean;
}

interface DirectoryReadResult {
  entries: VisualOfferEntry[];
  grid: HTMLElement;
}

const HOST_ID = "visual-offer-directory-host";
const VISUAL_VIEWS = new Set(["", "live", "examples", "worked_examples", "worked-examples"]);

function isOfferPlaneResponse(value: unknown): value is OfferPlaneResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OfferPlaneResponse>;
  return Array.isArray(candidate.items) && typeof candidate.liveOffersAvailable === "boolean";
}

function normalizePath(value: string) {
  try {
    const pathname = new URL(value, window.location.origin).pathname;
    return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  } catch {
    return value.length > 1 ? value.replace(/\/$/, "") : value;
  }
}

function causePairFromCard(card: HTMLElement, item: OfferPlaneItem) {
  const heading = card.querySelector("h3")?.textContent?.trim() ?? "";
  const pieces = heading
    .split(/\s*↔\s*/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  return {
    offeredCause: pieces[0] || item.causeAreas[0] || "Offered cause",
    requestedCause: pieces[1] || item.causeAreas[1] || "Requested cause",
  };
}

function readDirectory(items: OfferPlaneItem[]): DirectoryReadResult | null {
  const directory = document.querySelector<HTMLElement>(".mt-directory-view");
  const grid = directory?.querySelector<HTMLElement>(".mt-market-grid");
  if (!directory || !grid) return null;

  const cards = Array.from(grid.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.matches("article"),
  );
  if (!cards.length) return null;

  const itemsByHref = new Map(items.map((item) => [normalizePath(item.href), item]));
  const entries: VisualOfferEntry[] = [];

  for (const card of cards) {
    const primaryLink = card.querySelector<HTMLAnchorElement>(".mt-market-card-foot a[href]");
    const href = primaryLink?.getAttribute("href");
    if (!href) return null;

    const item = itemsByHref.get(normalizePath(href));
    if (!item) return null;

    const causes = causePairFromCard(card, item);
    const credibilityHref = card
      .querySelector<HTMLAnchorElement>('a[href*="/credibility"]')
      ?.getAttribute("href");

    entries.push({
      ...causes,
      credibilityHref: credibilityHref || undefined,
      item,
    });
  }

  return { entries, grid };
}

export function OfferVisualDirectoryMount() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [entries, setEntries] = useState<VisualOfferEntry[]>([]);

  const queryState = useMemo(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
    const view = (searchParams.get("view") || searchParams.get("tab") || "").toLowerCase();

    return {
      key: searchParams.toString(),
      shouldShow: normalizedPath === "/offers" && VISUAL_VIEWS.has(view),
    } as const;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!queryState.shouldShow) {
      return;
    }

    document.getElementById(HOST_ID)?.remove();
    const portalHost = document.createElement("div");
    portalHost.id = HOST_ID;
    portalHost.className = styles.portalHost;
    portalHost.dataset.visualOfferDirectory = "true";

    const controller = new AbortController();
    let disposed = false;
    let payload: OfferPlaneResponse | null = null;
    let activeGrid: HTMLElement | null = null;
    let activeHeading: HTMLElement | null = null;
    let activeKicker: HTMLElement | null = null;
    let lastFingerprint = "";

    function restoreDirectory() {
      if (activeGrid) activeGrid.hidden = false;
      if (activeHeading) {
        activeHeading.classList.remove(styles.visualHeading);
        activeHeading.removeAttribute("data-visual-count");
      }
      if (activeKicker) activeKicker.hidden = false;
      activeGrid = null;
      activeHeading = null;
      activeKicker = null;
    }

    function syncDirectory() {
      if (disposed) return;

      const directory = document.querySelector<HTMLElement>(".mt-directory-view");
      const grid = directory?.querySelector<HTMLElement>(".mt-market-grid");
      if (!directory || !grid) return;

      if (portalHost.parentElement !== directory || portalHost.nextSibling !== grid) {
        directory.insertBefore(portalHost, grid);
      }

      if (!payload) return;
      const result = readDirectory(payload.items);
      if (!result || result.grid !== grid) return;

      const fingerprint = result.entries.map((entry) => entry.item.href).join("|");
      if (!fingerprint) return;

      if (activeGrid && activeGrid !== grid) restoreDirectory();
      activeGrid = grid;
      activeGrid.hidden = true;

      activeHeading = directory.querySelector<HTMLElement>(".mt-directory-view-head h2");
      if (activeHeading) {
        activeHeading.classList.add(styles.visualHeading);
        activeHeading.setAttribute("data-visual-count", String(result.entries.length));
      }

      activeKicker = directory.querySelector<HTMLElement>(".mt-directory-view-head .mt-market-eyebrow");
      if (activeKicker) activeKicker.hidden = true;

      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        setEntries(result.entries);
      }
    }

    const observer = new MutationObserver(syncDirectory);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(() => {
      setHost(portalHost);
      syncDirectory();
    });

    fetch("/api/offers/plane", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (result) => {
        if (!result.ok) throw new Error(`Offer search returned ${result.status}.`);
        const nextPayload: unknown = await result.json();
        if (!isOfferPlaneResponse(nextPayload)) throw new Error("Offer search returned invalid data.");
        payload = nextPayload;
        syncDirectory();
      })
      .catch(() => {
        // The server-rendered directory stays visible as the resilient fallback.
      });

    return () => {
      disposed = true;
      controller.abort();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      restoreDirectory();
      portalHost.remove();
    };
  }, [queryState.key, queryState.shouldShow]);

  if (!queryState.shouldShow || !host || !entries.length) return null;

  return createPortal(
    <div className={styles.grid} data-visual-offer-grid="true">
      {entries.map((entry) => (
        <VisualOfferCard entry={entry} key={entry.item.id} />
      ))}
    </div>,
    host,
  );
}

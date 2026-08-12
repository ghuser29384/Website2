"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { OfferPlaneItem } from "@/lib/offer-plane";

import disclosureStyles from "./offer-plane-disclosure.module.css";
import { OfferPlaneInlineClient } from "./offer-plane-inline-client";
import styles from "./offer-plane-inline.module.css";

interface OfferPlaneResponse {
  items: OfferPlaneItem[];
  liveOffersAvailable: boolean;
}

const HOST_ID = "ordinary-offer-plane-host";
const ORDINARY_VIEWS = new Set(["", "all", "live", "examples", "worked_examples", "worked-examples"]);
const PUBLIC_GOODS_TERMS = [
  "moral public goods",
  "public goods fund",
  "public-good contribution",
  "common ground budget",
  "assurance matching",
  "crecm",
  "mpgf",
];

function isOfferPlaneResponse(value: unknown): value is OfferPlaneResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OfferPlaneResponse>;
  return Array.isArray(candidate.items) && typeof candidate.liveOffersAvailable === "boolean";
}

export function OfferPlaneInlineMount() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [response, setResponse] = useState<OfferPlaneResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const queryState = useMemo(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
    const view = (searchParams.get("view") || searchParams.get("tab") || "").toLowerCase();
    const search = (searchParams.get("search") || "").trim();
    const modes = [...searchParams.getAll("mode"), ...searchParams.getAll("format")];
    const publicGoodsIntent =
      view === "public-goods" ||
      view === "public_goods" ||
      modes.includes("public-good") ||
      PUBLIC_GOODS_TERMS.some((term) => search.toLowerCase().includes(term));
    const shouldShow = normalizedPath === "/offers" && ORDINARY_VIEWS.has(view) && !publicGoodsIntent;
    const rawMode = modes.find((mode) => mode === "pledge" || mode === "offset" || mode === "payment");

    return {
      initialCause: searchParams.getAll("cause")[0] || "all",
      initialMode: rawMode === "pledge" || rawMode === "offset" || rawMode === "payment" ? rawMode : "all",
      initialQuery: search,
      key: searchParams.toString(),
      shouldShow,
    } as const;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!queryState.shouldShow) return;

    document.getElementById(HOST_ID)?.remove();
    const portalHost = document.createElement("div");
    portalHost.id = HOST_ID;
    portalHost.className = styles.portalHost;
    portalHost.dataset.offerPlaneInline = "true";

    function placeHost() {
      const directorySection = document.querySelector<HTMLElement>(".mt-product-section.is-white");
      const searchForm = directorySection?.querySelector<HTMLFormElement>(
        'form[data-smart-query-surface="offers"]',
      );
      const toolbar = directorySection?.querySelector<HTMLElement>(".mt-directory-toolbar");

      if (searchForm?.parentElement) {
        if (searchForm.nextSibling !== portalHost) {
          searchForm.parentElement.insertBefore(portalHost, searchForm.nextSibling);
        }
        return;
      }

      if (toolbar?.parentElement) {
        if (toolbar.nextSibling !== portalHost) {
          toolbar.parentElement.insertBefore(portalHost, toolbar.nextSibling);
        }
        return;
      }

      if (directorySection && portalHost.parentElement !== directorySection) {
        directorySection.append(portalHost);
      }
    }

    placeHost();
    const frame = window.requestAnimationFrame(() => {
      placeHost();
      setHost(portalHost);
    });
    const observer = new MutationObserver(placeHost);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      portalHost.remove();
    };
  }, [queryState.shouldShow]);

  useEffect(() => {
    if (!queryState.shouldShow) return;

    const controller = new AbortController();

    fetch("/api/offers/plane", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (result) => {
        if (!result.ok) throw new Error(`Offer search returned ${result.status}.`);

        const payload: unknown = await result.json();
        if (!isOfferPlaneResponse(payload)) {
          throw new Error("Offer search returned an invalid response.");
        }

        setResponse(payload);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load the offer plane.");
      });

    return () => controller.abort();
  }, [attempt, queryState.shouldShow]);

  if (!queryState.shouldShow || !host) return null;

  const content = response ? (
    <OfferPlaneInlineClient
      initialCause={queryState.initialCause}
      initialMode={queryState.initialMode}
      initialQuery={queryState.initialQuery}
      items={response.items}
      key={queryState.key}
      liveOffersAvailable={response.liveOffersAvailable}
    />
  ) : error ? (
    <div className={styles.loadError} role="alert">
      <strong>The challenge-return plane could not be loaded.</strong>
      <p>{error}</p>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setAttempt((value) => value + 1);
        }}
      >
        Try again
      </button>
    </div>
  ) : (
    <div className={styles.loading} role="status" aria-live="polite">
      <strong>Loading the challenge-return offer plane…</strong>
      <span>Preparing ordinary offers and pledge swaps for visual search.</span>
    </div>
  );

  return createPortal(
    <details className={disclosureStyles.disclosure}>
      <summary>
        <span className={disclosureStyles.label}>Visual search</span>
        <strong className={disclosureStyles.title}>Explore by challenge and return</strong>
        <span className={disclosureStyles.optional}>
          <span>Optional</span>
        </span>
      </summary>
      <div className={disclosureStyles.body}>{content}</div>
    </details>,
    host,
  );
}

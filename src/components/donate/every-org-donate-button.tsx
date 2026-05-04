"use client";

import { useEffect, useId } from "react";

import {
  getEveryOrgDonationHref,
  type EveryOrgDonationTarget,
} from "@/lib/every-org";

type DonationFrequency = "once" | "monthly" | "quarterly" | "annually";

interface EveryOrgWidgetOptions {
  selector: string;
  nonprofitSlug: string;
  fundraiserSlug?: string;
  primaryColor?: string;
  defaultDonationAmount?: number;
  defaultFrequency?: DonationFrequency;
  addAmounts?: number[];
  completeDonationInNewTab?: boolean;
}

interface EveryOrgDonateButtonApi {
  createWidget: (options: EveryOrgWidgetOptions) => void;
}

interface EveryOrgRuntimeElement {
  id?: string;
  src?: string;
  async?: boolean;
  defer?: boolean;
  addEventListener?: (event: string, handler: () => void, options?: { once?: boolean }) => void;
  getAttribute?: (name: string) => string | null;
  setAttribute?: (name: string, value: string) => void;
}

interface EveryOrgRuntimeDocument {
  body?: { appendChild: (child: unknown) => void } | null;
  createElement: (tag: string) => EveryOrgRuntimeElement;
  getElementById: (id: string) => EveryOrgRuntimeElement | null;
}

interface EveryOrgDonateButtonProps {
  target: EveryOrgDonationTarget;
  label?: string;
  className?: string;
  defaultDonationAmount?: number;
  defaultFrequency?: DonationFrequency;
  suggestedAmounts?: number[];
  completeDonationInNewTab?: boolean;
}

const EVERY_ORG_SCRIPT_ID = "every-org-donate-button-script";
const EVERY_ORG_SCRIPT_SRC = "https://embeds.every.org/0.4/button.js?explicit=1";

let everyOrgScriptPromise: Promise<EveryOrgDonateButtonApi | null> | null = null;

function loadEveryOrgScript() {
  const runtime = globalThis as typeof globalThis & {
    document?: EveryOrgRuntimeDocument;
    everyDotOrgDonateButton?: EveryOrgDonateButtonApi;
  };
  const runtimeDocument = runtime.document;

  if (typeof globalThis === "undefined" || !runtimeDocument) {
    return Promise.resolve<EveryOrgDonateButtonApi | null>(null);
  }

  if (runtime.everyDotOrgDonateButton) {
    return Promise.resolve(runtime.everyDotOrgDonateButton);
  }

  if (everyOrgScriptPromise) {
    return everyOrgScriptPromise;
  }

  everyOrgScriptPromise = new Promise((resolve) => {
    const existingScript = runtimeDocument.getElementById(EVERY_ORG_SCRIPT_ID);

    const resolveFromWindow = () => {
      resolve(runtime.everyDotOrgDonateButton ?? null);
    };

    if (existingScript) {
      if (!existingScript.addEventListener) {
        resolveFromWindow();
        return;
      }

      existingScript.addEventListener("load", resolveFromWindow, { once: true });
      existingScript.addEventListener("error", () => resolve(null), { once: true });
      return;
    }

    const script = runtimeDocument.createElement("script");
    if (!script.addEventListener) {
      resolve(null);
      return;
    }

    script.id = EVERY_ORG_SCRIPT_ID;
    script.src = EVERY_ORG_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolveFromWindow, { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    runtimeDocument.body?.appendChild(script);
  });

  return everyOrgScriptPromise;
}

export function EveryOrgDonateButton({
  target,
  label = "Donate on Every.org",
  className,
  defaultDonationAmount,
  defaultFrequency = "once",
  suggestedAmounts,
  completeDonationInNewTab = false,
}: EveryOrgDonateButtonProps) {
  const reactId = useId();
  const buttonId = `every-org-donate-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const signature = JSON.stringify({
    nonprofitSlug: target.nonprofitSlug,
    fundraiserSlug: target.fundraiserSlug ?? null,
    defaultDonationAmount: defaultDonationAmount ?? target.defaultDonationAmount ?? null,
    defaultFrequency,
    suggestedAmounts: suggestedAmounts ?? target.suggestedAmounts ?? null,
    completeDonationInNewTab,
  });

  useEffect(() => {
    let isCancelled = false;

    async function attachWidget() {
      const runtime = globalThis as typeof globalThis & {
        document?: EveryOrgRuntimeDocument;
      };
      const runtimeDocument = runtime.document;
      const api = await loadEveryOrgScript();

      if (isCancelled || !api || !runtimeDocument) {
        return;
      }

      const element = runtimeDocument.getElementById(buttonId);

      if (!element || element.getAttribute?.("data-every-org-signature") === signature) {
        return;
      }

      api.createWidget({
        selector: `#${buttonId}`,
        nonprofitSlug: target.nonprofitSlug,
        fundraiserSlug: target.fundraiserSlug,
        primaryColor: "#6b97c8",
        defaultDonationAmount: defaultDonationAmount ?? target.defaultDonationAmount,
        defaultFrequency,
        addAmounts: [...(suggestedAmounts ?? target.suggestedAmounts ?? [])],
        completeDonationInNewTab,
      });

      element.setAttribute?.("data-every-org-signature", signature);
    }

    attachWidget();

    return () => {
      isCancelled = true;
    };
  }, [
    buttonId,
    completeDonationInNewTab,
    defaultDonationAmount,
    defaultFrequency,
    signature,
    suggestedAmounts,
    target.defaultDonationAmount,
    target.fundraiserSlug,
    target.nonprofitSlug,
    target.suggestedAmounts,
  ]);

  return (
    <a
      aria-label={`${label} for ${target.title}`}
      className={className}
      href={getEveryOrgDonationHref(target)}
      id={buttonId}
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

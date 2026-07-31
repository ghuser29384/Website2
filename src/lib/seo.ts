import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/config";

export const SITE_NAME = "Moral Trade";
export const SITE_DESCRIPTION =
  "A marketplace and coordination mechanism for trading commitments, redirecting offsetting donations, and funding conditional pools across different moral priorities.";
export const SITE_URL = "https://www.moraltrade.org";
export const SITE_LOCALE = "en_US";
export const SITE_IMAGE_PATH = "/brand/moral-trade-mark.png";

export function getAbsoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export type BreadcrumbJsonLdItem = {
  href: string;
  label: string;
};

export type FaqJsonLdItem = {
  answer: string;
  question: string;
};

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbJsonLdItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getAbsoluteUrl("/"),
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        item: getAbsoluteUrl(item.href),
      })),
    ],
  };
}

export function buildFaqPageJsonLd({
  description,
  faqs,
  name,
  path,
}: {
  description: string;
  faqs: readonly FaqJsonLdItem[];
  name: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name,
    url: getAbsoluteUrl(path),
    description,
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildWebPageJsonLd({
  description,
  name,
  path,
}: {
  description: string;
  name: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url: getAbsoluteUrl(path),
    description,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function buildArticleJsonLd({
  description,
  headline,
  path,
}: {
  description: string;
  headline: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    name: headline,
    url: getAbsoluteUrl(path),
    mainEntityOfPage: getAbsoluteUrl(path),
    description,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: getAbsoluteUrl(SITE_IMAGE_PATH),
    },
  };
}

export function truncateDescription(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}\u2026`;
}

export function formatLocation(city?: string | null, region?: string | null) {
  return [city, region].filter(Boolean).join(", ");
}

export function createPublicMetadataClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getPublicSitemapEntries() {
  if (process.env.MORAL_TRADE_STATIC_SITEMAP_ONLY === "true" || !hasSupabaseEnv()) {
    return {
      offers: [] as Array<{ id: string; updated_at: string; created_at: string }>,
      profiles: [] as Array<{ id: string; created_at: string }>,
    };
  }

  const supabase = createPublicMetadataClient();
  const [{ data: offers, error: offersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("offers")
        .select("id, created_at, updated_at")
        .eq("status", "open")
        .order("updated_at", { ascending: false }),
      (supabase as any)
        .from("public_profile_cards_v1")
        .select("id, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (offersError) {
    throw new Error(offersError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return {
    offers: (offers ?? []) as Array<{ id: string; updated_at: string; created_at: string }>,
    profiles: (profiles ?? []) as Array<{ id: string; created_at: string }>,
  };
}

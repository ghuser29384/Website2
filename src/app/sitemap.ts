import type { MetadataRoute } from "next";

import { getPublicSitemapEntries, getAbsoluteUrl } from "@/lib/seo";
import { PARTNER_COHORTS } from "@/lib/growth";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: getAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: getAbsoluteUrl("/ai.txt"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.62,
    },
    {
      url: getAbsoluteUrl("/what-is-moral-trade"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.92,
    },
    {
      url: getAbsoluteUrl("/moral-trade/technical-spec"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: getAbsoluteUrl("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.88,
    },
    {
      url: getAbsoluteUrl("/start"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.88,
    },
    {
      url: getAbsoluteUrl("/how-it-works"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.86,
    },
    {
      url: getAbsoluteUrl("/projects"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88,
    },
    {
      url: getAbsoluteUrl("/worked-examples"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.86,
    },
    {
      url: getAbsoluteUrl("/anti-threat-rules"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.82,
    },
    {
      url: getAbsoluteUrl("/research"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.82,
    },
    {
      url: getAbsoluteUrl("/measurement"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/transparency"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: getAbsoluteUrl("/accessibility"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.68,
    },
    {
      url: getAbsoluteUrl("/reasoning-center"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.82,
    },
    {
      url: getAbsoluteUrl("/offers"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/offers/new"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: getAbsoluteUrl("/cohort"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: getAbsoluteUrl("/status"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
    },
    {
      url: getAbsoluteUrl("/pilot-updates"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.76,
    },
    {
      url: getAbsoluteUrl("/team-and-governance"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.76,
    },
    {
      url: getAbsoluteUrl("/trust"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.78,
    },
    {
      url: getAbsoluteUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    ...PARTNER_COHORTS.map((partner) => ({
      url: getAbsoluteUrl(`/cohort/${partner.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
    ...CANONICAL_WORKED_CASE_OFFERS.map((offer) => ({
      url: getAbsoluteUrl(`/offers/examples/${offer.id}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
    {
      url: getAbsoluteUrl("/pledge-swaps"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: getAbsoluteUrl("/donation-offsets"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: getAbsoluteUrl("/paid-action-offers"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: getAbsoluteUrl("/validation"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: getAbsoluteUrl("/methodology"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/sources"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.68,
    },
    {
      url: getAbsoluteUrl("/safety"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/faq"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: getAbsoluteUrl("/people"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl("/background-networking"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/reasoning-standards"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/wish-registry"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl("/donate"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.72,
    },
    {
      url: getAbsoluteUrl("/mpgf"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/mpgf/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/mpgf/contribute"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl("/mpgf/pools"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl("/mpgf/technical-spec"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  try {
    const { offers, profiles } = await getPublicSitemapEntries();

    return [
      ...entries,
      ...offers.map((offer) => ({
        url: getAbsoluteUrl(`/offers/${offer.id}`),
        lastModified: new Date(offer.updated_at || offer.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...profiles.map((profile) => ({
        url: getAbsoluteUrl(`/people/${profile.id}`),
        lastModified: new Date(profile.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return entries;
  }
}

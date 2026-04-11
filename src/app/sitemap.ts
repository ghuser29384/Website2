import type { MetadataRoute } from "next";

import { getPublicSitemapEntries, getAbsoluteUrl } from "@/lib/seo";

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
      url: getAbsoluteUrl("/offers"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/people"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
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

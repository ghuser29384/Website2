import type { MetadataRoute } from "next";

import { getAbsoluteUrl, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/dashboard", "/cart", "/offers/new", "/auth/"],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}

import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";

import { FunnelTracker } from "@/components/analytics/funnel-tracker";
import { RecommendationLearningTracker } from "@/components/recommendations/recommendation-learning-tracker";
import { SmartQueryAutoEnhancer } from "@/components/search/smart-query-auto-enhancer";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_IMAGE_PATH, SITE_NAME, SITE_URL } from "@/lib/seo";

import "./globals.css";
import "./marketplace-ui.css";
import "./readability-cleanup.css";
import "./activation-critical.css";
import "./home-process-polish.css";
import "./home-mode-hover-colors.css";
import "./search-bar-polish.css";
import "./canonical-visual-system.css";

const SITE_FAVICON_PATH = `${SITE_IMAGE_PATH}?v=20260730`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: getAbsoluteUrl(SITE_IMAGE_PATH),
        width: 512,
        height: 512,
        alt: "Moral Trade",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [getAbsoluteUrl(SITE_IMAGE_PATH)],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: SITE_FAVICON_PATH,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: SITE_FAVICON_PATH,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: SITE_FAVICON_PATH,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: getAbsoluteUrl("/offers?search={search_term_string}"),
    "query-input": "required name=search_term_string",
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: getAbsoluteUrl(SITE_IMAGE_PATH),
  description: SITE_DESCRIPTION,
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "safety and participant support",
      email: "support@moraltrade.org",
      url: getAbsoluteUrl("/contact"),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href={SITE_FAVICON_PATH} rel="icon" sizes="512x512" type="image/png" />
        <link href={SITE_FAVICON_PATH} rel="shortcut icon" sizes="512x512" type="image/png" />
        <link href={SITE_FAVICON_PATH} rel="apple-touch-icon" sizes="512x512" />
        {/* The same static stylesheets also serve the legacy HTML shell. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/moral-trade-input-assist.css" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/moral-trade-live-feed-diagnostics.css" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/moral-trade-live-learning-diagnostics.css" rel="stylesheet" />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
          type="application/ld+json"
        />
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <FunnelTracker />
          <RecommendationLearningTracker />
          <SmartQueryAutoEnhancer />
        </Suspense>
        <Script src="/moral-trade-input-assist.js" strategy="lazyOnload" />
        <Script src="/moral-trade-live-feed-diagnostics.js" strategy="afterInteractive" />
        <Script src="/moral-trade-live-learning-diagnostics.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}

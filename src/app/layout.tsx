import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";

import { FunnelTracker } from "@/components/analytics/funnel-tracker";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_IMAGE_PATH, SITE_NAME, SITE_URL } from "@/lib/seo";

import "./globals.css";

const larken = localFont({
  src: "../../Larken Serif/Larken-Medium.otf",
  variable: "--font-heading-loaded",
  weight: "500",
  style: "normal",
  display: "swap",
});

const metropolis = localFont({
  src: "../../metropolis.regular.otf",
  variable: "--font-body-loaded",
  weight: "400",
  style: "normal",
  display: "swap",
});

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
    icon: SITE_IMAGE_PATH,
    shortcut: SITE_IMAGE_PATH,
    apple: SITE_IMAGE_PATH,
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
      contactType: "safety and pilot support",
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
      <body className={`${larken.variable} ${metropolis.variable}`}>
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
        </Suspense>
        {children}
      </body>
    </html>
  );
}

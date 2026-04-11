import type { Metadata } from "next";
import localFont from "next/font/local";

import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

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
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/O%20(8).png",
    shortcut: "/O%20(8).png",
    apple: "/O%20(8).png",
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: SITE_NAME,
  url: SITE_URL,
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: getAbsoluteUrl("/O%20(11).png"),
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
        {children}
      </body>
    </html>
  );
}

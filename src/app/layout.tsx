import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Moral Trade",
    template: "%s | Moral Trade",
  },
  description:
    "A minimal Next.js web app for structured moral trade, preserving the original homepage design and preparing for Supabase-backed accounts and offers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

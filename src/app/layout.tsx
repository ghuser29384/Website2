import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Moral Trade",
    template: "%s | Moral Trade",
  },
  description:
    "A public-interest web app for structured moral commitments, grounded in careful reasoning, explicit terms, and transparent limitations.",
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

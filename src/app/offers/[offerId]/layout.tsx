import { notFound } from "next/navigation";

import { isPostgresUuid } from "@/lib/uuid";

export default async function OfferRecordLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ offerId: string }>;
}>) {
  const { offerId } = await params;

  if (!isPostgresUuid(offerId)) {
    notFound();
  }

  return children;
}

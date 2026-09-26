import { notFound } from "next/navigation";

import { OfferCredibilityLink } from "@/components/offer-credibility-link";
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

  return (
    <>
      <OfferCredibilityLink offerId={offerId} />
      {children}
    </>
  );
}

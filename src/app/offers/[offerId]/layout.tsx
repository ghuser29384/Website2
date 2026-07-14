import { OfferCredibilityLink } from "@/components/offer-credibility-link";

export default async function OfferRecordLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ offerId: string }>;
}>) {
  const { offerId } = await params;

  return (
    <>
      <OfferCredibilityLink offerId={offerId} />
      {children}
    </>
  );
}

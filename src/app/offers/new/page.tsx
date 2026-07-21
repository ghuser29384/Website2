import { redirect } from "next/navigation";

import { getReviewedMarketplaceSeedTemplate } from "@/lib/marketplace-seed-templates";

export const dynamic = "force-dynamic";

interface LegacyOfferCreatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LegacyOfferCreatePage({
  searchParams,
}: LegacyOfferCreatePageProps) {
  const resolved = await searchParams;
  const example = single(resolved.example);
  const templateId = single(resolved.template);
  const mode = single(resolved.mode);
  const template = getReviewedMarketplaceSeedTemplate(templateId);
  let target = "/trades/new";

  if (example === "seed-victoria") {
    target = "/trades/new?example=seed-victoria";
  } else if (template?.format === "pledge_swap") {
    target = `/trades/new?template=${encodeURIComponent(template.id)}`;
  } else if (template?.format === "donation_offset" || mode === "offset") {
    const query = template?.id ? `?template=${encodeURIComponent(template.id)}` : "";
    target = `/donation-offsets${query}`;
  } else if (mode === "pool") {
    target = "/pools";
  }

  redirect(target);
}

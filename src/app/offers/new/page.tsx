import { redirect } from "next/navigation";

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
  const target = example === "seed-victoria" ? "/trades/new?example=seed-victoria" : "/trades/new";
  redirect(target);
}

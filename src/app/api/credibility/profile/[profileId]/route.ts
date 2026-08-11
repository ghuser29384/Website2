import { getPublicProfileSummary } from "@/lib/app-data";
import {
  CREDIBILITY_CATEGORIES,
  CREDIBILITY_ROLES,
  type CredibilityCategory,
  type CredibilityRole,
} from "@/lib/credibility";
import { getPublicCredibilitySummary } from "@/lib/credibility-data";
import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";

export const dynamic = "force-dynamic";

interface ProfileCredibilityRouteProps {
  params: Promise<{ profileId: string }>;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function roleFrom(value: string | null): CredibilityRole | undefined {
  return value && (CREDIBILITY_ROLES as readonly string[]).includes(value)
    ? (value as CredibilityRole)
    : undefined;
}

function categoryFrom(value: string | null): CredibilityCategory | undefined {
  return value && (CREDIBILITY_CATEGORIES as readonly string[]).includes(value)
    ? (value as CredibilityCategory)
    : undefined;
}

export async function GET(request: Request, { params }: ProfileCredibilityRouteProps) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited credibility profile read returns no profile payload until the window resets.",
    );
  }

  const { profileId } = await params;
  if (!isUuid(profileId)) {
    return buildMoralTradeApiJsonResponse(
      { ok: false, error: "A valid public profile identifier is required." },
      "no_store_dynamic",
      { status: 400 },
    );
  }

  const profile = await getPublicProfileSummary(profileId);
  if (!profile) {
    return buildMoralTradeApiJsonResponse(
      { ok: false, error: "Public profile not found." },
      "no_store_dynamic",
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const role = roleFrom(url.searchParams.get("role"));
  const category = categoryFrom(url.searchParams.get("category"));
  const summary = await getPublicCredibilitySummary(profileId, { role, category });

  return buildMoralTradeApiJsonResponse({
    ok: true,
    checkedAt: new Date().toISOString(),
    profile: {
      id: profile.id,
      displayName: profile.resolvedName,
    },
    context: { role: role ?? null, category: category ?? null },
    credibility: summary,
    privacyBoundary:
      "Only aggregate evidence is returned. Raw evidence, counterparties, restriction reasons, and private dispute material are not exposed.",
    documentation: "/credibility",
  });
}

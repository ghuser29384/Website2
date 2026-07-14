import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  MORAL_GOODS_FEATURE_CAPABILITIES,
  MORAL_GOODS_SEED_ENVELOPES,
  buildDealCardModel,
  evaluateFeatureCapabilities,
  evaluateEnvelopeReadiness,
  getGuidedStandingBudgetSteps,
  getMoralGoodsDiscoverySurface,
  getPrivateProposalIntakeFields,
} from "@/lib/moral-trade/group-buying";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited group-buying read returns no public deal cards until the window resets.",
    );
  }

  const capabilityGate = evaluateFeatureCapabilities(MORAL_GOODS_FEATURE_CAPABILITIES);
  const envelopes = MORAL_GOODS_SEED_ENVELOPES.map((envelope) => ({
    dealCard: buildDealCardModel(envelope, "public"),
    envelope: {
      actionWindow: envelope.actionWindow,
      currency: envelope.currency,
      enabledFeatureModules: envelope.enabledFeatureModules,
      expectedImpactRange: envelope.expectedImpactRange,
      funding: envelope.funding,
      publicEnvelopeId: envelope.registry.publicEnvelopeId,
      publicReport: envelope.publicReport,
      slug: envelope.slug,
      stateGroup: envelope.stateGroup,
      title: envelope.title,
      type: envelope.envelopeType,
      userFacingLabel: envelope.snapshot.publicCopy.primaryLabel,
    },
    readiness: evaluateEnvelopeReadiness({
      envelope,
      phase: envelope.stateGroup === "completed" ? "public_report" : "launch",
      now: "2026-06-24T12:00:00.000Z",
    }),
  }));

  return buildMoralTradeApiJsonResponse({
    blockers: capabilityGate.blockers,
    checkedAt: new Date().toISOString(),
    featureName: "Moral Goods Group Buying",
    guidedStandingBudgetSteps: getGuidedStandingBudgetSteps(),
    ok: capabilityGate.status === "pass",
    privateProposalIntakeFields: getPrivateProposalIntakeFields(),
    publicSurface: {
      capabilities: MORAL_GOODS_FEATURE_CAPABILITIES.map((capability) => ({
        environment: capability.environment,
        featureModule: capability.featureModule,
        publicReason: capability.publicReason,
        status: capability.status,
      })),
      discoverySurface: getMoralGoodsDiscoverySurface(),
      envelopes,
      navigationTabs: ["Fund", "Participate", "Results"],
      primaryEntryPoints: [
        "Fund verified actions",
        "Apply to participate",
        "Set a small recurring budget",
        "View results",
      ],
    },
  });
}

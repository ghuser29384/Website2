import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  evaluateAtLeastTierPlatformMatchCapability,
  type AtLeastTierPlatformMatchActorRole,
  type AtLeastTierPlatformMatchEnvironment,
} from "@/lib/mpgf/public-goods-at-least-tier-platform-match";
import {
  evaluateRefundBonusCapability,
  type RefundBonusActorRole,
  type RefundBonusEnvironment,
} from "@/lib/mpgf/public-goods-refund-bonus-non-mvp";
import {
  MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG,
  MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG,
  MORAL_PUBLIC_GOODS_LABS_POOL,
  MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG,
  MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG,
  MORAL_PUBLIC_GOODS_LABS_ROUTE,
  evaluateMoralPublicGoodsLabsAccess,
  type MoralPublicGoodsLabsActorRole,
  type MoralPublicGoodsLabsRuntimeEnvironment,
} from "@/lib/mpgf/moral-public-goods-labs-ui";
import {
  PROJECT_RECOMMENDATION_FEATURE_KEY,
  buildMoralPublicGoodsRecommendationDevSeedData,
  buildProjectRecommendationPublicView,
  evaluateProjectRecommendationCapability,
} from "@/lib/mpgf/public-goods-project-recommendations-non-mvp";
import { getAbsoluteUrl } from "@/lib/seo";
import MoralPublicGoodsLabsClient from "./moral-public-goods-labs-client";
import styles from "./moral-public-goods-labs.module.css";

type PageProps = {
  params: Promise<{ poolSlug: string }>;
};

export const metadata: Metadata = {
  alternates: {
    canonical: MORAL_PUBLIC_GOODS_LABS_ROUTE,
  },
  description:
    "Non-MVP Labs page for choosing a reviewed moral-public-good funding rule without production real-money movement.",
  openGraph: {
    description:
      "A Labs-only selector for refund-bonus pledges and at-least-tier platform matching on a reviewed moral-public-good pool.",
    title: "Moral Public Goods Labs",
    type: "website",
    url: getAbsoluteUrl(MORAL_PUBLIC_GOODS_LABS_ROUTE),
  },
  robots: {
    follow: false,
    index: false,
  },
  title: "Moral Public Goods Labs",
};

const labsTopbarLinks = [
  { href: "/offers", label: "Explore" },
  { href: MORAL_PUBLIC_GOODS_LABS_ROUTE, label: "Moral Public Goods" },
  { href: "/dashboard", label: "My Activity" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "Learn" },
] as const;

function getRuntimeEnvironment(): MoralPublicGoodsLabsRuntimeEnvironment {
  if (process.env.NODE_ENV === "test") return "test";
  if (process.env.NODE_ENV === "production") {
    return process.env.VERCEL_ENV === "preview" ? "preview" : "production";
  }
  return "development";
}

function getFlagValue(flag: string) {
  return process.env[flag] === "true" || process.env[flag.toUpperCase()] === "true";
}

function getActorRole(environment: MoralPublicGoodsLabsRuntimeEnvironment): MoralPublicGoodsLabsActorRole {
  const configured = process.env.MORAL_PUBLIC_GOODS_LABS_ACTOR_ROLE;
  if (configured === "admin" || configured === "service" || configured === "labs_participant" || configured === "public") {
    return configured;
  }
  return environment === "production" ? "public" : "labs_participant";
}

function SimpleLabsFooter() {
  return (
    <footer className={styles.simpleFooter} aria-label="Moral public goods labs footer">
      <a href="/faq">FAQ</a>
      <a href="/mpgf/technical-spec">Rules</a>
      <a href="/terms">Terms</a>
      <a href="/privacy">Privacy</a>
    </footer>
  );
}

function LabsUnavailablePage({ reasons }: { reasons: readonly string[] }) {
  return (
    <div className={styles.pageShell} data-mt-surface="mpgf-labs">
      <SiteTopbar brandHref="/" links={[...labsTopbarLinks]} showSearch={false} />
      <main className={styles.unavailable} id="main-content" tabIndex={-1}>
        <a className={styles.backLink} href="/mpgf">
          &larr; Back to moral public goods
        </a>
        <section className={styles.unavailableCard} aria-labelledby="labs-unavailable-heading">
          <span className={styles.labsPill}>LABS</span>
          <h1 id="labs-unavailable-heading">Moral Public Goods Labs is gated.</h1>
          <p>
            Labs mechanism — Non-MVP. Real-money use is disabled unless this feature is explicitly
            promoted.
          </p>
          <p>
            This production/public view does not create commitments, save payment methods, authorize
            charges, capture funds, route donations, execute platform match, or pay bonuses.
          </p>
          <ul>
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      </main>
      <SimpleLabsFooter />
    </div>
  );
}

export default async function MoralPublicGoodsLabsPage({ params }: PageProps) {
  const { poolSlug } = await params;
  if (poolSlug !== MORAL_PUBLIC_GOODS_LABS_POOL.slug) {
    notFound();
  }

  const environment = getRuntimeEnvironment();
  const actorRole = getActorRole(environment);
  const productionDeployment = environment === "production";
  const refundBonusFeatureEnabled =
    !productionDeployment || getFlagValue(MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_FEATURE_FLAG);
  const atLeastTierFeatureEnabled =
    !productionDeployment || getFlagValue(MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_FEATURE_FLAG);
  const refundBonusLiveMoneyEnabled = getFlagValue(MORAL_PUBLIC_GOODS_LABS_REFUND_BONUS_LIVE_MONEY_FLAG);
  const atLeastTierLiveMoneyEnabled = getFlagValue(MORAL_PUBLIC_GOODS_LABS_AT_LEAST_TIER_LIVE_MONEY_FLAG);
  const projectRecommendationFeatureEnabled = !productionDeployment || getFlagValue(PROJECT_RECOMMENDATION_FEATURE_KEY);
  const projectRecommendationCapability = evaluateProjectRecommendationCapability({
    action: "view_detail_drawer",
    actorRole: actorRole === "service" ? "service" : actorRole === "admin" ? "admin" : actorRole === "labs_participant" ? "labs_participant" : "public",
    environment,
    explicitPromotionRecordApproved: false,
    featureEnabled: projectRecommendationFeatureEnabled,
    publicSurfaceEnabled: false,
    targetReviewed: true,
  });
  const recommendationRows = buildMoralPublicGoodsRecommendationDevSeedData({
    environment,
  });
  const recommendationViewsByProjectId = Object.fromEntries(
    MORAL_PUBLIC_GOODS_LABS_POOL.projects.map((project) => [
      project.id,
      projectRecommendationCapability.allowed
        ? buildProjectRecommendationPublicView({
            recommendations: recommendationRows,
            target: {
              blocked: false,
              reviewed: project.reviewState === "Reviewed",
              targetId: project.id,
              targetType: "project",
            },
          })
        : null,
    ]),
  );

  const refundBonusViewCapability = evaluateRefundBonusCapability({
    action: "view_labs_pool",
    actorRole: actorRole as RefundBonusActorRole,
    environment: environment as RefundBonusEnvironment,
    featureEnabled: refundBonusFeatureEnabled,
  });
  const atLeastTierViewCapability = evaluateAtLeastTierPlatformMatchCapability({
    action: "view_labs_landing",
    actorRole: actorRole as AtLeastTierPlatformMatchActorRole,
    environment: environment as AtLeastTierPlatformMatchEnvironment,
    featureEnabled: atLeastTierFeatureEnabled,
  });
  const access = evaluateMoralPublicGoodsLabsAccess({
    actorRole,
    atLeastTierFeatureEnabled,
    atLeastTierViewAllowed: atLeastTierViewCapability.allowed,
    environment,
    refundBonusFeatureEnabled,
    refundBonusViewAllowed: refundBonusViewCapability.allowed,
  });

  const refundBonusCommitmentCapability = evaluateRefundBonusCapability({
    action: "create_hard_pledge",
    actorRole: actorRole as RefundBonusActorRole,
    environment: environment as RefundBonusEnvironment,
    featureEnabled: refundBonusFeatureEnabled,
    liveMoneyEnabled: refundBonusLiveMoneyEnabled,
    promotionRecordApproved: false,
    openGatePassed: false,
    bonusReserveBacked: MORAL_PUBLIC_GOODS_LABS_POOL.reserveBacked,
    legalComplianceApproved: false,
    paymentProviderReady: false,
    bonusPayoutProviderReady: false,
    identitySybilControlsReady: false,
    copyPreflightPassed: false,
    copyPreflightFresh: false,
    bonusExposureCapConfigured: false,
    emergencyPauseConfigured: false,
    auditReportingTemplatesReviewed: false,
    staleActiveLabelsAbsent: true,
  });
  const atLeastTierCommitmentCapability = evaluateAtLeastTierPlatformMatchCapability({
    action: "create_commitment",
    actorRole: actorRole as AtLeastTierPlatformMatchActorRole,
    environment: environment as AtLeastTierPlatformMatchEnvironment,
    featureEnabled: atLeastTierFeatureEnabled,
    liveMoneyEnabled: atLeastTierLiveMoneyEnabled,
    promotionRecordApproved: false,
    platformMatchReserveExists: true,
    platformMatchReserveBacked: MORAL_PUBLIC_GOODS_LABS_POOL.reserveBacked,
    rewardScheduleFrozen: true,
    rewardScheduleValid: true,
    copyPreflightPassed: false,
    copyPreflightFresh: false,
    paymentProviderReady: false,
    legalComplianceApproved: false,
    sybilControlsReady: false,
    reserveExposureCapConfigured: false,
    emergencyPauseConfigured: false,
    auditReportingTemplatesReviewed: false,
    prohibitedPublicCopyAbsent: true,
  });

  if (!access.canRenderInteractiveUi) {
    return (
      <LabsUnavailablePage
        reasons={[
          ...access.reasonCodes,
          ...refundBonusViewCapability.reasons,
          ...atLeastTierViewCapability.reasons,
        ]}
      />
    );
  }

  return (
    <div className={styles.pageShell} data-mt-surface="mpgf-labs">
      <SiteTopbar brandHref="/" links={[...labsTopbarLinks]} showSearch={false} />
      <MoralPublicGoodsLabsClient
        actorRole={actorRole}
        atLeastTierGateReasons={atLeastTierCommitmentCapability.reasons}
        environment={environment}
        pool={MORAL_PUBLIC_GOODS_LABS_POOL}
        projectRecommendationGateReasons={projectRecommendationCapability.reasons}
        projectRecommendationViewsByProjectId={recommendationViewsByProjectId}
        refundBonusGateReasons={refundBonusCommitmentCapability.reasons}
        simulationOnly={
          !refundBonusCommitmentCapability.allowed ||
          !atLeastTierCommitmentCapability.allowed ||
          !refundBonusLiveMoneyEnabled ||
          !atLeastTierLiveMoneyEnabled
        }
      />
      <SimpleLabsFooter />
    </div>
  );
}

import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import {
  combinedEffectiveLifeYears,
  formatPublicReceiptImpact,
  formatPublicReceiptMoney,
  getPublicDonationRedirectReceipt,
  type PublicDonationRedirectParty,
} from "@/lib/payments/public-donation-redirect-receipt";

export const alt = "Moral Trade Donation Redirect public receipt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 0;

interface OpenGraphImageProps {
  params: Promise<{ receiptId: string }>;
}

function impactLabel(party: PublicDonationRedirectParty, claimIsCurrent: boolean) {
  if (party.impact.effectiveLifeYears === null) return "Effective life-year estimate unavailable";
  const estimate = `≈${formatPublicReceiptImpact(party.impact.effectiveLifeYears)} effective life-years saved`;
  return claimIsCurrent ? estimate : `Original model: ${estimate}`;
}

function PublicRouteCard({
  label,
  party,
  claimIsCurrent,
}: {
  claimIsCurrent: boolean;
  label: string;
  party: PublicDonationRedirectParty;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid #d9dfda",
        borderRadius: 18,
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 228,
        padding: "24px 28px",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <span
          style={{
            color: "#657069",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <strong style={{ fontSize: 22 }}>{formatPublicReceiptMoney(party.amountCents)}</strong>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          padding: "14px 0",
        }}
      >
        <strong style={{ fontSize: 29, letterSpacing: "-0.025em", lineHeight: 1.08 }}>
          {party.charityName}
        </strong>
      </div>
      <div
        style={{
          borderTop: "1px solid #e1e5e2",
          color: "#29362d",
          display: "flex",
          flexDirection: "column",
          fontSize: 17,
          lineHeight: 1.25,
          paddingTop: 14,
        }}
      >
        <strong>
          {party.impact.primaryOutput
            ? claimIsCurrent
              ? party.impact.primaryOutput
              : `Original model: ${party.impact.primaryOutput}`
            : "Concrete outcome estimate unavailable"}
        </strong>
        <span style={{ color: "#657069", marginTop: 6 }}>
          {impactLabel(party, claimIsCurrent)}
        </span>
      </div>
    </div>
  );
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { receiptId } = await params;
  const receipt = await getPublicDonationRedirectReceipt(receiptId);
  if (!receipt) notFound();

  const combined = combinedEffectiveLifeYears(receipt);
  const isCompleted = receipt.status === "completed";
  const statusLabel = isCompleted
    ? "Completed"
    : receipt.status === "reversed"
      ? "Reversed"
      : "Disputed";
  const statusColor = isCompleted
    ? { background: "#e7f5ec", border: "#5a9b70", text: "#126637" }
    : receipt.status === "reversed"
      ? { background: "#fff3df", border: "#bd7b2d", text: "#7b4304" }
      : { background: "#ffedef", border: "#bd555d", text: "#8b252d" };
  const headline = isCompleted
    ? `${formatPublicReceiptMoney(receipt.totalAmountCents)} redirected to measurable gains.`
    : receipt.status === "reversed"
      ? "This Donation Redirect was reversed."
      : "This Donation Redirect is disputed.";

  return new ImageResponse(
    <div
      style={{
        background: "#f8faf8",
        color: "#141714",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        padding: "44px 54px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#5c6860",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Moral Trade · Donation Redirect
          </span>
          <strong
            style={{
              fontSize: 50,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
              marginTop: 10,
              maxWidth: 860,
            }}
          >
            {headline}
          </strong>
        </div>
        <span
          style={{
            background: statusColor.background,
            border: `1px solid ${statusColor.border}`,
            borderRadius: 999,
            color: statusColor.text,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.08em",
            padding: "10px 16px",
            textTransform: "uppercase",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
        <PublicRouteCard claimIsCurrent={isCompleted} label="Party A" party={receipt.owner} />
        <PublicRouteCard
          claimIsCurrent={isCompleted}
          label="Party B"
          party={receipt.counterparty}
        />
      </div>

      <div
        style={{
          alignItems: "center",
          background: isCompleted ? "#e7f4eb" : "#f2f2ef",
          border: `1px solid ${isCompleted ? "#79a88a" : "#c9ceca"}`,
          borderRadius: 15,
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
          padding: "15px 22px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#536158",
              fontSize: 12,
              fontWeight: 750,
              letterSpacing: "0.11em",
              textTransform: "uppercase",
            }}
          >
            {combined === null
              ? "Separate frozen outcome models"
              : isCompleted
                ? "Combined modeled impact"
                : "Original frozen model · not current impact"}
          </span>
          <strong style={{ fontSize: 25, letterSpacing: "-0.02em", marginTop: 3 }}>
            {combined === null
              ? "Impacts shown separately — not added"
              : `≈+${formatPublicReceiptImpact(combined)} effective life-years saved`}
          </strong>
        </div>
        <span style={{ color: "#59655d", fontSize: 14 }}>
          Identities and original destinations withheld
        </span>
      </div>
    </div>,
    size,
  );
}

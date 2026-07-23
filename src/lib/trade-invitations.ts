import { createHash, randomBytes } from "node:crypto";

import {
  BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
  decryptBackgroundSensitiveText,
  encryptBackgroundSensitiveText,
} from "@/lib/background-field-encryption";

export const TRADE_INVITATION_TTL_DAYS = 14;
export const TRADE_INVITATION_USABLE_STATUSES = new Set(["drafted", "sent", "opened"]);

export interface TradeInvitationPreview {
  invitationId: string;
  status: string;
  deliveryKind: "email" | "share_link";
  message: string;
  expiresAt: string;
  openedAt: string | null;
  senderDisplayName: string;
  threadId: string | null;
  offer: {
    id: string;
    offeredCause: string;
    requestedCause: string;
    offerAction: string;
    requestAction: string;
    verification: string;
    duration: string;
    noTradeBaseline: string;
    startDate: string | null;
    exitConditions: string;
    maximumBurden: string;
    privacyScope: string;
    evidenceDueDate: string | null;
    termsVersion: number;
  };
}

export function createTradeInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashTradeInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tradeInvitationTokenFieldKey(invitationId: string) {
  return `trade-invitation:${invitationId}:token`;
}

export function encryptTradeInvitationToken(token: string, invitationId: string) {
  return encryptBackgroundSensitiveText(token, tradeInvitationTokenFieldKey(invitationId));
}

export function decryptTradeInvitationToken(
  ciphertext: string | null | undefined,
  invitationId: string,
) {
  const token = decryptBackgroundSensitiveText(
    ciphertext,
    tradeInvitationTokenFieldKey(invitationId),
  );
  return token === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE ? "" : token;
}

export function isTradeInvitationUsable(status: string) {
  return TRADE_INVITATION_USABLE_STATUSES.has(status);
}

export function isTradeInvitationBearerPath(pathname: string) {
  return /^\/invitations\/[^/]+(?:\/|$)/.test(pathname);
}

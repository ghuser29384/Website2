"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  enrollBackgroundNetworkingMfaAction,
  removeBackgroundNetworkingMfaAction,
  revokeOtherBackgroundNetworkingSessionsAction,
  verifyBackgroundNetworkingMfaAction,
} from "@/app/background-networking/actions";
import {
  type BackgroundAccountSecuritySummary,
  type BackgroundMfaActionState,
} from "@/lib/background-account-security";

interface BackgroundAccountSecurityPanelProps {
  initialSummary: BackgroundAccountSecuritySummary | null;
}

const INITIAL_MFA_ACTION_STATE: BackgroundMfaActionState = {
  status: "idle",
};

const TOTP_CODE_PATTERN = "[0-9\\s\\-]{6,8}";

function ActionMessage({ state }: { state: BackgroundMfaActionState }) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <p className={state.status === "error" ? "route-text text-danger" : "route-text"}>
      {state.error ?? state.message}
    </p>
  );
}

function formatSessionDuration(seconds: number | null | undefined) {
  if (typeof seconds !== "number") {
    return "unknown";
  }

  const absoluteSeconds = Math.abs(seconds);
  const minutes = Math.max(1, Math.round(absoluteSeconds / 60));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  return `${hours}h`;
}

export function BackgroundAccountSecurityPanel({
  initialSummary,
}: BackgroundAccountSecurityPanelProps) {
  const router = useRouter();
  const [enrollState, enrollAction, isEnrollPending] = useActionState(
    enrollBackgroundNetworkingMfaAction,
    INITIAL_MFA_ACTION_STATE,
  );
  const [verifyState, verifyAction, isVerifyPending] = useActionState(
    verifyBackgroundNetworkingMfaAction,
    INITIAL_MFA_ACTION_STATE,
  );
  const [removeState, removeAction, isRemovePending] = useActionState(
    removeBackgroundNetworkingMfaAction,
    INITIAL_MFA_ACTION_STATE,
  );
  const verifiedFactors =
    initialSummary?.factors.filter(
      (factor) => factor.factorType === "totp" && factor.status === "verified",
    ) ?? [];
  const unverifiedFactors =
    initialSummary?.factors.filter(
      (factor) => factor.factorType === "totp" && factor.status !== "verified",
    ) ?? [];
  const setupFactorId = enrollState.factorId ?? unverifiedFactors[0]?.id ?? "";

  useEffect(() => {
    if (verifyState.status === "verified" || removeState.status === "removed") {
      router.refresh();
    }
  }, [removeState.status, router, verifyState.status]);

  return (
    <article className="panel data-card" id="account-security">
      <p className="detail-kicker">Account security</p>
      <h3>Authenticator MFA for private wish data</h3>
      <dl className="values-summary compact-summary">
        <div>
          <dt>Status</dt>
          <dd>{initialSummary?.statusLabel ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Verified factors</dt>
          <dd>{initialSummary?.verifiedTotpCount ?? 0}</dd>
        </div>
        <div>
          <dt>Session level</dt>
          <dd>{initialSummary?.currentLevel ?? "unknown"}</dd>
        </div>
      </dl>

      {initialSummary?.error ? <p className="route-text">{initialSummary.error}</p> : null}

      <div className="mini-list">
        <div className="mini-list-item">
          <strong>Current session</strong>
          <span>Session suffix: {initialSummary?.session.sessionIdSuffix ?? "unknown"}</span>
          <span>AAL: {initialSummary?.session.currentAal ?? initialSummary?.currentLevel ?? "unknown"}</span>
          <span>
            Token window:{" "}
            {formatSessionDuration(initialSummary?.session.accessTokenLifetimeSeconds)} ·{" "}
            {initialSummary?.session.accessTokenWindowStatus ?? "unknown"}
          </span>
          <span>
            Expires in: {formatSessionDuration(initialSummary?.session.accessTokenExpiresInSeconds)}
          </span>
          <span>{initialSummary?.session.reviewLabel ?? "Session review unavailable."}</span>
        </div>
      </div>

      <form action={revokeOtherBackgroundNetworkingSessionsAction} className="compact-form">
        <input name="return_to" type="hidden" value="/dashboard" />
        <button className="button button-secondary button-mini" type="submit">
          Revoke other sessions
        </button>
      </form>

      {verifiedFactors.length ? (
        <form action={verifyAction} className="compact-form">
          <input name="return_to" type="hidden" value="/dashboard" />
          <div className="field-grid">
            <label className="field">
              <span>Factor</span>
              <select name="factor_id" defaultValue={verifiedFactors[0]?.id}>
                {verifiedFactors.map((factor) => (
                  <option key={factor.id} value={factor.id}>
                    {factor.friendlyName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={8}
                name="code"
                pattern={TOTP_CODE_PATTERN}
                placeholder="123456"
              />
            </label>
          </div>
          <button className="button button-secondary button-mini" disabled={isVerifyPending} type="submit">
            Verify session
          </button>
        </form>
      ) : null}

      <form action={enrollAction} className="compact-form">
        <input name="return_to" type="hidden" value="/dashboard" />
        <label className="field">
          <span>Factor name</span>
          <input name="friendly_name" placeholder="Authenticator app" />
        </label>
        <button className="button button-secondary button-mini" disabled={isEnrollPending} type="submit">
          Create MFA setup
        </button>
      </form>
      <ActionMessage state={enrollState} />

      {enrollState.status === "enrolled" && enrollState.qrCode && setupFactorId ? (
        <form action={verifyAction} className="compact-form">
          <input name="return_to" type="hidden" value="/dashboard" />
          <input name="factor_id" type="hidden" value={setupFactorId} />
          <div className="mini-list">
            <div className="mini-list-item">
              <strong>Pending setup</strong>
              <Image
                alt="Authenticator app setup QR code"
                height={168}
                src={enrollState.qrCode}
                unoptimized
                width={168}
              />
              {enrollState.secret ? <code>{enrollState.secret}</code> : null}
            </div>
          </div>
          <label className="field">
            <span>Code</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={8}
              name="code"
              pattern={TOTP_CODE_PATTERN}
              placeholder="123456"
            />
          </label>
          <button className="button button-primary button-mini" disabled={isVerifyPending} type="submit">
            Verify MFA setup
          </button>
        </form>
      ) : null}
      <ActionMessage state={verifyState} />

      {initialSummary?.factors.length ? (
        <div className="mini-list">
          {initialSummary.factors.map((factor) => (
            <form action={removeAction} className="mini-list-item" key={factor.id}>
              <input name="return_to" type="hidden" value="/dashboard" />
              <input name="factor_id" type="hidden" value={factor.id} />
              <strong>
                {factor.friendlyName} · {factor.status}
              </strong>
              <span>
                {factor.factorType} · added{" "}
                {factor.createdAt ? new Date(factor.createdAt).toLocaleDateString() : "recently"}
              </span>
              <button
                className="button button-secondary button-mini"
                disabled={isRemovePending}
                type="submit"
              >
                Remove factor
              </button>
            </form>
          ))}
        </div>
      ) : null}
      <ActionMessage state={removeState} />
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getFormMessage } from "@/lib/form-state";
import { stableWitnessHash } from "@/lib/moral-trade/guest-witness-testimony";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guest witness testimony",
  robots: {
    index: false,
    follow: false,
  },
};

interface GuestWitnessPageProps {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type InviteRow = Database["public"]["Tables"]["baseline_witness_invites"]["Row"];
type OfferRow = Pick<
  Database["public"]["Tables"]["offers"]["Row"],
  "duration" | "id" | "offer_action" | "owner_alias" | "request_action"
>;
type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "id">;

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "Date unavailable" : new Date(timestamp).toLocaleString();
}

async function loadInvite(token: string) {
  const checkedAt = new Date().toISOString();

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      checkedAt,
      invite: null,
      offer: null,
      participant: null,
      unavailableReason: "Guest witness testimony is unavailable until persistence is configured.",
    };
  }

  const service = createServiceClient();
  const inviteResult = await service
    .from("baseline_witness_invites")
    .select("*")
    .eq("invite_token_hash", stableWitnessHash(token, "baseline-witness-invite-token"))
    .maybeSingle();

  if (inviteResult.error || !inviteResult.data) {
    return {
      checkedAt,
      invite: null,
      offer: null,
      participant: null,
      unavailableReason: "This witness invite is unavailable.",
    };
  }

  const invite = inviteResult.data as InviteRow;
  if (invite.invite_status === "pending") {
    await service
      .from("baseline_witness_invites")
      .update({ invite_status: "opened", updated_at: new Date().toISOString() })
      .eq("id", invite.id);
    await service.from("baseline_witness_audit_events").insert({
      actor_kind: "witness",
      event_payload_redacted: { privateFieldsSuppressed: true },
      event_type: "invite_opened",
      invite_id: invite.id,
      redacted_summary: "Guest witness opened a baseline testimony invite.",
    });
    invite.invite_status = "opened";
  }

  const [offerResult, participantResult] = await Promise.all([
    invite.purchase_envelope_type === "offer" && invite.purchase_envelope_id
      ? service
          .from("offers")
          .select("id, owner_alias, offer_action, request_action, duration")
          .eq("id", invite.purchase_envelope_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    service
      .from("profiles")
      .select("id, display_name")
      .eq("id", invite.participant_user_id)
      .maybeSingle(),
  ]);

  return {
    checkedAt,
    invite,
    offer: (offerResult.data as OfferRow | null) ?? null,
    participant: (participantResult.data as ProfileRow | null) ?? null,
    unavailableReason: null,
  };
}

export default async function GuestWitnessPage({ params, searchParams }: GuestWitnessPageProps) {
  const { inviteToken } = await params;
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const { checkedAt, invite, offer, participant, unavailableReason } = await loadInvite(inviteToken);
  const participantLabel = participant?.display_name || offer?.owner_alias || "the participant";
  const returnTo = `/guest-witness/${encodeURIComponent(inviteToken)}`;
  const inviteSubmittable =
    invite &&
    ["pending", "opened"].includes(invite.invite_status) &&
    Date.parse(invite.expires_at) > Date.parse(checkedAt);

  return (
    <div className="page-shell">
      <header className="hero compact-hero">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Guest witness</p>
            <h1>Private baseline testimony.</h1>
            <p className="hero-text">
              {participantLabel} asked you to tell reviewer operations what you know about their
              ordinary baseline before a pledge starts.
            </p>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Privacy boundary</p>
            <p className="route-text">
              Testimony is private by default. Social-account verification is optional identity
              assurance only; Moral Trade does not request posting permission or inspect posts, DMs,
              followers, photos, likes, or private social data.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        {unavailableReason || !inviteSubmittable ? (
          <section className="section section-white">
            <div className="empty-state">
              <div>
                <strong>Invite unavailable.</strong>
                <p>
                  {unavailableReason ??
                    "This invite has already been submitted, declined, reported, revoked, blocked, or expired."}
                </p>
              </div>
              <Link className="button button-secondary" href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : (
          <section className="section section-white">
            <div className="section-head">
              <p className="eyebrow">Baseline only</p>
              <h2>What reviewers need</h2>
              <p>
                This statement is about what you directly know from before the action window. It is
                not completion proof and it does not become public social testimony.
              </p>
            </div>

            <div className="data-grid">
              <article className="panel data-card">
                <p className="detail-kicker">Participant request</p>
                <h3>{participantLabel}</h3>
                {offer ? (
                  <>
                    <p className="route-text">
                      <strong>Proposed action:</strong> {offer.offer_action}
                    </p>
                    <p className="route-text">
                      <strong>Requested counterpart action:</strong> {offer.request_action}
                    </p>
                    <p className="route-text">
                      <strong>Duration:</strong> {offer.duration}
                    </p>
                  </>
                ) : null}
                <p className="route-text">
                  <strong>Action window:</strong> {formatDateTime(invite.action_window_start_at)} to{" "}
                  {formatDateTime(invite.action_window_end_at)}
                </p>
                <p className="route-text">
                  <strong>Invite expires:</strong> {formatDateTime(invite.expires_at)}
                </p>
              </article>

              <article className="panel data-card">
                <p className="detail-kicker">Submit private testimony</p>
                <form action="/api/moral-trade/guest-witness/testimonials" className="stack-form" method="post">
                  <input name="invite_token" type="hidden" value={inviteToken} />
                  <input name="return_to" type="hidden" value={returnTo} />
                  <div className="field-grid">
                    <label className="field">
                      <span>Your email</span>
                      <input name="witness_email" required type="email" />
                    </label>
                    <label className="field">
                      <span>Identity verification</span>
                      <select defaultValue="email_magic_link" name="provider">
                        <option value="email_magic_link">Email magic link</option>
                        <option value="google">Google account</option>
                        <option value="apple">Apple account</option>
                        <option value="x">X account</option>
                        <option value="facebook">Facebook account</option>
                        <option value="instagram">Instagram account</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Provider account id</span>
                      <input name="provider_account_id" placeholder="Optional unless using a social provider" />
                    </label>
                    <label className="field">
                      <span>Relationship</span>
                      <select defaultValue={invite.participant_claimed_relationship ?? "other"} name="relationship_type">
                        <option value="dining_companion">Dining companion</option>
                        <option value="roommate">Roommate</option>
                        <option value="friend">Friend</option>
                        <option value="family">Family</option>
                        <option value="romantic_partner">Romantic partner</option>
                        <option value="classmate">Classmate</option>
                        <option value="coworker">Coworker</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Direct knowledge</span>
                      <select defaultValue="moderate" name="baseline_knowledge_level">
                        <option value="high">High</option>
                        <option value="moderate">Moderate</option>
                        <option value="low">Low</option>
                        <option value="none">None</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Recent meal observation</span>
                      <select defaultValue="few_times" name="recent_meal_observation_frequency">
                        <option value="lived_together">Lived together</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="few_times">A few times</option>
                        <option value="once">Once</option>
                        <option value="never">Never</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Baseline credence</span>
                      <input
                        defaultValue="0.5"
                        max="1"
                        min="0"
                        name="baseline_counterfactual_credence_decimal"
                        required
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label className="field">
                      <span>Concern flag</span>
                      <select defaultValue="none" name="concern_flag">
                        <option value="none">None</option>
                        <option value="possible_baseline_overstatement">Possible baseline overstatement</option>
                        <option value="possible_pressure">Possible pressure</option>
                        <option value="possible_side_payment">Possible side payment</option>
                        <option value="insufficient_knowledge">Insufficient knowledge</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Basis</span>
                    <textarea
                      name="basis_text"
                      placeholder="What did you directly observe before the pledge window?"
                      required
                      rows={5}
                    />
                  </label>
                  <label className="field">
                    <span>Uncertainty notes</span>
                    <textarea name="uncertainty_notes_private" rows={3} />
                  </label>
                  <label className="field">
                    <span>Private concern notes</span>
                    <textarea name="concern_notes_private" rows={3} />
                  </label>
                  <label className="radio-row">
                    <input name="accuracy_affirmed" required type="checkbox" />
                    <span>I affirm this is accurate to the best of my knowledge.</span>
                  </label>
                  <button className="button button-primary" type="submit">
                    Submit testimony
                  </button>
                </form>
              </article>

              <article className="panel data-card">
                <p className="detail-kicker">Private alternatives</p>
                <form action="/api/moral-trade/guest-witness/testimonials" className="compact-form" method="post">
                  <input name="invite_token" type="hidden" value={inviteToken} />
                  <input name="return_to" type="hidden" value={returnTo} />
                  <input name="intent" type="hidden" value="decline" />
                  <label className="field">
                    <span>Decline notes</span>
                    <textarea name="decline_notes" rows={3} />
                  </label>
                  <button className="button button-secondary button-mini" type="submit">
                    Decline invite
                  </button>
                </form>

                <form action="/api/moral-trade/guest-witness/testimonials" className="compact-form" method="post">
                  <input name="invite_token" type="hidden" value={inviteToken} />
                  <input name="return_to" type="hidden" value={returnTo} />
                  <input name="intent" type="hidden" value="report_pressure" />
                  <label className="field">
                    <span>Pressure report</span>
                    <textarea name="pressure_notes" rows={3} />
                  </label>
                  <button className="button button-secondary button-mini" type="submit">
                    Send pressure report
                  </button>
                </form>
              </article>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

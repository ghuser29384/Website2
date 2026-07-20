import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { SectionHeader } from "@/components/ui/page-primitives";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Friend testimonial",
  robots: {
    index: false,
    follow: false,
  },
};

interface FriendTestimonialPageProps {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEMO_ACTION_WINDOW_START = "2026-07-01T00:00:00.000Z";
const DEMO_ACTION_WINDOW_END = "2026-07-03T00:00:00.000Z";

function firstString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return <LocalDateTime value={value} fallback="Time supplied in invite" />;
}

function hiddenInviteFields(input: {
  actionTemplateId: string;
  actionType: string;
  actionWindowEndAt: string;
  actionWindowStartAt: string;
  inviteToken: string;
  participantContext: string;
  participantUserId: string;
  pledgeSwapId: string;
}) {
  return (
    <>
      <input name="action_template_id" type="hidden" value={input.actionTemplateId} />
      <input name="action_type" type="hidden" value={input.actionType} />
      <input name="action_window_end_at" type="hidden" value={input.actionWindowEndAt} />
      <input name="action_window_start_at" type="hidden" value={input.actionWindowStartAt} />
      <input name="invite_status" type="hidden" value="pending" />
      <input name="invite_token" type="hidden" value={input.inviteToken} />
      <input name="participant_context" type="hidden" value={input.participantContext} />
      <input name="participant_user_id" type="hidden" value={input.participantUserId} />
      <input name="pledge_swap_id" type="hidden" value={input.pledgeSwapId} />
    </>
  );
}

export default async function FriendTestimonialPage({
  params,
  searchParams,
}: FriendTestimonialPageProps) {
  const { inviteToken } = await params;
  const resolvedSearchParams = await searchParams;
  const actionType =
    firstString(resolvedSearchParams.action_type) ??
    firstString(resolvedSearchParams.actionType) ??
    "avoid meat or fish";
  const actionWindowStartAt =
    firstString(resolvedSearchParams.action_window_start_at) ??
    firstString(resolvedSearchParams.actionWindowStartAt) ??
    DEMO_ACTION_WINDOW_START;
  const actionWindowEndAt =
    firstString(resolvedSearchParams.action_window_end_at) ??
    firstString(resolvedSearchParams.actionWindowEndAt) ??
    DEMO_ACTION_WINDOW_END;
  const participantContext =
    firstString(resolvedSearchParams.participant_context) ??
    "The participant asked for a private testimonial about this pledge.";
  const participantUserId =
    firstString(resolvedSearchParams.participant_user_id) ?? "participant-preview";
  const pledgeSwapId = firstString(resolvedSearchParams.pledge_swap_id) ?? "pledge-swap-preview";
  const actionTemplateId =
    firstString(resolvedSearchParams.action_template_id) ?? "action-template:pledge-swap";
  const inviteFields = {
    actionTemplateId,
    actionType,
    actionWindowEndAt,
    actionWindowStartAt,
    inviteToken,
    participantContext,
    participantUserId,
    pledgeSwapId,
  };

  return (
    <div className="page-shell">
      <header className="hero compact-hero">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Friend testimonial</p>
            <h1>Private pledge-swap testimony.</h1>
            <p className="hero-text">
              Tell reviewers what you know about the participant&apos;s ordinary diet and whether
              you think they completed this action. Do not guess beyond what you know.
            </p>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Private evidence</p>
            <p className="route-text">
              Your raw testimony, identity, relationship details, concern notes, and safety reports
              are not shown to funders or public reports. The participant may see only a
              non-sensitive summary if this affects verification or participant credibility.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="testimonial-scope-heading">
          <SectionHeader
            eyebrow="Invite scope"
            id="testimonial-scope-heading"
            title="Review the action and time window."
          >
            The invite discloses only the action type, action window, participant context, and
            request for a testimonial.
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Action</p>
              <h3>{actionType}</h3>
              <p className="route-text">
                <strong>Window:</strong> {formatDateTime(actionWindowStartAt)} to{" "}
                {formatDateTime(actionWindowEndAt)}
              </p>
              <p className="route-text">{participantContext}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Not disclosed</p>
              <ul className="clean-list">
                <li>Funder identities or payout details</li>
                <li>Private baseline answers or other evidence</li>
                <li>Risk flags, reviewer notes, or exact scoring rules</li>
              </ul>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Current stake policy</p>
              <p className="route-text">
                No monetary stake is required for supportive, uncertain, contradictory, or concern
                testimony. A future frozen policy may allow an optional capped charitable stake, but
                it is not conclusive proof.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="testimonial-form-heading">
          <SectionHeader
            eyebrow="Private submission"
            id="testimonial-form-heading"
            title="Separate baseline and completion credence."
          >
            Reviewers use this as one evidence source alongside declarations, check-ins, receipts,
            and other records.
          </SectionHeader>
          <div className="data-grid">
            <form
              action="/api/moral-trade/participant-credibility/enforce"
              className="panel data-card stack-form"
              method="post"
            >
              <input name="operation" type="hidden" value="submit_friend_testimonial" />
              {hiddenInviteFields(inviteFields)}
              <label className="field">
                <span>Your Moral Trade user id</span>
                <input name="friend_user_id" required />
              </label>
              <label className="field">
                <span>Relationship</span>
                <select defaultValue="friend" name="relationship_type">
                  <option value="friend">Friend</option>
                  <option value="family">Family member</option>
                  <option value="roommate">Roommate</option>
                  <option value="romantic_partner">Romantic partner</option>
                  <option value="classmate">Classmate</option>
                  <option value="coworker">Coworker</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>Private relationship context</span>
                <textarea name="relationship_context_private" rows={3} />
              </label>

              <label className="field">
                <span>Ordinary diet knowledge</span>
                <select defaultValue="moderate" name="baseline_knowledge_level">
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="field">
                <span>Baseline/additionality credence</span>
                <select defaultValue="0.8" name="baseline_counterfactual_credence_decimal">
                  <option value="">No estimate</option>
                  <option value="0.25">25%</option>
                  <option value="0.5">50%</option>
                  <option value="0.65">65%</option>
                  <option value="0.8">80%</option>
                  <option value="0.9">90%</option>
                  <option value="0.99">99%</option>
                </select>
              </label>
              <fieldset className="field">
                <legend>Baseline basis</legend>
                <label>
                  <input name="baseline_basis_json" type="checkbox" value="I have eaten with them often." />{" "}
                  I have eaten with them often.
                </label>
                <label>
                  <input name="baseline_basis_json" type="checkbox" value="I know their ordinary food habits." />{" "}
                  I know their ordinary food habits.
                </label>
                <label>
                  <input
                    name="baseline_basis_json"
                    type="checkbox"
                    value="I saw their meal plans or shopping habits before the pledge."
                  />{" "}
                  I saw their meal plans or shopping habits before the pledge.
                </label>
                <label>
                  <input name="baseline_basis_json" type="checkbox" value="I only have weak contextual knowledge." />{" "}
                  I only have weak contextual knowledge.
                </label>
              </fieldset>

              <label className="field">
                <span>Action-window knowledge</span>
                <select defaultValue="moderate" name="completion_knowledge_level">
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="field">
                <span>Completion credence</span>
                <select defaultValue="0.85" name="completion_credence_decimal">
                  <option value="">No estimate</option>
                  <option value="0.25">25%</option>
                  <option value="0.5">50%</option>
                  <option value="0.65">65%</option>
                  <option value="0.85">85%</option>
                  <option value="0.9">90%</option>
                  <option value="0.99">99%</option>
                </select>
              </label>
              <fieldset className="field">
                <legend>Completion basis</legend>
                <label>
                  <input name="completion_basis_json" type="checkbox" value="I ate with them during the action window." />{" "}
                  I ate with them during the action window.
                </label>
                <label>
                  <input name="completion_basis_json" type="checkbox" value="I saw some of their meals." />{" "}
                  I saw some of their meals.
                </label>
                <label>
                  <input name="completion_basis_json" type="checkbox" value="I communicated with them during the action window." />{" "}
                  I communicated with them during the action window.
                </label>
                <label>
                  <input
                    name="completion_basis_json"
                    type="checkbox"
                    value="I saw receipts/photos/messages relevant to the action."
                  />{" "}
                  I saw receipts, photos, or messages relevant to the action.
                </label>
                <label>
                  <input name="completion_basis_json" type="checkbox" value="I only have weak secondhand knowledge." />{" "}
                  I only have weak secondhand knowledge.
                </label>
              </fieldset>

              <label className="field">
                <span>Concern</span>
                <select defaultValue="none" name="concern_flag">
                  <option value="none">None</option>
                  <option value="possible_noncompletion">Possible noncompletion</option>
                  <option value="possible_baseline_manipulation">Possible baseline manipulation</option>
                  <option value="possible_pressure">Possible pressure</option>
                  <option value="possible_side_payment">Possible side payment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>Private concern notes</span>
                <textarea name="concern_notes_private" rows={4} />
              </label>
              <label className="field">
                <span>Private testimony</span>
                <textarea name="testimony_text_private" rows={5} />
              </label>
              <label className="checkbox-row">
                <input name="friend_terms_acceptance_id" required type="checkbox" value="terms:friend-testimonial:v1" />
                <span>
                  I understand this testimonial may affect participant credibility. I should not
                  guess beyond what I know. False or reckless testimony can reduce my own
                  testimonial credibility.
                </span>
              </label>
              <button className="button button-primary" type="submit">
                Submit private testimonial
              </button>
            </form>

            <article className="panel data-card">
              <p className="detail-kicker">Decline or report</p>
              <p className="route-text">
                You can decline without penalty. Private refusal reasons, coercion reports, and
                off-platform side-payment concerns are not shown raw to the participant.
              </p>
              <form
                action="/api/moral-trade/participant-credibility/enforce"
                className="stack-form"
                method="post"
              >
                <input name="operation" type="hidden" value="decline_friend_testimonial" />
                {hiddenInviteFields(inviteFields)}
                <input name="friend_user_id" type="hidden" value="friend-decline-preview" />
                <button className="button button-secondary" type="submit">
                  Decline privately
                </button>
              </form>
              <form
                action="/api/moral-trade/participant-credibility/enforce"
                className="stack-form"
                method="post"
              >
                <input name="operation" type="hidden" value="submit_friend_testimonial" />
                {hiddenInviteFields(inviteFields)}
                <input name="completion_credence_decimal" type="hidden" value="0.3" />
                <input name="completion_knowledge_level" type="hidden" value="low" />
                <input name="baseline_knowledge_level" type="hidden" value="low" />
                <input name="concern_flag" type="hidden" value="possible_pressure" />
                <input name="friend_terms_acceptance_id" type="hidden" value="terms:friend-testimonial:v1" />
                <label className="field">
                  <span>Your Moral Trade user id</span>
                  <input name="friend_user_id" required />
                </label>
                <label className="field">
                  <span>Private pressure or safety report</span>
                  <textarea name="concern_notes_private" rows={4} />
                </label>
                <button className="button button-secondary" type="submit">
                  Send private concern
                </button>
              </form>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="testimonial-review-heading">
          <SectionHeader
            eyebrow="Reviewer use"
            id="testimonial-review-heading"
            title="One private source, capped by policy."
          >
            Reviewer operations see relationship, knowledge basis, testimonial credibility,
            consistency, collusion risk, and proposed weight. High-stakes, conflicted,
            contradictory, or anomalous testimony requires review before it affects verification,
            additionality, or participant credibility.
          </SectionHeader>
          <div className="protocol-review-panel protocol-review-panel-needs_human_review">
            <div className="protocol-review-head">
              <div>
                <p className="eyebrow">Policy trace</p>
                <h3>Material effects create a PolicyEvaluationTrace.</h3>
                <p>
                  Fixed post-action consideration is not reduced by post-hoc credibility changes;
                  corrections move through append-only appeal or correction events.
                </p>
              </div>
              <span className="protocol-review-status">capped</span>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

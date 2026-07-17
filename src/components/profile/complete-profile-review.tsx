"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

import { completeWalkthroughProfileAction } from "@/app/complete-profile/actions";
import {
  COMPLETE_PROFILE_CONTACT_RULES,
  COMPLETE_PROFILE_MAX_COMMITMENTS,
  COMPLETE_PROFILE_MONTHLY_TIMES,
  type CompleteProfileContactRule,
  type CompleteProfileMaxCommitment,
  type CompleteProfileMonthlyTime,
} from "@/lib/complete-profile";
import type { WalkthroughProfileDraft } from "@/lib/walkthrough-profile";

import styles from "./complete-profile-review.module.css";

const REFINEMENT_STORAGE_KEY = "mt_complete_profile_refinement";

interface ReviewState {
  displayName: string;
  role: string;
  email: string;
  bio: string;
  maxCommitment: CompleteProfileMaxCommitment;
  monthlyTime: CompleteProfileMonthlyTime;
  contactRule: CompleteProfileContactRule;
  privateProfile: boolean;
}

interface CompleteProfileReviewProps {
  accountEmail: string;
  draft: WalkthroughProfileDraft;
  initialDisplayName: string;
  isAuthenticated: boolean;
  loginHref: string;
  returnTo: string;
  signupHref: string;
}

function Icon({ name }: { name: "arrow" | "check" | "lock" }) {
  if (name === "arrow") {
    return (
      <svg aria-hidden="true" className={styles.icon} viewBox="0 0 20 20">
        <path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg aria-hidden="true" className={styles.icon} viewBox="0 0 20 20">
        <path d="m4 10.5 3.5 3.5L16 5.5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 20 20">
      <rect height="9" rx="1" width="12" x="4" y="8" />
      <path d="M7 8V5.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function SubmitButton({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} disabled={pending} type="submit">
      <span>
        {pending
          ? "Saving profile…"
          : isAuthenticated
            ? "Save profile & explore"
            : "Create account & continue"}
      </span>
      <Icon name="arrow" />
    </button>
  );
}

function getInitials(displayName: string) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.length ? parts.map((part) => part[0]?.toUpperCase()).join("") : "YOU";
}

function getDefaultBio(draft: WalkthroughProfileDraft) {
  return `I look for concrete, verifiable ways to support ${draft.causeArea.toLowerCase()} without taking on open-ended commitments.`;
}

export function CompleteProfileReview({
  accountEmail,
  draft,
  initialDisplayName,
  isAuthenticated,
  loginHref,
  returnTo,
  signupHref,
}: CompleteProfileReviewProps) {
  const [restored, setRestored] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [profile, setProfile] = useState<ReviewState>({
    displayName: initialDisplayName,
    role: "",
    email: accountEmail,
    bio: getDefaultBio(draft),
    maxCommitment: 100,
    monthlyTime: "2 hours",
    contactRule: "Introductions only",
    privateProfile: true,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REFINEMENT_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as Partial<ReviewState> & { context?: string }) : null;
      const context = `${draft.causeArea}|${draft.offerType}|${draft.matchName}`;

      if (stored?.context === context) {
        setProfile((current) => ({
          ...current,
          ...stored,
          email: isAuthenticated ? accountEmail : String(stored.email ?? current.email),
          maxCommitment: COMPLETE_PROFILE_MAX_COMMITMENTS.includes(
            Number(stored.maxCommitment) as CompleteProfileMaxCommitment,
          )
            ? (Number(stored.maxCommitment) as CompleteProfileMaxCommitment)
            : current.maxCommitment,
          monthlyTime: COMPLETE_PROFILE_MONTHLY_TIMES.includes(
            stored.monthlyTime as CompleteProfileMonthlyTime,
          )
            ? (stored.monthlyTime as CompleteProfileMonthlyTime)
            : current.monthlyTime,
          contactRule: COMPLETE_PROFILE_CONTACT_RULES.includes(
            stored.contactRule as CompleteProfileContactRule,
          )
            ? (stored.contactRule as CompleteProfileContactRule)
            : current.contactRule,
          privateProfile:
            typeof stored.privateProfile === "boolean"
              ? stored.privateProfile
              : current.privateProfile,
        }));
      }
    } catch (error) {
      console.warn("Moral Trade could not restore the profile refinement draft.", error);
    } finally {
      setRestored(true);
    }
  }, [accountEmail, draft.causeArea, draft.matchName, draft.offerType, isAuthenticated]);

  useEffect(() => {
    if (!restored) return;

    try {
      window.localStorage.setItem(
        REFINEMENT_STORAGE_KEY,
        JSON.stringify({
          ...profile,
          context: `${draft.causeArea}|${draft.offerType}|${draft.matchName}`,
          version: 1,
        }),
      );
    } catch (error) {
      console.warn("Moral Trade could not save the profile refinement draft.", error);
    }
  }, [draft.causeArea, draft.matchName, draft.offerType, profile, restored]);

  const initials = useMemo(() => getInitials(profile.displayName), [profile.displayName]);
  const causeShort = draft.causeArea
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function updateProfile<Key extends keyof ReviewState>(key: Key, value: ReviewState[Key]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setValidationMessage("");

    if (!profile.displayName.trim() || !profile.role.trim() || !profile.email.trim()) {
      event.preventDefault();
      setValidationMessage("Add a display name, role, and email before continuing.");
      return;
    }

    if (!isAuthenticated) {
      event.preventDefault();
      window.location.assign(signupHref);
    }
  }

  return (
    <section className={styles.surface} aria-labelledby="complete-profile-heading">
      <div className={styles.stageHeading}>
        <div>
          <h1 id="complete-profile-heading">Turn your walkthrough into a profile.</h1>
        </div>
        <div className={styles.headingCopy}>
          <p>
            Review what Moral Trade carried over, fill the few missing details, and see the exact
            profile another member would receive.
          </p>
          <div className={styles.privateNote}>
            <Icon name="lock" />
            Nothing is public until you review and save.
          </div>
        </div>
      </div>

      <div className={styles.importStrip} aria-label="Imported walkthrough choices">
        <div className={styles.importCell}>
          <span>Priority carried over</span>
          <strong>{draft.causeArea}</strong>
          <small>{draft.originalCause}</small>
        </div>
        <div className={styles.importCell}>
          <span>Offer type carried over</span>
          <strong>{draft.offerType}</strong>
          <small>No offer or obligation has been created.</small>
        </div>
        <div className={styles.importCell}>
          <span>Illustrative match</span>
          <strong>{draft.matchName} match</strong>
          <small>
            {draft.matchGive || "Your contribution"} ↔ {draft.matchGet || "Their contribution"}
          </small>
        </div>
      </div>

      <form action={completeWalkthroughProfileAction} onSubmit={handleSubmit}>
        <input name="return_to" type="hidden" value={returnTo} />
        <input
          name="success_to"
          type="hidden"
          value="/discover?source=profile-complete&domain=offers&view=constellation"
        />
        <input name="walkthrough_cause" type="hidden" value={draft.originalCause} />
        <input name="cause_area" type="hidden" value={draft.causeArea} />
        <input name="offer_type" type="hidden" value={draft.offerType} />
        <input name="match_name" type="hidden" value={draft.matchName} />
        <input name="match_get" type="hidden" value={draft.matchGet} />
        <input name="match_give" type="hidden" value={draft.matchGive} />
        <input name="participant_kind" type="hidden" value={draft.participantKind} />
        <input name="primary_goal" type="hidden" value={draft.primaryGoal} />
        <input name="first_action" type="hidden" value={draft.firstAction} />
        <input name="contact_rule" type="hidden" value={profile.contactRule} />
        <input name="private_profile" type="hidden" value={String(profile.privateProfile)} />

        <div className={styles.reviewLayout}>
          <div className={styles.formPanel}>
            <section className={styles.formSection}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Your identity</h2>
                  <p>The name and role shown when someone evaluates an introduction or proposal.</p>
                </div>
                <span className={styles.requiredTag}>Required</span>
              </header>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Display name</span>
                  <input
                    autoComplete="name"
                    name="display_name"
                    required
                    value={profile.displayName}
                    onChange={(event) => updateProfile("displayName", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Role or short descriptor</span>
                  <input
                    name="role"
                    placeholder="e.g. Policy researcher"
                    required
                    value={profile.role}
                    onChange={(event) => updateProfile("role", event.target.value)}
                  />
                </label>
              </div>
              <label className={`${styles.field} ${styles.spacedField}`}>
                <span>Email</span>
                <input
                  autoComplete="email"
                  name="email"
                  readOnly={isAuthenticated}
                  required
                  type="email"
                  value={profile.email}
                  onChange={(event) => updateProfile("email", event.target.value)}
                />
                <small>
                  Used for sign-in and private notifications. It is never shown on your public
                  profile.
                </small>
              </label>
            </section>

            <section className={styles.formSection}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>How you can participate</h2>
                  <p>
                    Set realistic boundaries so recommendations do not assume more time or money
                    than you can offer.
                  </p>
                </div>
                <span className={styles.safeTag}>
                  <Icon name="check" /> No commitment created
                </span>
              </header>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Maximum one-time commitment</span>
                  <select
                    name="max_commitment"
                    value={profile.maxCommitment}
                    onChange={(event) =>
                      updateProfile(
                        "maxCommitment",
                        Number(event.target.value) as CompleteProfileMaxCommitment,
                      )
                    }
                  >
                    {COMPLETE_PROFILE_MAX_COMMITMENTS.map((amount) => (
                      <option key={amount} value={amount}>
                        Up to ${amount}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Time available each month</span>
                  <select
                    name="monthly_time"
                    value={profile.monthlyTime}
                    onChange={(event) =>
                      updateProfile("monthlyTime", event.target.value as CompleteProfileMonthlyTime)
                    }
                  >
                    {COMPLETE_PROFILE_MONTHLY_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time === "8+ hours" ? time : `About ${time}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={`${styles.field} ${styles.spacedField}`}>
                <span>How may people approach you?</span>
                <div className={styles.choiceRow} role="group" aria-label="Contact boundary">
                  {COMPLETE_PROFILE_CONTACT_RULES.map((rule) => (
                    <button
                      aria-pressed={profile.contactRule === rule}
                      className={styles.choice}
                      key={rule}
                      type="button"
                      onClick={() => updateProfile("contactRule", rule)}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.formSection}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>One useful sentence</h2>
                  <p>Tell potential counterparties what makes an opportunity worth your attention.</p>
                </div>
                <span className={styles.optionalTag}>Optional</span>
              </header>
              <label className={styles.field}>
                <span>Profile introduction</span>
                <textarea
                  maxLength={500}
                  name="bio"
                  value={profile.bio}
                  onChange={(event) => updateProfile("bio", event.target.value)}
                />
                <small>Keep this concrete. You can change it later.</small>
              </label>
            </section>

            <section className={styles.formSection}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Visibility</h2>
                  <p>You control when this draft becomes discoverable.</p>
                </div>
              </header>
              <div className={styles.toggleLine}>
                <div>
                  <strong>Keep this profile private after account creation</strong>
                  <small>You can browse and refine recommendations before publishing.</small>
                </div>
                <button
                  aria-label="Keep profile private after account creation"
                  aria-pressed={profile.privateProfile}
                  className={styles.switch}
                  type="button"
                  onClick={() => updateProfile("privateProfile", !profile.privateProfile)}
                />
              </div>
            </section>
          </div>

          <aside className={styles.previewRail} aria-label="Live profile preview">
            <article className={styles.profilePreview}>
              <div className={styles.previewTop}>
                <div className={styles.avatarOrb}>{initials}</div>
                <div className={styles.causeRing}>{causeShort || "MT"}</div>
                <h2>{profile.displayName || "Your name"}</h2>
                <p>{profile.role || "Role or short descriptor"}</p>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewBlock}>
                  <span>About</span>
                  <strong>{profile.bio || "Add one useful sentence about the opportunities you value."}</strong>
                </div>
                <div className={styles.previewBlock}>
                  <span>Can offer</span>
                  <div className={styles.previewTags}>
                    <b>{draft.offerType}</b>
                    <b>{profile.monthlyTime}/month</b>
                    <b>≤ ${profile.maxCommitment}</b>
                  </div>
                </div>
                <div className={styles.previewBlock}>
                  <span>Looking for</span>
                  <strong>{draft.matchGet || `Opportunities in ${draft.causeArea}`}</strong>
                </div>
                <div className={styles.previewBlock}>
                  <span>Contact</span>
                  <strong>{profile.contactRule}</strong>
                </div>
              </div>
            </article>
            <div className={styles.previewStatus}>
              <span className={profile.privateProfile ? styles.privateDot : styles.publicDot} />
              {profile.privateProfile ? "Private after save" : "Discoverable after save"}
            </div>
          </aside>
        </div>

        {validationMessage ? (
          <div aria-live="assertive" className={styles.validationMessage} role="alert">
            {validationMessage}
          </div>
        ) : null}

        <div className={styles.saveBar}>
          <div>
            <p>
              This creates a starter profile and account record. It does not publish an offer,
              contact another member, reserve money, or create a commitment.
            </p>
            {!isAuthenticated ? (
              <p className={styles.signInPrompt}>
                Already have an account? <Link href={loginHref}>Sign in</Link>.
              </p>
            ) : null}
          </div>
          <SubmitButton isAuthenticated={isAuthenticated} />
        </div>
      </form>
    </section>
  );
}

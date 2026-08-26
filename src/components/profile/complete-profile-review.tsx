"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";

import { completeWalkthroughProfileAction } from "@/app/complete-profile/actions";
import {
  COMPLETE_PROFILE_AFFILIATION_MAX_LENGTH,
  COMPLETE_PROFILE_CONTACT_RULES,
  COMPLETE_PROFILE_MAX_COMMITMENTS,
  COMPLETE_PROFILE_MONTHLY_TIMES,
  type CompleteProfileContactRule,
  type CompleteProfileMaxCommitment,
  type CompleteProfileMonthlyTime,
} from "@/lib/complete-profile";
import { validateProfileUsername } from "@/lib/profile-username";
import {
  buildInitialProfilePriorityAllocation,
  COMPLETE_PROFILE_SPARK_COUNT,
  COMPLETE_PROFILE_SPARK_VALUE,
  getAssignedProfilePrioritySparks,
  getProfilePriority,
  normalizeProfilePriorityAllocation,
  PROFILE_PRIORITY_OPTIONS,
  rankProfilePriorities,
  serializeProfilePriorityAllocation,
  type ProfilePriorityAllocation,
  type ProfilePriorityId,
} from "@/lib/profile-priorities";
import type { WalkthroughProfileDraft } from "@/lib/walkthrough-profile";

import styles from "./complete-profile-review.module.css";

const REFINEMENT_STORAGE_KEY = "mt_complete_profile_refinement";
const priorityOrder = PROFILE_PRIORITY_OPTIONS.map((priority) => priority.id);
const INITIAL_ALLOCATION = buildInitialProfilePriorityAllocation();

interface ReviewState {
  displayName: string;
  username: string;
  publicInvitationMentionsEnabled: boolean;
  role: string;
  affiliation: string;
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
  initialAffiliation: string;
  initialDisplayName: string;
  initialUsername: string;
  initialPublicInvitationMentionsEnabled: boolean;
  initialDetailsOpen: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  returnTo: string;
  signupHref: string;
}

type IconName =
  | "arrow"
  | "check"
  | "close"
  | "info"
  | "lock"
  | "minus"
  | "plus"
  | "reset"
  | "sparkles";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  if (name === "sparkles") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
        <path d="m12 3-1.8 4.9a2.2 2.2 0 0 1-1.3 1.3L4 11l4.9 1.8a2.2 2.2 0 0 1 1.3 1.3L12 19l1.8-4.9a2.2 2.2 0 0 1 1.3-1.3L20 11l-4.9-1.8a2.2 2.2 0 0 1-1.3-1.3L12 3Z" />
        <path d="m5 3 .4 1.1a1 1 0 0 0 .5.5L7 5l-1.1.4a1 1 0 0 0-.5.5L5 7l-.4-1.1a1 1 0 0 0-.5-.5L3 5l1.1-.4a1 1 0 0 0 .5-.5L5 3Zm14 14 .4 1.1a1 1 0 0 0 .5.5l1.1.4-1.1.4a1 1 0 0 0-.5.5L19 21l-.4-1.1a1 1 0 0 0-.5-.5L17 19l1.1-.4a1 1 0 0 0 .5-.5L19 17Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
        <path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5" />
      </svg>
    );
  }

  if (name === "plus" || name === "minus") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
        <path d="M4 10h12" />
        {name === "plus" ? <path d="M10 4v12" /> : null}
      </svg>
    );
  }

  if (name === "reset") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
        <path d="M4.5 6.5V2.8M4.5 2.8h3.8M4.6 3.2a7 7 0 1 1-1.2 8.1" />
      </svg>
    );
  }

  if (name === "info") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 9v4M10 6.3v.2" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
        <rect height="9" rx="1" width="12" x="4" y="8" />
        <path d="M7 8V5.5a3 3 0 0 1 6 0V8" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
        <path d="m4 10.5 3.5 3.5L16 5.5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
      <path d="m4.5 4.5 11 11M15.5 4.5l-11 11" />
    </svg>
  );
}

function MoralMark() {
  return (
    <span aria-hidden="true" className={styles.moralMark}>
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function SubmitButton({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className={styles.drawerSubmit} disabled={pending} type="submit">
      <span>
        {pending
          ? "Saving profile…"
          : isAuthenticated
            ? "Save profile & explore"
            : "Create account & continue"}
      </span>
      <Icon className={styles.icon} name="arrow" />
    </button>
  );
}

function getRefinementContext(draft: WalkthroughProfileDraft) {
  return `${draft.source}|${draft.causeArea}|${draft.offerType}|${draft.matchName}`;
}

function getDefaultBio(draft: WalkthroughProfileDraft) {
  if (draft.source === "direct") {
    return "I look for concrete, verifiable ways to make progress on the priorities I rank here without taking on open-ended commitments.";
  }

  return `I look for concrete, verifiable ways to support ${draft.causeArea.toLowerCase()} without taking on open-ended commitments.`;
}

export function CompleteProfileReview({
  accountEmail,
  draft,
  initialAffiliation,
  initialDisplayName,
  initialUsername,
  initialPublicInvitationMentionsEnabled,
  initialDetailsOpen,
  isAuthenticated,
  loginHref,
  returnTo,
  signupHref,
}: CompleteProfileReviewProps) {
  const [allocation, setAllocation] = useState<ProfilePriorityAllocation>(INITIAL_ALLOCATION);
  const [focusedPriorityId, setFocusedPriorityId] = useState<ProfilePriorityId | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(initialDetailsOpen);
  const [restored, setRestored] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [profile, setProfile] = useState<ReviewState>({
    displayName: initialDisplayName,
    username: initialUsername,
    publicInvitationMentionsEnabled: initialPublicInvitationMentionsEnabled,
    role: "",
    affiliation: initialAffiliation,
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
      const stored = raw
        ? (JSON.parse(raw) as Partial<ReviewState> & {
            context?: string;
            priorityAllocation?: unknown;
          })
        : null;
      const context = getRefinementContext(draft);

      if (stored?.context === context) {
        const restoredAllocation = normalizeProfilePriorityAllocation(
          stored.priorityAllocation,
        );
        if (restoredAllocation) setAllocation(restoredAllocation);

        setProfile((current) => ({
          ...current,
          ...stored,
          email: isAuthenticated ? accountEmail : String(stored.email ?? current.email),
          username: isAuthenticated
            ? initialUsername
            : String(stored.username ?? current.username),
          publicInvitationMentionsEnabled: isAuthenticated
            ? initialPublicInvitationMentionsEnabled
            : typeof stored.publicInvitationMentionsEnabled === "boolean"
              ? stored.publicInvitationMentionsEnabled
              : current.publicInvitationMentionsEnabled,
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
  }, [
    accountEmail,
    draft.causeArea,
    draft.matchName,
    draft.offerType,
    draft.source,
    initialPublicInvitationMentionsEnabled,
    initialUsername,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (!restored) return;

    try {
      window.localStorage.setItem(
        REFINEMENT_STORAGE_KEY,
        JSON.stringify({
          ...profile,
          context: getRefinementContext(draft),
          priorityAllocation: JSON.parse(serializeProfilePriorityAllocation(allocation)),
          version: 3,
        }),
      );
    } catch (error) {
      console.warn("Moral Trade could not save the profile refinement draft.", error);
    }
  }, [
    allocation,
    draft.causeArea,
    draft.matchName,
    draft.offerType,
    draft.source,
    profile,
    restored,
  ]);

  useEffect(() => {
    if (!detailsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailsOpen]);

  const assigned = getAssignedProfilePrioritySparks(allocation);
  const unassigned = COMPLETE_PROFILE_SPARK_COUNT - assigned;
  const ranking = rankProfilePriorities(allocation, priorityOrder);
  const leadingPriorityIds = ranking.slice(0, 8);
  const allocationRowIds =
    focusedPriorityId && !leadingPriorityIds.includes(focusedPriorityId)
      ? [...leadingPriorityIds.slice(0, 7), focusedPriorityId]
      : leadingPriorityIds;
  const sparks = ranking.flatMap((id) =>
    Array.from({ length: allocation[id] }, () => id),
  );

  function updateProfile<Key extends keyof ReviewState>(key: Key, value: ReviewState[Key]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function adjust(id: ProfilePriorityId, delta: -1 | 1) {
    setAllocation((current) => {
      if (delta === -1 && current[id] === 0) return current;
      const total = getAssignedProfilePrioritySparks(current);

      if (delta === 1 && total >= COMPLETE_PROFILE_SPARK_COUNT) {
        const donor = [...priorityOrder]
          .reverse()
          .find((candidate) => candidate !== id && current[candidate] > 0);
        if (!donor) return current;
        return {
          ...current,
          [donor]: current[donor] - 1,
          [id]: current[id] + 1,
        };
      }

      return { ...current, [id]: current[id] + delta };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setValidationMessage("");

    const usernameResult = validateProfileUsername(profile.username);
    if (!profile.displayName.trim() || !profile.role.trim() || !profile.email.trim() || !usernameResult.ok) {
      event.preventDefault();
      setValidationMessage(usernameResult.ok ? "Add a display name, role, and email before continuing." : usernameResult.message);
      setDetailsOpen(true);
      return;
    }

    if (!normalizeProfilePriorityAllocation(serializeProfilePriorityAllocation(allocation))) {
      event.preventDefault();
      setValidationMessage("Your priority allocation could not be verified. Reset it and try again.");
      setDetailsOpen(true);
      return;
    }

    if (!isAuthenticated) {
      event.preventDefault();
      window.location.assign(signupHref);
    }
  }

  return (
    <section aria-labelledby="complete-profile-heading" className={styles.profilePage}>
      <form action={completeWalkthroughProfileAction} onSubmit={handleSubmit}>
        <input name="return_to" type="hidden" value={returnTo} />
        <input name="profile_source" type="hidden" value={draft.source} />
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
        <input
          name="priority_allocation"
          type="hidden"
          value={serializeProfilePriorityAllocation(allocation)}
        />

        <header className={styles.profileHeader}>
          <Link
            aria-label="Moral Trade home"
            className={styles.brandLockup}
            href="/"
            prefetch={false}
          >
            <MoralMark />
            <span>Moral Trade</span>
          </Link>
          {draft.source === "walkthrough" ? (
            <div
              aria-label="Walkthrough progress: final step"
              className={styles.walkthroughProgress}
            >
              <span>1&nbsp; Welcome</span>
              <i />
              <span>2&nbsp; Explore</span>
              <i />
              <span>3&nbsp; Priorities</span>
              <i />
              <strong>
                <b>4</b> Complete
              </strong>
            </div>
          ) : (
            <div
              aria-label="Profile setup: priorities"
              className={styles.walkthroughProgress}
            >
              <strong>
                <b aria-hidden="true">✦</b> Profile setup
              </strong>
            </div>
          )}
          <button
            className={styles.primaryAction}
            onClick={() => setDetailsOpen(true)}
            type="button"
          >
            Save profile
            <Icon className={styles.icon} name="arrow" />
          </button>
        </header>

        <div className={styles.mosaicLayout}>
          <aside className={styles.introPanel}>
            <p className={styles.sectionLabel}>Complete your profile</p>
            <h1 id="complete-profile-heading">Spend 100 sparks of attention.</h1>
            <p className={styles.introDescription}>
              Each block is a rough five-point share of your personal attention. Grow the
              priorities that feel central.
            </p>
            <div className={styles.honestyNote}>
              <Icon className={styles.icon} name="info" />
              <p>
                These are coarse personal emphasis shares—not cost-effectiveness, moral value, or
                predicted impact.
              </p>
            </div>
            <div className={styles.instructionBlock}>
              <h2>Twenty deliberate blocks</h2>
              <p>
                <Icon className={styles.icon} name="plus" />
                <span>Add one five-point spark.</span>
              </p>
              <p>
                <Icon className={styles.icon} name="minus" />
                <span>Return a spark to the unassigned tray.</span>
              </p>
            </div>
            <button
              className={styles.textAction}
              onClick={() => {
                setAllocation(INITIAL_ALLOCATION);
                setFocusedPriorityId(null);
              }}
              type="button"
            >
              <Icon className={styles.icon} name="reset" />
              Reset this design
            </button>
          </aside>

          <main className={styles.mosaicStage}>
            <div className={styles.mosaicHeadline}>
              <div>
                <span>Personal emphasis</span>
                <strong aria-live="polite">
                  {assigned * COMPLETE_PROFILE_SPARK_VALUE}
                  <small>/100</small>
                </strong>
              </div>
              <p>
                {unassigned
                  ? `${unassigned} sparks left to place`
                  : "All sparks placed — adjust freely"}
              </p>
            </div>

            <div
              aria-label={`${assigned * COMPLETE_PROFILE_SPARK_VALUE} of 100 attention points assigned`}
              className={styles.sparkMosaic}
              role="img"
            >
              {Array.from({ length: COMPLETE_PROFILE_SPARK_COUNT }).map((_, index) => {
                const id = sparks[index];
                const priority = id ? getProfilePriority(id) : null;
                return (
                  <span
                    aria-label={priority?.name ?? "Unassigned spark"}
                    className={priority ? styles.assignedSpark : styles.emptySpark}
                    key={index}
                    style={
                      priority
                        ? ({ "--priority-color": priority.color } as CSSProperties)
                        : undefined
                    }
                    title={priority?.name ?? "Unassigned spark"}
                  >
                    <Icon className={styles.sparkIcon} name="sparkles" />
                  </span>
                );
              })}
            </div>

            <div className={styles.allocationList}>
              {allocationRowIds.map((id) => {
                const priority = getProfilePriority(id);
                return (
                  <div className={styles.allocationRow} key={id}>
                    <i style={{ background: priority.color }} />
                    <span>{priority.shortName}</span>
                    <div className={styles.allocationBar}>
                      <b
                        style={{
                          background: priority.color,
                          width: `${Math.min(allocation[id] * 20, 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{allocation[id] * COMPLETE_PROFILE_SPARK_VALUE}</strong>
                    <button
                      aria-label={`Decrease ${priority.name}`}
                      disabled={!allocation[id]}
                      onClick={() => adjust(id, -1)}
                      type="button"
                    >
                      <Icon className={styles.rowIcon} name="minus" />
                    </button>
                    <button
                      aria-label={`Increase ${priority.name}`}
                      onClick={() => adjust(id, 1)}
                      type="button"
                    >
                      <Icon className={styles.rowIcon} name="plus" />
                    </button>
                  </div>
                );
              })}
            </div>
          </main>

          <aside aria-label="Your ranking" className={styles.rankingRail}>
            <div className={styles.railHeading}>
              <h2>Your ranking</h2>
              <p>Ordered by your rough attention share.</p>
            </div>
            <ol className={styles.rankingList}>
              {ranking.map((id, index) => {
                const priority = getProfilePriority(id);
                const topRank = index < 5;
                return (
                  <li className={topRank ? styles.topRank : ""} key={id}>
                    <span
                      className={styles.rankNumber}
                      style={{ color: topRank ? priority.color : undefined }}
                    >
                      {index + 1}
                    </span>
                    <span className={styles.rankLabel}>{priority.shortName}</span>
                    {allocation[id] && allocationRowIds.includes(id) ? (
                      <span className={styles.rankTrailing}>
                        {allocation[id] * COMPLETE_PROFILE_SPARK_VALUE} sparks
                      </span>
                    ) : allocation[id] ? (
                      <button
                        aria-label={`Edit ${priority.name}`}
                        className={styles.rankAllocate}
                        onClick={() => setFocusedPriorityId(id)}
                        title={`Show controls for ${priority.name}`}
                        type="button"
                      >
                        {allocation[id] * COMPLETE_PROFILE_SPARK_VALUE} sparks
                      </button>
                    ) : (
                      <button
                        aria-label={`Assign one spark to ${priority.name}`}
                        className={styles.rankAllocate}
                        onClick={() => {
                          setFocusedPriorityId(id);
                          adjust(id, 1);
                        }}
                        title={`Assign one spark to ${priority.name}`}
                        type="button"
                      >
                        Unassigned
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className={styles.railFooter}>
              <p>
                Ties are shown together. Five-point blocks deliberately avoid false precision.
              </p>
            </div>
          </aside>
        </div>

        {detailsOpen ? (
          <div
            aria-label="Close profile details"
            className={styles.detailsBackdrop}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setDetailsOpen(false);
            }}
            role="presentation"
          >
            <section
              aria-labelledby="profile-details-heading"
              aria-modal="true"
              className={styles.detailsSheet}
              role="dialog"
            >
              <header className={styles.detailsHeader}>
                <div>
                  <span>Complete your profile</span>
                  <h2 id="profile-details-heading">Finish the practical details.</h2>
                  <p>
                    Your mosaic stays private by default. These boundaries help Moral Trade avoid
                    assuming more time, money, or contact than you intend.
                  </p>
                </div>
                <button
                  aria-label="Close profile details"
                  autoFocus
                  className={styles.closeButton}
                  onClick={() => setDetailsOpen(false)}
                  type="button"
                >
                  <Icon className={styles.icon} name="close" />
                </button>
              </header>

              <div className={styles.contextStrip}>
                <div>
                  <span>
                    {draft.source === "walkthrough"
                      ? "Walkthrough priority"
                      : "Priority basis"}
                  </span>
                  <strong>
                    {draft.source === "walkthrough"
                      ? draft.originalCause
                      : "Your 100-spark ranking"}
                  </strong>
                  <small>
                    {draft.source === "walkthrough"
                      ? draft.causeArea
                      : "Saved from the priorities you assign here."}
                  </small>
                </div>
                <div>
                  <span>Personal emphasis</span>
                  <strong>{assigned * COMPLETE_PROFILE_SPARK_VALUE}/100</strong>
                  <small>{unassigned} unassigned blocks remain</small>
                </div>
                <div>
                  <span>
                    {draft.source === "walkthrough" ? "Offer boundary" : "Offer status"}
                  </span>
                  <strong>
                    {draft.source === "walkthrough" ? draft.offerType : "Not set here"}
                  </strong>
                  <small>
                    {draft.source === "walkthrough"
                      ? "No offer or obligation has been created."
                      : "Saving does not create or publish an offer."}
                  </small>
                </div>
              </div>

              <div className={styles.detailsBody}>
                <section className={styles.formSection}>
                  <div className={styles.formSectionHeading}>
                    <div>
                      <span>01</span>
                      <h3>Your identity</h3>
                    </div>
                    <small>Required</small>
                  </div>
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
                      <span>Username</span>
                      <input
                        autoCapitalize="none"
                        autoComplete="username"
                        maxLength={32}
                        name="username"
                        pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                        placeholder="e.g. ellen-sun"
                        required
                        spellCheck={false}
                        value={profile.username}
                        onChange={(event) => updateProfile("username", event.target.value.toLowerCase().replace(/^@+/u, ""))}
                      />
                      <small>Unique and public. Existing accounts are not assigned a generated username.</small>
                    </label>
                  </div>
                  <label className={`${styles.field} ${styles.spacedField}`}>
                    <span>Role or short descriptor</span>
                    <input
                      name="role"
                      placeholder="e.g. Policy researcher"
                      required
                      value={profile.role}
                      onChange={(event) => updateProfile("role", event.target.value)}
                    />
                  </label>
                  <label className={`${styles.field} ${styles.spacedField}`}>
                    <span>Company, organization, or university (optional)</span>
                    <input
                      autoComplete="organization"
                      maxLength={COMPLETE_PROFILE_AFFILIATION_MAX_LENGTH}
                      name="affiliation"
                      placeholder="e.g. Future Institute or University of Oxford"
                      value={profile.affiliation}
                      onChange={(event) => updateProfile("affiliation", event.target.value)}
                    />
                    <small>Shown with your role when your profile is public.</small>
                  </label>
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
                    <small>Used for sign-in and private notifications. Never shown publicly.</small>
                  </label>
                </section>

                <section className={styles.formSection}>
                  <div className={styles.formSectionHeading}>
                    <div>
                      <span>02</span>
                      <h3>Participation limits</h3>
                    </div>
                    <small className={styles.safeLabel}>
                      <Icon className={styles.miniIcon} name="check" /> No commitment created
                    </small>
                  </div>
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
                          updateProfile(
                            "monthlyTime",
                            event.target.value as CompleteProfileMonthlyTime,
                          )
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
                          onClick={() => updateProfile("contactRule", rule)}
                          type="button"
                        >
                          {rule}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className={styles.formSection}>
                  <div className={styles.formSectionHeading}>
                    <div>
                      <span>03</span>
                      <h3>One useful sentence</h3>
                    </div>
                    <small>Optional</small>
                  </div>
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
                  <div className={styles.formSectionHeading}>
                    <div>
                      <span>04</span>
                      <h3>Visibility</h3>
                    </div>
                    <small>
                      <Icon className={styles.miniIcon} name="lock" /> Owner controlled
                    </small>
                  </div>
                  <div className={styles.toggleLine}>
                    <div>
                      <strong>Keep this profile private after account creation</strong>
                      <small>You can browse and refine recommendations before publishing.</small>
                    </div>
                    <button
                      aria-label="Keep profile private after account creation"
                      aria-pressed={profile.privateProfile}
                      className={styles.switch}
                      onClick={() => updateProfile("privateProfile", !profile.privateProfile)}
                      type="button"
                    />
                  </div>
                  <div className={styles.toggleLine}>
                    <div>
                      <strong>Show my username on public pending invitations</strong>
                      <small>Turning this off does not disable private participant search; public pages use “Pending invitee” until acceptance.</small>
                    </div>
                    <input
                      name="public_invitation_mentions_enabled"
                      type="hidden"
                      value={profile.publicInvitationMentionsEnabled ? "on" : "off"}
                    />
                    <button
                      aria-label="Show my username on public pending invitations"
                      aria-pressed={profile.publicInvitationMentionsEnabled}
                      className={styles.switch}
                      onClick={() => updateProfile("publicInvitationMentionsEnabled", !profile.publicInvitationMentionsEnabled)}
                      type="button"
                    />
                  </div>
                </section>
              </div>

              {validationMessage ? (
                <div aria-live="assertive" className={styles.validationMessage} role="alert">
                  {validationMessage}
                </div>
              ) : null}

              <footer className={styles.detailsFooter}>
                <div>
                  <p>
                    Saving creates a starter profile. It does not publish an offer, contact
                    another member, reserve money, or create a commitment.
                  </p>
                  {!isAuthenticated ? (
                    <p>
                      Already have an account? <Link href={loginHref}>Sign in</Link>.
                    </p>
                  ) : null}
                </div>
                <SubmitButton isAuthenticated={isAuthenticated} />
              </footer>
            </section>
          </div>
        ) : null}
      </form>
    </section>
  );
}

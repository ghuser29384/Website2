"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useFormStatus } from "react-dom";

import { saveProfilePrioritySearchAction } from "@/app/profile/priorities/actions";
import {
  COMPLETE_PROFILE_SPARK_COUNT,
  COMPLETE_PROFILE_SPARK_VALUE,
  getAssignedProfilePrioritySparks,
  getProfilePriority,
  normalizeProfilePriorityAllocation,
  PROFILE_PRIORITY_OPTIONS,
  PROFILE_PRIORITY_RESOURCE_OPTIONS,
  rankProfilePriorities,
  serializeProfilePriorityAllocation,
  serializeProfilePriorityResourceAllocations,
  type ProfilePriorityAllocation,
  type ProfilePriorityId,
  type ProfilePriorityResourceAllocationMap,
  type ProfilePriorityResourceType,
} from "@/lib/profile-priorities";

import styles from "./complete-profile-review.module.css";

type IconName = "arrow" | "info" | "minus" | "plus" | "reset" | "sparkles";

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

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v4M10 6.3v.2" />
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

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryAction} disabled={pending} type="submit">
      {pending ? "Saving…" : "Save priorities"}
      <Icon className={styles.icon} name="arrow" />
    </button>
  );
}

interface ProfilePriorityEditorProps {
  initialAllocation: ProfilePriorityAllocation;
  initialResourceAllocations: ProfilePriorityResourceAllocationMap;
  returnTo: string;
}

const priorityOrder = PROFILE_PRIORITY_OPTIONS.map((priority) => priority.id);
type ProfilePriorityView = "general" | ProfilePriorityResourceType;

const profilePriorityViews = [
  {
    id: "general",
    label: "General",
    prompt: "How would you allocate 100 sparks across causes as your default prior?",
  },
  ...PROFILE_PRIORITY_RESOURCE_OPTIONS,
] as const;

export function ProfilePriorityEditor({
  initialAllocation,
  initialResourceAllocations,
  returnTo,
}: ProfilePriorityEditorProps) {
  const [generalAllocation, setGeneralAllocation] =
    useState<ProfilePriorityAllocation>(initialAllocation);
  const [resourceAllocations, setResourceAllocations] =
    useState<ProfilePriorityResourceAllocationMap>(initialResourceAllocations);
  const [activeView, setActiveView] = useState<ProfilePriorityView>("general");
  const [focusedPriorityId, setFocusedPriorityId] = useState<ProfilePriorityId | null>(null);
  const activeResourceType = activeView === "general" ? null : activeView;
  const activeOverride = activeResourceType
    ? resourceAllocations[activeResourceType]
    : null;
  const allocation = activeOverride ?? generalAllocation;
  const isInherited = Boolean(activeResourceType && !activeOverride);
  const activeViewOption = profilePriorityViews.find(({ id }) => id === activeView)!;
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

  function adjust(id: ProfilePriorityId, delta: -1 | 1) {
    if (isInherited) return;

    const update = (current: ProfilePriorityAllocation) => {
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
    };

    if (activeResourceType) {
      setResourceAllocations((current) => ({
        ...current,
        [activeResourceType]: update(current[activeResourceType] ?? generalAllocation),
      }));
      return;
    }
    setGeneralAllocation(update);
  }

  const serializedAllocation = serializeProfilePriorityAllocation(allocation);
  const allocationIsValid = Boolean(normalizeProfilePriorityAllocation(serializedAllocation));
  const serializedGeneralAllocation = serializeProfilePriorityAllocation(generalAllocation);
  const serializedResourceAllocations =
    serializeProfilePriorityResourceAllocations(resourceAllocations);

  return (
    <section aria-labelledby="profile-priorities-heading" className={styles.profilePage}>
      <form action={saveProfilePrioritySearchAction}>
        <input name="return_to" type="hidden" value={`/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`} />
        <input name="success_to" type="hidden" value={returnTo} />
        <input
          name="priority_allocation"
          type="hidden"
          value={serializedGeneralAllocation}
        />
        <input
          name="resource_allocations"
          type="hidden"
          value={serializedResourceAllocations}
        />

        <header className={styles.profileHeader}>
          <Link aria-label="Moral Trade home" className={styles.brandLockup} href="/">
            <MoralMark />
            <span>Moral Trade</span>
          </Link>
          <div aria-label="Profile priorities" className={styles.walkthroughProgress}>
            <strong>
              <b aria-hidden="true">✦</b>
              Profile priorities
            </strong>
          </div>
          <SaveButton />
        </header>

        <div className={styles.mosaicLayout}>
          <aside className={styles.introPanel}>
            <p className={styles.sectionLabel}>Private profile</p>
            <h1 id="profile-priorities-heading">Adjust your 100 sparks.</h1>
            <p className={styles.introDescription}>
              Set one general prior, then optionally customize how different resources follow it.
            </p>
            <div
              aria-label="Priority allocation resource"
              className={styles.resourceSelector}
              role="group"
            >
              {profilePriorityViews.map((view) => (
                <button
                  aria-pressed={activeView === view.id}
                  key={view.id}
                  onClick={() => {
                    setActiveView(view.id);
                    setFocusedPriorityId(null);
                  }}
                  type="button"
                >
                  <span>{view.label}</span>
                  <small>
                    {view.id === "general"
                      ? "Default"
                      : resourceAllocations[view.id]
                        ? "Customized"
                        : "Uses general"}
                  </small>
                </button>
              ))}
            </div>
            <div className={styles.honestyNote}>
              <Icon className={styles.icon} name="info" />
              <p>
                These are coarse personal emphasis shares—not cost-effectiveness, moral value, or
                predicted impact.
              </p>
            </div>
            <div className={styles.instructionBlock}>
              <h2>Twenty five-spark blocks</h2>
              <p>
                <Icon className={styles.icon} name="plus" />
                <span>Add five sparks to a priority.</span>
              </p>
              <p>
                <Icon className={styles.icon} name="minus" />
                <span>Return five sparks to the unassigned tray.</span>
              </p>
            </div>
            <button
              className={styles.textAction}
              onClick={() => {
                setGeneralAllocation(initialAllocation);
                setResourceAllocations(initialResourceAllocations);
                setActiveView("general");
                setFocusedPriorityId(null);
              }}
              type="button"
            >
              <Icon className={styles.icon} name="reset" />
              Reset unsaved changes
            </button>
            <Link className={styles.textAction} href={returnTo}>
              Cancel and return
            </Link>
          </aside>

          <main
            aria-label={`${activeViewOption.label} allocation editor`}
            className={styles.mosaicStage}
          >
            <div className={styles.resourceContext}>
              <div>
                <span>{activeViewOption.label} allocation</span>
                <p>{activeViewOption.prompt}</p>
                <small>
                  {activeResourceType
                    ? isInherited
                      ? "This view follows your general profile, including future general edits."
                      : "This private override stays separate when your general allocation changes."
                    : "This remains the live default when no applicable resource override is selected."}
                </small>
              </div>
              {activeResourceType ? (
                isInherited ? (
                  <button
                    className={styles.resourceAction}
                    onClick={() => {
                      setResourceAllocations((current) => ({
                        ...current,
                        [activeResourceType]: { ...generalAllocation },
                      }));
                    }}
                    type="button"
                  >
                    Customize
                  </button>
                ) : (
                  <button
                    className={styles.resourceAction}
                    onClick={() => {
                      setResourceAllocations((current) => {
                        const next = { ...current };
                        delete next[activeResourceType];
                        return next;
                      });
                      setFocusedPriorityId(null);
                    }}
                    type="button"
                  >
                    Use general allocation again
                  </button>
                )
              ) : null}
            </div>
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
                  ? `${unassigned * COMPLETE_PROFILE_SPARK_VALUE} sparks left to place`
                  : "All sparks placed — adjust freely"}
              </p>
            </div>

            <div
              aria-label={`${assigned * COMPLETE_PROFILE_SPARK_VALUE} of 100 attention sparks assigned`}
              className={styles.sparkMosaic}
              role="img"
            >
              {Array.from({ length: COMPLETE_PROFILE_SPARK_COUNT }).map((_, index) => {
                const id = sparks[index];
                const priority = id ? getProfilePriority(id) : null;
                return (
                  <span
                    aria-label={priority?.name ?? "Unassigned five-spark block"}
                    className={priority ? styles.assignedSpark : styles.emptySpark}
                    key={index}
                    style={
                      priority
                        ? ({ "--priority-color": priority.color } as CSSProperties)
                        : undefined
                    }
                    title={priority?.name ?? "Unassigned five-spark block"}
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
                      disabled={isInherited || !allocation[id]}
                      onClick={() => adjust(id, -1)}
                      type="button"
                    >
                      <Icon className={styles.rowIcon} name="minus" />
                    </button>
                    <button
                      aria-label={`Increase ${priority.name}`}
                      disabled={isInherited}
                      onClick={() => adjust(id, 1)}
                      type="button"
                    >
                      <Icon className={styles.rowIcon} name="plus" />
                    </button>
                  </div>
                );
              })}
            </div>
            {!allocationIsValid ? (
              <p className={styles.validationMessage} role="alert">
                Assign at least five sparks before saving.
              </p>
            ) : null}
          </main>

          <aside aria-label="Your priority ranking" className={styles.rankingRail}>
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
                    {isInherited ? (
                      <span className={styles.rankTrailing}>
                        {allocation[id]
                          ? `${allocation[id] * COMPLETE_PROFILE_SPARK_VALUE} sparks`
                          : "Unassigned"}
                      </span>
                    ) : allocation[id] && allocationRowIds.includes(id) ? (
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
                        aria-label={`Assign five sparks to ${priority.name}`}
                        className={styles.rankAllocate}
                        onClick={() => {
                          setFocusedPriorityId(id);
                          adjust(id, 1);
                        }}
                        title={`Assign five sparks to ${priority.name}`}
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
              <p>Ties remain tied. Unassigned sparks are intentional, not opposition.</p>
              <p>
                Allocations stay private. Current live ranking continues to use the general vector;
                resource overrides are saved for a separately reviewed integration.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}

"use client";

import {
  ArrowLeft,
  ArrowsOutSimple,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  File,
  FileImage,
  FilePdf,
  Flag,
  Info,
  LinkSimple,
  Lock,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  PaperPlaneTilt,
  ShareNetwork,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { reviewTradeEvidenceAction } from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";

import styles from "./evidence-stage.module.css";

export type EvidenceStageState = "submitted" | "accepted" | "challenged";
export type EvidenceStageRedactionState =
  | "pending_review"
  | "not_required"
  | "redacted"
  | "withheld";

export type EvidenceStageItem = {
  id: string;
  title: string;
  summary: string;
  evidenceType: string;
  state: EvidenceStageState;
  group: string;
  submittedBy: string;
  submittedById: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  challengeWindowEndsAt: string | null;
  redactionState: EvidenceStageRedactionState;
  redactionNote: string;
  fileName: string;
  publicUrl: string | null;
  preview: "meal_before" | "receipt" | "meal_after" | "live";
};

export type EvidenceStageTimelineEvent = {
  id: string;
  at: string;
  label: string;
  title: string;
  description: string;
  evidenceId?: string;
};

export type EvidenceStageRecord = {
  id: string;
  isExample: boolean;
  lifecycle: string;
  offeredCause: string;
  requestedCause: string;
  proposedAction: string;
  requestedAction: string;
  evidenceRule: string;
  duration: string;
  privacyScope: string;
  proposer: string;
  responder: string;
  proposerId: string | null;
  responderId: string | null;
  createdAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  evidence: EvidenceStageItem[];
  timeline: EvidenceStageTimelineEvent[];
};

export type EvidenceStageViewerContext = {
  viewerId: string | null;
  isParticipant: boolean;
  agreementHref: string | null;
  threadHref: string | null;
};

function formatDate(value: string | null, includeTime = true) {
  if (!value) return "Not recorded";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
    month: "short",
    timeZoneName: includeTime ? "short" : undefined,
    year: "numeric",
  }).format(new Date(timestamp));
}

function shortId(value: string) {
  return value === "example" ? "EXAMPLE" : value.slice(0, 8).toUpperCase();
}

function mediaKind(item: EvidenceStageItem) {
  if (item.preview === "receipt") return "receipt" as const;
  if (item.evidenceType === "link") return "link" as const;
  const locator = `${item.fileName} ${item.publicUrl ?? ""}`.toLowerCase();
  if (/\.(png|jpe?g|webp|avif)(?:[?#].*)?$/.test(locator)) return "image" as const;
  if (/\.pdf(?:[?#].*)?$/.test(locator)) return "pdf" as const;
  if (item.publicUrl) return "link" as const;
  return "document" as const;
}

function redactionCopy(state: EvidenceStageRedactionState) {
  if (state === "not_required") return "Public-safe copy";
  if (state === "redacted") return "Privacy-redacted copy";
  if (state === "withheld") return "Source withheld for safety";
  return "Source pending review";
}

function reviewWindowIsOpen(value: string | null, now: number) {
  if (!value) return true;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) || timestamp > now;
}

function stateCopy(item: EvidenceStageItem, canReview: boolean, reviewWindowOpen = true) {
  if (item.state === "accepted") {
    return {
      label: "Accepted",
      title: "Accepted against the agreed evidence rule",
      copy: "The other participant accepted this item. Acceptance records their review; it is not independent verification.",
    };
  }
  if (item.state === "challenged") {
    return {
      label: "Challenged",
      title: "This evidence has been challenged",
      copy: "A participant identified a factual or scope issue. The agreement remains disputed until that issue is resolved.",
    };
  }
  if (!reviewWindowOpen) {
    return {
      label: "Review window closed",
      title: "The participant review window has closed",
      copy: "This item remains submitted and visible, but a new accept or challenge decision can no longer be recorded from this review window.",
    };
  }
  return {
    label: canReview ? "Ready for your review" : "Awaiting participant review",
    title: canReview ? "Ready for your decision" : "Submitted under the agreed evidence rule",
    copy: "The item is visible and ready for counterparty review. Submission alone does not mean the claim has been accepted or independently verified.",
  };
}

function ArtifactIcon({ item }: { item: EvidenceStageItem }) {
  const kind = mediaKind(item);
  if (kind === "image") return <FileImage aria-hidden="true" size={31} weight="thin" />;
  if (kind === "pdf") return <FilePdf aria-hidden="true" size={31} weight="thin" />;
  if (kind === "link") return <LinkSimple aria-hidden="true" size={31} weight="thin" />;
  return <File aria-hidden="true" size={31} weight="thin" />;
}

function ReceiptPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.receiptMini : styles.receipt}>
      <h4>THE GREEN TABLE</h4>
      {!compact ? (
        <p>
          Cafe receipt · public-safe copy
          <br />
          July 18, 2026 · 12:39 PM
        </p>
      ) : null}
      <hr />
      <div><span>Lentil bowl</span><b>$12.50</b></div>
      {!compact ? <div><span>Roasted vegetables</span><b>incl.</b></div> : null}
      {!compact ? <div><span>Feta + tahini</span><b>incl.</b></div> : null}
      <div><span>Sparkling water</span><b>$2.75</b></div>
      <div className={styles.receiptTotal}><span>Total</span><b>$15.25</b></div>
      {!compact ? (
        <>
          <hr />
          <div><span>Order</span><i /></div>
          <div><span>Payment</span><i /></div>
        </>
      ) : null}
    </div>
  );
}

function ArtifactThumbnail({ item }: { item: EvidenceStageItem }) {
  const kind = mediaKind(item);
  if (kind === "image" && item.publicUrl) {
    return <Image alt="" fill referrerPolicy="no-referrer" sizes="10rem" src={item.publicUrl} unoptimized />;
  }
  if (kind === "receipt") return <ReceiptPreview compact />;
  return <ArtifactIcon item={item} />;
}

function ArtifactMedia({ item, record }: { item: EvidenceStageItem; record: EvidenceStageRecord }) {
  const kind = mediaKind(item);
  if (kind === "image" && item.publicUrl) {
    return (
      <Image
        alt={item.title}
        className={styles.mainImage}
        height={1024}
        priority={item.preview === "meal_before"}
        referrerPolicy="no-referrer"
        src={item.publicUrl}
        unoptimized
        width={1536}
      />
    );
  }
  if (kind === "pdf" && item.publicUrl) {
    return (
      <iframe
        className={styles.pdf}
        referrerPolicy="no-referrer"
        sandbox="allow-downloads allow-same-origin allow-scripts"
        src={item.publicUrl}
        title={item.title}
      />
    );
  }
  if (kind === "receipt") return <ReceiptPreview />;
  return (
    <article className={styles.document}>
      <header>
        <span>Moral Trade</span>
        <small>Public evidence copy</small>
      </header>
      <p>{item.evidenceType.replaceAll("_", " ")}</p>
      <h2>{item.title}</h2>
      <div className={styles.documentSummary}>{item.summary}</div>
      <dl>
        <div><dt>Status</dt><dd>{item.state}</dd></div>
        <div><dt>Submitted by</dt><dd>{item.submittedBy}</dd></div>
        <div><dt>Evidence rule</dt><dd>{record.evidenceRule}</dd></div>
        <div><dt>Privacy</dt><dd>{item.redactionNote}</dd></div>
      </dl>
      {item.publicUrl ? (
        <a href={item.publicUrl} rel="noreferrer" target="_blank">
          <LinkSimple aria-hidden="true" size={17} /> Open public source
        </a>
      ) : (
        <p className={styles.metadataOnly}>The metadata is public; no public-safe source file is available.</p>
      )}
    </article>
  );
}

export function EvidenceStage({
  record,
  viewer,
}: {
  record: EvidenceStageRecord;
  viewer: EvidenceStageViewerContext;
}) {
  const [selectedId, setSelectedId] = useState(record.evidence[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [checksOpen, setChecksOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const [viewerOpenedAt] = useState(Date.now);
  const mediaRef = useRef<HTMLDivElement>(null);
  const timelineToggleRef = useRef<HTMLButtonElement>(null);
  const timelineCloseRef = useRef<HTMLButtonElement>(null);
  const privacyDialogRef = useRef<HTMLDialogElement>(null);
  const acceptDialogRef = useRef<HTMLDialogElement>(null);
  const challengeDialogRef = useRef<HTMLDialogElement>(null);

  const selected = useMemo(
    () => record.evidence.find((item) => item.id === selectedId) ?? record.evidence[0],
    [record.evidence, selectedId],
  );

  useEffect(() => {
    if (!timelineOpen) return;
    const timelineToggle = timelineToggleRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTimelineOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    timelineCloseRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      timelineToggle?.focus();
    };
  }, [timelineOpen]);

  if (!selected) return null;

  const reviewWindowOpen = reviewWindowIsOpen(selected.challengeWindowEndsAt, viewerOpenedAt);
  const canReview = Boolean(
    !record.isExample &&
      viewer.isParticipant &&
      viewer.viewerId &&
      selected.state === "submitted" &&
      selected.submittedById !== viewer.viewerId &&
      reviewWindowOpen,
  );
  const status = stateCopy(selected, canReview, reviewWindowOpen);
  const evidenceSubject = record.isExample
    ? record.requestedCause
    : `${record.offeredCause} ↔ ${record.requestedCause}`;

  const selectArtifact = (id: string) => {
    setSelectedId(id);
    setZoom(1);
    setChecksOpen(false);
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Moral Trade evidence: ${record.requestedCause}`, url: location.href });
      } else {
        await navigator.clipboard.writeText(location.href);
      }
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 1_400);
    } catch {
      setShareLabel("Share");
    }
  };

  const enterFullscreen = async () => {
    if (!mediaRef.current?.requestFullscreen) {
      if (selected.publicUrl) window.open(selected.publicUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await mediaRef.current.requestFullscreen();
    } catch {
      // Fullscreen can be unavailable in embedded or restricted browsers.
    }
  };

  return (
    <section className={styles.shell} data-pe-desk data-stage-evidence-viewer>
      <header className={styles.header}>
        <Link className={styles.back} href={viewer.isParticipant && viewer.agreementHref ? viewer.agreementHref : "/evidence"}>
          <ArrowLeft aria-hidden="true" size={18} /> {viewer.isParticipant ? "Commitment" : "Evidence"}
        </Link>
        <div className={styles.heading}>
          <h1>Evidence for {evidenceSubject}</h1>
          <p>{record.offeredCause} ↔ {record.requestedCause} · MT–{shortId(record.id)}</p>
        </div>
        <button
          aria-controls="evidence-proof-timeline"
          aria-expanded={timelineOpen}
          aria-label={`Open proof timeline. ${status.label}`}
          className={styles.ready}
          data-pe-timeline-toggle
          data-stage-timeline-toggle
          onClick={() => setTimelineOpen(true)}
          ref={timelineToggleRef}
          type="button"
        >
          <ClockCounterClockwise aria-hidden="true" size={16} />
          <span>{status.label}</span>
        </button>
      </header>

      {record.isExample ? (
        <div className={styles.exampleNotice}>
          Illustrative record — the people, evidence, and review state below are examples, not marketplace activity.
        </div>
      ) : null}

      <div className={styles.grid}>
        <aside className={styles.filmstrip} aria-label="Submitted artifacts">
          {record.evidence.map((item, index) => (
            <button
              aria-pressed={item.id === selected.id}
              className={`${styles.artifact} ${item.id === selected.id ? styles.selected : ""}`}
              data-pe-select={item.id}
              data-stage-artifact={item.id}
              key={item.id}
              onClick={() => selectArtifact(item.id)}
              type="button"
            >
              <span className={styles.thumbnail}><ArtifactThumbnail item={item} /></span>
              <strong>{index + 1} · {item.title}</strong>
              <small>{item.state} · {formatDate(item.submittedAt, false)}</small>
            </button>
          ))}
          <div className={styles.artifactCount}>{record.evidence.length} artifact{record.evidence.length === 1 ? "" : "s"}</div>
        </aside>

        <div className={styles.media} data-stage-media ref={mediaRef}>
          <div className={styles.mediaView}>
            <div className={styles.zoomTarget} style={{ height: `${zoom * 100}%`, width: `${zoom * 100}%` }}>
              <ArtifactMedia item={selected} record={record} />
            </div>
          </div>

          <button
            className={styles.privacy}
            onClick={() => privacyDialogRef.current?.showModal()}
            type="button"
          >
            <Lock aria-hidden="true" size={17} />
            <span>
              <strong>{redactionCopy(selected.redactionState)}</strong>
              <small>Submitted {formatDate(selected.submittedAt)}</small>
            </span>
            <u>Details</u>
          </button>

          <div className={styles.toolbar} aria-label="Media controls">
            <button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.8, value + 0.15))} type="button">
              <MagnifyingGlassPlus aria-hidden="true" size={17} />
            </button>
            <button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.8, value - 0.15))} type="button">
              <MagnifyingGlassMinus aria-hidden="true" size={17} />
            </button>
            <button onClick={() => setZoom(1)} type="button">Fit</button>
            {selected.publicUrl ? (
              <a href={selected.publicUrl} rel="noreferrer" target="_blank">Open copy</a>
            ) : (
              <button onClick={() => privacyDialogRef.current?.showModal()} type="button">Availability details</button>
            )}
            <button aria-label="View fullscreen" onClick={enterFullscreen} type="button">
              <ArrowsOutSimple aria-hidden="true" size={17} />
            </button>
          </div>
        </div>

        <aside className={styles.review} data-stage-review>
          <div className={styles.verdict}>
            <span className={`${styles.verdictIcon} ${
              selected.state === "accepted"
                ? styles.verdictAccepted
                : selected.state === "challenged"
                  ? styles.verdictChallenged
                  : styles.verdictSubmitted
            }`}>
              {selected.state === "accepted" ? (
                <Check aria-hidden="true" size={25} />
              ) : selected.state === "challenged" ? (
                <Flag aria-hidden="true" size={25} />
              ) : (
                <Clock aria-hidden="true" size={25} />
              )}
            </span>
            <div>
              <h2>{status.title}</h2>
              <p>{status.copy}</p>
            </div>
          </div>

          <div className={styles.reviewSection}>
            <h3><CheckCircle aria-hidden="true" size={18} /> {selected.state === "accepted" ? "What this covers" : "What this is offered to support"}</h3>
            <ul>
              <li>{selected.summary}</li>
              <li>Submitted by {selected.submittedBy} as {selected.evidenceType.replaceAll("_", " ")} evidence.</li>
              <li>The item {selected.state === "accepted" ? "was assessed" : "should be assessed"} against the parties’ frozen evidence rule.</li>
            </ul>
          </div>

          <div className={styles.reviewSection}>
            <h3 className={styles.warning}><Info aria-hidden="true" size={18} /> What it cannot establish</h3>
            <ul>
              <li>Events or behavior outside what this public-safe artifact shows.</li>
              <li>Independent verification unless an explicit review record says so.</li>
            </ul>
          </div>

          <div className={styles.reviewSection}>
            <button
              aria-expanded={checksOpen}
              className={styles.disclosure}
              onClick={() => setChecksOpen((open) => !open)}
              type="button"
            >
              <span><strong>{selected.state === "accepted" ? "Review record" : "Evidence details"}</strong><small>Status, scope, timing, and redaction</small></span>
              <CaretRight aria-hidden="true" className={checksOpen ? styles.rotated : ""} size={17} />
            </button>
            {checksOpen ? (
              <dl className={styles.checkDetails}>
                <div><dt>Review state</dt><dd>{selected.state}</dd></div>
                <div><dt>Reviewed</dt><dd>{formatDate(selected.reviewedAt)}</dd></div>
                <div><dt>Redaction</dt><dd>{selected.redactionState.replaceAll("_", " ")}</dd></div>
                <div><dt>Evidence rule</dt><dd>{record.evidenceRule}</dd></div>
              </dl>
            ) : null}
          </div>

          <div className={styles.reviewSection}>
            <h3><Clock aria-hidden="true" size={18} /> Review window</h3>
            <p className={styles.micro}>{formatDate(selected.challengeWindowEndsAt)}<br />This screen records review decisions; it does not itself hold or release funds.</p>
          </div>
        </aside>
      </div>

      <footer className={styles.decision}>
        {record.isExample ? (
          <>
            <Link className={styles.primaryAction} href="/evidence"><ArrowLeft aria-hidden="true" size={20} /> All evidence records</Link>
            <button className={styles.secondaryAction} onClick={share} type="button"><ShareNetwork aria-hidden="true" size={18} /> {shareLabel}</button>
            <button className={styles.disabledAction} disabled type="button"><ShieldCheck aria-hidden="true" size={18} /> Example only</button>
          </>
        ) : canReview ? (
          <>
            <button className={styles.primaryAction} onClick={() => acceptDialogRef.current?.showModal()} type="button">
              <ShieldCheck aria-hidden="true" size={22} /> Accept evidence
            </button>
            <Link className={styles.secondaryAction} href={viewer.threadHref ?? viewer.agreementHref ?? `/trade-agreements/${record.id}`}>
              <PaperPlaneTilt aria-hidden="true" size={18} /> Ask {selected.submittedBy}
            </Link>
            <button className={styles.challengeAction} onClick={() => challengeDialogRef.current?.showModal()} type="button">
              <Flag aria-hidden="true" size={18} /> Challenge
            </button>
          </>
        ) : viewer.isParticipant && viewer.agreementHref ? (
          <>
            <Link className={styles.primaryAction} href={viewer.agreementHref}><ShieldCheck aria-hidden="true" size={21} /> Open agreement review</Link>
            <Link className={styles.secondaryAction} href={viewer.threadHref ?? viewer.agreementHref}><PaperPlaneTilt aria-hidden="true" size={18} /> Ask counterparty</Link>
            <button className={styles.challengeAction} onClick={share} type="button"><ShareNetwork aria-hidden="true" size={18} /> {shareLabel}</button>
          </>
        ) : (
          <>
            <Link className={styles.primaryAction} href="/evidence"><ArrowLeft aria-hidden="true" size={20} /> All evidence records</Link>
            <button className={styles.secondaryAction} onClick={share} type="button"><ShareNetwork aria-hidden="true" size={18} /> {shareLabel}</button>
            <Link className={styles.challengeAction} href="/contact?topic=evidence-report"><Flag aria-hidden="true" size={18} /> Report</Link>
          </>
        )}
      </footer>

      {timelineOpen ? (
        <section
          aria-label="Proof timeline"
          aria-modal="true"
          className={styles.timeline}
          data-pe-timeline
          data-stage-timeline
          id="evidence-proof-timeline"
          role="dialog"
        >
          <header>
            <div><p>Proof timeline</p><h2>How this trade reached its current state</h2></div>
            <button aria-label="Close timeline" onClick={() => setTimelineOpen(false)} ref={timelineCloseRef} type="button"><X aria-hidden="true" size={20} /></button>
          </header>
          <div className={styles.timelineScroll}>
            {record.timeline.map((event) => (
              <article className={styles.timelineEvent} key={event.id}>
                <time>{formatDate(event.at)}</time>
                <div><p>{event.label}</p><h3>{event.title}</h3><span>{event.description}</span>
                  {event.evidenceId ? (
                    <button data-pe-open-evidence={event.evidenceId} onClick={() => { selectArtifact(event.evidenceId as string); setTimelineOpen(false); }} type="button">
                      Inspect linked evidence <CaretRight aria-hidden="true" size={14} />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <dialog className={styles.dialog} ref={privacyDialogRef}>
        <div className={styles.dialogHeader}>
          <div><p>Public-copy privacy</p><h2>{selected.title}</h2></div>
          <button aria-label="Close privacy details" onClick={() => privacyDialogRef.current?.close()} type="button"><X aria-hidden="true" size={19} /></button>
        </div>
        <dl className={styles.dialogDetails}>
          <div><dt>What is shared</dt><dd>{selected.publicUrl ? "The certified public-safe artifact and its evidence record." : "The public evidence record and metadata; no source copy is available here."}</dd></div>
          <div><dt>Redaction state</dt><dd>{selected.redactionState.replaceAll("_", " ")}</dd></div>
          <div><dt>What is hidden</dt><dd>{selected.redactionNote}</dd></div>
          <div><dt>Viewer access</dt><dd>This viewer exposes only the public copy or public metadata recorded for this item.</dd></div>
          <div><dt>Privacy rule</dt><dd>{record.privacyScope}</dd></div>
        </dl>
        <button className={styles.dialogClose} onClick={() => privacyDialogRef.current?.close()} type="button">Done</button>
      </dialog>

      {canReview ? (
        <>
          <dialog className={styles.dialog} ref={acceptDialogRef}>
            <div className={styles.dialogHeader}>
              <div><p>Accept selected evidence</p><h2>Does this meet the frozen evidence rule?</h2></div>
              <button aria-label="Close acceptance confirmation" onClick={() => acceptDialogRef.current?.close()} type="button"><X aria-hidden="true" size={19} /></button>
            </div>
            <p className={styles.dialogCopy}>Accepting records your participant review of “{selected.title}.” It is not independent verification and this screen does not itself move money.</p>
            <form action={reviewTradeEvidenceAction} className={styles.challengeForm}>
              <input name="agreement_id" type="hidden" value={record.id} />
              <input name="evidence_id" type="hidden" value={selected.id} />
              <input name="decision" type="hidden" value="accept" />
              <input name="return_to" type="hidden" value={`/evidence/${record.id}`} />
              <div>
                <button onClick={() => acceptDialogRef.current?.close()} type="button">Keep reviewing</button>
                <PendingSubmitButton className={styles.confirmSubmit} pendingLabel="Accepting evidence…"><ShieldCheck aria-hidden="true" size={17} /> Confirm acceptance</PendingSubmitButton>
              </div>
            </form>
          </dialog>

          <dialog className={styles.dialog} ref={challengeDialogRef}>
            <div className={styles.dialogHeader}>
              <div><p>Challenge selected evidence</p><h2>Name the specific issue</h2></div>
              <button aria-label="Close challenge form" onClick={() => challengeDialogRef.current?.close()} type="button"><X aria-hidden="true" size={19} /></button>
            </div>
            <p className={styles.dialogCopy}>A challenge moves the agreement into disputed state. The other participant will see the category and explanation you record.</p>
            <form action={reviewTradeEvidenceAction} className={styles.challengeForm}>
              <input name="agreement_id" type="hidden" value={record.id} />
              <input name="evidence_id" type="hidden" value={selected.id} />
              <input name="decision" type="hidden" value="challenge" />
              <input name="return_to" type="hidden" value={`/evidence/${record.id}`} />
              <label>
                <span>Issue category</span>
                <select name="challenge_category" required defaultValue="">
                  <option disabled value="">Choose the closest issue</option>
                  <option value="factual_mismatch">Factual mismatch</option>
                  <option value="outside_scope">Outside the agreed scope</option>
                  <option value="duplicate_proof">Duplicate or reused proof</option>
                  <option value="privacy_or_coercion">Privacy or coercion concern</option>
                </select>
              </label>
              <label><span>What specifically is wrong?</span><textarea name="challenge_reason" required rows={5} /></label>
              <div>
                <button onClick={() => challengeDialogRef.current?.close()} type="button">Cancel</button>
                <PendingSubmitButton className={styles.challengeSubmit} pendingLabel="Submitting challenge…"><Flag aria-hidden="true" size={17} /> Submit challenge</PendingSubmitButton>
              </div>
            </form>
          </dialog>
        </>
      ) : null}
    </section>
  );
}

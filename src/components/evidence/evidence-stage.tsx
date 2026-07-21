"use client";

import {
  ArrowsOutSimple,
  CaretLeft,
  CaretRight,
  Check,
  Clock,
  DownloadSimple,
  File,
  FileImage,
  FilePdf,
  Flag,
  GlobeHemisphereWest,
  LinkSimple,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { reviewTradeEvidenceAction } from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import {
  formatLocalDateTimeValue,
  LocalDateTime,
} from "@/components/ui/local-date-time";

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
  mimeType: string;
  state: EvidenceStageState;
  group: string;
  submittedBy: string;
  submittedById: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  challengeWindowEndsAt: string | null;
  challengeReason: string | null;
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
  actor?: string;
  evidenceId?: string;
};

export type EvidenceStageRecord = {
  id: string;
  isExample: boolean;
  accessScope: "public" | "participant";
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

type EvidenceTab = "evidence" | "terms" | "verification";

const TABS: Array<{ id: EvidenceTab; label: string }> = [
  { id: "evidence", label: "Evidence" },
  { id: "terms", label: "Trade terms" },
  { id: "verification", label: "Verification" },
];

function evidenceDateOptions(includeTime: boolean): Intl.DateTimeFormatOptions {
  return {
    day: "numeric",
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
    month: "short",
    timeZoneName: includeTime ? "short" : undefined,
    year: "numeric",
  };
}

function EvidenceDate({
  value,
  includeTime = true,
}: {
  value: string | null;
  includeTime?: boolean;
}) {
  const options = evidenceDateOptions(includeTime);
  const fallback = formatLocalDateTimeValue(value, {
    dateOnly: !includeTime,
    locale: "en",
    options,
    timeZone: "UTC",
  })?.label ?? value ?? "Not recorded";

  return (
    <LocalDateTime
      value={value}
      fallback={fallback}
      dateOnly={!includeTime}
      locale="en"
      options={options}
    />
  );
}

function lifecycleCopy(record: EvidenceStageRecord) {
  const normalized = record.lifecycle.replaceAll("_", " ");
  if (!record.evidence.length) {
    if (record.lifecycle === "proposed" || record.lifecycle === "draft") return "Evidence not yet due";
    return "Awaiting evidence";
  }
  if (record.evidence.some((item) => item.state === "challenged")) return "Evidence disputed";
  if (record.completedAt) return <>Completed <EvidenceDate value={record.completedAt} includeTime={false} /></>;
  if (record.evidence.every((item) => item.state === "accepted")) return "All submitted evidence accepted";
  if (record.evidence.some((item) => item.state === "accepted")) return "Partially reviewed";
  return normalized === "evidence due" ? "Evidence submitted" : normalized;
}

function mediaKind(item: EvidenceStageItem) {
  if (item.preview === "receipt") return "receipt" as const;
  if (item.evidenceType === "link") return "link" as const;
  const locator = `${item.fileName} ${item.publicUrl ?? ""} ${item.mimeType}`.toLowerCase();
  if (/image\//.test(locator) || /\.(png|jpe?g|webp|avif)(?:[?#].*)?$/.test(locator)) {
    return "image" as const;
  }
  if (/application\/pdf/.test(locator) || /\.pdf(?:[?#].*)?$/.test(locator)) {
    return "pdf" as const;
  }
  if (/text\/(plain|csv|markdown)/.test(locator) || /\.(txt|csv|md)(?:[?#].*)?$/.test(locator)) {
    return "text" as const;
  }
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

function stateCopy(item: EvidenceStageItem | undefined, canReview: boolean, reviewWindowOpen = true) {
  if (!item) {
    return {
      label: "Awaiting evidence",
      title: "No evidence has been submitted",
      copy: "This page is ready for the first artifact. The agreed evidence rule and trade history remain visible in the meantime.",
    };
  }
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
      copy: "This item remains visible, but a new accept or challenge decision cannot be recorded from the closed window.",
    };
  }
  return {
    label: canReview ? "Ready for your review" : "Awaiting participant review",
    title: canReview ? "Ready for your decision" : "Submitted under the agreed evidence rule",
    copy: "Submission alone does not mean the claim has been accepted or independently verified.",
  };
}

function ArtifactIcon({ item, size = 31 }: { item: EvidenceStageItem; size?: number }) {
  const kind = mediaKind(item);
  if (kind === "image") return <FileImage aria-hidden="true" size={size} weight="thin" />;
  if (kind === "pdf") return <FilePdf aria-hidden="true" size={size} weight="thin" />;
  if (kind === "link") return <LinkSimple aria-hidden="true" size={size} weight="thin" />;
  return <File aria-hidden="true" size={size} weight="thin" />;
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
    return (
      <Image
        alt=""
        fill
        referrerPolicy="no-referrer"
        sizes="9rem"
        src={item.publicUrl}
        unoptimized
      />
    );
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
  if (kind === "text" && item.publicUrl) {
    return (
      <iframe
        className={styles.textFile}
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin"
        src={item.publicUrl}
        title={item.title}
      />
    );
  }
  if (kind === "receipt") return <ReceiptPreview />;
  return (
    <article className={styles.document}>
      <header><span>Moral Trade</span><small>Public evidence copy</small></header>
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

function Timeline({
  record,
  onSelectEvidence,
}: {
  record: EvidenceStageRecord;
  onSelectEvidence?: (id: string) => void;
}) {
  return (
    <ol className={styles.timelineList}>
      {record.timeline.map((event) => (
        <li
          className={`${styles.timelineEvent} ${
            event.label === "Challenge"
              ? styles.timelineChallenged
              : event.label === "Review" || event.label === "Completion"
                ? styles.timelineAccepted
                : styles.timelineNeutral
          }`}
          key={event.id}
        >
          <span className={styles.timelineMarker}><Check aria-hidden="true" size={12} weight="bold" /></span>
          <div className={styles.timelineCopy}>
            <strong>{event.title}</strong>
            <EvidenceDate value={event.at} />
            <p>{event.description}</p>
            {event.evidenceId && onSelectEvidence ? (
              <button
                data-pe-open-evidence={event.evidenceId}
                onClick={() => onSelectEvidence(event.evidenceId as string)}
                type="button"
              >
                Inspect evidence
              </button>
            ) : null}
          </div>
          {event.actor ? <span className={styles.timelineActor}>{event.actor}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function ReviewStatusIcon({ item }: { item: EvidenceStageItem | undefined }) {
  if (!item) return <Clock aria-hidden="true" size={20} />;
  if (item.state === "accepted") return <ShieldCheck aria-hidden="true" size={20} />;
  if (item.state === "challenged") return <Flag aria-hidden="true" size={20} />;
  return <Clock aria-hidden="true" size={20} />;
}

export function EvidenceStage({
  record,
  viewer,
}: {
  record: EvidenceStageRecord;
  viewer: EvidenceStageViewerContext;
}) {
  const [activeTab, setActiveTab] = useState<EvidenceTab>("evidence");
  const [selectedId, setSelectedId] = useState(record.evidence[0]?.id ?? "");
  const [zoom, setZoom] = useState(1);
  const [viewerOpenedAt] = useState(Date.now);
  const mediaRef = useRef<HTMLDivElement>(null);
  const fileDetailsRef = useRef<HTMLElement>(null);
  const privacyDialogRef = useRef<HTMLDialogElement>(null);
  const acceptDialogRef = useRef<HTMLDialogElement>(null);
  const challengeDialogRef = useRef<HTMLDialogElement>(null);

  const selectedIndex = useMemo(
    () => Math.max(0, record.evidence.findIndex((item) => item.id === selectedId)),
    [record.evidence, selectedId],
  );
  const selected = record.evidence[selectedIndex];
  const reviewWindowOpen = reviewWindowIsOpen(selected?.challengeWindowEndsAt ?? null, viewerOpenedAt);
  const canReview = Boolean(
    selected &&
      !record.isExample &&
      viewer.isParticipant &&
      viewer.viewerId &&
      selected.state === "submitted" &&
      selected.submittedById !== viewer.viewerId &&
      reviewWindowOpen,
  );
  const status = stateCopy(selected, canReview, reviewWindowOpen);
  const closeHref = viewer.isParticipant && viewer.agreementHref ? viewer.agreementHref : "/evidence";
  const acceptedCount = record.evidence.filter((item) => item.state === "accepted").length;

  const selectArtifact = (id: string) => {
    setSelectedId(id);
    setZoom(1);
    setActiveTab("evidence");
    if (fileDetailsRef.current) fileDetailsRef.current.scrollTop = 0;
  };

  const selectByOffset = (offset: number) => {
    if (!record.evidence.length) return;
    const nextIndex = Math.min(record.evidence.length - 1, Math.max(0, selectedIndex + offset));
    selectArtifact(record.evidence[nextIndex].id);
  };

  const enterFullscreen = async () => {
    if (!mediaRef.current?.requestFullscreen) {
      if (selected?.publicUrl) window.open(selected.publicUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await mediaRef.current.requestFullscreen();
    } catch {
      // Fullscreen can be unavailable in embedded or restricted browsers.
    }
  };

  const onViewerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectByOffset(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectByOffset(1);
    }
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: EvidenceTab) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = TABS.findIndex((item) => item.id === tab);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(current + offset + TABS.length) % TABS.length];
    setActiveTab(next.id);
    document.getElementById(`evidence-tab-${next.id}`)?.focus();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const openDialog = [privacyDialogRef, acceptDialogRef, challengeDialogRef].find(
        (ref) => ref.current?.open,
      );
      if (openDialog?.current) openDialog.current.close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section
      aria-labelledby="evidence-record-title"
      className={styles.shell}
      data-evidence-dossier
      data-pe-desk
      data-stage-evidence-viewer
    >
      {record.isExample ? (
        <p className={styles.visuallyHidden}>
          Illustrative record — the people, evidence, and review state below are examples, not marketplace activity.
        </p>
      ) : null}
      <Link aria-label="Close evidence viewer" className={styles.closeIcon} href={closeHref}>
        <X aria-hidden="true" size={26} weight="thin" />
      </Link>

      <div className={styles.frame}>
        <aside className={styles.summaryPane}>
          <div className={styles.summaryScroll}>
            <p className={styles.eyebrow}>{record.isExample ? "Illustrative moral trade" : "Moral trade evidence"}</p>
            <p className={styles.lifecycle}>{lifecycleCopy(record)}</p>
            <h1 id="evidence-record-title">{record.proposer} <span aria-hidden="true">→</span> {record.responder}</h1>

            <div className={styles.exchange} aria-label={`${record.offeredCause} in exchange for ${record.requestedCause}`}>
              <strong>{record.offeredCause}</strong>
              <span aria-hidden="true">↔</span>
              <b>{record.requestedCause}</b>
            </div>

            <div className={styles.summaryBadges}>
              <span>
                {record.accessScope === "public" ? <GlobeHemisphereWest aria-hidden="true" size={19} /> : <Lock aria-hidden="true" size={19} />}
                {record.accessScope === "public" ? "Public evidence record" : "Participant-only record"}
              </span>
              <span>
                {record.evidence.some((item) => item.state === "challenged") ? (
                  <Flag aria-hidden="true" size={19} />
                ) : acceptedCount > 0 ? (
                  <ShieldCheck aria-hidden="true" size={19} />
                ) : (
                  <Clock aria-hidden="true" size={19} />
                )}
                {acceptedCount > 0 ? `${acceptedCount} participant-reviewed` : "Review pending"}
              </span>
            </div>

            <section className={styles.sideSection} aria-labelledby="side-trade-terms">
              <h2 id="side-trade-terms">Trade terms</h2>
              <p>{record.proposedAction}</p>
              <p>{record.requestedAction}</p>
              <small>{record.duration}</small>
            </section>

            <section className={`${styles.sideSection} ${styles.verificationSection}`} aria-labelledby="side-verification">
              <h2 id="side-verification">Verification</h2>
              {record.timeline.length ? (
                <Timeline record={record} onSelectEvidence={selectArtifact} />
              ) : (
                <p className={styles.emptyTimeline}>The first event will appear when this trade is created.</p>
              )}
            </section>
          </div>

          <Link className={styles.reportConcern} href={`/contact?topic=evidence-report&record=${encodeURIComponent(record.id)}`}>
            <Flag aria-hidden="true" size={18} /> Report concern
          </Link>
        </aside>

        <div className={styles.workspace}>
          <div className={styles.mobileSummary}>
            <span>{lifecycleCopy(record)}</span>
            <strong>{record.proposer} ↔ {record.responder}</strong>
            <small>{record.offeredCause} ↔ {record.requestedCause}</small>
          </div>

          <div aria-label="Evidence record sections" className={styles.tabs} role="tablist">
            {TABS.map((tab) => (
              <button
                aria-controls={`evidence-panel-${tab.id}`}
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? styles.activeTab : ""}
                id={`evidence-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, tab.id)}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "evidence" ? (
            <div
              aria-labelledby="evidence-tab-evidence"
              className={styles.evidencePanel}
              id="evidence-panel-evidence"
              role="tabpanel"
            >
              <div className={styles.artifactToolbar}>
                <button
                  aria-label="Previous evidence item"
                  disabled={!selected || selectedIndex === 0}
                  onClick={() => selectByOffset(-1)}
                  type="button"
                >
                  <CaretLeft aria-hidden="true" size={20} />
                </button>
                <span>
                  {record.isExample ? <i>Illustrative</i> : null}
                  {selected ? `${selected.title} ${selectedIndex + 1} of ${record.evidence.length}` : "No evidence submitted"}
                </span>
                <button
                  aria-label="Next evidence item"
                  disabled={!selected || selectedIndex === record.evidence.length - 1}
                  onClick={() => selectByOffset(1)}
                  type="button"
                >
                  <CaretRight aria-hidden="true" size={20} />
                </button>
                <div className={styles.zoomControls} aria-label="Document zoom controls">
                  <button aria-label="Zoom out" disabled={!selected} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))} type="button"><Minus aria-hidden="true" size={18} /></button>
                  <button aria-label="Reset zoom" disabled={!selected} onClick={() => setZoom(1)} type="button">{Math.round(zoom * 100)}%</button>
                  <button aria-label="Zoom in" disabled={!selected} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} type="button"><Plus aria-hidden="true" size={18} /></button>
                  <button aria-label="View fullscreen" disabled={!selected} onClick={enterFullscreen} type="button"><ArrowsOutSimple aria-hidden="true" size={20} /></button>
                </div>
              </div>

              <figure
                aria-label={selected ? `${selected.title} evidence preview` : "Evidence preview"}
                className={styles.media}
                data-stage-media
                onKeyDown={onViewerKeyDown}
                ref={mediaRef}
                tabIndex={0}
              >
                {selected ? (
                  <div className={styles.mediaScroll}>
                    <div className={styles.zoomTarget} style={{ transform: `scale(${zoom})` }}>
                      <ArtifactMedia item={selected} record={record} />
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyEvidence}>
                    <File aria-hidden="true" size={46} weight="thin" />
                    <h2>No evidence submitted yet</h2>
                    <p>The trade terms and verification history are available now. Artifacts will appear here after submission.</p>
                    {viewer.isParticipant && viewer.agreementHref ? <Link href={viewer.agreementHref}>Open the trade to submit evidence</Link> : null}
                  </div>
                )}
              </figure>

              <div className={styles.artifactDetails}>
                <div className={styles.filmstrip} aria-label="Submitted evidence items">
                  {record.evidence.map((item, index) => (
                    <button
                      aria-current={item.id === selected?.id ? "true" : undefined}
                      aria-label={`Open ${item.title}`}
                      aria-pressed={item.id === selected?.id}
                      className={item.id === selected?.id ? styles.selectedArtifact : ""}
                      data-pe-select={item.id}
                      data-stage-artifact={item.id}
                      key={item.id}
                      onClick={() => selectArtifact(item.id)}
                      type="button"
                    >
                      <span className={styles.thumbnail}><ArtifactThumbnail item={item} /></span>
                      <strong>{item.title}</strong>
                      <small>{item.group} · <EvidenceDate value={item.submittedAt} includeTime={false} /></small>
                      <i>{String(index + 1).padStart(2, "0")}</i>
                    </button>
                  ))}
                </div>

                <aside className={styles.fileDetails} aria-live="polite" ref={fileDetailsRef}>
                  {selected ? (
                    <>
                      <h2>Submitted by</h2>
                      <div className={styles.submitter}>
                        <span>{selected.submittedBy.slice(0, 2).toUpperCase()}</span>
                        <p><strong>{selected.submittedBy}</strong><small><EvidenceDate value={selected.submittedAt} /></small></p>
                      </div>
                      <h2>File details</h2>
                      <p className={`${styles.artifactStatus} ${styles[`artifactStatus${selected.state[0].toUpperCase()}${selected.state.slice(1)}`]}`}>
                        {selected.state === "accepted" ? "Accepted by counterparty" : selected.state === "challenged" ? "Challenged by counterparty" : "Submitted · review pending"}
                      </p>
                      <p>{selected.fileName || "No public file"}</p>
                      <p>{selected.mimeType || selected.evidenceType.replaceAll("_", " ")}</p>
                      <p>{redactionCopy(selected.redactionState)}</p>
                      <button onClick={() => privacyDialogRef.current?.showModal()} type="button">Privacy details</button>
                      {viewer.isParticipant && viewer.threadHref ? <Link href={viewer.threadHref}>Ask counterparty</Link> : null}
                      <h2>Evidence mapping</h2>
                      <p className={styles.artifactGroup}>{selected.group}</p>
                      <p className={styles.artifactSummary}>{selected.summary}</p>
                      <p className={styles.artifactLimit}>This item supports only what is visible or stated here; it cannot establish behavior outside the submitted record.</p>
                      {selected.challengeReason ? <p className={styles.challengeReason}><strong>Challenge:</strong> {selected.challengeReason}</p> : null}
                    </>
                  ) : (
                    <><h2>Evidence status</h2><p>Awaiting the first submission.</p></>
                  )}
                </aside>
              </div>

              <footer className={styles.actions}>
                <div className={`${styles.reviewState} ${selected?.state === "challenged" ? styles.reviewChallenged : selected?.state === "accepted" ? styles.reviewAccepted : styles.reviewPending}`}>
                  <ReviewStatusIcon item={selected} />
                  <span><strong>{status.label}</strong><small>{status.copy}</small></span>
                </div>
                <div className={styles.actionButtons}>
                  {canReview ? (
                    <>
                      <button className={styles.acceptAction} onClick={() => acceptDialogRef.current?.showModal()} type="button"><ShieldCheck aria-hidden="true" size={18} /> Accept evidence</button>
                      <button className={styles.challengeAction} onClick={() => challengeDialogRef.current?.showModal()} type="button"><Flag aria-hidden="true" size={18} /> Challenge</button>
                    </>
                  ) : null}
                  {selected?.publicUrl && selected.evidenceType !== "link" ? (
                    <a download className={styles.downloadAction} href={selected.publicUrl}><DownloadSimple aria-hidden="true" size={18} /> Download</a>
                  ) : null}
                  {selected?.publicUrl ? (
                    <a className={styles.originalAction} href={selected.publicUrl} rel="noreferrer" target="_blank">View original <LinkSimple aria-hidden="true" size={17} /></a>
                  ) : selected ? (
                    <button className={styles.originalAction} onClick={() => privacyDialogRef.current?.showModal()} type="button">Availability details</button>
                  ) : null}
                  <Link className={styles.closeAction} href={closeHref}>Close</Link>
                </div>
              </footer>
            </div>
          ) : null}

          {activeTab === "terms" ? (
            <div aria-labelledby="evidence-tab-terms" className={styles.tabPanel} id="evidence-panel-terms" role="tabpanel">
              <div className={styles.panelHeading}><p>Frozen agreement</p><h2>The exact exchange both parties accepted</h2></div>
              <div className={styles.termExchange}>
                <article><span>{record.proposer}</span><strong>{record.proposedAction}</strong><small>{record.offeredCause}</small></article>
                <div aria-hidden="true">↔</div>
                <article><span>{record.responder}</span><strong>{record.requestedAction}</strong><small>{record.requestedCause}</small></article>
              </div>
              <dl className={styles.termDetails}>
                <div><dt>Duration</dt><dd>{record.duration}</dd></div>
                <div><dt>Evidence required</dt><dd>{record.evidenceRule}</dd></div>
                <div><dt>Privacy</dt><dd>{record.privacyScope}</dd></div>
                <div><dt>Record ID</dt><dd>MT–{record.id === "example" ? "EXAMPLE" : record.id.slice(0, 8).toUpperCase()}</dd></div>
              </dl>
            </div>
          ) : null}

          {activeTab === "verification" ? (
            <div aria-labelledby="evidence-tab-verification" className={styles.tabPanel} id="evidence-panel-verification" role="tabpanel">
              <div className={styles.panelHeading}><p>Verification record</p><h2>{lifecycleCopy(record)}</h2><span>Participant decisions are shown separately from independent verification.</span></div>
              <div className={styles.verificationGrid}>
                <article>
                  <ShieldCheck aria-hidden="true" size={28} weight="thin" />
                  <span>Participant review</span>
                  <strong>{acceptedCount} of {record.evidence.length} accepted</strong>
                  <p>An acceptance means the counterparty reviewed the item against the frozen rule. It is not an independent platform finding.</p>
                </article>
                <article>
                  <Lock aria-hidden="true" size={28} weight="thin" />
                  <span>Privacy scope</span>
                  <strong>{record.accessScope === "public" ? "Public evidence scope" : "Participant-only evidence scope"}</strong>
                  <p>{record.privacyScope} The selected item is {redactionCopy(selected?.redactionState ?? "pending_review").toLowerCase()}.</p>
                </article>
              </div>
              <section className={styles.fullTimeline}>
                <h3>Record history</h3>
                <Timeline record={record} onSelectEvidence={selectArtifact} />
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <dialog aria-labelledby="privacy-dialog-title" className={styles.dialog} ref={privacyDialogRef}>
        <div className={styles.dialogHeader}>
          <div><p>Evidence-copy privacy</p><h2 id="privacy-dialog-title">{selected?.title ?? "Evidence record"}</h2></div>
          <button aria-label="Close privacy details" onClick={() => privacyDialogRef.current?.close()} type="button"><X aria-hidden="true" size={19} /></button>
        </div>
        {selected ? (
          <dl className={styles.dialogDetails}>
            <div><dt>What is shared</dt><dd>{selected.publicUrl ? "The available evidence artifact and its review record." : "The evidence record and metadata; no source copy is available here."}</dd></div>
            <div><dt>Redaction state</dt><dd>{selected.redactionState.replaceAll("_", " ")}</dd></div>
            <div><dt>What is hidden</dt><dd>{selected.redactionNote}</dd></div>
            <div><dt>Viewer access</dt><dd>This viewer exposes only the public copy or public metadata recorded for this item.</dd></div>
            <div><dt>Privacy rule</dt><dd>{record.privacyScope}</dd></div>
          </dl>
        ) : <p className={styles.dialogCopy}>No artifact has been submitted.</p>}
        <button className={styles.dialogClose} onClick={() => privacyDialogRef.current?.close()} type="button">Done</button>
      </dialog>

      {canReview && selected ? (
        <>
          <dialog aria-labelledby="accept-dialog-title" className={styles.dialog} ref={acceptDialogRef}>
            <div className={styles.dialogHeader}>
              <div><p>Accept selected evidence</p><h2 id="accept-dialog-title">Does this meet the frozen evidence rule?</h2></div>
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

          <dialog aria-labelledby="challenge-dialog-title" className={styles.dialog} ref={challengeDialogRef}>
            <div className={styles.dialogHeader}>
              <div><p>Challenge selected evidence</p><h2 id="challenge-dialog-title">Name the specific issue</h2></div>
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EvidenceStage,
  type EvidenceStageItem,
  type EvidenceStageRecord,
  type EvidenceStageRedactionState,
  type EvidenceStageState,
  type EvidenceStageTimelineEvent,
  type EvidenceStageViewerContext,
} from "@/components/evidence/evidence-stage";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EvidenceState = EvidenceStageState;
type RedactionState = EvidenceStageRedactionState;
type EvidenceItem = EvidenceStageItem;
type TimelineEvent = EvidenceStageTimelineEvent;
type EvidenceRecord = EvidenceStageRecord;

type PageProps = {
  params: Promise<{ recordId?: string[] }>;
};

const CSS = String.raw`
:root{--pe-paper:#fffdf8;--pe-ink:#11120f;--pe-muted:#77766f;--pe-line:#d4d0c5;--pe-green:#2f8a4a;--pe-green-dark:#174b2b;--pe-dark:#1d211d;--pe-serif:Georgia,"Times New Roman",serif;--pe-sans:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.pe-page{min-height:100vh;background-color:#f4f2eb;background-image:linear-gradient(rgba(78,76,68,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(78,76,68,.06) 1px,transparent 1px);background-size:28px 28px;color:var(--pe-ink)}
.pe-main{width:min(1500px,calc(100vw - 36px));margin:0 auto;padding:34px 0 76px}.pe-main-record{width:100%;padding:0}.pe-hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(330px,.58fr);gap:56px;align-items:end;padding:64px 0 48px;border-bottom:1px solid #aba79d}.pe-hero h1{max-width:850px;margin:0;font:500 clamp(48px,6.5vw,92px)/.94 var(--pe-serif);letter-spacing:-.055em}.pe-lead{max-width:780px;margin:24px 0 0;color:#595a54;font-size:17px;line-height:1.65}.pe-policy{padding:24px;border:1px solid #a9a59a;background:rgba(255,253,248,.9);box-shadow:0 18px 45px rgba(28,27,23,.08)}.pe-policy strong{font:500 25px/1.1 var(--pe-serif)}.pe-policy p{margin:12px 0 16px;color:#696a63;font-size:13px;line-height:1.6}.pe-policy a,.pe-notice a{font-size:12px;font-weight:750;text-decoration:underline;text-underline-offset:4px}.pe-principles{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #b9b5aa;border-top:0;background:#fffdf8}.pe-principles article{padding:28px;min-height:210px}.pe-principles article+article{border-left:1px solid var(--pe-line)}.pe-principles span{font:700 11px/1 ui-monospace,monospace;color:#88877f;letter-spacing:.1em}.pe-principles h2{margin:34px 0 8px;font:500 25px/1.05 var(--pe-serif)}.pe-principles p{margin:0;color:#6d6d66;font-size:12px;line-height:1.58}.pe-section{padding:54px 0 0}.pe-section-head{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:18px}.pe-section-head p{margin:0 0 8px;font:700 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#77766f}.pe-section-head h2{margin:0;font:500 36px/1 var(--pe-serif);letter-spacing:-.035em}.pe-section-head>span{font-size:12px;color:#6f7069}.pe-records{display:grid;gap:10px}.pe-record-card{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(270px,.65fr) auto;gap:24px;align-items:center;padding:22px 24px;border:1px solid #b4b0a5;background:rgba(255,253,248,.92);text-decoration:none;transition:transform .18s,box-shadow .18s,border-color .18s}.pe-record-card:hover{transform:translateY(-2px);border-color:#67645d;box-shadow:0 15px 34px rgba(24,24,21,.1)}.pe-record-title small{display:block;color:var(--pe-green);font-size:10px;font-weight:800;text-transform:uppercase}.pe-record-title strong{display:block;margin-top:7px;font:500 25px/1.08 var(--pe-serif)}.pe-record-title span{display:block;margin-top:7px;color:#74736c;font-size:11px}.pe-record-meta{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pe-record-meta span{display:block;color:#83827a;font-size:9px;text-transform:uppercase}.pe-record-meta strong{display:block;margin-top:5px;font-size:11px}.pe-record-action{font-size:12px;font-weight:800}.pe-empty{padding:30px;border:1px dashed #aaa69c;background:rgba(255,253,248,.64)}.pe-empty strong{font:500 23px/1.1 var(--pe-serif)}.pe-empty p{max-width:700px;margin:9px 0 0;color:#6d6d66;font-size:12px;line-height:1.6}.pe-example{display:grid;grid-template-columns:minmax(0,.9fr) minmax(360px,1.1fr);border:1px solid #928e84;background:#173c28;color:white;overflow:hidden}.pe-example-copy{padding:42px}.pe-example-label{font:750 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#b8d8c1}.pe-example h2{max-width:570px;margin:24px 0 12px;font:500 42px/.98 var(--pe-serif);letter-spacing:-.045em}.pe-example p{max-width:560px;margin:0;color:rgba(255,255,255,.65);font-size:13px;line-height:1.6}.pe-example a{display:inline-flex;margin-top:25px;padding:11px 15px;border:1px solid rgba(255,255,255,.35);border-radius:999px;color:white;font-size:12px;font-weight:800;text-decoration:none}.pe-example-list{display:grid;align-content:center;padding:30px;background:rgba(0,0,0,.14)}.pe-example-list div{display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.14)}.pe-example-list i{font:700 9px/1 ui-monospace,monospace;color:#acd4b6}.pe-example-list strong{display:block;font-size:11px}.pe-example-list span span{display:block;margin-top:4px;color:rgba(255,255,255,.45);font-size:9px}.pe-example-list b{font-size:9px;color:#a9dfb6}.pe-notice{display:flex;justify-content:space-between;gap:24px;align-items:center;margin-bottom:15px;padding:14px 17px;border:1px solid #aaa69c;border-left:4px solid var(--pe-green);background:rgba(255,253,248,.96)}.pe-notice.example{border-left-color:#b2711d}.pe-notice strong{display:block;font-size:12px}.pe-notice p{max-width:900px;margin:4px 0 0;color:#707169;font-size:11px;line-height:1.5}
.pe-desk{height:min(820px,calc(100vh - 150px));min-height:690px;border:1px solid rgba(255,255,255,.24);border-radius:18px;overflow:hidden;background:var(--pe-dark);color:#f8f7f2;box-shadow:0 34px 90px rgba(24,24,21,.27),0 8px 25px rgba(24,24,21,.13);font-family:var(--pe-sans)}.pe-topbar{height:60px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 18px 0 22px;border-bottom:1px solid rgba(255,255,255,.13)}.pe-breadcrumbs{display:flex;align-items:center;gap:9px;min-width:0;font-size:11px;color:rgba(255,255,255,.55)}.pe-breadcrumbs a{color:inherit;text-decoration:none}.pe-breadcrumbs strong{color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pe-actions{display:flex;gap:8px;align-items:center}.pe-chip,.pe-actions button{height:36px;display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:transparent;color:white;padding:0 11px;font-size:10px;font-weight:750}.pe-chip{color:#c8e6cf;background:rgba(92,173,110,.1)}.pe-actions button{cursor:pointer}.pe-actions button:hover,.pe-actions button[aria-expanded=true]{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.35)}.pe-workbench{height:calc(100% - 60px);display:grid;grid-template-columns:235px minmax(0,1fr)}.pe-nav{border-right:1px solid rgba(255,255,255,.13);padding:18px 14px;overflow:auto}.pe-case{padding:11px 10px 18px;border-bottom:1px solid rgba(255,255,255,.13)}.pe-case>span{font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4)}.pe-case h1{margin:9px 0 0;font:500 22px/1.08 var(--pe-serif);letter-spacing:-.025em}.pe-case p{margin:9px 0 0;color:rgba(255,255,255,.5);font-size:10px}.pe-group-label{margin:18px 10px 8px;font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35)}.pe-doc-button{width:100%;display:grid;grid-template-columns:31px 1fr auto;gap:9px;align-items:center;padding:9px 8px;border:0;border-radius:9px;background:transparent;color:rgba(255,255,255,.62);text-align:left;cursor:pointer}.pe-doc-button:hover,.pe-doc-button.active{background:rgba(255,255,255,.1);color:white}.pe-file-icon{width:31px;height:35px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:4px}.pe-doc-button strong{display:block;font-size:10px}.pe-doc-button small{display:block;margin-top:3px;color:rgba(255,255,255,.38);font-size:8px}.pe-doc-button em{font-style:normal;font-size:8px;color:#9bd7a9}.pe-viewer-area{position:relative;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 295px}.pe-viewer{min-width:0;display:grid;grid-template-rows:48px 1fr;background:#dad9d3;color:var(--pe-ink)}.pe-toolbar{display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #c8c6be;background:#efeee9}.pe-toolgroup{display:flex;align-items:center;gap:6px}.pe-toolgroup button,.pe-toolgroup a{width:31px;height:31px;display:grid;place-items:center;border:1px solid #c9c6bd;border-radius:7px;background:#fbfaf6;color:var(--pe-ink);cursor:pointer}.pe-toolgroup span,.pe-toolbar>span{font-size:9px;color:#77766f}.pe-stage{overflow:auto;display:grid;place-items:start center;padding:28px 30px 52px}.pe-doc-panel{display:none;width:min(650px,100%);transform-origin:top center}.pe-doc-panel.active{display:block}.pe-paper{min-height:650px;padding:42px 45px;background:white;color:var(--pe-ink);box-shadow:0 12px 38px rgba(0,0,0,.18)}.pe-letterhead{display:flex;justify-content:space-between;gap:20px;padding-bottom:21px;border-bottom:2px solid var(--pe-ink)}.pe-letterhead strong{font:500 26px/1 var(--pe-serif)}.pe-letterhead span{text-align:right;color:#77766f;font:700 8px/1.5 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.pe-paper-kicker{margin:27px 0 6px;color:var(--pe-green);font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.pe-paper h2{margin:0;font:500 31px/1.02 var(--pe-serif);letter-spacing:-.035em}.pe-paper-lead{margin:10px 0 0;color:#6c6d66;font-size:10px;line-height:1.55}.pe-terms{display:grid;gap:12px;margin-top:25px}.pe-term{display:grid;grid-template-columns:26px 1fr;gap:11px;font-size:10px;line-height:1.5}.pe-term b{width:24px;height:24px;display:grid;place-items:center;border:1px solid #111;border-radius:50%;font-size:8px}.pe-signatures{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:60px}.pe-signatures div{border-top:1px solid #111;padding-top:8px}.pe-signatures em{display:block;font:italic 18px/1 var(--pe-serif)}.pe-signatures span{display:block;margin-top:5px;color:#77766f;font-size:8px}.pe-trip-table{margin-top:24px;border-top:1px solid #aaa69f}.pe-trip-row{display:grid;grid-template-columns:34px 82px 1fr 85px;align-items:center;min-height:42px;border-bottom:1px solid #d6d2c8;font-size:9px}.pe-trip-row b{font-family:ui-monospace,monospace}.pe-dot{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:var(--pe-green)}.pe-redact{display:inline-block;height:7px;border-radius:1px;background:#111}.pe-stamp{display:inline-flex;align-items:center;gap:8px;margin-top:27px;padding:11px 13px;border:2px solid var(--pe-green);color:var(--pe-green);font:800 10px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;transform:rotate(-1deg)}.pe-receipts{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px}.pe-receipt{padding:20px;border:1px dashed #88847d;font-family:ui-monospace,monospace}.pe-receipt>strong,.pe-receipt>small{display:block;text-align:center}.pe-receipt>small{margin-top:5px;color:#77766f;font-size:7px}.pe-receipt hr{margin:15px 0;border:0;border-top:1px dashed #88847d}.pe-receipt div{display:flex;justify-content:space-between;margin:8px 0;font-size:8px}.pe-receipt .total{font-size:13px}.pe-route-map{margin-top:25px;padding:15px;border:1px solid #d2cec3;background:#f5f3ed}.pe-route-map svg{width:100%;height:auto}.pe-payment{text-align:center;margin:35px 0 25px}.pe-payment i{width:66px;height:66px;display:grid;place-items:center;margin:0 auto 17px;border-radius:50%;background:#e8f3ea;color:var(--pe-green)}.pe-payment strong{display:block;font:500 69px/.88 var(--pe-serif);letter-spacing:-.06em}.pe-payment span{display:block;margin-top:8px;color:#77766f;font-size:9px}.pe-facts{margin:0 auto;width:min(370px,100%);border-top:1px solid #d4d0c5}.pe-facts div{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid #d4d0c5;font-size:9px}.pe-completion{display:grid;gap:11px;margin-top:25px}.pe-completion div{display:flex;gap:9px;align-items:flex-start;padding:12px;border:1px solid #d4d0c5;background:#faf8f1;font-size:10px}.pe-live-file{margin-top:26px;padding:20px;border:1px solid #d2cec3;background:#faf8f1}.pe-live-file strong{display:block;font-size:12px}.pe-live-file p{margin:8px 0 0;color:#6b6c65;font-size:10px;line-height:1.55}.pe-live-file a{display:inline-flex;margin-top:14px;padding:9px 11px;border:1px solid #aaa69c;font-size:9px;font-weight:800;text-decoration:none}.pe-live-image{display:block;max-width:100%;margin:0 auto;background:white;box-shadow:0 12px 38px rgba(0,0,0,.18)}.pe-live-pdf{width:100%;height:680px;border:0;background:white;box-shadow:0 12px 38px rgba(0,0,0,.18)}.pe-inspector{padding:21px 20px;border-left:1px solid rgba(255,255,255,.13);overflow:auto}.pe-inspector-panel{display:none}.pe-inspector-panel.active{display:block}.pe-inspector>div>p:first-child{margin:0;color:rgba(255,255,255,.4);font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.pe-inspector h2{margin:9px 0 0;font:500 23px/1.05 var(--pe-serif)}.pe-inspector-copy{margin:10px 0 20px;color:rgba(255,255,255,.55);font-size:10px;line-height:1.55}.pe-inspector dl{margin:0;border-top:1px solid rgba(255,255,255,.13)}.pe-inspector dl div{display:grid;grid-template-columns:88px 1fr;gap:11px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.13);font-size:9px}.pe-inspector dt{color:rgba(255,255,255,.38)}.pe-inspector dd{margin:0;font-weight:650}.pe-review-note{margin-top:18px;padding:14px;border:1px solid rgba(111,205,132,.27);border-radius:10px;background:rgba(111,205,132,.1)}.pe-review-note strong{display:flex;gap:7px;align-items:center;color:#a7e2b4;font-size:10px}.pe-review-note p{margin:6px 0 0;color:rgba(255,255,255,.55);font-size:9px;line-height:1.5}.pe-inspector a{display:inline-flex;align-items:center;gap:7px;margin-top:14px;color:white;font-size:9px;font-weight:750}.pe-timeline{display:none;position:absolute;inset:0 0 0 0;z-index:5;background:var(--pe-paper);color:var(--pe-ink);grid-template-rows:82px 1fr;box-shadow:-20px 0 60px rgba(0,0,0,.28)}.pe-timeline.open{display:grid}.pe-timeline-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px;border-bottom:1px solid var(--pe-line)}.pe-timeline-head p{margin:0;color:var(--pe-green);font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.pe-timeline-head h2{margin:7px 0 0;font:500 25px/1 var(--pe-serif)}.pe-timeline-head button{width:36px;height:36px;border:1px solid var(--pe-line);border-radius:50%;background:white;cursor:pointer}.pe-timeline-scroll{overflow:auto;padding:24px 30px 40px}.pe-timeline-rail{position:relative;padding-left:32px}.pe-timeline-rail:before{content:"";position:absolute;left:7px;top:12px;bottom:12px;width:1px;background:#aaa69c}.pe-event{position:relative;padding:0 0 24px 102px;border-bottom:1px solid var(--pe-line);margin-bottom:20px}.pe-event:last-child{border-bottom:0}.pe-event:before{content:"";position:absolute;left:-31px;top:4px;width:13px;height:13px;border:2px solid var(--pe-green);border-radius:50%;background:var(--pe-paper);box-shadow:0 0 0 4px var(--pe-paper)}.pe-event time{position:absolute;left:0;top:0;width:86px;color:#77766f;font:700 8px/1.4 ui-monospace,monospace;text-transform:uppercase}.pe-event>p{margin:0;color:var(--pe-green);font:700 8px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.pe-event h3{margin:6px 0 0;font-size:11px}.pe-event>span{display:block;margin-top:4px;color:#77766f;font-size:9px;line-height:1.5}.pe-event button{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:7px 9px;border:1px solid var(--pe-line);background:white;font-size:8px;font-weight:800;cursor:pointer}.pe-mobile-strip{display:none}
@media(max-width:1050px){.pe-main{width:calc(100vw - 20px)}.pe-hero{grid-template-columns:1fr}.pe-principles{grid-template-columns:1fr}.pe-principles article+article{border-left:0;border-top:1px solid var(--pe-line)}.pe-record-card{grid-template-columns:1fr auto}.pe-record-meta{display:none}.pe-workbench{grid-template-columns:205px minmax(0,1fr)}.pe-viewer-area{grid-template-columns:minmax(0,1fr)}.pe-inspector{display:none}}
@media(max-width:720px){.pe-main{width:100%;padding-top:12px}.pe-main.pe-main-record{padding:0}.pe-hero,.pe-section{margin-left:12px;margin-right:12px}.pe-hero{padding:36px 0 32px;gap:26px}.pe-hero h1{font-size:52px}.pe-lead{font-size:15px}.pe-principles{margin:0 12px}.pe-example{grid-template-columns:1fr}.pe-example-copy{padding:30px 24px}.pe-example h2{font-size:35px}.pe-example-list{padding:20px 24px}.pe-record-card{grid-template-columns:1fr;padding:18px}.pe-record-action{margin-top:4px}.pe-notice{margin:0 10px 10px;align-items:flex-start;flex-direction:column}.pe-desk{height:calc(100dvh - 78px);min-height:0;border-radius:16px 16px 0 0}.pe-topbar{height:58px;padding:0 11px}.pe-breadcrumbs span,.pe-chip{display:none}.pe-actions button{width:36px;padding:0;justify-content:center;font-size:0}.pe-workbench{height:calc(100% - 58px);display:block}.pe-nav{height:102px;padding:10px;border-right:0;border-bottom:1px solid rgba(255,255,255,.13);overflow:hidden}.pe-case{display:none}.pe-desktop-list{display:none}.pe-mobile-strip{display:flex;gap:7px;overflow-x:auto}.pe-mobile-strip button{min-width:155px;display:grid;grid-template-columns:27px 1fr;gap:8px;align-items:center;padding:9px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:transparent;color:rgba(255,255,255,.6);text-align:left}.pe-mobile-strip button.active{background:rgba(255,255,255,.1);color:white}.pe-mobile-strip strong{display:block;font-size:9px}.pe-mobile-strip small{display:block;margin-top:3px;font-size:7px;color:rgba(255,255,255,.38)}.pe-viewer-area{height:calc(100% - 102px)}.pe-toolbar>span{display:none}.pe-stage{padding:16px 9px 38px}.pe-paper{min-height:610px;padding:28px 22px}.pe-receipts{grid-template-columns:1fr}.pe-timeline{position:fixed;inset:58px 0 0;z-index:100}.pe-timeline-scroll{padding:20px 16px 40px}.pe-event{padding-left:78px}.pe-event time{width:65px}.pe-live-pdf{height:610px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;

function clean(value: unknown, fallback = "") {
  const result = typeof value === "string" ? value.trim() : "";
  return result || fallback;
}

function label(value: unknown, fallback: string) {
  const result = clean(value, fallback).replace(/\s+/g, " ");
  return result.length > 60 ? `${result.slice(0, 57).trimEnd()}…` : result;
}

function state(value: unknown): EvidenceState {
  return value === "accepted" || value === "challenged" ? value : "submitted";
}

function redaction(value: unknown): RedactionState {
  return value === "not_required" || value === "redacted" || value === "withheld"
    ? value
    : "pending_review";
}

function groupFor(title: string, evidenceType: string) {
  const value = `${title} ${evidenceType}`.toLowerCase();
  if (/(agreement|terms|contract)/.test(value)) return "Terms";
  if (/(payment|completion|confirmation|sign[- ]?off)/.test(value)) return "Payment & confirmation";
  if (evidenceType === "attestation") return "Attestations";
  return "Fulfillment";
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not recorded";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: includeTime ? "numeric" : undefined,
    minute: includeTime ? "2-digit" : undefined,
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function buildTimeline(record: Omit<EvidenceRecord, "timeline">, confirmations: Array<Record<string, unknown>>) {
  const events: TimelineEvent[] = [{
    id: "created",
    at: record.createdAt,
    label: "Agreement",
    title: "Trade record created",
    description: "The parties created the bilateral agreement record.",
  }];
  if (record.activatedAt) events.push({
    id: "activated",
    at: record.activatedAt,
    label: "Agreement",
    title: "Terms activated",
    description: "Both participants confirmed the same frozen term version.",
  });
  for (const item of record.evidence) {
    events.push({ id: `submitted-${item.id}`, at: item.submittedAt, label: "Evidence", title: `${item.title} submitted`, description: item.summary, evidenceId: item.id });
    if (item.reviewedAt) events.push({
      id: `reviewed-${item.id}`,
      at: item.reviewedAt,
      label: item.state === "challenged" ? "Challenge" : "Review",
      title: item.state === "challenged" ? `${item.title} challenged` : `${item.title} accepted`,
      description: item.state === "challenged" ? "The counterparty opened a factual or scope challenge." : "The counterparty accepted this evidence item.",
      evidenceId: item.id,
    });
  }
  confirmations.forEach((confirmation, index) => {
    const at = clean(confirmation.confirmed_at);
    if (at) events.push({ id: `confirmation-${index}`, at, label: "Confirmation", title: "Completion confirmation recorded", description: "A participant independently confirmed completion." });
  });
  if (record.completedAt) events.push({ id: "completed", at: record.completedAt, label: "Completion", title: "Trade completed", description: "The public record was finalized after both completion confirmations." });
  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

async function signedPublicUrl(supabase: any, row: Record<string, any>) {
  if (clean(row.public_visibility, "public") !== "public") return null;
  if (!["redacted", "not_required"].includes(redaction(row.redaction_status))) return null;
  const direct = clean(row.public_url);
  if (direct) return direct;
  const path = clean(row.public_storage_path);
  if (!path) return null;
  const { data, error } = await supabase.storage.from("trade-evidence").createSignedUrl(path, 1800);
  return error ? null : data?.signedUrl ?? null;
}

async function hydrate(rows: Array<Record<string, any>>, includeUrls: boolean): Promise<EvidenceRecord[]> {
  if (!rows.length) return [];
  const supabase = createServiceClient() as any;
  const agreementIds = rows.map((row) => String(row.id));
  const offerIds = rows.map((row) => clean(row.offer_id)).filter(Boolean);
  const profileIds = rows.flatMap((row) => [clean(row.proposer_id), clean(row.responder_id)]).filter(Boolean);
  const versionIds = rows.map((row) => clean(row.current_version_id)).filter(Boolean);
  const [evidenceResult, offerResult, profileResult, versionResult, confirmationResult] = await Promise.all([
    supabase.from("trade_evidence_items").select("*").in("agreement_id", agreementIds).in("public_visibility", ["public", "withheld_safety"]).order("created_at", { ascending: true }),
    offerIds.length ? supabase.from("offers").select("id,offered_cause,requested_cause").in("id", offerIds) : Promise.resolve({ data: [] }),
    profileIds.length ? supabase.from("profiles").select("id,display_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    versionIds.length ? supabase.from("trade_agreement_versions").select("id,proposed_action,requested_action,duration,evidence_rule,privacy_scope").in("id", versionIds) : Promise.resolve({ data: [] }),
    supabase.from("trade_completion_confirmations").select("agreement_id,user_id,confirmed_at").in("agreement_id", agreementIds).order("confirmed_at", { ascending: true }),
  ]);
  const byAgreement = new Map<string, Array<Record<string, any>>>();
  for (const item of evidenceResult.data ?? []) {
    const id = String(item.agreement_id);
    byAgreement.set(id, [...(byAgreement.get(id) ?? []), item]);
  }
  const offers = new Map((offerResult.data ?? []).map((row: any) => [String(row.id), row]));
  const profiles = new Map((profileResult.data ?? []).map((row: any) => [String(row.id), row]));
  const versions = new Map((versionResult.data ?? []).map((row: any) => [String(row.id), row]));
  const confirmations = new Map<string, Array<Record<string, unknown>>>();
  for (const item of confirmationResult.data ?? []) {
    const id = String(item.agreement_id);
    confirmations.set(id, [...(confirmations.get(id) ?? []), item]);
  }
  const records: EvidenceRecord[] = [];
  for (const agreement of rows) {
    const id = String(agreement.id);
    const rawEvidence = byAgreement.get(id) ?? [];
    if (!rawEvidence.length) continue;
    const offer: any = offers.get(clean(agreement.offer_id)) ?? {};
    const version: any = versions.get(clean(agreement.current_version_id)) ?? {};
    const proposer: any = profiles.get(clean(agreement.proposer_id)) ?? {};
    const responder: any = profiles.get(clean(agreement.responder_id)) ?? {};
    const evidence: EvidenceItem[] = await Promise.all(rawEvidence.map(async (item: any) => {
      const evidenceType = clean(item.evidence_type, "file");
      const title = clean(item.public_title, evidenceType === "attestation" ? "Participant attestation" : evidenceType === "link" ? "External evidence link" : "Submitted evidence file");
      const fileName = clean(item.public_original_filename, clean(item.storage_path).split("/").pop() ?? "");
      return {
        id: String(item.id),
        title,
        summary: clean(item.public_summary, clean(item.attestation, "Evidence submitted under the parties’ frozen agreement.")),
        evidenceType,
        state: state(item.status),
        group: groupFor(title, evidenceType),
        submittedBy: label(String(item.submitted_by) === String(agreement.proposer_id) ? proposer.display_name : responder.display_name, "Participant"),
        submittedById: item.submitted_by ? String(item.submitted_by) : null,
        submittedAt: clean(item.created_at, agreement.created_at),
        reviewedAt: item.reviewed_at ? String(item.reviewed_at) : null,
        challengeWindowEndsAt: item.challenge_window_ends_at
          ? String(item.challenge_window_ends_at)
          : null,
        redactionState: redaction(item.redaction_status),
        redactionNote: clean(item.public_redaction_note, "Sensitive identifiers should be removed before publication."),
        fileName,
        publicUrl: includeUrls ? await signedPublicUrl(supabase, item) : null,
        preview: "live" as const,
      };
    }));
    const partial = {
      id,
      isExample: false,
      lifecycle: clean(agreement.lifecycle_status, "active"),
      offeredCause: clean(offer.offered_cause, "Moral priority"),
      requestedCause: clean(offer.requested_cause, "Counterparty priority"),
      proposedAction: clean(version.proposed_action, "Action recorded in the agreement."),
      requestedAction: clean(version.requested_action, "Reciprocal action recorded in the agreement."),
      evidenceRule: clean(version.evidence_rule, "Evidence is evaluated against the frozen agreement."),
      duration: clean(version.duration, "Duration recorded in the agreement"),
      privacyScope: clean(version.privacy_scope, "Public by default with narrow safety exceptions."),
      proposer: label(proposer.display_name, "Proposer"),
      responder: label(responder.display_name, "Responder"),
      proposerId: agreement.proposer_id ? String(agreement.proposer_id) : null,
      responderId: agreement.responder_id ? String(agreement.responder_id) : null,
      createdAt: clean(agreement.created_at, new Date(0).toISOString()),
      activatedAt: agreement.activated_at ? String(agreement.activated_at) : null,
      completedAt: agreement.completed_at ? String(agreement.completed_at) : null,
      updatedAt: clean(agreement.public_evidence_updated_at, clean(agreement.updated_at, agreement.created_at)),
      evidence,
    };
    records.push({ ...partial, timeline: buildTimeline(partial, confirmations.get(id) ?? []) });
  }
  return records;
}

async function listRecords() {
  try {
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase.from("agreements").select("id,offer_id,proposer_id,responder_id,lifecycle_status,current_version_id,created_at,updated_at,public_evidence_updated_at,activated_at,completed_at,public_evidence_enabled").eq("public_evidence_enabled", true).order("public_evidence_updated_at", { ascending: false }).limit(50);
    return error ? [] : hydrate(data ?? [], false);
  } catch { return []; }
}

async function getRecord(id: string) {
  if (id === "example") return EXAMPLE;
  try {
    const supabase = createServiceClient() as any;
    const { data, error } = await supabase.from("agreements").select("id,offer_id,proposer_id,responder_id,lifecycle_status,current_version_id,created_at,updated_at,public_evidence_updated_at,activated_at,completed_at,public_evidence_enabled").eq("id", id).eq("public_evidence_enabled", true).maybeSingle();
    if (error || !data) return null;
    return (await hydrate([data], true))[0] ?? null;
  } catch { return null; }
}

const EXAMPLE_EVIDENCE: EvidenceItem[] = [
  { id:"before",title:"Before-meal photo",summary:"A time-stamped public-safe photo shows a lentil bowl, roasted vegetables, chickpeas, feta, and tahini before the meal.",evidenceType:"file",state:"submitted",group:"Required evidence",submittedBy:"Jordan M.",submittedById:null,submittedAt:"2026-07-18T19:43:00.000Z",reviewedAt:null,challengeWindowEndsAt:"2026-07-19T20:18:00.000Z",redactionState:"redacted",redactionNote:"Location metadata and unrelated background details are removed.",fileName:"meal-before.webp",publicUrl:"/evidence/example/meal-before.webp",preview:"meal_before" },
  { id:"receipt",title:"Itemized receipt",summary:"The itemized cafe receipt lists a lentil bowl, roasted vegetables, feta, tahini, and sparkling water; no meat, poultry, or fish is listed.",evidenceType:"file",state:"submitted",group:"Required evidence",submittedBy:"Jordan M.",submittedById:null,submittedAt:"2026-07-18T19:39:00.000Z",reviewedAt:null,challengeWindowEndsAt:"2026-07-19T20:18:00.000Z",redactionState:"redacted",redactionNote:"Order and payment identifiers are masked in the shared copy.",fileName:"green-table-receipt.txt",publicUrl:null,preview:"receipt" },
  { id:"after",title:"After-meal photo",summary:"An optional follow-up photo shows the same bowl after the meal and provides additional context beyond the two required artifacts.",evidenceType:"file",state:"submitted",group:"Optional context",submittedBy:"Jordan M.",submittedById:null,submittedAt:"2026-07-18T20:01:00.000Z",reviewedAt:null,challengeWindowEndsAt:"2026-07-19T20:18:00.000Z",redactionState:"redacted",redactionNote:"Location metadata and unrelated background details are removed.",fileName:"meal-after.webp",publicUrl:"/evidence/example/meal-after.webp",preview:"meal_after" },
];

const EXAMPLE_BASE = {
  id:"example",isExample:true,lifecycle:"evidence_due",offeredCause:"$10 payment",requestedCause:"one meat-free meal",proposedAction:"Casey R. pays Jordan M. $10 after reviewing the agreed public-safe evidence.",requestedAction:"Jordan M. eats one meal without meat, poultry, or fish.",evidenceRule:"A before-meal photo and itemized receipt captured during the agreed meal window; an after-meal photo is optional context.",duration:"One meal · 18 Jul 2026",privacyScope:"Public-safe copies only. Location, order, payment, and unrelated personal details are removed.",proposer:"Casey R.",responder:"Jordan M.",proposerId:null,responderId:null,createdAt:"2026-07-18T18:16:00.000Z",activatedAt:"2026-07-18T18:18:00.000Z",completedAt:null,updatedAt:"2026-07-18T20:02:00.000Z",evidence:EXAMPLE_EVIDENCE,
};
const EXAMPLE: EvidenceRecord = { ...EXAMPLE_BASE, timeline: buildTimeline(EXAMPLE_BASE, []) };

function Directory({ records }: { records: EvidenceRecord[] }) {
  return (
    <>
      <section className="pe-hero">
        <div>
          <h1>Inspect the proof behind every trade.</h1>
          <p className="pe-lead">
            Open a record to inspect every published artifact, its review state, applied redactions,
            and the chronology from agreement through completion.
          </p>
        </div>
        <aside className="pe-policy">
          <strong>Public evidence, not public exposure</strong>
          <p>
            Exact addresses, account numbers, private contact details, and unrelated personal
            information should be removed before publication. A narrow safety exception can
            withhold specific proof while preserving an explicit redaction state.
          </p>
          <Link href="/privacy">Read the privacy standard</Link>
        </aside>
      </section>
      <section className="pe-principles">
        <article><span>01</span><h2>Media first</h2><p>Photos, receipts, documents, and attestations stay one tap apart in an immersive review stage.</p></article>
        <article><span>02</span><h2>Status stays explicit</h2><p>Submitted, accepted, and challenged evidence remain distinct. Visibility is not presented as independent verification.</p></article>
        <article><span>03</span><h2>Limits stay visible</h2><p>Every artifact explains what it supports, what it cannot establish, and which details were removed.</p></article>
      </section>
      <section className="pe-section">
        <div className="pe-section-head"><div><p>Public directory</p><h2>Live evidence records</h2></div><span>{records.length} public record{records.length === 1 ? "" : "s"}</span></div>
        {records.length ? (
          <div className="pe-records">
            {records.map((record) => (
              <Link className="pe-record-card" href={`/evidence/${record.id}`} key={record.id}>
                <div className="pe-record-title"><small>{record.lifecycle.replaceAll("_", " ")}</small><strong>{record.offeredCause} ↔ {record.requestedCause}</strong><span>{record.proposer} → {record.responder}</span></div>
                <div className="pe-record-meta"><div><span>Evidence</span><strong>{record.evidence.length} public item{record.evidence.length === 1 ? "" : "s"}</strong></div><div><span>Updated</span><strong>{formatDate(record.updatedAt)}</strong></div></div>
                <div className="pe-record-action">Inspect →</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="pe-empty"><strong>No live evidence records have been published yet.</strong><p>Completed and in-progress trades will appear after their first public evidence item is submitted. The interface example below is clearly separated from live marketplace activity.</p></div>
        )}
      </section>
      <section className="pe-section">
        <div className="pe-section-head"><div><p>Interface example · not a live trade</p><h2>Design 01 · Evidence Stage</h2></div></div>
        <article className="pe-example">
          <div className="pe-example-copy">
            <span className="pe-example-label">Illustrative record</span>
            <h2>Review one meat-free meal without losing the full package.</h2>
            <p>Select the before photo, itemized receipt, or optional after photo; inspect privacy details, evidence limits, and the proof timeline from the same immersive stage.</p>
            <Link href="/evidence/example">Open the Design 01 evidence stage →</Link>
          </div>
          <div className="pe-example-list" aria-hidden="true">
            <div><i>01</i><span><strong>Before-meal photo</strong><span>Required · public-safe copy</span></span><b>Submitted</b></div>
            <div><i>02</i><span><strong>Itemized receipt</strong><span>Required · identifiers masked</span></span><b>Submitted</b></div>
            <div><i>03</i><span><strong>After-meal photo</strong><span>Optional context</span></span><b>Submitted</b></div>
          </div>
        </article>
      </section>
    </>
  );
}

async function Desk({
  record,
  viewerId,
}: {
  record: EvidenceRecord;
  viewerId: string | null;
}) {
  const isParticipant = Boolean(
    viewerId &&
      (viewerId === record.proposerId || viewerId === record.responderId),
  );
  let threadHref: string | null = null;

  if (isParticipant && !record.isExample) {
    try {
      const supabase = createServiceClient() as any;
      const { data } = await supabase
        .from("trade_threads")
        .select("id")
        .eq("agreement_id", record.id)
        .maybeSingle();
      threadHref = data?.id ? `/messages/${String(data.id)}` : null;
    } catch {
      threadHref = null;
    }
  }

  const viewerContext: EvidenceStageViewerContext = {
    viewerId: isParticipant ? viewerId : null,
    isParticipant,
    agreementHref: isParticipant && !record.isExample ? `/trade-agreements/${record.id}#evidence` : null,
    threadHref,
  };
  const publicRecord: EvidenceRecord = {
    ...record,
    proposerId: null,
    responderId: null,
    evidence: record.evidence.map((item) => ({
      ...item,
      submittedById: isParticipant ? item.submittedById : null,
    })),
  };

  return <EvidenceStage record={publicRecord} viewer={viewerContext} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { recordId } = await params;
  const id = recordId?.[0];
  if (!id) return { title:"Public evidence", description:"Inspect the evidence, review state, redactions, and chronology behind Moral Trade records." };
  const record = await getRecord(id);
  if (!record) return { title:"Evidence record unavailable", robots:{index:false,follow:false} };
  return { title:record.isExample?"Example public evidence record":`${record.offeredCause} ↔ ${record.requestedCause} evidence`, description:"Inspect the public evidence, review state, redactions, and proof timeline for this Moral Trade record.", robots:record.isExample?{index:false,follow:false}:{index:true,follow:true}, alternates:record.isExample?undefined:{canonical:`/evidence/${record.id}`} };
}

export default async function EvidencePage({ params }: PageProps) {
  const [{ recordId }, viewer] = await Promise.all([params, getViewer()]);
  const id = recordId?.[0];
  const record = id ? await getRecord(id) : null;
  if (id && !record) notFound();
  const records = id ? [] : await listRecords();
  return (
    <div className="pe-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showSearch
          showLogout={Boolean(viewer)}
        />
      </header>
      <main className={`pe-main ${record ? "pe-main-record" : ""}`} id="main-content" tabIndex={-1}>
        {record ? <Desk record={record} viewerId={viewer?.authUser.id ?? null} /> : <Directory records={records} />}
      </main>
      <SiteFooter />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EvidenceState = "submitted" | "accepted" | "challenged";
type RedactionState = "pending_review" | "not_required" | "redacted" | "withheld";

type EvidenceItem = {
  id: string;
  title: string;
  summary: string;
  evidenceType: string;
  state: EvidenceState;
  group: string;
  submittedBy: string;
  submittedAt: string;
  reviewedAt: string | null;
  redactionState: RedactionState;
  redactionNote: string;
  fileName: string;
  publicUrl: string | null;
  preview: "agreement" | "trip" | "transit" | "routes" | "payment" | "completion" | "live";
};

type TimelineEvent = {
  id: string;
  at: string;
  label: string;
  title: string;
  description: string;
  evidenceId?: string;
};

type EvidenceRecord = {
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
  createdAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
};

type PageProps = {
  params: Promise<{ recordId?: string[] }>;
};

const CSS = String.raw`
:root{--pe-paper:#fffdf8;--pe-ink:#11120f;--pe-muted:#77766f;--pe-line:#d4d0c5;--pe-green:#2f8a4a;--pe-green-dark:#174b2b;--pe-dark:#1d211d;--pe-serif:Georgia,"Times New Roman",serif;--pe-sans:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.pe-page{min-height:100vh;background-color:#f4f2eb;background-image:linear-gradient(rgba(78,76,68,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(78,76,68,.06) 1px,transparent 1px);background-size:28px 28px;color:var(--pe-ink)}
.pe-main{width:min(1500px,calc(100vw - 36px));margin:0 auto;padding:34px 0 76px}.pe-hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(330px,.58fr);gap:56px;align-items:end;padding:64px 0 48px;border-bottom:1px solid #aba79d}.pe-hero h1{max-width:850px;margin:0;font:500 clamp(48px,6.5vw,92px)/.94 var(--pe-serif);letter-spacing:-.055em}.pe-lead{max-width:780px;margin:24px 0 0;color:#595a54;font-size:17px;line-height:1.65}.pe-policy{padding:24px;border:1px solid #a9a59a;background:rgba(255,253,248,.9);box-shadow:0 18px 45px rgba(28,27,23,.08)}.pe-policy strong{font:500 25px/1.1 var(--pe-serif)}.pe-policy p{margin:12px 0 16px;color:#696a63;font-size:13px;line-height:1.6}.pe-policy a,.pe-notice a{font-size:12px;font-weight:750;text-decoration:underline;text-underline-offset:4px}.pe-principles{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #b9b5aa;border-top:0;background:#fffdf8}.pe-principles article{padding:28px;min-height:210px}.pe-principles article+article{border-left:1px solid var(--pe-line)}.pe-principles span{font:700 11px/1 ui-monospace,monospace;color:#88877f;letter-spacing:.1em}.pe-principles h2{margin:34px 0 8px;font:500 25px/1.05 var(--pe-serif)}.pe-principles p{margin:0;color:#6d6d66;font-size:12px;line-height:1.58}.pe-section{padding:54px 0 0}.pe-section-head{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:18px}.pe-section-head p{margin:0 0 8px;font:700 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#77766f}.pe-section-head h2{margin:0;font:500 36px/1 var(--pe-serif);letter-spacing:-.035em}.pe-section-head>span{font-size:12px;color:#6f7069}.pe-records{display:grid;gap:10px}.pe-record-card{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(270px,.65fr) auto;gap:24px;align-items:center;padding:22px 24px;border:1px solid #b4b0a5;background:rgba(255,253,248,.92);text-decoration:none;transition:transform .18s,box-shadow .18s,border-color .18s}.pe-record-card:hover{transform:translateY(-2px);border-color:#67645d;box-shadow:0 15px 34px rgba(24,24,21,.1)}.pe-record-title small{display:block;color:var(--pe-green);font-size:10px;font-weight:800;text-transform:uppercase}.pe-record-title strong{display:block;margin-top:7px;font:500 25px/1.08 var(--pe-serif)}.pe-record-title span{display:block;margin-top:7px;color:#74736c;font-size:11px}.pe-record-meta{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pe-record-meta span{display:block;color:#83827a;font-size:9px;text-transform:uppercase}.pe-record-meta strong{display:block;margin-top:5px;font-size:11px}.pe-record-action{font-size:12px;font-weight:800}.pe-empty{padding:30px;border:1px dashed #aaa69c;background:rgba(255,253,248,.64)}.pe-empty strong{font:500 23px/1.1 var(--pe-serif)}.pe-empty p{max-width:700px;margin:9px 0 0;color:#6d6d66;font-size:12px;line-height:1.6}.pe-example{display:grid;grid-template-columns:minmax(0,.9fr) minmax(360px,1.1fr);border:1px solid #928e84;background:#173c28;color:white;overflow:hidden}.pe-example-copy{padding:42px}.pe-example-label{font:750 10px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#b8d8c1}.pe-example h2{max-width:570px;margin:24px 0 12px;font:500 42px/.98 var(--pe-serif);letter-spacing:-.045em}.pe-example p{max-width:560px;margin:0;color:rgba(255,255,255,.65);font-size:13px;line-height:1.6}.pe-example a{display:inline-flex;margin-top:25px;padding:11px 15px;border:1px solid rgba(255,255,255,.35);border-radius:999px;color:white;font-size:12px;font-weight:800;text-decoration:none}.pe-example-list{display:grid;align-content:center;padding:30px;background:rgba(0,0,0,.14)}.pe-example-list div{display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.14)}.pe-example-list i{font:700 9px/1 ui-monospace,monospace;color:#acd4b6}.pe-example-list strong{display:block;font-size:11px}.pe-example-list span span{display:block;margin-top:4px;color:rgba(255,255,255,.45);font-size:9px}.pe-example-list b{font-size:9px;color:#a9dfb6}.pe-notice{display:flex;justify-content:space-between;gap:24px;align-items:center;margin-bottom:15px;padding:14px 17px;border:1px solid #aaa69c;border-left:4px solid var(--pe-green);background:rgba(255,253,248,.96)}.pe-notice.example{border-left-color:#b2711d}.pe-notice strong{display:block;font-size:12px}.pe-notice p{max-width:900px;margin:4px 0 0;color:#707169;font-size:11px;line-height:1.5}
.pe-desk{height:min(820px,calc(100vh - 150px));min-height:690px;border:1px solid rgba(255,255,255,.24);border-radius:18px;overflow:hidden;background:var(--pe-dark);color:#f8f7f2;box-shadow:0 34px 90px rgba(24,24,21,.27),0 8px 25px rgba(24,24,21,.13);font-family:var(--pe-sans)}.pe-topbar{height:60px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 18px 0 22px;border-bottom:1px solid rgba(255,255,255,.13)}.pe-breadcrumbs{display:flex;align-items:center;gap:9px;min-width:0;font-size:11px;color:rgba(255,255,255,.55)}.pe-breadcrumbs a{color:inherit;text-decoration:none}.pe-breadcrumbs strong{color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pe-actions{display:flex;gap:8px;align-items:center}.pe-chip,.pe-actions button{height:36px;display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:transparent;color:white;padding:0 11px;font-size:10px;font-weight:750}.pe-chip{color:#c8e6cf;background:rgba(92,173,110,.1)}.pe-actions button{cursor:pointer}.pe-actions button:hover,.pe-actions button[aria-expanded=true]{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.35)}.pe-workbench{height:calc(100% - 60px);display:grid;grid-template-columns:235px minmax(0,1fr)}.pe-nav{border-right:1px solid rgba(255,255,255,.13);padding:18px 14px;overflow:auto}.pe-case{padding:11px 10px 18px;border-bottom:1px solid rgba(255,255,255,.13)}.pe-case>span{font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4)}.pe-case h1{margin:9px 0 0;font:500 22px/1.08 var(--pe-serif);letter-spacing:-.025em}.pe-case p{margin:9px 0 0;color:rgba(255,255,255,.5);font-size:10px}.pe-group-label{margin:18px 10px 8px;font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35)}.pe-doc-button{width:100%;display:grid;grid-template-columns:31px 1fr auto;gap:9px;align-items:center;padding:9px 8px;border:0;border-radius:9px;background:transparent;color:rgba(255,255,255,.62);text-align:left;cursor:pointer}.pe-doc-button:hover,.pe-doc-button.active{background:rgba(255,255,255,.1);color:white}.pe-file-icon{width:31px;height:35px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:4px}.pe-doc-button strong{display:block;font-size:10px}.pe-doc-button small{display:block;margin-top:3px;color:rgba(255,255,255,.38);font-size:8px}.pe-doc-button em{font-style:normal;font-size:8px;color:#9bd7a9}.pe-viewer-area{position:relative;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 295px}.pe-viewer{min-width:0;display:grid;grid-template-rows:48px 1fr;background:#dad9d3;color:var(--pe-ink)}.pe-toolbar{display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #c8c6be;background:#efeee9}.pe-toolgroup{display:flex;align-items:center;gap:6px}.pe-toolgroup button,.pe-toolgroup a{width:31px;height:31px;display:grid;place-items:center;border:1px solid #c9c6bd;border-radius:7px;background:#fbfaf6;color:var(--pe-ink);cursor:pointer}.pe-toolgroup span,.pe-toolbar>span{font-size:9px;color:#77766f}.pe-stage{overflow:auto;display:grid;place-items:start center;padding:28px 30px 52px}.pe-doc-panel{display:none;width:min(650px,100%);transform-origin:top center}.pe-doc-panel.active{display:block}.pe-paper{min-height:650px;padding:42px 45px;background:white;color:var(--pe-ink);box-shadow:0 12px 38px rgba(0,0,0,.18)}.pe-letterhead{display:flex;justify-content:space-between;gap:20px;padding-bottom:21px;border-bottom:2px solid var(--pe-ink)}.pe-letterhead strong{font:500 26px/1 var(--pe-serif)}.pe-letterhead span{text-align:right;color:#77766f;font:700 8px/1.5 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.pe-paper-kicker{margin:27px 0 6px;color:var(--pe-green);font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.pe-paper h2{margin:0;font:500 31px/1.02 var(--pe-serif);letter-spacing:-.035em}.pe-paper-lead{margin:10px 0 0;color:#6c6d66;font-size:10px;line-height:1.55}.pe-terms{display:grid;gap:12px;margin-top:25px}.pe-term{display:grid;grid-template-columns:26px 1fr;gap:11px;font-size:10px;line-height:1.5}.pe-term b{width:24px;height:24px;display:grid;place-items:center;border:1px solid #111;border-radius:50%;font-size:8px}.pe-signatures{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:60px}.pe-signatures div{border-top:1px solid #111;padding-top:8px}.pe-signatures em{display:block;font:italic 18px/1 var(--pe-serif)}.pe-signatures span{display:block;margin-top:5px;color:#77766f;font-size:8px}.pe-trip-table{margin-top:24px;border-top:1px solid #aaa69f}.pe-trip-row{display:grid;grid-template-columns:34px 82px 1fr 85px;align-items:center;min-height:42px;border-bottom:1px solid #d6d2c8;font-size:9px}.pe-trip-row b{font-family:ui-monospace,monospace}.pe-dot{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:var(--pe-green)}.pe-redact{display:inline-block;height:7px;border-radius:1px;background:#111}.pe-stamp{display:inline-flex;align-items:center;gap:8px;margin-top:27px;padding:11px 13px;border:2px solid var(--pe-green);color:var(--pe-green);font:800 10px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;transform:rotate(-1deg)}.pe-receipts{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px}.pe-receipt{padding:20px;border:1px dashed #88847d;font-family:ui-monospace,monospace}.pe-receipt>strong,.pe-receipt>small{display:block;text-align:center}.pe-receipt>small{margin-top:5px;color:#77766f;font-size:7px}.pe-receipt hr{margin:15px 0;border:0;border-top:1px dashed #88847d}.pe-receipt div{display:flex;justify-content:space-between;margin:8px 0;font-size:8px}.pe-receipt .total{font-size:13px}.pe-route-map{margin-top:25px;padding:15px;border:1px solid #d2cec3;background:#f5f3ed}.pe-route-map svg{width:100%;height:auto}.pe-payment{text-align:center;margin:35px 0 25px}.pe-payment i{width:66px;height:66px;display:grid;place-items:center;margin:0 auto 17px;border-radius:50%;background:#e8f3ea;color:var(--pe-green)}.pe-payment strong{display:block;font:500 69px/.88 var(--pe-serif);letter-spacing:-.06em}.pe-payment span{display:block;margin-top:8px;color:#77766f;font-size:9px}.pe-facts{margin:0 auto;width:min(370px,100%);border-top:1px solid #d4d0c5}.pe-facts div{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid #d4d0c5;font-size:9px}.pe-completion{display:grid;gap:11px;margin-top:25px}.pe-completion div{display:flex;gap:9px;align-items:flex-start;padding:12px;border:1px solid #d4d0c5;background:#faf8f1;font-size:10px}.pe-live-file{margin-top:26px;padding:20px;border:1px solid #d2cec3;background:#faf8f1}.pe-live-file strong{display:block;font-size:12px}.pe-live-file p{margin:8px 0 0;color:#6b6c65;font-size:10px;line-height:1.55}.pe-live-file a{display:inline-flex;margin-top:14px;padding:9px 11px;border:1px solid #aaa69c;font-size:9px;font-weight:800;text-decoration:none}.pe-live-image{display:block;max-width:100%;margin:0 auto;background:white;box-shadow:0 12px 38px rgba(0,0,0,.18)}.pe-live-pdf{width:100%;height:680px;border:0;background:white;box-shadow:0 12px 38px rgba(0,0,0,.18)}.pe-inspector{padding:21px 20px;border-left:1px solid rgba(255,255,255,.13);overflow:auto}.pe-inspector-panel{display:none}.pe-inspector-panel.active{display:block}.pe-inspector>div>p:first-child{margin:0;color:rgba(255,255,255,.4);font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.pe-inspector h2{margin:9px 0 0;font:500 23px/1.05 var(--pe-serif)}.pe-inspector-copy{margin:10px 0 20px;color:rgba(255,255,255,.55);font-size:10px;line-height:1.55}.pe-inspector dl{margin:0;border-top:1px solid rgba(255,255,255,.13)}.pe-inspector dl div{display:grid;grid-template-columns:88px 1fr;gap:11px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.13);font-size:9px}.pe-inspector dt{color:rgba(255,255,255,.38)}.pe-inspector dd{margin:0;font-weight:650}.pe-review-note{margin-top:18px;padding:14px;border:1px solid rgba(111,205,132,.27);border-radius:10px;background:rgba(111,205,132,.1)}.pe-review-note strong{display:flex;gap:7px;align-items:center;color:#a7e2b4;font-size:10px}.pe-review-note p{margin:6px 0 0;color:rgba(255,255,255,.55);font-size:9px;line-height:1.5}.pe-inspector a{display:inline-flex;align-items:center;gap:7px;margin-top:14px;color:white;font-size:9px;font-weight:750}.pe-timeline{display:none;position:absolute;inset:0 0 0 0;z-index:5;background:var(--pe-paper);color:var(--pe-ink);grid-template-rows:82px 1fr;box-shadow:-20px 0 60px rgba(0,0,0,.28)}.pe-timeline.open{display:grid}.pe-timeline-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px;border-bottom:1px solid var(--pe-line)}.pe-timeline-head p{margin:0;color:var(--pe-green);font:700 9px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}.pe-timeline-head h2{margin:7px 0 0;font:500 25px/1 var(--pe-serif)}.pe-timeline-head button{width:36px;height:36px;border:1px solid var(--pe-line);border-radius:50%;background:white;cursor:pointer}.pe-timeline-scroll{overflow:auto;padding:24px 30px 40px}.pe-timeline-rail{position:relative;padding-left:32px}.pe-timeline-rail:before{content:"";position:absolute;left:7px;top:12px;bottom:12px;width:1px;background:#aaa69c}.pe-event{position:relative;padding:0 0 24px 102px;border-bottom:1px solid var(--pe-line);margin-bottom:20px}.pe-event:last-child{border-bottom:0}.pe-event:before{content:"";position:absolute;left:-31px;top:4px;width:13px;height:13px;border:2px solid var(--pe-green);border-radius:50%;background:var(--pe-paper);box-shadow:0 0 0 4px var(--pe-paper)}.pe-event time{position:absolute;left:0;top:0;width:86px;color:#77766f;font:700 8px/1.4 ui-monospace,monospace;text-transform:uppercase}.pe-event>p{margin:0;color:var(--pe-green);font:700 8px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em}.pe-event h3{margin:6px 0 0;font-size:11px}.pe-event>span{display:block;margin-top:4px;color:#77766f;font-size:9px;line-height:1.5}.pe-event button{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:7px 9px;border:1px solid var(--pe-line);background:white;font-size:8px;font-weight:800;cursor:pointer}.pe-mobile-strip{display:none}
@media(max-width:1050px){.pe-main{width:calc(100vw - 20px)}.pe-hero{grid-template-columns:1fr}.pe-principles{grid-template-columns:1fr}.pe-principles article+article{border-left:0;border-top:1px solid var(--pe-line)}.pe-record-card{grid-template-columns:1fr auto}.pe-record-meta{display:none}.pe-workbench{grid-template-columns:205px minmax(0,1fr)}.pe-viewer-area{grid-template-columns:minmax(0,1fr)}.pe-inspector{display:none}}
@media(max-width:720px){.pe-main{width:100%;padding-top:12px}.pe-hero,.pe-section{margin-left:12px;margin-right:12px}.pe-hero{padding:36px 0 32px;gap:26px}.pe-hero h1{font-size:52px}.pe-lead{font-size:15px}.pe-principles{margin:0 12px}.pe-example{grid-template-columns:1fr}.pe-example-copy{padding:30px 24px}.pe-example h2{font-size:35px}.pe-example-list{padding:20px 24px}.pe-record-card{grid-template-columns:1fr;padding:18px}.pe-record-action{margin-top:4px}.pe-notice{margin:0 10px 10px;align-items:flex-start;flex-direction:column}.pe-desk{height:calc(100dvh - 78px);min-height:0;border-radius:16px 16px 0 0}.pe-topbar{height:58px;padding:0 11px}.pe-breadcrumbs span,.pe-chip{display:none}.pe-actions button{width:36px;padding:0;justify-content:center;font-size:0}.pe-workbench{height:calc(100% - 58px);display:block}.pe-nav{height:102px;padding:10px;border-right:0;border-bottom:1px solid rgba(255,255,255,.13);overflow:hidden}.pe-case{display:none}.pe-desktop-list{display:none}.pe-mobile-strip{display:flex;gap:7px;overflow-x:auto}.pe-mobile-strip button{min-width:155px;display:grid;grid-template-columns:27px 1fr;gap:8px;align-items:center;padding:9px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:transparent;color:rgba(255,255,255,.6);text-align:left}.pe-mobile-strip button.active{background:rgba(255,255,255,.1);color:white}.pe-mobile-strip strong{display:block;font-size:9px}.pe-mobile-strip small{display:block;margin-top:3px;font-size:7px;color:rgba(255,255,255,.38)}.pe-viewer-area{height:calc(100% - 102px)}.pe-toolbar>span{display:none}.pe-stage{padding:16px 9px 38px}.pe-paper{min-height:610px;padding:28px 22px}.pe-receipts{grid-template-columns:1fr}.pe-timeline{position:fixed;inset:58px 0 0;z-index:100}.pe-timeline-scroll{padding:20px 16px 40px}.pe-event{padding-left:78px}.pe-event time{width:65px}.pe-live-pdf{height:610px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;

const SCRIPT = String.raw`
(function(){
  const desk=document.querySelector('[data-pe-desk]');
  if(!desk)return;
  const buttons=[...desk.querySelectorAll('[data-pe-select]')];
  const docs=[...desk.querySelectorAll('[data-pe-document]')];
  const inspectors=[...desk.querySelectorAll('[data-pe-inspector]')];
  const timeline=desk.querySelector('[data-pe-timeline]');
  const zoomLabel=desk.querySelector('[data-pe-zoom-label]');
  let selected=buttons[0]?.getAttribute('data-pe-select')||'';
  let zoom=1;
  function applyZoom(){
    docs.forEach((doc)=>{const inner=doc.querySelector('[data-pe-zoom-target]');if(inner)inner.style.transform='scale('+zoom+')';});
    if(zoomLabel)zoomLabel.textContent=Math.round(zoom*100)+'%';
  }
  function select(id){
    selected=id;
    buttons.forEach((button)=>{const active=button.getAttribute('data-pe-select')===id;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});
    docs.forEach((doc)=>doc.classList.toggle('active',doc.getAttribute('data-pe-document')===id));
    inspectors.forEach((panel)=>panel.classList.toggle('active',panel.getAttribute('data-pe-inspector')===id));
    zoom=1;applyZoom();
  }
  desk.addEventListener('click',async(event)=>{
    const selectButton=event.target.closest('[data-pe-select]');if(selectButton){select(selectButton.getAttribute('data-pe-select'));return;}
    const linked=event.target.closest('[data-pe-open-evidence]');if(linked){select(linked.getAttribute('data-pe-open-evidence'));timeline?.classList.remove('open');return;}
    if(event.target.closest('[data-pe-timeline-toggle]')){timeline?.classList.toggle('open');return;}
    if(event.target.closest('[data-pe-timeline-close]')){timeline?.classList.remove('open');return;}
    if(event.target.closest('[data-pe-zoom-in]')){zoom=Math.min(1.3,Math.round((zoom+.1)*10)/10);applyZoom();return;}
    if(event.target.closest('[data-pe-zoom-out]')){zoom=Math.max(.8,Math.round((zoom-.1)*10)/10);applyZoom();return;}
    if(event.target.closest('[data-pe-share]')){try{await navigator.clipboard.writeText(location.href);event.target.closest('button').lastChild.textContent=' Copied';setTimeout(()=>location.reload(),1100)}catch(_){}}
  });
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')timeline?.classList.remove('open');});
  select(selected);applyZoom();
})();
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
  const path = clean(row.storage_path);
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
        submittedAt: clean(item.created_at, agreement.created_at),
        reviewedAt: item.reviewed_at ? String(item.reviewed_at) : null,
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
  { id:"agreement",title:"Original trade agreement",summary:"Sam pays $75 after Riley documents ten planned car trips replaced by transit or bicycle.",evidenceType:"document",state:"accepted",group:"Terms",submittedBy:"Sam G. + Riley P.",submittedAt:"2026-06-18T14:18:00.000Z",reviewedAt:"2026-06-18T14:18:00.000Z",redactionState:"not_required",redactionNote:"The example contains no private contact or financial details.",fileName:"trade-agreement.pdf",publicUrl:null,preview:"agreement" },
  { id:"trip-log",title:"Trip log · 10 entries",summary:"A dated master log links every replaced car trip to a transit receipt or bicycle route record.",evidenceType:"file",state:"accepted",group:"Fulfillment",submittedBy:"Riley P.",submittedAt:"2026-06-28T18:42:00.000Z",reviewedAt:"2026-06-29T08:52:00.000Z",redactionState:"redacted",redactionNote:"Exact origin and destination addresses are hidden.",fileName:"trip-log-redacted.pdf",publicUrl:null,preview:"trip" },
  { id:"transit",title:"Transit receipts · 7 records",summary:"Seven fare confirmations have dates and times compatible with the trip-log entries.",evidenceType:"file",state:"accepted",group:"Fulfillment",submittedBy:"Riley P.",submittedAt:"2026-06-28T18:43:00.000Z",reviewedAt:"2026-06-29T08:54:00.000Z",redactionState:"redacted",redactionNote:"Transit account identifiers are masked.",fileName:"transit-receipts-redacted.pdf",publicUrl:null,preview:"transit" },
  { id:"routes",title:"Bicycle routes · 3 records",summary:"Three route traces document the remaining trips, with exact endpoints removed.",evidenceType:"file",state:"accepted",group:"Fulfillment",submittedBy:"Riley P.",submittedAt:"2026-06-28T18:44:00.000Z",reviewedAt:"2026-06-29T08:56:00.000Z",redactionState:"redacted",redactionNote:"Home, work, and exact trip endpoints are hidden.",fileName:"bicycle-routes-redacted.pdf",publicUrl:null,preview:"routes" },
  { id:"payment",title:"Payment confirmation · $75",summary:"The amount, recipient, and timing match the accepted agreement.",evidenceType:"file",state:"accepted",group:"Payment & confirmation",submittedBy:"Sam G.",submittedAt:"2026-06-29T09:03:00.000Z",reviewedAt:"2026-06-29T09:08:00.000Z",redactionState:"redacted",redactionNote:"Bank and payment-account identifiers are masked.",fileName:"payment-confirmation-redacted.pdf",publicUrl:null,preview:"payment" },
  { id:"completion",title:"Mutual completion confirmation",summary:"Both participants independently confirmed the exchange and public record.",evidenceType:"attestation",state:"accepted",group:"Payment & confirmation",submittedBy:"Sam G. + Riley P.",submittedAt:"2026-06-29T09:14:00.000Z",reviewedAt:"2026-06-29T09:14:00.000Z",redactionState:"not_required",redactionNote:"Only the names chosen for public display are shown.",fileName:"completion-confirmation.pdf",publicUrl:null,preview:"completion" },
];

const EXAMPLE_BASE = {
  id:"example",isExample:true,lifecycle:"completed",offeredCause:"$75 payment",requestedCause:"10 car trips replaced",proposedAction:"Sam G. pays Riley P. $75 after a complete evidence package is submitted.",requestedAction:"Riley P. replaces ten planned car trips with transit or bicycle trips.",evidenceRule:"A dated trip log plus a receipt or route record for each trip, followed by mutual confirmation.",duration:"18–29 Jun 2026",privacyScope:"Public by default. Exact addresses, account numbers, and unrelated details are redacted.",proposer:"Sam G.",responder:"Riley P.",createdAt:"2026-06-18T14:16:00.000Z",activatedAt:"2026-06-18T14:18:00.000Z",completedAt:"2026-06-29T09:14:00.000Z",updatedAt:"2026-06-29T09:14:00.000Z",evidence:EXAMPLE_EVIDENCE,
};
const EXAMPLE: EvidenceRecord = { ...EXAMPLE_BASE, timeline: buildTimeline(EXAMPLE_BASE, [{confirmed_at:"2026-06-29T09:11:00.000Z"},{confirmed_at:"2026-06-29T09:14:00.000Z"}]) };

function Icon({ name }: { name: "back" | "check" | "copy" | "file" | "globe" | "layers" | "link" | "minus" | "plus" | "shield" | "x" }) {
  const body = {
    back:<path d="M19 12H5m6 6-6-6 6-6"/>,check:<path d="m5 12 4 4L19 6"/>,copy:<><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,file:<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.5 4.2 5.5 4.2 9S14.8 18.5 12 21M12 3C9.2 5.5 7.8 8.5 7.8 12S9.2 18.5 12 21"/></>,layers:<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,link:<><path d="M10 13a4 4 0 0 0 5.7.1l2.2-2.2a4 4 0 0 0-5.7-5.7L11 6.4"/><path d="M14 11a4 4 0 0 0-5.7-.1l-2.2 2.2a4 4 0 0 0 5.7 5.7l1.2-1.2"/></>,minus:<path d="M5 12h14"/>,plus:<path d="M12 5v14M5 12h14"/>,shield:<><path d="M12 3 4.5 6v5.2c0 4.7 3 8.1 7.5 9.8 4.5-1.7 7.5-5.1 7.5-9.8V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,x:<path d="M6 6l12 12M18 6 6 18"/>,
  }[name];
  return <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">{body}</svg>;
}

function Receipt({ date, time }: { date: string; time: string }) {
  return <div className="pe-receipt"><strong>CITY TRANSIT</strong><small>Mobile fare confirmation</small><hr/><div><span>Date</span><b>{date}</b></div><div><span>Time</span><b>{time}</b></div><div><span>Account</span><b>•••• 3812</b></div><div><span>Fare</span><b>$4.40</b></div><hr/><div className="total"><span>Total</span><b>$4.40</b></div></div>;
}

function Preview({ item, record }: { item: EvidenceItem; record: EvidenceRecord }) {
  if (item.preview === "agreement") return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Moral Trade</strong><span>Illustrative public record<br/>Accepted 18 Jun 2026</span></header><p className="pe-paper-kicker">Original terms</p><h2>Sam G. → Riley P.</h2><p className="pe-paper-lead">Agreement to exchange $75 for documented replacement of ten planned car trips.</p><div className="pe-terms"><div className="pe-term"><b>1</b><span>Riley replaces ten trips that would otherwise be taken by car.</span></div><div className="pe-term"><b>2</b><span>Every trip is supported by a receipt, route record, or agreed proof.</span></div><div className="pe-term"><b>3</b><span>Sam releases $75 after reviewing the complete package.</span></div><div className="pe-term"><b>4</b><span>The completed trade and redacted evidence are public by default.</span></div></div><div className="pe-signatures"><div><em>Sam G.</em><span>Confirmed 18 Jun · 2:16 PM</span></div><div><em>Riley P.</em><span>Confirmed 18 Jun · 2:18 PM</span></div></div></article></div>;
  if (item.preview === "trip") return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Moral Trade</strong><span>Public evidence copy<br/>Locations redacted</span></header><p className="pe-paper-kicker">Fulfillment evidence</p><h2>Trip replacement log</h2><p className="pe-paper-lead">Ten dated entries during the completion window.</p><div className="pe-trip-table">{["Transit","Transit","Bicycle","Transit","Transit","Bicycle","Transit","Transit","Bicycle","Transit"].map((mode,index)=><div className="pe-trip-row" key={index}><b>{String(index+1).padStart(2,"0")}</b><span>{20+Math.min(index,7)} Jun</span><span><i className="pe-dot"/>{mode}</span><span className="pe-redact" style={{width:`${36+(index%3)*8}px`}}/></div>)}</div><div className="pe-stamp"><Icon name="check"/>10 of 10 records matched</div></article></div>;
  if (item.preview === "transit") return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Transit receipts</strong><span>Illustrative public copy<br/>7 records · 4 pages</span></header><p className="pe-paper-kicker">Fare confirmations</p><h2>Dates, times, and fares</h2><p className="pe-paper-lead">Account identifiers are masked; fields needed for comparison remain visible.</p><div className="pe-receipts"><Receipt date="20 JUN 2026" time="08:14 AM"/><Receipt date="21 JUN 2026" time="05:48 PM"/></div></article></div>;
  if (item.preview === "routes") return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Bicycle routes</strong><span>Illustrative public copy<br/>Endpoints hidden</span></header><p className="pe-paper-kicker">Route records</p><h2>Three bicycle trips</h2><div className="pe-route-map"><svg viewBox="0 0 520 330"><rect width="520" height="330" fill="#f5f3ed"/><g stroke="#d8d4ca"><path d="M0 55h520M0 110h520M0 165h520M0 220h520M0 275h520"/><path d="M75 0v330M150 0v330M225 0v330M300 0v330M375 0v330M450 0v330"/></g><g fill="none" stroke="#2f8a4a" strokeWidth="5" strokeLinecap="round"><path d="M55 270C120 220 150 250 200 190S310 150 365 90S435 75 475 45"/><path d="M42 78C115 100 130 150 205 160S320 202 390 178S450 145 485 135"/><path d="M90 305C145 258 205 286 250 240S325 225 355 260S420 296 472 255"/></g></svg></div><div className="pe-stamp"><Icon name="check"/>3 dates matched</div></article></div>;
  if (item.preview === "payment") return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Payment confirmation</strong><span>Illustrative public copy<br/>29 Jun 2026</span></header><div className="pe-payment"><i><Icon name="check"/></i><strong>$75.00</strong><span>Payment completed</span></div><dl className="pe-facts"><div><dt>From</dt><dd>Sam G.</dd></div><div><dt>To</dt><dd>Riley P.</dd></div><div><dt>Time</dt><dd>29 Jun · 9:03 AM</dd></div><div><dt>Account</dt><dd>•••• 9417 → •••• 2208</dd></div><div><dt>Reference</dt><dd>Ten trips completed</dd></div></dl></article></div>;
  if (item.preview === "completion") return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Completion record</strong><span>Illustrative public record<br/>29 Jun 2026</span></header><p className="pe-paper-kicker">Final mutual confirmation</p><h2>Trade completed</h2><p className="pe-paper-lead">Both participants confirmed that the public record accurately describes the exchange.</p><div className="pe-completion"><div><Icon name="check"/><span>Ten planned car trips replaced and documented.</span></div><div><Icon name="check"/><span>The agreed $75 payment was completed.</span></div><div><Icon name="check"/><span>Evidence was submitted before the deadline.</span></div></div><div className="pe-signatures"><div><em>Sam G.</em><span>Confirmed 29 Jun · 9:11 AM</span></div><div><em>Riley P.</em><span>Confirmed 29 Jun · 9:14 AM</span></div></div><div className="pe-stamp"><Icon name="shield"/>Example record complete</div></article></div>;
  const lower = `${item.fileName} ${item.publicUrl ?? ""}`.toLowerCase();
  if (item.publicUrl && /\.(png|jpe?g|webp)(?:[?#].*)?$/.test(lower)) return <div data-pe-zoom-target><img className="pe-live-image" alt={item.title} src={item.publicUrl}/> </div>;
  if (item.publicUrl && /\.pdf(?:[?#].*)?$/.test(lower)) return <div data-pe-zoom-target><iframe className="pe-live-pdf" src={item.publicUrl} title={item.title}/></div>;
  return <div data-pe-zoom-target><article className="pe-paper"><header className="pe-letterhead"><strong>Moral Trade</strong><span>Public evidence record<br/>Redaction state preserved</span></header><p className="pe-paper-kicker">{item.evidenceType.replaceAll("_"," ")}</p><h2>{item.title}</h2><p className="pe-paper-lead">{item.summary}</p><div className="pe-live-file"><strong>{item.state.replaceAll("_"," ")} · {item.redactionState.replaceAll("_"," ")}</strong><p>{item.redactionNote}</p>{item.publicUrl?<a href={item.publicUrl} target="_blank" rel="noreferrer"><Icon name="link"/> Open public source</a>:<p>The evidence metadata is public. The source file is unavailable until a public-safe copy passes redaction review.</p>}</div><div className="pe-terms"><div className="pe-term"><b>1</b><span>{record.evidenceRule}</span></div><div className="pe-term"><b>2</b><span>{record.privacyScope}</span></div></div></article></div>;
}

function Directory({ records }: { records: EvidenceRecord[] }) {
  return <><section className="pe-hero"><div><h1>Inspect the proof behind every trade.</h1><p className="pe-lead">Moral Trade evidence is public by default. Open a record to inspect the submitted proof, its review state, applied redactions, and the chronology from agreement through completion.</p></div><aside className="pe-policy"><strong>Public evidence, not public exposure</strong><p>Exact addresses, account numbers, private contact details, and unrelated personal information should be removed before publication. A narrow safety exception can withhold specific proof while preserving an explicit redaction state.</p><Link href="/privacy">Read the privacy standard</Link></aside></section><section className="pe-principles"><article><span>01</span><h2>Public by default</h2><p>Evidence records enter the public directory automatically unless a documented safety exception applies.</p></article><article><span>02</span><h2>Status stays explicit</h2><p>Submitted, accepted, and challenged evidence remain distinct. Visibility is not presented as independent verification.</p></article><article><span>03</span><h2>Redactions stay visible</h2><p>The viewer states when a source is redacted, pending review, or withheld instead of implying complete disclosure.</p></article></section><section className="pe-section"><div className="pe-section-head"><div><p>Public directory</p><h2>Live evidence records</h2></div><span>{records.length} public record{records.length===1?"":"s"}</span></div>{records.length?<div className="pe-records">{records.map(record=><Link className="pe-record-card" href={`/evidence/${record.id}`} key={record.id}><div className="pe-record-title"><small>{record.lifecycle.replaceAll("_"," ")}</small><strong>{record.offeredCause} ↔ {record.requestedCause}</strong><span>{record.proposer} → {record.responder}</span></div><div className="pe-record-meta"><div><span>Evidence</span><strong>{record.evidence.length} public item{record.evidence.length===1?"":"s"}</strong></div><div><span>Updated</span><strong>{formatDate(record.updatedAt)}</strong></div></div><div className="pe-record-action">Inspect →</div></Link>)}</div>:<div className="pe-empty"><strong>No live evidence records have been published yet.</strong><p>Completed and in-progress trades will appear after their first public evidence item is submitted. The interface example below is clearly separated from live marketplace activity.</p></div>}</section><section className="pe-section"><div className="pe-section-head"><div><p>Interface example · not a live trade</p><h2>Evidence Desk + layered Proof Timeline</h2></div></div><article className="pe-example"><div className="pe-example-copy"><span className="pe-example-label">Illustrative record</span><h2>Inspect documents without losing the chronology.</h2><p>Design 04 now opens as a working layer inside Design 02. Jump from a milestone directly to the supporting agreement, trip log, receipt, route, payment, or confirmation.</p><Link href="/evidence/example">Open the example evidence desk →</Link></div><div className="pe-example-list" aria-hidden="true"><div><i>01</i><span><strong>Original agreement</strong><span>Frozen terms · signed</span></span><b>Accepted</b></div><div><i>02</i><span><strong>Trip log · 10 entries</strong><span>Master fulfillment record</span></span><b>Matched</b></div><div><i>03</i><span><strong>Transit receipts · 7</strong><span>Dates and fares visible</span></span><b>Matched</b></div><div><i>04</i><span><strong>Payment confirmation</strong><span>$75 · identifiers masked</span></span><b>Accepted</b></div></div></article></section></>;
}

function Desk({ record }: { record: EvidenceRecord }) {
  const groups = [...new Set(record.evidence.map(item=>item.group))];
  return <><section className={`pe-notice ${record.isExample?"example":""}`}><div><strong>{record.isExample?"Illustrative interface record — not a live trade":"Public evidence record"}</strong><p>{record.isExample?"Sam G. and Riley P. are example parties. The documents and review outcomes demonstrate the integrated interface and are not marketplace activity.":"Public visibility does not itself mean independent verification. Every item preserves its submitted, accepted, or challenged state and redaction status."}</p></div><Link href="/evidence">All evidence records</Link></section><section className="pe-desk" data-pe-desk><header className="pe-topbar"><div className="pe-breadcrumbs"><Link href="/evidence"><Icon name="back"/> Public evidence</Link><span>›</span><strong>{record.proposer} → {record.responder}</strong></div><div className="pe-actions"><span className="pe-chip"><Icon name="globe"/>Public by default</span><button data-pe-timeline-toggle aria-expanded="false" type="button"><Icon name="layers"/> Timeline</button><button data-pe-share type="button"><Icon name="copy"/> Share</button></div></header><div className="pe-workbench"><nav className="pe-nav" aria-label="Evidence files"><div className="pe-case"><span>Evidence desk</span><h1>{record.offeredCause} ↔ {record.requestedCause}</h1><p>{record.proposer} → {record.responder} · {record.lifecycle.replaceAll("_"," ")}</p></div><div className="pe-mobile-strip">{record.evidence.map((item,index)=><button className={index===0?"active":""} data-pe-select={item.id} key={`m-${item.id}`} type="button"><Icon name="file"/><span><strong>{item.title}</strong><small>{item.state}</small></span></button>)}</div><div className="pe-desktop-list">{groups.map(group=><div key={group}><p className="pe-group-label">{group}</p>{record.evidence.filter(item=>item.group===group).map((item,index)=><button className={`pe-doc-button ${record.evidence[0].id===item.id?"active":""}`} data-pe-select={item.id} key={item.id} type="button"><span className="pe-file-icon"><Icon name="file"/></span><span><strong>{item.title}</strong><small>{item.evidenceType} · {formatDate(item.submittedAt)}</small></span><em>{item.state}</em></button>)}</div>)}</div></nav><div className="pe-viewer-area"><section className="pe-viewer"><div className="pe-toolbar"><div className="pe-toolgroup"><button data-pe-zoom-out type="button" aria-label="Zoom out"><Icon name="minus"/></button><span data-pe-zoom-label>100%</span><button data-pe-zoom-in type="button" aria-label="Zoom in"><Icon name="plus"/></button></div><span>Personal identifiers should be removed before publication</span><div className="pe-toolgroup"/></div><div className="pe-stage">{record.evidence.map((item,index)=><div className={`pe-doc-panel ${index===0?"active":""}`} data-pe-document={item.id} key={item.id}><Preview item={item} record={record}/></div>)}</div></section><aside className="pe-inspector">{record.evidence.map((item,index)=><div className={`pe-inspector-panel ${index===0?"active":""}`} data-pe-inspector={item.id} key={item.id}><p>Inspector</p><h2>{item.title}</h2><p className="pe-inspector-copy">{item.summary}</p><dl><div><dt>Status</dt><dd>{item.state}</dd></div><div><dt>Submitted by</dt><dd>{item.submittedBy}</dd></div><div><dt>Submitted</dt><dd>{formatDate(item.submittedAt,true)}</dd></div><div><dt>Reviewed</dt><dd>{formatDate(item.reviewedAt,true)}</dd></div><div><dt>Evidence type</dt><dd>{item.evidenceType}</dd></div><div><dt>Redaction</dt><dd>{item.redactionState.replaceAll("_"," ")}</dd></div></dl><div className="pe-review-note"><strong><Icon name="shield"/>Public-copy note</strong><p>{item.redactionNote}</p></div>{item.publicUrl?<a href={item.publicUrl} target="_blank" rel="noreferrer"><Icon name="link"/>Open public copy</a>:null}<br/><Link href="/contact?topic=evidence-report">Report this evidence</Link></div>)}</aside><section className="pe-timeline" data-pe-timeline aria-label="Proof timeline"><header className="pe-timeline-head"><div><p>Proof timeline</p><h2>How this trade reached its current state</h2></div><button data-pe-timeline-close type="button" aria-label="Close timeline"><Icon name="x"/></button></header><div className="pe-timeline-scroll"><div className="pe-timeline-rail">{record.timeline.map(event=><article className="pe-event" key={event.id}><time>{formatDate(event.at,true)}</time><p>{event.label}</p><h3>{event.title}</h3><span>{event.description}</span>{event.evidenceId?<button data-pe-open-evidence={event.evidenceId} type="button">Inspect linked evidence →</button>:null}</article>)}</div></div></section></div></div></section><script dangerouslySetInnerHTML={{__html:SCRIPT}}/> </>;
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
  return <div className="pe-page"><style dangerouslySetInnerHTML={{__html:CSS}}/><header className="v72-route-header"><SiteTopbar brandHref="/" links={getPrimaryNavLinks(Boolean(viewer))} {...getTopbarActions(Boolean(viewer))} showSearch showLogout={Boolean(viewer)}/></header><main className="pe-main" id="main-content" tabIndex={-1}>{record?<Desk record={record}/>:<Directory records={records}/>}</main><SiteFooter/></div>;
}

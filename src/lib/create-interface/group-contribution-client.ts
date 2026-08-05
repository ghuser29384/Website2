import {
  summarizeGroupContribution,
  validateGroupContributionTerms,
  type GroupContributionTerms,
  type UnderlyingContributionKind,
  type ValidationIssue,
} from "./group-contribution";
import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
  normalizeDraft,
  type GroupContributionDraftState,
  type GroupDraftMode,
} from "./group-contribution-draft";
import { sanitizeGroupContributionDraft } from "./group-contribution-draft-sanitize";
import { parseGroupContributionProposalPayload } from "./group-contribution-payload";
import {
  permitsCoActStructure,
  permitsCoFundAllocation,
  permitsGroupContributionMode,
  readGroupContributionProposalFlags,
} from "./group-contribution-flags";

const STORAGE_KEY = "mt:create:group-contribution-drafts:v1";
const RESUME_STORAGE_KEY = "mt:create:group-contribution-resume:v1";
const RESUME_DRAFT_STORAGE_KEY = "mt:create:group-contribution-resume-drafts:v1";
const PAYLOAD_FIELD = "groupContributionTerms";
const HOST_ATTRIBUTE = "data-mt-group-contribution-host";
const OPTION_ATTRIBUTE = "data-mt-group-contribution-option";
const MAX_LOCAL_DRAFTS = 50;
const CREATE_FRAME_SELECTOR = "iframe[data-create-interface-frame='true']";
const PROPOSAL_FLAGS = readGroupContributionProposalFlags({
  NEXT_PUBLIC_MORAL_TRADE_CO_ACT_PROPOSALS:
    process.env.NEXT_PUBLIC_MORAL_TRADE_CO_ACT_PROPOSALS,
  NEXT_PUBLIC_MORAL_TRADE_CO_FUND_PROPOSALS:
    process.env.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_PROPOSALS,
  NEXT_PUBLIC_MORAL_TRADE_CO_ACT_COMPLEMENTARY_ROLES:
    process.env.NEXT_PUBLIC_MORAL_TRADE_CO_ACT_COMPLEMENTARY_ROLES,
  NEXT_PUBLIC_MORAL_TRADE_CO_FUND_FLEXIBLE:
    process.env.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_FLEXIBLE,
  NEXT_PUBLIC_MORAL_TRADE_CO_FUND_CUSTOM_SPLIT:
    process.env.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_CUSTOM_SPLIT,
  NEXT_PUBLIC_MORAL_TRADE_CO_FUND_MATCHING:
    process.env.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_MATCHING,
});

interface StoredDrafts {
  version: 1;
  drafts: Record<string, GroupContributionDraftState>;
}

interface MountedOption {
  key: string;
  card: HTMLElement;
  host: HTMLElement;
  shadow: ShadowRoot;
  underlying: UnderlyingContributionKind;
  state: GroupContributionDraftState;
  inputListener: () => void;
  renderTimer: number | null;
  shadowListenersInstalled: boolean;
}

interface ProposalOptionPayload {
  optionKey: string;
  terms: GroupContributionTerms;
}

export interface GroupContributionProposalPayload {
  schemaVersion: 1;
  execution: "proposal-only";
  options: ProposalOptionPayload[];
}

interface PublicGroupContributionApi {
  readProposalPayload: () => GroupContributionProposalPayload;
  readDrafts: () => GroupContributionDraftState[];
  validate: () => Array<{ optionKey: string; issues: ValidationIssue[] }>;
  refresh: () => void;
}

declare global {
  interface Window {
    MoralTradeGroupContributions?: PublicGroupContributionApi;
    __moralTradeGroupContributionFetchBridgeV1?: boolean;
  }
}

const mounted = new Map<string, MountedOption>();
let observer: MutationObserver | null = null;
let parentObserver: MutationObserver | null = null;
let activeWindow: Window | null = null;
let activeDocument: Document | null = null;
let activeFrame: HTMLIFrameElement | null = null;
let scanQueued = false;
let submitGuardInstalled = false;
let resumedProposal: GroupContributionProposalPayload | null = null;

export function startGroupContributionEnhancement(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isCreateTradePath(window.location.pathname)) return;

  const attach = () => {
    const frame = document.querySelector<HTMLIFrameElement>(CREATE_FRAME_SELECTOR);
    if (frame) {
      attachCreateFrame(frame);
      return;
    }
    activateCreateDocument(window, document);
  };

  attach();
  parentObserver ??= new window.MutationObserver(attach);
  parentObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function attachCreateFrame(frame: HTMLIFrameElement): void {
  if (activeFrame !== frame) {
    activeFrame?.removeEventListener("load", activateAttachedFrame);
    activeFrame = frame;
    frame.addEventListener("load", activateAttachedFrame);
  }
  activateAttachedFrame();
}

function activateAttachedFrame(): void {
  const frame = activeFrame;
  if (!frame?.contentWindow || !frame.contentDocument) return;
  activateCreateDocument(frame.contentWindow, frame.contentDocument);
}

function activateCreateDocument(targetWindow: Window, targetDocument: Document): void {
  if (!targetDocument.documentElement) return;
  if (activeWindow === targetWindow && activeDocument === targetDocument) {
    queueScan();
    return;
  }

  observer?.disconnect();
  for (const entry of mounted.values()) {
    entry.card.removeEventListener("input", entry.inputListener);
    entry.card.removeEventListener("change", entry.inputListener);
    if (entry.renderTimer !== null) targetWindow.clearTimeout(entry.renderTimer);
  }
  mounted.clear();
  activeWindow = targetWindow;
  activeDocument = targetDocument;
  restoreResumeDrafts();
  resumedProposal = readStoredResumeProposal();
  scanQueued = false;
  submitGuardInstalled = false;

  installSubmitGuard();
  installPublishBridge();
  const nextObserver = new (targetWindow as Window & typeof globalThis).MutationObserver(
    () => queueScan(),
  );
  nextObserver.observe(targetDocument.documentElement, { childList: true, subtree: true });
  observer = nextObserver;
  targetWindow.addEventListener("popstate", queueScan);
  targetWindow.addEventListener("pageshow", queueScan);

  const api: PublicGroupContributionApi = {
    readProposalPayload,
    readDrafts: () => [...mounted.values()].map((entry) => normalizeDraft(entry.state)),
    validate: validateMountedDrafts,
    refresh: queueScan,
  };
  window.MoralTradeGroupContributions = api;
  targetWindow.MoralTradeGroupContributions = api;
  queueScan();
}

function createWindow(): Window {
  if (!activeWindow) throw new Error("The Create group-contribution window is unavailable");
  return activeWindow;
}

function createDocument(): Document {
  if (!activeDocument) throw new Error("The Create group-contribution document is unavailable");
  return activeDocument;
}

function isCreateTradePath(pathname: string): boolean {
  return pathname === "/trades/new" || pathname.startsWith("/trades/new/");
}

function queueScan(): void {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(() => {
    scanQueued = false;
    scanForOptions();
  });
}

function scanForOptions(): void {
  if (!activeWindow || !activeDocument) return;
  const root = locateOfferStepRoot();
  if (!root) {
    if (resumedProposal) writeProposalPayload(false);
    return;
  }

  const candidates = locateOptionCards(root);
  candidates.forEach((candidate, index) => {
    if (candidate.card.hasAttribute(OPTION_ATTRIBUTE)) return;
    mountOption(candidate.card, candidate.label, index);
  });

  removeDetachedOptions();
  if (mounted.size > 0) resumedProposal = null;
  writeProposalPayload();
}

function locateOfferStepRoot(): HTMLElement | null {
  const doc = createDocument();
  const headings = doc.querySelectorAll<HTMLElement>(
    "h1, h2, h3, [role='heading'], [aria-label]",
  );
  for (const heading of headings) {
    const text = normalizedText(heading.textContent);
    if (text.includes("what could you offer") || text.includes("make each option specific")) {
      return (
        heading.closest<HTMLElement>("main, [role='main'], form") ??
        heading.parentElement?.parentElement ??
        doc.body
      );
    }
  }
  return null;
}

function locateOptionCards(root: HTMLElement): Array<{ card: HTMLElement; label: HTMLElement }> {
  const labelCandidates = [...root.querySelectorAll<HTMLElement>("*")].filter((element) => {
    const own = normalizedText(directText(element));
    return /^option\s+\d+$/u.test(own) && ![...element.children].some((child) =>
      /^option\s+\d+$/u.test(normalizedText(directText(child as HTMLElement))),
    );
  });

  const cards: Array<{ card: HTMLElement; label: HTMLElement }> = [];
  const seen = new Set<HTMLElement>();
  for (const label of labelCandidates) {
    const card = closestOptionCard(label, root);
    if (!card || seen.has(card)) continue;
    seen.add(card);
    cards.push({ card, label });
  }
  return cards;
}

function closestOptionCard(label: HTMLElement, root: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = label.parentElement;
  let candidate: HTMLElement | null = null;
  const doc = createDocument();
  while (node && node !== root && node !== doc.body) {
    const controls = node.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
    const textLength = (node.textContent ?? "").trim().length;
    if (controls > 0 && textLength < 4_000) {
      candidate = node;
      if (
        node.matches("fieldset, article, section") ||
        node.getAttribute("role") === "group" ||
        createWindow().getComputedStyle(node).borderStyle !== "none"
      ) {
        break;
      }
    }
    node = node.parentElement;
  }
  return candidate;
}

function mountOption(card: HTMLElement, label: HTMLElement, index: number): void {
  const underlying = inferUnderlyingContribution(card);
  const candidateMode: "co-act" | "co-fund" =
    underlying === "financial" ? "co-fund" : "co-act";
  if (!permitsGroupContributionMode(PROPOSAL_FLAGS, candidateMode)) {
    card.setAttribute(OPTION_ATTRIBUTE, `disabled:${candidateMode}`);
    return;
  }
  const key = optionKey(card, label, index, underlying);
  const existing = mounted.get(key);
  if (existing) {
    if (existing.card === card && existing.host.isConnected) {
      card.setAttribute(OPTION_ATTRIBUTE, key);
      return;
    }
    existing.card.removeEventListener("input", existing.inputListener);
    existing.card.removeEventListener("change", existing.inputListener);
    mounted.delete(key);
  }

  const host = createDocument().createElement("div");
  host.setAttribute(HOST_ATTRIBUTE, key);
  host.setAttribute("data-mt-proposal-only", "true");
  host.style.display = "block";
  host.style.marginTop = "12px";
  const shadow = host.attachShadow({ mode: "open" });

  const saved = readStoredDrafts().drafts[key];
  const state = saved
    ? sanitizeStoredDraft(saved, key, underlying)
    : defaultGroupContributionDraft(key, underlying, readPrimaryText(card, underlying));
  state.primaryText = readPrimaryText(card, underlying) || state.primaryText;

  const inputListener = () => {
    const entry = mounted.get(key);
    if (!entry) return;
    entry.state.primaryText = readPrimaryText(card, entry.underlying) || entry.state.primaryText;
    updateCounterpartyMatchDefault(entry.state);
    renderMountedOption(entry);
    writeProposalPayload();
  };
  card.addEventListener("input", inputListener);
  card.addEventListener("change", inputListener);

  card.setAttribute(OPTION_ATTRIBUTE, key);
  card.insertAdjacentElement("afterend", host);

  const entry: MountedOption = {
    key,
    card,
    host,
    shadow,
    underlying,
    state,
    inputListener,
    renderTimer: null,
    shadowListenersInstalled: false,
  };
  mounted.set(key, entry);
  updateCounterpartyMatchDefault(entry.state);
  renderMountedOption(entry);
}

function removeDetachedOptions(): void {
  for (const [key, entry] of mounted) {
    if (entry.card.isConnected && entry.host.isConnected) continue;
    entry.card.removeEventListener("input", entry.inputListener);
    entry.card.removeEventListener("change", entry.inputListener);
    if (entry.renderTimer !== null) createWindow().clearTimeout(entry.renderTimer);
    mounted.delete(key);
  }
}

function inferUnderlyingContribution(card: HTMLElement): UnderlyingContributionKind {
  const sectionHeading = nearestSectionHeading(card);
  const heading = normalizedText(sectionHeading);
  if (/\b(fund|funding|donation|donate|money|payment|grant|cash)\b/u.test(heading)) {
    return "financial";
  }

  const labels = normalizedText(
    [...card.querySelectorAll("label, input, textarea, select")]
      .map((element) =>
        [
          element.textContent,
          element.getAttribute("name"),
          element.getAttribute("placeholder"),
          element.getAttribute("aria-label"),
        ]
          .filter(Boolean)
          .join(" "),
      )
      .join(" "),
  );
  return /\b(amount|currency|usd|dollar|funding|donation)\b/u.test(labels)
    ? "financial"
    : "nonfinancial";
}

function nearestSectionHeading(card: HTMLElement): string {
  let node: HTMLElement | null = card;
  const doc = createDocument();
  while (node && node !== doc.body) {
    const headings = [...node.querySelectorAll<HTMLElement>("h2, h3, h4, [role='heading']")]
      .map((heading) => heading.textContent?.trim() ?? "")
      .filter(Boolean)
      .filter((heading) => !/^option\s+\d+$/iu.test(heading));
    if (headings.length > 0) return headings[0];
    node = node.parentElement;
  }
  return "";
}

function optionKey(
  card: HTMLElement,
  label: HTMLElement,
  index: number,
  underlying: UnderlyingContributionKind,
): string {
  const offerId = card.getAttribute("data-offer-id");
  const entryIndex = card.getAttribute("data-entry-index");
  if (offerId && entryIndex !== null && /^\d+$/u.test(entryIndex)) {
    return `${slug(offerId)}:${Number(entryIndex) + 1}`;
  }

  const explicit =
    card.getAttribute("data-option-id") ??
    card.querySelector<HTMLElement>("[data-option-id]")?.getAttribute("data-option-id");
  if (explicit) return `option:${slug(explicit)}`;

  const section = slug(nearestSectionHeading(card) || underlying);
  const optionNumber = slug(label.textContent ?? String(index + 1));
  return `${section}:${optionNumber || index + 1}`;
}

function readPrimaryText(
  card: HTMLElement,
  underlying: UnderlyingContributionKind,
): string {
  const preferredFields = underlying === "financial"
    ? ["organization", "matchTarget"]
    : ["action", "work", "person", "cause", "support", "unit"];
  let hasPreferredControl = false;
  for (const field of preferredFields) {
    const control = card.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[data-offer-field='${field}']`,
    );
    if (control) hasPreferredControl = true;
    const value = control?.value.trim() ?? "";
    if (value) return value;
  }
  if (hasPreferredControl) return "";

  const controls = card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "textarea, input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='number']), select",
  );
  for (const control of controls) {
    const value = control.value.trim();
    if (value && !/^option\s+\d+$/iu.test(value)) return value;
  }
  return "";
}

function renderMountedOption(entry: MountedOption): void {
  const { shadow, state, underlying } = entry;
  const availableGroupMode: GroupDraftMode = underlying === "financial" ? "co-fund" : "co-act";
  if (state.mode !== "solo" && state.mode !== availableGroupMode) state.mode = "solo";
  if (state.mode === "co-act" && !permitsCoActStructure(PROPOSAL_FLAGS, state.coActStructure)) {
    state.coActStructure = "same-action";
  }
  if (state.mode === "co-fund" && !permitsCoFundAllocation(PROPOSAL_FLAGS, state.allocationMode)) {
    state.allocationMode = "equal-share";
  }

  ensureShadowShell(entry, availableGroupMode);
  shadow.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === state.mode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const slot = shadow.querySelector<HTMLElement>("[data-mt-group-panel-slot]");
  if (!slot) throw new Error("The group-contribution panel slot is unavailable");
  slot.innerHTML = state.mode === "solo" ? soloCopy(availableGroupMode) : groupPanel(state);
  hydrateValues(slot, state);
  updateValidationStatus(entry);
}

function ensureShadowShell(entry: MountedOption, availableGroupMode: GroupDraftMode): void {
  if (entry.shadow.querySelector("[data-mt-group-shell]")) return;

  entry.shadow.innerHTML = `${styles()}
    <section class="mt-group" aria-label="Group contribution terms" data-mt-group-shell>
      <div class="mode-row" role="group" aria-label="How will you provide this option?">
        <button type="button" class="mode-button" data-mode="solo" aria-pressed="false">Solo</button>
        <button type="button" class="mode-button" data-mode="${availableGroupMode}" aria-pressed="false">${availableGroupMode === "co-act" ? "Act together" : "Fund together"}</button>
        <span class="mechanism">${availableGroupMode === "co-act" ? "CO-ACT" : "CO-FUND"}</span>
      </div>
      <div data-mt-group-panel-slot></div>
    </section>`;
  installShadowDelegatedListeners(entry);
}

function scheduleMountedOptionRender(entry: MountedOption): void {
  if (entry.renderTimer !== null) return;
  const targetWindow = createWindow();
  entry.renderTimer = targetWindow.setTimeout(() => {
    entry.renderTimer = null;
    if (!entry.host.isConnected || !entry.card.isConnected) return;
    renderMountedOption(entry);
    writeProposalPayload();
  }, 0);
}

function soloCopy(mode: GroupDraftMode): string {
  return `<p class="solo-copy">Choose <strong>${mode === "co-act" ? "Act together" : "Fund together"}</strong> to make this option depend on or coordinate with other eligible users.</p>`;
}

function groupPanel(state: GroupContributionDraftState): string {
  const terms = buildGroupContributionTerms(state);
  const summary = terms ? summarizeGroupContribution(terms) : "Complete the required group terms.";
  return `<div class="panel">
    <div class="proposal-boundary"><strong>PROPOSAL ONLY</strong><span>These terms do not activate a group or authorize payment.</span></div>
    <p class="summary" data-summary>${escapeHtml(summary)}</p>
    <div class="grid primary-grid">
      ${numberField("participantLimit", "Maximum participants", state.participantLimit, 1, 100)}
      ${selectField("visibility", "Visibility", [
        ["public", "Public"],
        ["unlisted", "Unlisted"],
        ["invitation-only", "Invitation-only"],
      ])}
      ${state.mode === "co-act" ? coActPrimaryFields(state) : coFundPrimaryFields(state)}
    </div>
    ${counterpartyPrompt(state)}
    <details class="advanced">
      <summary>Advanced terms</summary>
      <div class="advanced-body">
        ${commonAdvancedFields(state)}
        ${state.mode === "co-act" ? coActAdvancedFields(state) : coFundAdvancedFields(state)}
      </div>
    </details>
    <div class="validation" data-validation aria-live="polite"></div>
  </div>`;
}

function coActStructureOptions(): Array<[string, string]> {
  const options: Array<[string, string]> = [["same-action", "Same action"]];
  if (PROPOSAL_FLAGS.coActComplementaryRoles) {
    options.push(["complementary-roles", "Complementary roles"]);
  }
  return options;
}

function coFundAllocationOptions(): Array<[string, string]> {
  const options: Array<[string, string]> = [["equal-share", "Equal shares"]];
  if (PROPOSAL_FLAGS.coFundFlexible) {
    options.push(["flexible-contribution", "Flexible contributions"]);
  }
  if (PROPOSAL_FLAGS.coFundCustomSplit) {
    options.push(["custom-split", "Custom split"]);
  }
  if (PROPOSAL_FLAGS.coFundMatching) {
    options.push(["matching-pledge", "Matching pledge"]);
  }
  return options;
}

function coActPrimaryFields(state: GroupContributionDraftState): string {
  return `
    ${selectField("coActStructure", "Structure", coActStructureOptions())}
    ${selectField("activationMode", "Activation", [
      ["independent", "Act together without a minimum"],
      ["minimum-participants", "Act only if at least N join"],
    ])}
    ${
      state.activationMode === "minimum-participants"
        ? numberField("minimumParticipants", "Minimum participants", state.minimumParticipants, 1, state.participantLimit)
        : ""
    }
    ${textField("duration", "Duration", "e.g. 12 weeks")}
    ${textField("frequency", "Frequency", "e.g. one meal per week")}
    ${numberField("baselineQuantity", "Pre-commitment baseline", state.baselineQuantity, 0, 1_000_000, "number")}
    ${textField("baselineUnit", "Baseline unit", "e.g. meat-free meals per week")}
  `;
}

function coFundPrimaryFields(_state: GroupContributionDraftState): string {
  return `
    ${selectField("allocationMode", "Allocation", coFundAllocationOptions())}
    ${moneyField("targetMinor", "Project target", "0.00")}
    ${textField("settlementCurrency", "Settlement currency", "USD", 3)}
    ${moneyField("maximumBudgetMinor", "Your maximum budget", "0.00")}
    ${textareaField("noPoolDefault", "What would you fund instead?", "If this Co-Fund does not happen, where would you otherwise use this money?")}
    ${checkboxField("participationBeatsDefault", "This Co-Fund is better by my lights than my stated default")}
  `;
}

function counterpartyPrompt(state: GroupContributionDraftState): string {
  if (state.mode !== "co-act" || !actionsMateriallyMatch(state.primaryText, requestedActionText())) return "";
  return `<div class="counterparty-prompt">
    <div><strong>Do this together?</strong><span>Count the other party's requested action as their participation in this Co-Act.</span></div>
    <label class="check"><input type="checkbox" data-field="counterpartyParticipation" data-checkbox-value="explicitly-included" ${state.counterpartyParticipation === "explicitly-included" ? "checked" : ""}><span>Yes, include the counterparty</span></label>
  </div>`;
}

function commonAdvancedFields(_state: GroupContributionDraftState): string {
  return `<section class="terms-section">
    <h4>Group and eligibility</h4>
    <div class="grid">
      ${textField("existingGroupId", "Existing group ID", "Leave blank to create a new group")}
      ${selectField("combination", "Relationship to other group options", [
        ["alternative", "One of these alternatives"],
        ["cumulative", "All selected options apply"],
      ])}
      ${dateTimeField("recruitmentDeadline", "Recruitment deadline")}
      ${numberField("minimumReliability", "Minimum Moral Trade reliability", 0, 0, 100, "number", true)}
      ${textField("geography", "Required geography", "Optional")}
      ${textField("skill", "Required skill", "Optional")}
    </div>
  </section>`;
}

function coActAdvancedFields(state: GroupContributionDraftState): string {
  return `<section class="terms-section">
    <h4>Action, evidence, and attrition</h4>
    <div class="grid">
      ${
        state.coActStructure === "complementary-roles"
          ? textareaField(
              "complementaryRoles",
              "Roles",
              "One per line, in the form Role: obligation. Add at least two.",
            )
          : ""
      }
      ${checkboxField("creatorCounts", "Creator counts toward the participant minimum")}
      ${numberField(
        "activationConfirmationHours",
        "Activation confirmation period (hours)",
        state.activationConfirmationHours,
        1,
        720,
      )}
      ${selectField("performanceStartMode", "Performance begins", [
        ["on-activation", "On activation"],
        ["scheduled", "On a scheduled date"],
      ])}
      ${state.performanceStartMode === "scheduled" ? dateTimeField("performanceStartsAt", "Performance start") : ""}
      ${selectField("coActTiming", "Participant timing", [
        ["same-period", "Same overall period"],
        ["same-time", "Same time"],
      ])}
      ${selectField("coordination", "Coordination", [
        ["notifications-only", "Notifications only"],
        ["announcements", "Announcements and reminders"],
        ["discussion-thread", "Participant discussion thread"],
      ])}
      ${selectField("lateJoining", "Late joining", [
        ["closed-after-activation", "Closed after activation"],
        ["original-end-date", "Join with the original end date"],
        ["full-duration", "Each late participant completes the full duration"],
      ])}
      ${selectField("rewardMode", "Reward structure", [
        ["fixed-group", "Fixed group reward"],
        ["per-participant-or-unit", "Per participant or verified unit"],
      ])}
      ${textField("rewardDescription", "Reward", "Describe the linked reward")}
      ${textField("rewardRuleOrUnit", state.rewardMode === "fixed-group" ? "Allocation rule" : "Reward unit", "Describe the rule")}
      ${selectField("baselineSource", "Baseline source", [
        ["verified-history", "Verified history"],
        ["self-report", "Self-report"],
        ["mixed", "Mixed evidence"],
      ])}
      ${selectField("baselineConfidence", "Baseline confidence", [
        ["low", "Low"],
        ["medium", "Medium"],
        ["high", "High"],
      ])}
      ${selectField("evidenceVerification", "Evidence standard", [
        ["self-declared", "Self-attestation"],
        ["profile-verified", "Profile-verified"],
        ["document-verified", "Document-verified"],
        ["independently-verified", "Independently verified"],
      ])}
      ${numberField("allowedMisses", "Allowed misses", state.allowedMisses, 0, 10_000)}
      ${numberField("gracePeriodHours", "Grace period (hours)", state.gracePeriodHours, 0, 8_760)}
      ${checkboxField("makeUpAllowed", "Allow disclosed make-up performance")}
      ${selectField("postActivationWithdrawal", "Post-activation withdrawal", [
        ["recorded-nonperformance", "Record as nonperformance unless excused"],
        ["authorized-by-terms", "Authorized under the published terms"],
      ])}
      ${checkboxField("redistributionEnabled", "Automatically redistribute missing obligations within accepted limits")}
      ${
        state.redistributionEnabled
          ? `${selectField("redistributionFormula", "Redistribution formula", [
              ["equal", "Equal"],
              ["proportional-to-base", "Proportional to base obligation"],
              ["role-specific", "Role-specific"],
            ])}
            ${numberField("redistributionMaximumQuantity", "Maximum total obligation this participant accepts", state.redistributionMaximumQuantity, 0, 1_000_000, "number")}
            ${numberField("replacementRecruitmentHours", "Replacement recruitment period (hours)", state.replacementRecruitmentHours, 1, 8_760)}`
          : ""
      }
      ${selectField("redistributionFallback", "Residual-shortfall fallback", [
        ["reduced-output-and-reward", "Continue with reduced output and reward"],
        ["end-future-performance", "Preserve earned rewards and end future work"],
        ["withdraw-without-penalty", "Allow withdrawal without reliability penalty"],
        ["terminate", "Terminate the Co-Act"],
        ["new-version", "Create a revised version for fresh consent"],
      ])}
    </div>
    <p class="privacy-note">Detailed baselines stay private. Other users see only the incremental commitment, method, and confidence. Invitation-only identities become public only after successful completion and advance consent.</p>
  </section>`;
}

function coFundAdvancedFields(state: GroupContributionDraftState): string {
  return `<section class="terms-section">
    <h4>Project and payment intent</h4>
    <div class="grid">
      ${textareaField("projectDescription", "Fixed project or deliverable", "Describe the frozen project and deliverable")}
      ${checkboxField("milestoneBasedPayout", "Use milestone-based payout for a project or service provider")}
      ${paymentMethodFields(state)}
      ${numberField("paymentRepairWindowHours", "Payment repair window (hours)", state.paymentRepairWindowHours, 1, 168)}
      ${selectField("coFundDeadlineOutcome", "If the deadline is missed", [
        ["release-reservations", "Release reservations"],
        ["one-extension", "Allow one extension"],
        ["new-round", "Open a new round"],
        ["participant-vote", "Let participants vote"],
      ])}
      ${state.coFundDeadlineOutcome === "one-extension" ? numberField("coFundExtensionHours", "Extension length (hours)", state.coFundExtensionHours, 1, 8_760) : ""}
      ${selectField("coFundFailureFallback", "If the linked trade stays under threshold", [
        ["expire-trade", "Expire the trade"],
        ["alternative-offer", "Use a specified alternative offer"],
        ["renegotiate", "Permit renegotiation"],
      ])}
      ${checkboxField("preauthorizeExecutableFallback", "Request a separate fallback authorization after proposal review")}
      ${selectField("recurringMode", "Recurring terms", [
        ["none", "One time"],
        ["standing-authorization", "Standing authorization"],
        ["confirm-each-cycle", "Confirm each cycle"],
      ])}
      ${
        state.recurringMode !== "none"
          ? `${textField("recurringFrequency", "Frequency", "e.g. monthly")}
             ${moneyField("recurringMaximumMinor", "Maximum per cycle", "0.00")}`
          : ""
      }
    </div>
    <div class="fixed-policy">
      <strong>Fixed platform rules</strong>
      <span>Exact final allocation · 24-hour unanimous confirmation · waitlist before any eligible payment-failure bridge · exchange rates lock at final confirmation.</span>
    </div>
  </section>`;
}

function paymentMethodFields(state: GroupContributionDraftState): string {
  const methods: Array<["wallet" | "card-or-ach" | "escrow", string]> = [
    ["wallet", "Wallet reservation"],
    ["card-or-ach", "Card or ACH authorization"],
    ["escrow", "Escrow when required"],
  ];
  return `<fieldset class="field field-wide"><legend>Compatible payment methods</legend><div class="checks">${methods
    .map(
      ([value, label]) =>
        `<label class="check"><input type="checkbox" data-payment-method="${value}" ${state.paymentMethods.includes(value) ? "checked" : ""}><span>${label}</span></label>`,
    )
    .join("")}</div></fieldset>`;
}

function numberField(
  field: keyof GroupContributionDraftState,
  label: string,
  value: number,
  min: number,
  max: number,
  step = "1",
  allowBlank = false,
): string {
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="number" data-field="${field}" min="${min}" max="${max}" step="${step}" value="${allowBlank ? "" : String(value)}"></label>`;
}

function moneyField(field: keyof GroupContributionDraftState, label: string, placeholder: string): string {
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="number" data-field="${field}" data-minor-units="true" min="0" step="0.01" placeholder="${escapeHtml(placeholder)}"></label>`;
}

function textField(
  field: keyof GroupContributionDraftState,
  label: string,
  placeholder: string,
  maxLength = 300,
): string {
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="text" data-field="${field}" placeholder="${escapeHtml(placeholder)}" maxlength="${maxLength}"></label>`;
}

function textareaField(field: keyof GroupContributionDraftState, label: string, placeholder: string): string {
  return `<label class="field field-wide"><span>${escapeHtml(label)}</span><textarea data-field="${field}" placeholder="${escapeHtml(placeholder)}" rows="3" maxlength="2000"></textarea></label>`;
}

function dateTimeField(field: keyof GroupContributionDraftState, label: string): string {
  return `<label class="field"><span>${escapeHtml(label)}</span><input type="datetime-local" data-field="${field}"></label>`;
}

function selectField(
  field: keyof GroupContributionDraftState,
  label: string,
  options: Array<[string, string]>,
): string {
  return `<label class="field"><span>${escapeHtml(label)}</span><select data-field="${field}">${options
    .map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`)
    .join("")}</select></label>`;
}

function checkboxField(field: keyof GroupContributionDraftState, label: string): string {
  return `<label class="check field-wide"><input type="checkbox" data-field="${field}"><span>${escapeHtml(label)}</span></label>`;
}

function hydrateValues(root: ParentNode, state: GroupContributionDraftState): void {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-field]").forEach(
    (control) => {
      const field = control.dataset.field as keyof GroupContributionDraftState;
      if (!(field in state)) return;
      const value = state[field];
      if (isInputElement(control) && control.type === "checkbox") {
        if (field === "counterpartyParticipation") {
          control.checked = state.counterpartyParticipation === "explicitly-included";
        } else {
          control.checked = Boolean(value);
        }
      } else if (isInputElement(control) && control.dataset.minorUnits === "true") {
        control.value = typeof value === "number" && value > 0 ? (value / 100).toFixed(2) : "";
      } else if (value === null || value === undefined) {
        control.value = "";
      } else {
        control.value = String(value);
      }
    },
  );
}

function installShadowDelegatedListeners(entry: MountedOption): void {
  if (entry.shadowListenersInstalled) return;
  entry.shadowListenersInstalled = true;

  entry.shadow.addEventListener("click", (event) => {
    const target = elementTarget(event.target);
    const button = target?.closest<HTMLButtonElement>("button[data-mode]");
    if (!button || !entry.shadow.contains(button)) return;

    const mode = button.dataset.mode as GroupDraftMode;
    entry.state.mode = mode;
    entry.state.primaryText =
      readPrimaryText(entry.card, entry.underlying) || entry.state.primaryText;
    persistDrafts();
    writeProposalPayload();
    scheduleMountedOptionRender(entry);
  });

  entry.shadow.addEventListener("input", (event) => {
    const control = formControlTarget(event.target);
    if (!control?.matches("[data-field]")) return;
    updateStateFromControl(entry.state, control);
    entry.state = normalizeDraft(entry.state);
    persistDrafts();
    writeProposalPayload();
    updateValidationStatus(entry);
  });

  entry.shadow.addEventListener("change", (event) => {
    const control = formControlTarget(event.target);
    if (!control) return;

    if (control.matches("[data-payment-method]")) {
      entry.state.paymentMethods = [
        ...entry.shadow.querySelectorAll<HTMLInputElement>("[data-payment-method]:checked"),
      ]
        .map((input) => input.dataset.paymentMethod)
        .filter((value): value is "wallet" | "card-or-ach" | "escrow" =>
          value === "wallet" || value === "card-or-ach" || value === "escrow",
        );
    } else if (control.matches("[data-field]")) {
      updateStateFromControl(entry.state, control);
      entry.state = normalizeDraft(entry.state);
    } else {
      return;
    }

    persistDrafts();
    writeProposalPayload();
    if (controlRequiresPanelRender(control)) {
      scheduleMountedOptionRender(entry);
    } else {
      updateValidationStatus(entry);
    }
  });
}

function elementTarget(target: EventTarget | null): Element | null {
  if (!target || typeof target !== "object") return null;
  if (!("closest" in target) || typeof target.closest !== "function") return null;
  if (!("matches" in target) || typeof target.matches !== "function") return null;
  return target as Element;
}

function formControlTarget(
  target: EventTarget | null,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const element = elementTarget(target);
  if (!element?.matches("input, textarea, select")) return null;
  return element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}

function controlRequiresPanelRender(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): boolean {
  const field = control.dataset.field;
  return (
    field === "coActStructure" ||
    field === "activationMode" ||
    field === "performanceStartMode" ||
    field === "redistributionEnabled" ||
    field === "allocationMode" ||
    field === "recurringMode" ||
    field === "coFundDeadlineOutcome"
  );
}

function updateStateFromControl(
  state: GroupContributionDraftState,
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): void {
  const field = control.dataset.field as keyof GroupContributionDraftState;
  if (!(field in state)) return;

  if (field === "counterpartyParticipation" && isInputElement(control)) {
    state.counterpartyParticipation = control.checked ? "explicitly-included" : "explicitly-excluded";
    return;
  }

  if (isInputElement(control) && control.type === "checkbox") {
    (state as unknown as Record<string, unknown>)[field] = control.checked;
    return;
  }

  if (isInputElement(control) && control.dataset.minorUnits === "true") {
    const parsed = Number.parseFloat(control.value);
    (state as unknown as Record<string, unknown>)[field] = Number.isFinite(parsed)
      ? Math.max(0, Math.round(parsed * 100))
      : 0;
    return;
  }

  const existing = state[field];
  if (typeof existing === "number" || existing === null) {
    if (field === "minimumReliability" && control.value.trim() === "") {
      state.minimumReliability = null;
      return;
    }
    const parsed = Number(control.value);
    (state as unknown as Record<string, unknown>)[field] = Number.isFinite(parsed) ? parsed : 0;
    return;
  }

  (state as unknown as Record<string, unknown>)[field] = control.value;
}

function updateValidationStatus(entry: MountedOption): void {
  const status = entry.shadow.querySelector<HTMLElement>("[data-validation]");
  const summary = entry.shadow.querySelector<HTMLElement>("[data-summary]");
  if (!status) return;

  const terms = buildGroupContributionTerms(entry.state);
  if (!terms) {
    status.className = "validation";
    status.textContent = "Solo option — no group terms will be submitted.";
    return;
  }

  const result = validateGroupContributionTerms(terms, entry.underlying);
  if (summary) summary.textContent = summarizeGroupContribution(terms);

  if (result.ok) {
    status.className = "validation valid";
    status.textContent = "Group terms are complete for proposal review.";
    return;
  }

  status.className = "validation invalid";
  status.innerHTML = `<strong>Complete these terms before continuing:</strong><ul>${result.issues
    .slice(0, 6)
    .map((issue) => `<li>${escapeHtml(issue.message)}</li>`)
    .join("")}</ul>`;
}

function readProposalPayload(): GroupContributionProposalPayload {
  if (mounted.size === 0 && resumedProposal) return resumedProposal;

  const options: ProposalOptionPayload[] = [];
  for (const entry of mounted.values()) {
    const terms = buildGroupContributionTerms(entry.state);
    if (!terms) continue;
    const result = validateGroupContributionTerms(terms, entry.underlying);
    if (result.ok) options.push({ optionKey: entry.key, terms: result.value });
  }
  return { schemaVersion: 1, execution: "proposal-only", options };
}

function validateMountedDrafts(): Array<{ optionKey: string; issues: ValidationIssue[] }> {
  const invalid: Array<{ optionKey: string; issues: ValidationIssue[] }> = [];
  for (const entry of mounted.values()) {
    const terms = buildGroupContributionTerms(entry.state);
    if (!terms) continue;
    const result = validateGroupContributionTerms(terms, entry.underlying);
    if (!result.ok) invalid.push({ optionKey: entry.key, issues: result.issues });
  }
  return invalid;
}

function writeProposalPayload(persistCurrentDrafts = true): void {
  const preservingResumedDrafts = mounted.size === 0 && resumedProposal !== null;
  if (persistCurrentDrafts && !preservingResumedDrafts) persistDrafts();
  const payload = readProposalPayload();
  const serialized = JSON.stringify(payload);

  const forms = new Set<HTMLFormElement>();
  for (const entry of mounted.values()) {
    const form = entry.card.closest<HTMLFormElement>("form");
    if (form) forms.add(form);
  }

  if (forms.size === 0) {
    const doc = createDocument();
    let hidden = doc.querySelector<HTMLInputElement>(`input[type='hidden'][name='${PAYLOAD_FIELD}']`);
    if (!hidden) {
      hidden = createDocument().createElement("input");
      hidden.type = "hidden";
      hidden.name = PAYLOAD_FIELD;
      hidden.setAttribute("data-mt-group-contribution-payload", "true");
      createDocument().body.append(hidden);
    }
    hidden.value = serialized;
  } else {
    for (const form of forms) {
      let hidden = form.querySelector<HTMLInputElement>(`input[type='hidden'][name='${PAYLOAD_FIELD}']`);
      if (!hidden) {
        hidden = createDocument().createElement("input");
        hidden.type = "hidden";
        hidden.name = PAYLOAD_FIELD;
        hidden.setAttribute("data-mt-group-contribution-payload", "true");
        form.append(hidden);
      }
      hidden.value = serialized;
    }
  }

  renderReviewSummaries(payload);

  const targetWindow = createWindow();
  targetWindow.dispatchEvent(
    new (targetWindow as Window & typeof globalThis).CustomEvent("moraltrade:group-contribution-change", {
      detail: {
        proposal: payload,
        drafts: [...mounted.values()].map((entry) => normalizeDraft(entry.state)),
      },
    }),
  );
}

function renderReviewSummaries(payload: GroupContributionProposalPayload): void {
  const doc = createDocument();
  const summaryOffers = doc.querySelector<HTMLElement>("#summaryOffers");
  if (!summaryOffers) return;

  const existing = summaryOffers.querySelector<HTMLElement>(
    "[data-mt-group-contribution-review]",
  );
  const fingerprint = JSON.stringify(payload.options);
  if (existing?.dataset.mtGroupContributionReviewFingerprint === fingerprint) {
    return;
  }

  existing?.remove();
  if (payload.options.length === 0) return;

  const container = doc.createElement("section");
  container.setAttribute("data-mt-group-contribution-review", "true");
  container.dataset.mtGroupContributionReviewFingerprint = fingerprint;
  container.setAttribute("aria-label", "Proposed group contribution terms");
  container.style.cssText =
    "margin-top:12px;border-top:1px solid #c6c0b5;padding-top:10px;display:grid;gap:8px";
  const heading = doc.createElement("strong");
  heading.textContent = "Proposed group terms";
  heading.style.cssText =
    "font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.09em;text-transform:uppercase;color:#075ee8";
  container.append(heading);

  for (const option of payload.options) {
    const item = doc.createElement("div");
    item.setAttribute("data-mt-group-contribution-review-option", option.optionKey);
    item.style.cssText =
      "border:1px solid #c6c0b5;background:#fff;padding:9px 10px;font-size:13px;line-height:1.45";
    const mechanism = option.terms.mode === "co-act" ? "CO-ACT" : "CO-FUND";
    item.innerHTML = `<strong style="display:block;font:700 10px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;color:#075ee8">${mechanism} · PROPOSAL ONLY</strong><span>${escapeHtml(summarizeGroupContribution(option.terms))}</span>`;
    container.append(item);
  }
  summaryOffers.append(container);
}

function installPublishBridge(): void {
  const targetWindow = createWindow();
  if (targetWindow.__moralTradeGroupContributionFetchBridgeV1) return;

  const originalFetch = targetWindow.fetch.bind(targetWindow);
  targetWindow.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = resolveRequestUrl(input);
    const method = (init?.method ?? requestMethod(input)).toUpperCase();
    if (
      method !== "POST" ||
      requestUrl.origin !== window.location.origin ||
      requestUrl.pathname !== "/api/create/publish"
    ) {
      return originalFetch(input, init);
    }

    const invalid = validateMountedDrafts();
    if (invalid.length > 0) {
      const first = invalid[0];
      const entry = mounted.get(first.optionKey);
      entry?.host.scrollIntoView({ behavior: "smooth", block: "center" });
      throw new Error(first.issues[0]?.message ?? "Complete the group-contribution terms before submitting.");
    }

    const proposal = readProposalPayload();
    if (proposal.options.length === 0) return originalFetch(input, init);
    if (typeof init?.body !== "string") {
      throw new Error("Group-contribution proposals require a JSON Create submission body.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(init.body);
    } catch {
      throw new Error("The Create submission body is not valid JSON.");
    }
    if (!isRecord(payload)) {
      throw new Error("The Create submission body must be a JSON object.");
    }

    persistResumeProposal(proposal);
    const response = await originalFetch(input, {
      ...init,
      body: JSON.stringify({ ...payload, groupContributionTerms: proposal }),
    });
    if (response.ok) clearResumeProposal();
    return response;
  }) as typeof targetWindow.fetch;
  targetWindow.__moralTradeGroupContributionFetchBridgeV1 = true;
}

function resolveRequestUrl(input: RequestInfo | URL): URL {
  const raw =
    typeof input === "string" || input instanceof URL
      ? String(input)
      : typeof input === "object" && input !== null && "url" in input
        ? String(input.url)
        : String(input);
  return new URL(raw, window.location.href);
}

function requestMethod(input: RequestInfo | URL): string {
  return typeof input === "object" && input !== null && "method" in input
    ? String(input.method)
    : "GET";
}

function isInputElement(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): control is HTMLInputElement {
  return control.tagName === "INPUT";
}

function isFormElement(value: EventTarget | null): value is HTMLFormElement {
  return Boolean(value && typeof value === "object" && "tagName" in value && value.tagName === "FORM");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function installSubmitGuard(): void {
  if (submitGuardInstalled) return;
  submitGuardInstalled = true;
  createDocument().addEventListener(
    "submit",
    (event) => {
      if (!isFormElement(event.target)) return;
      const invalid = validateMountedDrafts();
      if (invalid.length === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const entry = mounted.get(invalid[0].optionKey);
      entry?.host.scrollIntoView({ behavior: "smooth", block: "center" });
      entry?.shadow.querySelector<HTMLElement>(".validation.invalid")?.focus();
      const targetWindow = createWindow();
      targetWindow.dispatchEvent(
        new (targetWindow as Window & typeof globalThis).CustomEvent("moraltrade:group-contribution-invalid", { detail: invalid }),
      );
    },
    true,
  );
}

function resumeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.top && window.top !== window) return window.top.sessionStorage;
  } catch {
    // Cross-origin embedding falls back to the iframe storage area.
  }
  return window.sessionStorage;
}

function resumeRequestUrl(): URL | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.top && window.top !== window) {
      return new URL(window.top.location.href);
    }
  } catch {
    // Cross-origin embedding falls back to the iframe URL.
  }
  return new URL(window.location.href);
}

function isResumeRequest(): boolean {
  try {
    return resumeRequestUrl()?.searchParams.get("resume") === "create";
  } catch {
    return false;
  }
}

function restoreResumeDrafts(): void {
  if (!isResumeRequest()) return;
  try {
    const raw = resumeStorage()?.getItem(RESUME_DRAFT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<StoredDrafts>;
    if (parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") return;
    const snapshot: StoredDrafts = { version: 1, drafts: parsed.drafts };
    createWindow().localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Invalid or unavailable local state cannot override the validated proposal snapshot.
  }
}

function persistResumeProposal(proposal: GroupContributionProposalPayload): void {
  if (proposal.options.length === 0) return;
  resumedProposal = proposal;
  const storage = resumeStorage();
  if (!storage) return;
  try {
    storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(proposal));
    const draftSnapshot = createWindow().localStorage.getItem(STORAGE_KEY);
    if (draftSnapshot) storage.setItem(RESUME_DRAFT_STORAGE_KEY, draftSnapshot);
  } catch {
    // Authentication resume is best effort; the server remains authoritative.
  }
}

function clearResumeProposal(): void {
  resumedProposal = null;
  const storage = resumeStorage();
  if (!storage) return;
  try {
    storage.removeItem(RESUME_STORAGE_KEY);
    storage.removeItem(RESUME_DRAFT_STORAGE_KEY);
  } catch {
    // A successful server receipt is authoritative even if local cleanup fails.
  }
}

function readStoredResumeProposal(): GroupContributionProposalPayload | null {
  if (!isResumeRequest()) return null;
  try {
    const raw = resumeStorage()?.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.options)) return null;

    const contributionKinds = new Map<string, UnderlyingContributionKind>();
    for (const candidate of parsed.options) {
      if (
        !isRecord(candidate) ||
        typeof candidate.optionKey !== "string" ||
        !isRecord(candidate.terms)
      ) {
        return null;
      }
      if (candidate.terms.mode === "co-act") {
        if (!permitsGroupContributionMode(PROPOSAL_FLAGS, "co-act")) return null;
        contributionKinds.set(candidate.optionKey, "nonfinancial");
      } else if (candidate.terms.mode === "co-fund") {
        if (!permitsGroupContributionMode(PROPOSAL_FLAGS, "co-fund")) return null;
        contributionKinds.set(candidate.optionKey, "financial");
      } else {
        return null;
      }
    }

    const result = parseGroupContributionProposalPayload(raw, contributionKinds);
    return result.ok && result.value.options.length > 0 ? result.value : null;
  } catch {
    return null;
  }
}

function persistDrafts(): void {
  try {
    const drafts = [...mounted.values()]
      .slice(0, MAX_LOCAL_DRAFTS)
      .reduce<Record<string, GroupContributionDraftState>>((record, entry) => {
        record[entry.key] = normalizeDraft(entry.state);
        return record;
      }, {});
    const value: StoredDrafts = { version: 1, drafts };
    createWindow().localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Local draft persistence is best effort. Proposal submission remains explicit.
  }
}

function readStoredDrafts(): StoredDrafts {
  try {
    const raw = createWindow().localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, drafts: {} };
    const parsed = JSON.parse(raw) as Partial<StoredDrafts>;
    if (parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") {
      return { version: 1, drafts: {} };
    }
    return { version: 1, drafts: parsed.drafts };
  } catch {
    return { version: 1, drafts: {} };
  }
}

function sanitizeStoredDraft(
  saved: GroupContributionDraftState,
  key: string,
  underlying: UnderlyingContributionKind,
): GroupContributionDraftState {
  return sanitizeGroupContributionDraft(saved, key, underlying);
}

function updateCounterpartyMatchDefault(state: GroupContributionDraftState): void {
  if (state.mode !== "co-act") {
    state.counterpartyParticipation = "not-applicable";
    return;
  }
  const matches = actionsMateriallyMatch(state.primaryText, requestedActionText());
  if (!matches) state.counterpartyParticipation = "not-applicable";
  else if (state.counterpartyParticipation === "not-applicable") {
    state.counterpartyParticipation = "explicitly-excluded";
  }
}

function requestedActionText(): string {
  const doc = createDocument();
  const labels = [...doc.querySelectorAll<HTMLElement>("*")].filter((element) =>
    normalizedText(directText(element)).includes("you want someone to"),
  );
  for (const label of labels) {
    let node: HTMLElement | null = label.parentElement;
    while (node && node !== doc.body) {
      const text = (node.textContent ?? "").replace(label.textContent ?? "", " ").trim();
      if (text.length > 3 && text.length < 500) return text;
      node = node.parentElement;
    }
  }
  return "";
}

export function actionsMateriallyMatch(first: string, second: string): boolean {
  const a = significantTokens(first);
  const b = significantTokens(second);
  if (a.size < 2 || b.size < 2) return false;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union >= 0.5 || intersection / Math.min(a.size, b.size) >= 0.7;
}

function significantTokens(value: string): Set<string> {
  const stop = new Set([
    "a",
    "an",
    "and",
    "at",
    "for",
    "in",
    "of",
    "on",
    "one",
    "or",
    "the",
    "to",
    "with",
    "would",
    "you",
  ]);
  const canonical = normalizedText(value)
    .replace(/\b(?:does not|doesn't|do not|don't|not|never)\s+(?:eat|eating|consume|consuming)\b/gu, "avoid")
    .replace(/\beach\b/gu, "per");
  return new Set(
    canonical
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length > 1 && !stop.has(token)),
  );
}

function directText(element: HTMLElement): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent ?? "")
    .join(" ");
}

function normalizedText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function slug(value: string): string {
  return normalizedText(value).replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 80);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "'":
        return "&#39;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}

function styles(): string {
  return `<style>
    :host { color: #111; font-family: Arial, Helvetica, sans-serif; }
    * { box-sizing: border-box; }
    button, input, select, textarea { font: inherit; color: inherit; }
    .mt-group { border-top: 1px solid #c6c0b5; padding-top: 12px; }
    .mode-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .mode-button { appearance: none; border: 1px solid #a9a398; background: #fbfaf7; min-height: 36px; padding: 0 14px; font: 700 11px/1.1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: .07em; cursor: pointer; border-radius: 0; }
    .mode-button:hover, .mode-button:focus-visible { border-color: #075ee8; outline: 2px solid rgba(7,94,232,.22); outline-offset: 1px; }
    .mode-button.selected { border-color: #075ee8; color: #075ee8; background: #fff; }
    .mechanism { margin-left: auto; color: #075ee8; font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .12em; }
    .solo-copy { margin: 10px 0 0; color: #6b675f; font-size: 13px; line-height: 1.45; }
    .panel { margin-top: 12px; border: 1px solid #bcb6aa; background: rgba(255,255,255,.66); }
    .proposal-boundary { display: flex; gap: 10px; align-items: baseline; padding: 10px 14px; border-bottom: 1px solid #d0cabf; background: #f5f2eb; }
    .proposal-boundary strong { color: #075ee8; font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .11em; white-space: nowrap; }
    .proposal-boundary span { color: #66625b; font-size: 12px; line-height: 1.4; }
    .summary { margin: 0; padding: 14px; border-bottom: 1px solid #d0cabf; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; line-height: 1.25; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .primary-grid { padding: 14px; }
    .field { display: grid; gap: 6px; min-width: 0; }
    .field > span, legend { color: #282622; font: 700 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: .08em; }
    .field input, .field select, .field textarea { width: 100%; min-height: 42px; border: 1px solid #b8b1a5; border-radius: 0; background: #fff; padding: 9px 11px; font-size: 14px; line-height: 1.35; }
    .field textarea { resize: vertical; min-height: 76px; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: #075ee8; outline: 2px solid rgba(7,94,232,.2); outline-offset: 0; }
    .field-wide { grid-column: 1 / -1; }
    .check { display: flex; align-items: flex-start; gap: 9px; color: #35322d; font-size: 13px; line-height: 1.4; }
    .check input { width: 16px; height: 16px; margin: 1px 0 0; accent-color: #075ee8; flex: 0 0 auto; }
    .counterparty-prompt { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin: 0 14px 14px; padding: 12px; border-left: 3px solid #075ee8; background: #f4f7fe; }
    .counterparty-prompt > div { display: grid; gap: 3px; }
    .counterparty-prompt strong { font-family: Georgia, 'Times New Roman', serif; font-size: 16px; }
    .counterparty-prompt span { color: #5e5a53; font-size: 12px; line-height: 1.35; }
    .advanced { border-top: 1px solid #d0cabf; }
    .advanced > summary { cursor: pointer; padding: 12px 14px; color: #075ee8; font: 700 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: .08em; }
    .advanced > summary:focus-visible { outline: 2px solid #075ee8; outline-offset: -3px; }
    .advanced-body { padding: 2px 14px 14px; display: grid; gap: 18px; }
    .terms-section { display: grid; gap: 12px; }
    .terms-section h4 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 400; }
    fieldset { margin: 0; border: 0; padding: 0; }
    legend { margin-bottom: 8px; }
    .checks { display: flex; gap: 14px; flex-wrap: wrap; }
    .privacy-note, .fixed-policy { margin: 0; padding: 11px 12px; background: #f5f2eb; color: #5d5952; font-size: 12px; line-height: 1.45; }
    .fixed-policy { display: grid; gap: 4px; }
    .fixed-policy strong { color: #222; font: 700 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: .08em; }
    .validation { border-top: 1px solid #d0cabf; padding: 10px 14px; color: #66625b; font-size: 12px; line-height: 1.4; }
    .validation.valid { color: #1f6538; border-left: 3px solid #1f6538; }
    .validation.invalid { color: #8a281f; border-left: 3px solid #a63a2d; }
    .validation strong { display: block; margin-bottom: 4px; }
    .validation ul { margin: 4px 0 0 18px; padding: 0; }
    @media (max-width: 700px) {
      .grid { grid-template-columns: 1fr; }
      .field-wide { grid-column: auto; }
      .counterparty-prompt { align-items: flex-start; flex-direction: column; }
      .proposal-boundary { align-items: flex-start; flex-direction: column; gap: 5px; }
      .mechanism { margin-left: 0; }
    }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
  </style>`;
}

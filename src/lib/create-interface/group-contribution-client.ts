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

const STORAGE_KEY = "mt:create:group-contribution-drafts:v1";
const PAYLOAD_FIELD = "groupContributionTerms";
const HOST_ATTRIBUTE = "data-mt-group-contribution-host";
const OPTION_ATTRIBUTE = "data-mt-group-contribution-option";
const MAX_LOCAL_DRAFTS = 50;

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
  }
}

const mounted = new Map<string, MountedOption>();
let observer: MutationObserver | null = null;
let scanQueued = false;
let submitGuardInstalled = false;

export function startGroupContributionEnhancement(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isCreateTradePath(window.location.pathname)) return;

  installSubmitGuard();
  queueScan();

  observer ??= new MutationObserver(() => queueScan());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", queueScan);
  window.addEventListener("pageshow", queueScan);

  window.MoralTradeGroupContributions = {
    readProposalPayload,
    readDrafts: () => [...mounted.values()].map((entry) => normalizeDraft(entry.state)),
    validate: validateMountedDrafts,
    refresh: queueScan,
  };
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
  if (!isCreateTradePath(window.location.pathname)) return;
  const root = locateOfferStepRoot();
  if (!root) return;

  const candidates = locateOptionCards(root);
  candidates.forEach((candidate, index) => {
    if (candidate.card.hasAttribute(OPTION_ATTRIBUTE)) return;
    mountOption(candidate.card, candidate.label, index);
  });

  removeDetachedOptions();
  writeProposalPayload();
}

function locateOfferStepRoot(): HTMLElement | null {
  const headings = document.querySelectorAll<HTMLElement>(
    "h1, h2, h3, [role='heading'], [aria-label]",
  );
  for (const heading of headings) {
    const text = normalizedText(heading.textContent);
    if (text.includes("what could you offer") || text.includes("make each option specific")) {
      return (
        heading.closest<HTMLElement>("main, [role='main'], form") ??
        heading.parentElement?.parentElement ??
        document.body
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
  while (node && node !== root && node !== document.body) {
    const controls = node.querySelectorAll("input, textarea, select, [contenteditable='true']").length;
    const textLength = (node.textContent ?? "").trim().length;
    if (controls > 0 && textLength < 4_000) {
      candidate = node;
      if (
        node.matches("fieldset, article, section") ||
        node.getAttribute("role") === "group" ||
        getComputedStyle(node).borderStyle !== "none"
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
  const key = optionKey(card, label, index, underlying);
  if (mounted.has(key)) {
    card.setAttribute(OPTION_ATTRIBUTE, key);
    return;
  }

  const host = document.createElement("div");
  host.setAttribute(HOST_ATTRIBUTE, key);
  host.setAttribute("data-mt-proposal-only", "true");
  host.style.display = "block";
  host.style.marginTop = "12px";
  const shadow = host.attachShadow({ mode: "open" });

  const saved = readStoredDrafts().drafts[key];
  const state = saved
    ? sanitizeStoredDraft(saved, key, underlying)
    : defaultGroupContributionDraft(key, underlying, readPrimaryText(card));
  state.primaryText = readPrimaryText(card) || state.primaryText;

  const inputListener = () => {
    const entry = mounted.get(key);
    if (!entry) return;
    entry.state.primaryText = readPrimaryText(card) || entry.state.primaryText;
    updateCounterpartyMatchDefault(entry.state);
    renderMountedOption(entry);
    writeProposalPayload();
  };
  card.addEventListener("input", inputListener);
  card.addEventListener("change", inputListener);

  card.setAttribute(OPTION_ATTRIBUTE, key);
  card.insertAdjacentElement("afterend", host);

  const entry: MountedOption = { key, card, host, shadow, underlying, state, inputListener };
  mounted.set(key, entry);
  updateCounterpartyMatchDefault(entry.state);
  renderMountedOption(entry);
}

function removeDetachedOptions(): void {
  for (const [key, entry] of mounted) {
    if (entry.card.isConnected && entry.host.isConnected) continue;
    entry.card.removeEventListener("input", entry.inputListener);
    entry.card.removeEventListener("change", entry.inputListener);
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
  while (node && node !== document.body) {
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
  const explicit =
    card.getAttribute("data-option-id") ??
    card.querySelector<HTMLElement>("[data-option-id]")?.getAttribute("data-option-id");
  if (explicit) return `option:${slug(explicit)}`;

  const section = slug(nearestSectionHeading(card) || underlying);
  const optionNumber = slug(label.textContent ?? String(index + 1));
  return `${section}:${optionNumber || index + 1}`;
}

function readPrimaryText(card: HTMLElement): string {
  const controls = card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "textarea, input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select",
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

  shadow.innerHTML = `${styles()}
    <section class="mt-group" aria-label="Group contribution terms">
      <div class="mode-row" role="group" aria-label="How will you provide this option?">
        <button type="button" class="mode-button ${state.mode === "solo" ? "selected" : ""}" data-mode="solo" aria-pressed="${state.mode === "solo"}">Solo</button>
        <button type="button" class="mode-button ${state.mode === availableGroupMode ? "selected" : ""}" data-mode="${availableGroupMode}" aria-pressed="${state.mode === availableGroupMode}">${availableGroupMode === "co-act" ? "Act together" : "Fund together"}</button>
        <span class="mechanism">${availableGroupMode === "co-act" ? "CO-ACT" : "CO-FUND"}</span>
      </div>
      ${state.mode === "solo" ? soloCopy(availableGroupMode) : groupPanel(state)}
    </section>`;

  hydrateValues(shadow, state);
  installShadowListeners(entry);
  updateValidationStatus(entry);
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

function coActPrimaryFields(state: GroupContributionDraftState): string {
  return `
    ${selectField("coActStructure", "Structure", [
      ["same-action", "Same action"],
      ["complementary-roles", "Complementary roles"],
    ])}
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
    ${selectField("allocationMode", "Allocation", [
      ["equal-share", "Equal shares"],
      ["flexible-contribution", "Flexible contributions"],
      ["custom-split", "Custom split"],
      ["matching-pledge", "Matching pledge"],
    ])}
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

function hydrateValues(shadow: ShadowRoot, state: GroupContributionDraftState): void {
  shadow.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-field]").forEach(
    (control) => {
      const field = control.dataset.field as keyof GroupContributionDraftState;
      if (!(field in state)) return;
      const value = state[field];
      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        if (field === "counterpartyParticipation") {
          control.checked = state.counterpartyParticipation === "explicitly-included";
        } else {
          control.checked = Boolean(value);
        }
      } else if (control instanceof HTMLInputElement && control.dataset.minorUnits === "true") {
        control.value = typeof value === "number" && value > 0 ? (value / 100).toFixed(2) : "";
      } else if (value === null || value === undefined) {
        control.value = "";
      } else {
        control.value = String(value);
      }
    },
  );
}

function installShadowListeners(entry: MountedOption): void {
  entry.shadow.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode as GroupDraftMode;
      entry.state.mode = mode;
      entry.state.primaryText = readPrimaryText(entry.card) || entry.state.primaryText;
      renderMountedOption(entry);
      writeProposalPayload();
    });
  });

  entry.shadow
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-field]")
    .forEach((control) => {
      const update = (rerender: boolean) => {
        updateStateFromControl(entry.state, control);
        entry.state = normalizeDraft(entry.state);
        persistDrafts();
        writeProposalPayload();
        if (rerender) renderMountedOption(entry);
        else updateValidationStatus(entry);
      };
      control.addEventListener("input", () => update(false));
      control.addEventListener("change", () => update(true));
    });

  entry.shadow.querySelectorAll<HTMLInputElement>("[data-payment-method]").forEach((control) => {
    control.addEventListener("change", () => {
      entry.state.paymentMethods = [...entry.shadow.querySelectorAll<HTMLInputElement>("[data-payment-method]:checked")]
        .map((input) => input.dataset.paymentMethod)
        .filter((value): value is "wallet" | "card-or-ach" | "escrow" =>
          value === "wallet" || value === "card-or-ach" || value === "escrow",
        );
      persistDrafts();
      writeProposalPayload();
      updateValidationStatus(entry);
    });
  });
}

function updateStateFromControl(
  state: GroupContributionDraftState,
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): void {
  const field = control.dataset.field as keyof GroupContributionDraftState;
  if (!(field in state)) return;

  if (field === "counterpartyParticipation" && control instanceof HTMLInputElement) {
    state.counterpartyParticipation = control.checked ? "explicitly-included" : "explicitly-excluded";
    return;
  }

  if (control instanceof HTMLInputElement && control.type === "checkbox") {
    (state as unknown as Record<string, unknown>)[field] = control.checked;
    return;
  }

  if (control instanceof HTMLInputElement && control.dataset.minorUnits === "true") {
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

function writeProposalPayload(): void {
  persistDrafts();
  const payload = readProposalPayload();
  const serialized = JSON.stringify(payload);

  const forms = new Set<HTMLFormElement>();
  for (const entry of mounted.values()) {
    const form = entry.card.closest<HTMLFormElement>("form");
    if (form) forms.add(form);
  }

  if (forms.size === 0) {
    let hidden = document.querySelector<HTMLInputElement>(`input[type='hidden'][name='${PAYLOAD_FIELD}']`);
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = PAYLOAD_FIELD;
      hidden.setAttribute("data-mt-group-contribution-payload", "true");
      document.body.append(hidden);
    }
    hidden.value = serialized;
  } else {
    for (const form of forms) {
      let hidden = form.querySelector<HTMLInputElement>(`input[type='hidden'][name='${PAYLOAD_FIELD}']`);
      if (!hidden) {
        hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = PAYLOAD_FIELD;
        hidden.setAttribute("data-mt-group-contribution-payload", "true");
        form.append(hidden);
      }
      hidden.value = serialized;
    }
  }

  window.dispatchEvent(
    new CustomEvent("moraltrade:group-contribution-change", {
      detail: {
        proposal: payload,
        drafts: [...mounted.values()].map((entry) => normalizeDraft(entry.state)),
      },
    }),
  );
}

function installSubmitGuard(): void {
  if (submitGuardInstalled) return;
  submitGuardInstalled = true;
  document.addEventListener(
    "submit",
    (event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      const invalid = validateMountedDrafts();
      if (invalid.length === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const entry = mounted.get(invalid[0].optionKey);
      entry?.host.scrollIntoView({ behavior: "smooth", block: "center" });
      entry?.shadow.querySelector<HTMLElement>(".validation.invalid")?.focus();
      window.dispatchEvent(
        new CustomEvent("moraltrade:group-contribution-invalid", { detail: invalid }),
      );
    },
    true,
  );
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Local draft persistence is best effort. Proposal submission remains explicit.
  }
}

function readStoredDrafts(): StoredDrafts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  const defaults = defaultGroupContributionDraft(key, underlying);
  const merged = {
    ...defaults,
    ...saved,
    optionKey: key,
    underlyingContribution: underlying,
    paymentMethods: Array.isArray(saved.paymentMethods)
      ? saved.paymentMethods.filter(
          (method): method is "wallet" | "card-or-ach" | "escrow" =>
            method === "wallet" || method === "card-or-ach" || method === "escrow",
        )
      : defaults.paymentMethods,
  };
  if (underlying === "financial" && merged.mode === "co-act") merged.mode = "solo";
  if (underlying === "nonfinancial" && merged.mode === "co-fund") merged.mode = "solo";
  return normalizeDraft(merged);
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
  const labels = [...document.querySelectorAll<HTMLElement>("*")].filter((element) =>
    normalizedText(directText(element)).includes("you want someone to"),
  );
  for (const label of labels) {
    let node: HTMLElement | null = label.parentElement;
    while (node && node !== document.body) {
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
  return new Set(
    normalizedText(value)
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length > 1 && !stop.has(token)),
  );
}

function directText(element: HTMLElement): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
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

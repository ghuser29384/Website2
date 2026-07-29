from __future__ import annotations

from pathlib import Path
import textwrap

ROOT = Path(__file__).resolve().parents[2]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def append_before_once(text: str, marker: str, addition: str, label: str) -> str:
    return replace_once(text, marker, addition + marker, label)


html_path = ROOT / "public/moral-trade-create/index.html"
html = html_path.read_text(encoding="utf-8")
if "common-ground-create-integration-v1" in html:
    raise RuntimeError("Compact Common Ground Pool integration already exists")

html = replace_once(
    html,
    "Create a pledge-swap, donation redirect, or public-goods pool.",
    "Create a trade, redirect, or pool.",
    "shorten Create header subtitle",
)
html = replace_once(
    html,
    "Choose Commitment, Skill, or Fund. If you choose Fund, also choose whether you are creating a pledge-swap, a donation redirect, or a dominant assurance contract pool.",
    "Choose Commitment, Skill, or Fund. Fund includes swaps, redirects, shared-project pools, and threshold pools.",
    "shorten request intro copy",
)
html = replace_once(
    html,
    "<div class=\"fund-mode-kicker\">If you chose Fund, choose the structure</div>",
    "<div class=\"fund-mode-kicker\">Choose a funding structure</div>",
    "shorten funding structure kicker",
)

old_dac_card = textwrap.dedent('''\
                <button type="button" class="fund-mode-choice" data-fund-mode="dac" aria-pressed="false">
                  <span class="fund-mode-mark">Public-good pool</span>
                  <strong>Dominant assurance contract pool</strong>
                  <p>Either launch a new threshold pool or ask a counterparty to contribute to a pool that already exists.</p>
                </button>
''')
new_pool_cards = textwrap.dedent('''\
                <button type="button" class="fund-mode-choice" data-fund-mode="commonGround" aria-pressed="false">
                  <span class="fund-mode-mark">Shared project</span>
                  <strong>Common Ground Pool</strong>
                  <p>Split one shared project across people who value it for different reasons.</p>
                </button>
                <button type="button" class="fund-mode-choice" data-fund-mode="dac" aria-pressed="false">
                  <span class="fund-mode-mark">Threshold</span>
                  <strong>Threshold pool</strong>
                  <p>Fund only if a target is reached. Add a failure bonus only when needed.</p>
                </button>
''')
html = replace_once(html, old_dac_card, new_pool_cards, "add Common Ground Pool card")

common_ground_panel = textwrap.dedent('''\

            <div class="common-ground-panel" id="commonGroundFields" hidden data-common-ground-create-integration-v1>
              <div class="common-ground-toolbar">
                <strong>Shared split</strong>
                <button type="button" id="commonGroundExample">Reset example</button>
              </div>
              <div class="common-ground-top-grid">
                <div class="offer-field">
                  <label for="commonGroundTargetInput">Target</label>
                  <div class="money-input-shell"><span>$</span><input id="commonGroundTargetInput" type="number" inputmode="decimal" min="0.01" step="0.01" value="10000.00" /><span>USD</span></div>
                </div>
                <div class="offer-field">
                  <label for="commonGroundDeadlineInput">Deadline</label>
                  <input id="commonGroundDeadlineInput" type="text" maxlength="100" placeholder="e.g. 30 September 2026, 23:59 UTC" />
                </div>
              </div>
              <div class="common-ground-participants-head">
                <span id="commonGroundParticipantCount">2 participants</span>
                <button type="button" id="addCommonGroundParticipant">+ Add</button>
              </div>
              <div class="common-ground-participant-list" id="commonGroundParticipantList"></div>
              <label class="common-ground-confirm">
                <input type="checkbox" id="commonGroundBaselineConfirm" />
                <span>These are honest no-pool defaults.</span>
              </label>
              <div class="common-ground-status" id="commonGroundStatus" role="status" aria-live="polite"></div>
            </div>
''')
html = append_before_once(
    html,
    '            <div class="dac-terms-panel" id="dacCreateFields" hidden>',
    common_ground_panel,
    "insert compact Common Ground Pool editor",
)

common_ground_css = textwrap.dedent('''\

    /* compact Common Ground Pool integration */
    .fund-mode-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .common-ground-panel {
      margin: 14px 0 0;
      border: 1px solid var(--line-strong);
      background: rgba(251,250,246,.9);
    }

    .common-ground-panel[hidden] { display: none !important; }

    .common-ground-toolbar,
    .common-ground-participants-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 46px;
      padding: 0 14px;
      border-bottom: 1px solid var(--line);
    }

    .common-ground-toolbar strong,
    .common-ground-participants-head span {
      font: 700 9px/1.2 var(--mono);
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .common-ground-toolbar button,
    .common-ground-participants-head button,
    .common-ground-remove {
      min-height: 32px;
      border: 1px solid var(--line-strong);
      padding: 0 10px;
      background: white;
      font: 700 9px/1 var(--mono);
      letter-spacing: .06em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .common-ground-toolbar button:hover,
    .common-ground-participants-head button:hover,
    .common-ground-remove:hover { background: var(--ink); color: white; }

    .common-ground-top-grid {
      display: grid;
      grid-template-columns: minmax(180px, .7fr) minmax(260px, 1.3fr);
      gap: 12px;
      padding: 14px;
      border-bottom: 1px solid var(--line);
    }

    .common-ground-participant-list { display: grid; }

    .common-ground-participant-row {
      display: grid;
      grid-template-columns: minmax(130px, .8fr) minmax(180px, 1.2fr) minmax(120px, .72fr) minmax(120px, .72fr) minmax(120px, .72fr) auto;
      gap: 10px;
      align-items: end;
      padding: 13px 14px;
      border-bottom: 1px solid var(--line);
    }

    .common-ground-participant-row .offer-field { margin: 0; }
    .common-ground-participant-row input[readonly] { background: var(--blue-soft); color: var(--blue); font-weight: 700; }
    .common-ground-remove { margin-bottom: 1px; color: #8b3d32; }

    .common-ground-confirm {
      display: flex;
      align-items: center;
      gap: 9px;
      margin: 13px 14px 0;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .common-ground-confirm input { width: 17px; height: 17px; accent-color: var(--blue); }

    .common-ground-status {
      min-height: 42px;
      margin: 12px 14px 14px;
      padding: 11px 13px;
      border-left: 4px solid var(--line-strong);
      background: rgba(18,18,15,.045);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .common-ground-status.ready {
      border-left-color: var(--moss);
      background: var(--moss-soft);
      color: #315039;
    }

    .common-ground-status.blocked {
      border-left-color: var(--apricot);
      background: var(--apricot-soft);
      color: #693b2a;
    }

    @media (max-width: 1100px) {
      .fund-mode-grid { grid-template-columns: 1fr; }
      .common-ground-participant-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .common-ground-remove { justify-self: start; }
    }

    @media (max-width: 700px) {
      .common-ground-top-grid,
      .common-ground-participant-row { grid-template-columns: 1fr; }
      .common-ground-toolbar,
      .common-ground-participants-head { align-items: flex-start; padding-top: 11px; padding-bottom: 11px; }
    }
''')
html = append_before_once(html, "\n  </style>\n</head>", common_ground_css, "append Common Ground Pool CSS")

common_ground_js = textwrap.dedent(r'''\

    /* common-ground-create-integration-v1 */
    const cgOriginalIsDirectPoolRoute = isDirectPoolRoute;
    const cgOriginalGetCreationFormatLabel = getCreationFormatLabel;
    const cgOriginalUpdateRequestPageCopy = updateRequestPageCopy;
    const cgOriginalUpdateRequestKindSelection = updateRequestKindSelection;
    const cgOriginalUpdateRequestContinue = updateRequestContinue;
    const cgOriginalContinueFromRequest = continueFromRequest;
    const cgOriginalShowStep = showStep;
    const cgOriginalBuildCreateSubmissionPayload = buildCreateSubmissionPayload;
    const cgOriginalRenderSubmittedReceipt = renderSubmittedReceipt;
    const cgOriginalSelectFundMode = selectFundMode;

    fundModeMeta.commonGround = {
      label: "Common Ground Pool",
      fieldLabel: "Shared project",
      placeholder: "e.g. Shared research and coordination",
      note: ""
    };
    fundModeSuggestions.commonGround = [
      "Shared research and coordination for {cause}",
      "Shared evidence infrastructure for {cause}",
      "A jointly valued project for {cause}"
    ];

    function isCommonGroundRoute() {
      return state.requestKind === "fund" && state.fundMode === "commonGround";
    }

    isDirectPoolRoute = function () {
      return isCommonGroundRoute() || cgOriginalIsDirectPoolRoute();
    };

    getCreationFormatLabel = function () {
      return isCommonGroundRoute() ? "Common Ground Pool" : cgOriginalGetCreationFormatLabel();
    };

    function cgDefaultDeadline() {
      const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
    }

    function cgExampleParticipants() {
      return [
        {
          id: "cg-a",
          name: "Participant A",
          defaultProject: "Animal-welfare project",
          budget: "10000.00",
          contribution: "5000.00"
        },
        {
          id: "cg-b",
          name: "Participant B",
          defaultProject: "Long-term-future project",
          budget: "10000.00",
          contribution: "5000.00"
        }
      ];
    }

    const cgWasResumed = state.fundMode === "commonGround" && Array.isArray(state.commonGroundParticipants);
    let cgPrivateValueBps = new Map();

    function cgInitializeState() {
      if (!Array.isArray(state.commonGroundParticipants) || state.commonGroundParticipants.length < 2) {
        state.commonGroundParticipants = cgExampleParticipants();
      }
      state.commonGroundParticipants = state.commonGroundParticipants.slice(0, 8).map((participant, index) => ({
        id: String(participant.id || `cg-${index + 1}`),
        name: String(participant.name || ""),
        defaultProject: String(participant.defaultProject || ""),
        budget: String(participant.budget || ""),
        contribution: String(participant.contribution || "0.00")
      }));
      state.commonGroundTarget = String(state.commonGroundTarget || "10000.00");
      state.commonGroundDeadline = String(state.commonGroundDeadline || cgDefaultDeadline());
      state.commonGroundBaselineConfirmed = cgWasResumed ? false : Boolean(state.commonGroundBaselineConfirmed);
      state.commonGroundParticipantGainChecked = false;
      cgPrivateValueBps = new Map(
        state.commonGroundParticipants.map((participant, index) => [participant.id, cgWasResumed ? 0 : index < 2 ? 6000 : 0])
      );
    }

    function cgResetExample({ setProject = true } = {}) {
      state.commonGroundTarget = "10000.00";
      state.commonGroundDeadline = cgDefaultDeadline();
      state.commonGroundParticipants = cgExampleParticipants();
      state.commonGroundBaselineConfirmed = false;
      state.commonGroundParticipantGainChecked = false;
      cgPrivateValueBps = new Map([["cg-a", 6000], ["cg-b", 6000]]);
      if (setProject) {
        const project = `Shared research and coordination for ${state.cause || "a common cause"}`;
        state.requestAction = project;
        const input = $("#requestActionInput");
        if (input) input.value = project;
      }
      cgSyncPanel();
    }

    function cgParseCents(value) {
      const normalized = String(value ?? "").replace(/[$,\s]/g, "");
      const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
      if (!match) return null;
      const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
      return Number.isSafeInteger(cents) ? cents : null;
    }

    function cgMoneyInput(cents) {
      return (Number(cents || 0) / 100).toFixed(2);
    }

    function cgFormatUsd(cents) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: Number(cents) % 100 === 0 ? 0 : 2
      }).format(Number(cents || 0) / 100);
    }

    function cgBalancedShares(valueBps) {
      const values = valueBps.map(value => value / 10000);
      if (values.reduce((sum, value) => sum + value, 0) <= 1) return null;
      const active = new Set(values.map((_, index) => index));
      let lambda = 0;
      while (active.size) {
        const total = [...active].reduce((sum, index) => sum + values[index], 0);
        lambda = (total - 1) / active.size;
        const remove = [...active].filter(index => values[index] <= lambda + 1e-12);
        if (!remove.length) break;
        remove.forEach(index => active.delete(index));
      }
      if (!active.size) return null;
      const shares = values.map((value, index) => active.has(index) ? Math.max(0, value - lambda) : 0);
      const total = shares.reduce((sum, value) => sum + value, 0);
      return total > 0 ? shares.map(value => value / total) : null;
    }

    function cgAllocateCents(targetCents, shares) {
      const raw = shares.map(share => targetCents * share);
      const allocations = raw.map(Math.floor);
      let remainder = targetCents - allocations.reduce((sum, value) => sum + value, 0);
      raw.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
        .forEach(entry => {
          if (remainder <= 0) return;
          allocations[entry.index] += 1;
          remainder -= 1;
        });
      return allocations;
    }

    function cgEvaluate() {
      const blockers = [];
      const project = $("#requestActionInput")?.value.trim() || state.requestAction.trim();
      const targetCents = cgParseCents(state.commonGroundTarget);
      const deadline = state.commonGroundDeadline.trim();
      const deadlineTime = Date.parse(deadline);
      const participants = state.commonGroundParticipants;

      if (!project) blockers.push("Name the shared project.");
      if (!(targetCents > 0)) blockers.push("Enter a positive target.");
      if (!deadline) blockers.push("Add a deadline.");
      else if (!Number.isFinite(deadlineTime)) blockers.push("Use a clear deadline with a timezone.");
      else if (deadlineTime <= Date.now() + 30 * 60 * 1000) blockers.push("Use a deadline at least 30 minutes away.");
      if (participants.length < 2 || participants.length > 8) blockers.push("Use 2–8 participants.");

      const parsed = participants.map((participant, index) => {
        const budgetCents = cgParseCents(participant.budget);
        const privateValueBps = Number(cgPrivateValueBps.get(participant.id) || 0);
        if (!participant.name.trim()) blockers.push(`Name participant ${index + 1}.`);
        if (!participant.defaultProject.trim()) blockers.push(`Add participant ${index + 1}’s no-pool default.`);
        if (!(budgetCents > 0)) blockers.push(`Add participant ${index + 1}’s budget.`);
        if (!(privateValueBps > 0)) blockers.push(`Add participant ${index + 1}’s private value.`);
        return { participant, budgetCents, privateValueBps };
      });

      let allocations = participants.map(() => 0);
      let gains = participants.map(() => 0);
      if (targetCents > 0 && parsed.every(row => row.privateValueBps > 0)) {
        const shares = cgBalancedShares(parsed.map(row => row.privateValueBps));
        if (!shares) {
          blockers.push("Combined private value must exceed 100%.");
        } else {
          allocations = cgAllocateCents(targetCents, shares);
          parsed.forEach((row, index) => {
            const contributionCents = allocations[index];
            const sharedValueCents = Math.floor((targetCents * row.privateValueBps + 5000) / 10000);
            gains[index] = sharedValueCents - contributionCents;
            if (!(contributionCents > 0)) blockers.push("Every listed participant needs a positive share.");
            if (row.budgetCents != null && contributionCents > row.budgetCents) {
              blockers.push(`${row.participant.name || `Participant ${index + 1}`} cannot cover the suggested share.`);
            }
            if (!(gains[index] > 0)) blockers.push("No positive-gain split exists for every participant.");
          });
        }
      }

      if (!state.commonGroundBaselineConfirmed) blockers.push("Confirm the no-pool defaults.");
      const uniqueBlockers = [...new Set(blockers)];
      return {
        ok: uniqueBlockers.length === 0,
        blockers: uniqueBlockers,
        project,
        targetCents: targetCents || 0,
        deadline,
        parsed,
        allocations,
        gains
      };
    }

    function cgStatusText(result) {
      if (!result.ok) return result.blockers[0] || "Complete the split.";
      const minimumGain = Math.min(...result.gains);
      if (result.gains.length === 2 && result.gains[0] === result.gains[1]) {
        return `Both gain ${cgFormatUsd(result.gains[0])} by their own estimates.`;
      }
      return `All ${result.gains.length} gain at least ${cgFormatUsd(minimumGain)} by their own estimates.`;
    }

    function cgRecalculate() {
      const result = cgEvaluate();
      state.commonGroundParticipants.forEach((participant, index) => {
        participant.contribution = cgMoneyInput(result.allocations[index] || 0);
        const output = $(`[data-cg-contribution="${participant.id}"]`);
        if (output) output.value = participant.contribution;
      });
      state.commonGroundParticipantGainChecked = result.ok;
      const status = $("#commonGroundStatus");
      if (status) {
        status.textContent = cgStatusText(result);
        status.classList.toggle("ready", result.ok);
        status.classList.toggle("blocked", !result.ok);
      }
      return result;
    }

    function cgRenderParticipants() {
      const list = $("#commonGroundParticipantList");
      if (!list) return;
      $("#commonGroundParticipantCount").textContent = `${state.commonGroundParticipants.length} participants`;
      list.innerHTML = state.commonGroundParticipants.map((participant, index) => {
        const privateValue = Number(cgPrivateValueBps.get(participant.id) || 0);
        return `
          <div class="common-ground-participant-row" data-cg-row="${escapeHTML(participant.id)}">
            <div class="offer-field"><label for="cg-name-${index}">Name</label><input id="cg-name-${index}" data-cg-field="name" data-cg-id="${escapeHTML(participant.id)}" maxlength="80" value="${escapeHTML(participant.name)}" /></div>
            <div class="offer-field"><label for="cg-default-${index}">Without pool</label><input id="cg-default-${index}" data-cg-field="defaultProject" data-cg-id="${escapeHTML(participant.id)}" maxlength="160" value="${escapeHTML(participant.defaultProject)}" /></div>
            <div class="offer-field"><label for="cg-budget-${index}">Budget</label><input id="cg-budget-${index}" data-cg-field="budget" data-cg-id="${escapeHTML(participant.id)}" type="number" inputmode="decimal" min="0.01" step="0.01" value="${escapeHTML(participant.budget)}" /></div>
            <div class="offer-field"><label for="cg-value-${index}">Value (private)</label><input id="cg-value-${index}" data-cg-field="privateValue" data-cg-id="${escapeHTML(participant.id)}" type="number" inputmode="decimal" min="0.01" max="500" step="0.01" value="${privateValue > 0 ? privateValue / 100 : ""}" aria-label="${escapeHTML(participant.name || `Participant ${index + 1}`)} private value percentage" /></div>
            <div class="offer-field"><label for="cg-pay-${index}">Pays</label><input id="cg-pay-${index}" data-cg-contribution="${escapeHTML(participant.id)}" readonly value="${escapeHTML(participant.contribution)}" /></div>
            ${state.commonGroundParticipants.length > 2 ? `<button type="button" class="common-ground-remove" data-cg-remove="${escapeHTML(participant.id)}" aria-label="Remove ${escapeHTML(participant.name || `participant ${index + 1}`)}">Remove</button>` : ""}
          </div>`;
      }).join("");

      $$('[data-cg-field]', list).forEach(input => {
        input.addEventListener("input", () => {
          const participant = state.commonGroundParticipants.find(row => row.id === input.dataset.cgId);
          if (!participant) return;
          if (input.dataset.cgField === "privateValue") {
            const value = Number(input.value);
            cgPrivateValueBps.set(participant.id, Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0);
          } else {
            participant[input.dataset.cgField] = input.value;
          }
          setRequestError("");
          updateRequestContinue();
        });
      });

      $$('[data-cg-remove]', list).forEach(button => {
        button.addEventListener("click", () => {
          if (state.commonGroundParticipants.length <= 2) return;
          const id = button.dataset.cgRemove;
          state.commonGroundParticipants = state.commonGroundParticipants.filter(row => row.id !== id);
          cgPrivateValueBps.delete(id);
          cgRenderParticipants();
          updateRequestContinue();
        });
      });
    }

    function cgSyncPanel() {
      const target = $("#commonGroundTargetInput");
      const deadline = $("#commonGroundDeadlineInput");
      const confirm = $("#commonGroundBaselineConfirm");
      if (target) target.value = state.commonGroundTarget;
      if (deadline) deadline.value = state.commonGroundDeadline;
      if (confirm) confirm.checked = Boolean(state.commonGroundBaselineConfirmed);
      cgRenderParticipants();
      updateRequestContinue();
    }

    function cgAddParticipant() {
      if (state.commonGroundParticipants.length >= 8) return;
      const id = `cg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      state.commonGroundParticipants.push({
        id,
        name: `Participant ${state.commonGroundParticipants.length + 1}`,
        defaultProject: "",
        budget: state.commonGroundTarget || "10000.00",
        contribution: "0.00"
      });
      cgPrivateValueBps.set(id, 0);
      cgRenderParticipants();
      updateRequestContinue();
    }

    function cgSyncPoolState(result) {
      state.requestAction = result.project;
      state.poolThresholds = [{ amount: cgMoneyInput(result.targetCents) }];
      state.poolDeadline = result.deadline;
      state.poolFailureBonusType = "none";
      state.poolFailureBonusAmount = "";
      state.poolFailureBonusPercent = "";
      state.poolFailureBonusFunction = "";
      state.poolFailureTimingMode = "all";
      state.poolTimingFormulaAcknowledged = false;
      state.poolContinuation = "stop";
      state.poolThresholdVisibility = "publicExact";
      state.poolProgressVisibility = "exact";
      state.moralTradeBonusShare = "0";
      state.poolActivation = "Every named participant must confirm the same frozen split before the pool can open.";
      state.offers = [];
      state.offerPhase = "choose";
      state.offerDetails = createEmptyOfferDetails();
    }

    function cgContinue() {
      const result = cgRecalculate();
      if (!result.ok) {
        setRequestError(result.blockers[0] || "Complete the Common Ground Pool split.");
        return;
      }
      cgSyncPoolState(result);
      setRequestError("");
      closeSuggestions();
      showStep(4);
    }

    function cgRenderSummary() {
      const result = cgRecalculate();
      $("#summaryHeading").textContent = "Review the split.";
      $("#summaryStepLabel").textContent = "Review and submit · 3 of 3";
      $("#summaryIntro").textContent = "Check the project, target, and who pays.";
      $("#summaryLeftLabel").textContent = "Shared project";
      $("#summaryLeftFoot").textContent = "One project, one frozen split.";
      $("#summaryJoin").textContent = "→";
      $("#summaryRightLabel").textContent = "Who pays";
      $("#summaryRightFoot").textContent = "Private value estimates are not submitted.";
      $("#summaryRequestKind").textContent = "Fund · Common Ground Pool";
      $("#summaryRequestAction").textContent = result.project;
      const rows = [
        ["Target", `${cgFormatUsd(result.targetCents)} · ${result.deadline}`],
        ...state.commonGroundParticipants.map(participant => [
          participant.name,
          `${cgFormatUsd(cgParseCents(participant.contribution) || 0)} · without pool: ${participant.defaultProject}`
        ])
      ];
      $("#summaryOffers").innerHTML = rows.map(([label, value], index) => `
        <div class="seed-offer-item">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div><strong class="seed-offer-title">${escapeHTML(label)}</strong><ul><li>${escapeHTML(value)}</li></ul></div>
        </div>`).join("");
      $("#publishKicker").textContent = "Private review";
      $("#publishHeading").textContent = "Submit this pool for review.";
      $("#publishDescription").textContent = "No pledge opens until every named participant confirms and Moral Trade approves the recipient.";
      $("#publishFacts").innerHTML = `
        <div class="publish-fact"><span>Target</span><strong>${escapeHTML(cgFormatUsd(result.targetCents))}</strong></div>
        <div class="publish-fact"><span>Participants</span><strong>${state.commonGroundParticipants.length}</strong></div>
        <div class="publish-fact"><span>Visibility</span><strong>Private until approved</strong></div>`;
      $("#publishConfirmTitle").textContent = "The split and no-pool defaults are accurate.";
      $("#publishConfirmCopy").textContent = "Private value estimates stay in this tab.";
      $("#publishOffer").textContent = "Submit for review →";
      $("#boundaryNote").innerHTML = "<strong>No money moves</strong> Every named participant must confirm the same frozen split before the pool can open.";
    }

    updateRequestPageCopy = function () {
      if (!isCommonGroundRoute()) return cgOriginalUpdateRequestPageCopy();
      $("#requestHeading").textContent = "What should everyone fund together?";
      $("#requestIntroCopy").textContent = "Name one shared project and split the target.";
    };

    updateRequestKindSelection = function () {
      cgOriginalUpdateRequestKindSelection();
      const active = isCommonGroundRoute();
      $("#commonGroundFields").hidden = !active;
      if (!active) return;
      $("#dacCreateFields").hidden = true;
      $("#dacExistingFields").hidden = true;
      $("#requestModeNote").hidden = true;
      $("#requestBottomHint").textContent = "Review the shared split.";
      $("#continueRequest").textContent = "Review pool →";
      cgSyncPanel();
      updateRequestPageCopy();
    };

    updateRequestContinue = function () {
      if (!isCommonGroundRoute()) return cgOriginalUpdateRequestContinue();
      const result = cgRecalculate();
      $("#continueRequest").disabled = !result.ok;
    };

    continueFromRequest = function () {
      if (isCommonGroundRoute()) return cgContinue();
      return cgOriginalContinueFromRequest();
    };

    showStep = function (step) {
      cgOriginalShowStep(step);
      if (step === 2 && isCommonGroundRoute()) cgSyncPanel();
      if (step === 4 && isCommonGroundRoute()) cgRenderSummary();
    };

    selectFundMode = function (button) {
      const enteringCommonGround = button.dataset.fundMode === "commonGround" && !isCommonGroundRoute();
      cgOriginalSelectFundMode(button);
      if (enteringCommonGround && !$("#requestActionInput").value.trim()) {
        const project = `Shared research and coordination for ${state.cause || "a common cause"}`;
        state.requestAction = project;
        $("#requestActionInput").value = project;
      }
      if (isCommonGroundRoute()) cgSyncPanel();
    };

    buildCreateSubmissionPayload = function () {
      const payload = cgOriginalBuildCreateSubmissionPayload();
      if (!isCommonGroundRoute()) return payload;
      const result = cgEvaluate();
      if (!result.ok) throw new Error(result.blockers[0] || "The Common Ground Pool split is incomplete.");
      payload.pool.commonGround = {
        targetAmountCents: result.targetCents,
        calculationPolicy: "balanced_surplus_v1",
        privateValueEstimatesStored: false,
        participantGainChecked: true,
        baselineConfirmed: true,
        participants: state.commonGroundParticipants.map((participant, index) => ({
          id: participant.id,
          name: participant.name.trim(),
          defaultProject: participant.defaultProject.trim(),
          budgetCents: result.parsed[index].budgetCents,
          contributionCents: result.allocations[index]
        }))
      };
      return payload;
    };

    renderSubmittedReceipt = function (submission) {
      cgOriginalRenderSubmittedReceipt(submission);
      if (!isCommonGroundRoute()) return;
      const result = cgEvaluate();
      $("#publishedObjectLabel").textContent = "Common Ground Pool proposal";
      $("#publishedHeadline").textContent = result.project;
      $("#publishedLede").textContent = "Saved for review. It stays private and cannot accept pledges until every named participant confirms and the review gates pass.";
      $("#publishedOfferList").innerHTML = [
        `<li>Target: ${escapeHTML(cgFormatUsd(result.targetCents))}</li>`,
        `<li>Deadline: ${escapeHTML(result.deadline)}</li>`,
        ...state.commonGroundParticipants.map(participant => `<li>${escapeHTML(participant.name)}: ${escapeHTML(cgFormatUsd(cgParseCents(participant.contribution) || 0))}; without pool: ${escapeHTML(participant.defaultProject)}</li>`),
        `<li>Private value estimates were not submitted.</li>`
      ].join("");
      $("#boundaryNote").innerHTML = "<strong>Submitted</strong> This private review record creates no pledge or payment obligation.";
    };

    cgInitializeState();
    $("#commonGroundTargetInput").addEventListener("input", event => {
      state.commonGroundTarget = event.target.value;
      setRequestError("");
      updateRequestContinue();
    });
    $("#commonGroundDeadlineInput").addEventListener("input", event => {
      state.commonGroundDeadline = event.target.value;
      setRequestError("");
      updateRequestContinue();
    });
    $("#commonGroundBaselineConfirm").addEventListener("change", event => {
      state.commonGroundBaselineConfirmed = event.target.checked;
      setRequestError("");
      updateRequestContinue();
    });
    $("#addCommonGroundParticipant").addEventListener("click", cgAddParticipant);
    $("#commonGroundExample").addEventListener("click", () => cgResetExample({ setProject: true }));
    $("#continueRequest").addEventListener("click", event => {
      if (!isCommonGroundRoute()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cgContinue();
    }, true);
    ["#startOver", "#makeAnotherOffer"].forEach(selector => {
      $(selector).addEventListener("click", () => {
        window.setTimeout(() => cgResetExample({ setProject: false }), 0);
      });
    });

    if (cgWasResumed) {
      state.commonGroundBaselineConfirmed = false;
      state.commonGroundParticipantGainChecked = false;
      updateRequestKindSelection();
      showStep(2);
    } else {
      $("#commonGroundFields").hidden = true;
    }
''')
html = append_before_once(html, "\n  </script>\n</body>", common_ground_js, "append Common Ground Pool JavaScript")
html_path.write_text(html, encoding="utf-8")


types_path = ROOT / "src/lib/create-interface/types.ts"
types = types_path.read_text(encoding="utf-8")
types = replace_once(
    types,
    'export type CreateFundMode = "pledgeSwap" | "redirect" | "dac";',
    'export type CreateFundMode = "pledgeSwap" | "redirect" | "commonGround" | "dac";',
    "extend Create fund modes",
)
common_ground_types = textwrap.dedent('''\
export interface CreateCommonGroundParticipantInput {
  id: string;
  name: string;
  defaultProject: string;
  budgetCents: number;
  contributionCents: number;
}

export interface CreateCommonGroundInput {
  targetAmountCents: number;
  calculationPolicy: "balanced_surplus_v1";
  privateValueEstimatesStored: false;
  participantGainChecked: true;
  baselineConfirmed: true;
  participants: CreateCommonGroundParticipantInput[];
}

''')
types = append_before_once(types, "export interface CreatePoolInput {", common_ground_types, "add Common Ground input types")
types = replace_once(
    types,
    "export interface CreatePoolInput {\n  thresholds: CreateThresholdInput[];",
    "export interface CreatePoolInput {\n  commonGround?: CreateCommonGroundInput | null;\n  thresholds: CreateThresholdInput[];",
    "add Common Ground input to pool",
)
types = append_before_once(
    types,
    "export interface ValidatedCreatePoolTerms {",
    "export interface ValidatedCreateCommonGroundTerms extends CreateCommonGroundInput {}\n\n",
    "add validated Common Ground type",
)
types = replace_once(
    types,
    "export interface ValidatedCreatePoolTerms {\n  thresholdAmountsCents: number[];",
    "export interface ValidatedCreatePoolTerms {\n  commonGround: ValidatedCreateCommonGroundTerms | null;\n  thresholdAmountsCents: number[];",
    "add Common Ground to validated pool terms",
)
types_path.write_text(types, encoding="utf-8")


validation_path = ROOT / "src/lib/create-interface/validation.ts"
validation = validation_path.read_text(encoding="utf-8")
integer_helper = textwrap.dedent('''\

function exactIntegerValue(value: unknown, label: string, options?: {
  minimum?: number;
  maximum?: number;
}) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be an exact integer.`);
  }
  if (options?.minimum != null && value < options.minimum) {
    throw new Error(`${label} is below the permitted minimum.`);
  }
  if (options?.maximum != null && value > options.maximum) {
    throw new Error(`${label} exceeds the permitted maximum.`);
  }
  return value;
}
''')
validation = append_before_once(validation, "\nfunction validateOfferOption", integer_helper, "add exact integer validator")

validate_common_ground = textwrap.dedent('''\

function validateCommonGround(raw: unknown): NonNullable<ValidatedCreatePoolTerms["commonGround"]> {
  const input = objectValue(raw, "Common Ground Pool terms");
  const allowedTopLevel = new Set([
    "targetAmountCents",
    "calculationPolicy",
    "privateValueEstimatesStored",
    "participantGainChecked",
    "baselineConfirmed",
    "participants",
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevel.has(key)) {
      throw new Error("Common Ground Pool terms contain an unsupported or private field.");
    }
  }

  const targetAmountCents = exactIntegerValue(input.targetAmountCents, "Common Ground Pool target", { minimum: 1 });
  if (input.calculationPolicy !== "balanced_surplus_v1") {
    throw new Error("Common Ground Pool calculation policy is invalid.");
  }
  if (input.privateValueEstimatesStored !== false) {
    throw new Error("Private Common Ground Pool value estimates must not be submitted.");
  }
  if (input.participantGainChecked !== true || input.baselineConfirmed !== true) {
    throw new Error("Common Ground Pool gain and no-pool baseline confirmations are required.");
  }
  if (!Array.isArray(input.participants) || input.participants.length < 2 || input.participants.length > 8) {
    throw new Error("A Common Ground Pool requires between two and eight participants.");
  }

  const seen = new Set<string>();
  const participants = input.participants.map((rawParticipant, index) => {
    const participant = objectValue(rawParticipant, `Common Ground Pool participant ${index + 1}`);
    const allowedParticipantFields = new Set(["id", "name", "defaultProject", "budgetCents", "contributionCents"]);
    for (const key of Object.keys(participant)) {
      if (!allowedParticipantFields.has(key)) {
        throw new Error("Common Ground Pool participant terms contain an unsupported or private field.");
      }
    }
    const id = textValue(participant.id, `Common Ground Pool participant ${index + 1} id`, 2, 80);
    if (!/^[A-Za-z0-9:_-]+$/.test(id)) {
      throw new Error(`Common Ground Pool participant ${index + 1} id contains unsupported characters.`);
    }
    if (seen.has(id)) throw new Error("Common Ground Pool participant ids must be unique.");
    seen.add(id);
    const budgetCents = exactIntegerValue(participant.budgetCents, `Common Ground Pool participant ${index + 1} budget`, { minimum: 1 });
    const contributionCents = exactIntegerValue(participant.contributionCents, `Common Ground Pool participant ${index + 1} contribution`, { minimum: 1 });
    if (contributionCents > budgetCents) {
      throw new Error(`Common Ground Pool participant ${index + 1} contribution exceeds their controlled budget.`);
    }
    return {
      id,
      name: textValue(participant.name, `Common Ground Pool participant ${index + 1} name`, 1, 80),
      defaultProject: textValue(participant.defaultProject, `Common Ground Pool participant ${index + 1} no-pool default`, 1, 160),
      budgetCents,
      contributionCents,
    };
  });

  const contributionTotal = participants.reduce((sum, participant) => sum + participant.contributionCents, 0);
  if (!Number.isSafeInteger(contributionTotal) || contributionTotal !== targetAmountCents) {
    throw new Error("Common Ground Pool participant contributions must equal the target exactly.");
  }

  return {
    targetAmountCents,
    calculationPolicy: "balanced_surplus_v1",
    privateValueEstimatesStored: false,
    participantGainChecked: true,
    baselineConfirmed: true,
    participants,
  };
}
''')
validation = append_before_once(validation, "\nfunction validatePool(raw: unknown): ValidatedCreatePoolTerms {", validate_common_ground, "add Common Ground validation")
validation = replace_once(
    validation,
    'function validatePool(raw: unknown): ValidatedCreatePoolTerms {\n  const input = objectValue(raw, "Pool terms");',
    'function validatePool(raw: unknown): ValidatedCreatePoolTerms {\n  const input = objectValue(raw, "Pool terms");\n  const commonGround = input.commonGround == null ? null : validateCommonGround(input.commonGround);',
    "read Common Ground pool terms",
)
validation = replace_once(
    validation,
    '  if (payload.fundMode === "redirect") return "donation_redirect";\n  if (payload.fundMode === "dac" && payload.dacPath === "create") return "pool_create";',
    '  if (payload.fundMode === "redirect") return "donation_redirect";\n  if (payload.fundMode === "commonGround") return "pool_create";\n  if (payload.fundMode === "dac" && payload.dacPath === "create") return "pool_create";',
    "infer Common Ground Pool kind",
)
validation = replace_once(
    validation,
    '["pledgeSwap", "redirect", "dac"] as const, "Funding structure"',
    '["pledgeSwap", "redirect", "commonGround", "dac"] as const, "Funding structure"',
    "accept Common Ground fund mode",
)
validation = replace_once(
    validation,
    '  const moralTradeBonusShareBps = decimalToInteger(\n    input.moralTradeBonusShare,\n    2,\n    "Moral Trade failure-bonus share",\n    { minimum: 0, maximum: 10_000 },\n  );',
    '  const moralTradeBonusShareBps = decimalToInteger(\n    input.moralTradeBonusShare,\n    2,\n    "Moral Trade failure-bonus share",\n    { minimum: 0, maximum: 10_000 },\n  );\n  const continuation = enumValue(input.continuation, ["stop", "continue"] as const, "Post-threshold behavior");',
    "name continuation for Common Ground validation",
)
common_ground_invariants = textwrap.dedent('''\
  if (commonGround) {
    if (thresholdAmountsCents.length !== 1 || thresholdAmountsCents[0] !== commonGround.targetAmountCents) {
      throw new Error("A Common Ground Pool requires one threshold equal to its shared target.");
    }
    if (failureBonusType !== "none" || failureTimingMode !== "all") {
      throw new Error("A Common Ground Pool cannot include a failure bonus or timing multiplier.");
    }
    if (continuation !== "stop") {
      throw new Error("A Common Ground Pool must stop at its shared target.");
    }
    if (input.thresholdVisibility !== "public_exact" || progressVisibility !== "exact") {
      throw new Error("A Common Ground Pool requires exact target and progress disclosure after approval.");
    }
    if (moralTradeBonusShareBps !== 0) {
      throw new Error("A Common Ground Pool cannot request Moral Trade failure-bonus funding.");
    }
  }

''')
validation = append_before_once(validation, "  return {\n    thresholdAmountsCents,", common_ground_invariants, "enforce Common Ground pool invariants")
validation = replace_once(
    validation,
    "  return {\n    thresholdAmountsCents,",
    "  return {\n    commonGround,\n    thresholdAmountsCents,",
    "return validated Common Ground terms",
)
validation = replace_once(
    validation,
    '    continuation: enumValue(input.continuation, ["stop", "continue"] as const, "Post-threshold behavior"),',
    "    continuation,",
    "reuse validated continuation",
)
validation = replace_once(
    validation,
    '    if (source.fundMode === "dac" && !source.dacPath) {\n      throw new Error("Dominant assurance contract requests require a new-pool or existing-pool path.");\n    }',
    '    if (source.fundMode === "dac" && !source.dacPath) {\n      throw new Error("Threshold-pool requests require a new-pool or existing-pool path.");\n    }',
    "simplify threshold-pool validation copy",
)
validation = replace_once(
    validation,
    '      throw new Error("Only dominant assurance contract requests may select a pool path.");',
    '      throw new Error("Only threshold-pool requests may select a pool path.");',
    "simplify pool path validation copy",
)
validation = replace_once(
    validation,
    '  const poolTerms = directPool ? validatePool(source.pool) : null;\n  if (directPool && !source.pool) throw new Error("Direct pool terms are required.");\n  if (!directPool && source.pool) throw new Error("Pool terms may only be supplied for direct pool creation.");',
    '  const poolTerms = directPool ? validatePool(source.pool) : null;\n  if (directPool && !source.pool) throw new Error("Direct pool terms are required.");\n  if (!directPool && source.pool) throw new Error("Pool terms may only be supplied for direct pool creation.");\n  if (source.fundMode === "commonGround" && !poolTerms?.commonGround) {\n    throw new Error("Common Ground Pool terms are required for the Common Ground funding structure.");\n  }\n  if (source.fundMode !== "commonGround" && poolTerms?.commonGround) {\n    throw new Error("Common Ground Pool terms may only be used with the Common Ground funding structure.");\n  }',
    "bind Common Ground terms to Common Ground mode",
)
validation_path.write_text(validation, encoding="utf-8")


persistence_path = ROOT / "src/lib/create-interface/persistence.ts"
persistence = persistence_path.read_text(encoding="utf-8")
persistence = replace_once(
    persistence,
    '  const isPool = row.target_type === "mpgf_pool_proposal";\n  const kindLabel = validated.kind === "donation_redirect"',
    '  const isPool = row.target_type === "mpgf_pool_proposal";\n  const isCommonGround = validated.source.fundMode === "commonGround";\n  const kindLabel = validated.kind === "donation_redirect"',
    "identify Common Ground submissions",
)
persistence = replace_once(
    persistence,
    '      : isPool\n        ? "Moral public-goods pool proposal"',
    '      : isCommonGround\n        ? "Common Ground Pool proposal"\n        : isPool\n          ? "Moral public-goods pool proposal"',
    "label Common Ground submission",
)
persistence = replace_once(
    persistence,
    '    lede: isPool\n      ? "The pool proposal is durable but not public and cannot accept pledges until its recipient, underwriting, reserve, formula, and operator-review gates are complete."\n      : "The proposal is durable but not public. It creates no obligation until review is complete and both sides confirm final terms.",',
    '    lede: isCommonGround\n      ? "The shared-project split is durable but private. It cannot accept pledges until every named participant confirms and the recipient and operator-review gates are complete."\n      : isPool\n        ? "The pool proposal is durable but not public and cannot accept pledges until its recipient, underwriting, reserve, formula, and operator-review gates are complete."\n        : "The proposal is durable but not public. It creates no obligation until review is complete and both sides confirm final terms.",',
    "add concise Common Ground receipt copy",
)
persistence_path.write_text(persistence, encoding="utf-8")


source_contract_path = ROOT / "src/lib/create-interface/source-contract.test.ts"
source_contract = source_contract_path.read_text(encoding="utf-8")
source_contract = replace_once(
    source_contract,
    "  assert.match(html, /Progress range/);",
    "  assert.match(html, /Progress range/);\n  assert.match(html, /Common Ground Pool/);\n  assert.match(html, /data-fund-mode=\"commonGround\"/);\n  assert.match(html, /Private value estimates stay in this tab/);\n  assert.match(html, /commonGroundParticipantGainChecked/);\n  assert.doesNotMatch(html, /href=\"\\/mpgf\\/common-ground-pool/);",
    "add Common Ground source contract assertions",
)
source_contract_path.write_text(source_contract, encoding="utf-8")


validation_test_path = ROOT / "src/lib/create-interface/validation.test.ts"
validation_test = validation_test_path.read_text(encoding="utf-8")
validation_test += textwrap.dedent('''\


test("validates a compact Common Ground Pool without private value estimates", () => {
  const targetAmountCents = 1_000_000;
  const input = {
    ...pledgePayload(),
    submissionKey: "create-unit-common-ground",
    requestKind: "fund",
    fundMode: "commonGround",
    dacPath: null,
    requestAction: "Shared research and coordination",
    offers: [],
    pool: {
      commonGround: {
        targetAmountCents,
        calculationPolicy: "balanced_surplus_v1",
        privateValueEstimatesStored: false,
        participantGainChecked: true,
        baselineConfirmed: true,
        participants: [
          { id: "cg-a", name: "Participant A", defaultProject: "Animal welfare", budgetCents: 1_000_000, contributionCents: 500_000 },
          { id: "cg-b", name: "Participant B", defaultProject: "Long-term future", budgetCents: 1_000_000, contributionCents: 500_000 },
        ],
      },
      thresholds: [{ amount: "10000" }],
      deadline: futureDeadline(),
      failureBonusType: "none",
      failureBonusAmount: "",
      failureBonusPercent: "",
      failureBonusFunction: "",
      failureTimingMode: "all",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "0",
      activationRule: "Every named participant confirms the frozen split.",
    },
  };

  const result = validateCreatePayload(input);
  assert.equal(result.kind, "pool_create");
  assert.equal(result.poolTerms?.commonGround?.targetAmountCents, targetAmountCents);
  assert.equal(result.poolTerms?.commonGround?.participants.length, 2);
  assert.equal(result.poolTerms?.commonGround?.privateValueEstimatesStored, false);
  assert.equal(JSON.stringify(result.poolTerms?.commonGround).includes("privateValue"), false);
});

test("rejects private Common Ground values and contribution totals that miss the target", () => {
  const base = {
    ...pledgePayload(),
    submissionKey: "create-unit-common-ground-invalid",
    requestKind: "fund",
    fundMode: "commonGround",
    dacPath: null,
    requestAction: "Shared project",
    offers: [],
    pool: {
      commonGround: {
        targetAmountCents: 1_000_000,
        calculationPolicy: "balanced_surplus_v1",
        privateValueEstimatesStored: false,
        participantGainChecked: true,
        baselineConfirmed: true,
        participants: [
          { id: "cg-a", name: "A", defaultProject: "A default", budgetCents: 1_000_000, contributionCents: 400_000 },
          { id: "cg-b", name: "B", defaultProject: "B default", budgetCents: 1_000_000, contributionCents: 500_000 },
        ],
      },
      thresholds: [{ amount: "10000" }],
      deadline: futureDeadline(),
      failureBonusType: "none",
      failureBonusAmount: "",
      failureBonusPercent: "",
      failureBonusFunction: "",
      failureTimingMode: "all",
      timingCutoffMethod: "period",
      timingCutoffPercent: "50",
      timingCutoffDate: "",
      timingContributorPercent: "20",
      timingPreset: "linear",
      timingPiecewiseBands: [{ end: "100", multiplier: "100" }],
      timingFormula: "1 - t",
      timingFormulaAcknowledged: false,
      continuation: "stop",
      thresholdVisibility: "public_exact",
      progressVisibility: "exact",
      moralTradeBonusShare: "0",
      activationRule: "",
    },
  };

  assert.throws(() => validateCreatePayload(base), /contributions must equal the target/i);
  base.pool.commonGround.participants[0].contributionCents = 500_000;
  Object.assign(base.pool.commonGround.participants[0], { privateValueBps: 6000 });
  assert.throws(() => validateCreatePayload(base), /unsupported or private field/i);
});
''')
validation_test_path.write_text(validation_test, encoding="utf-8")


e2e_path = ROOT / "tests/create-common-ground-pool.spec.ts"
e2e_path.write_text(textwrap.dedent('''\
import { expect, test } from "@playwright/test";

test.describe("compact Common Ground Pool in Create", () => {
  test("builds the worked split inside /trades/new without exposing the advanced threshold editor", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.getByRole("button", { name: /^Fund/ }).click();
    await create.getByRole("button", { name: /Common Ground Pool/ }).click();

    await expect(create.getByRole("heading", { name: "What should everyone fund together?" })).toBeVisible();
    await expect(create.locator("#commonGroundFields")).toBeVisible();
    await expect(create.locator("#dacCreateFields")).toBeHidden();
    await expect(create.getByText("Both gain $1,000 by their own estimates.", { exact: true })).toBeVisible();
    await expect(create.getByRole("button", { name: "Review pool" })).toBeDisabled();

    const visibleWords = await create.locator("#commonGroundFields").evaluate((element) =>
      (element.textContent || "").trim().split(/\s+/).filter(Boolean).length,
    );
    expect(visibleWords).toBeLessThanOrEqual(95);

    await create.getByLabel("These are honest no-pool defaults.").check();
    await expect(create.getByRole("button", { name: "Review pool" })).toBeEnabled();
    await create.getByRole("button", { name: "Review pool" }).click();

    await expect(create.getByRole("heading", { name: "Review the split." })).toBeVisible();
    await expect(create.getByText("Failure-bonus timing", { exact: true })).toHaveCount(0);
    await expect(create.getByText("Private value estimates are not submitted.", { exact: true })).toBeVisible();
    await expect(create.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  });

  test("stays compact without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/trades/new");
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');

    await create.getByRole("button", { name: "Future flourishing" }).click();
    await create.getByRole("button", { name: /^Fund/ }).click();
    await create.getByRole("button", { name: /Common Ground Pool/ }).click();
    await expect(create.locator("#commonGroundFields")).toBeVisible();

    const hasHorizontalOverflow = await create.locator("html").evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
'''), encoding="utf-8")


doc_path = ROOT / "docs/common-ground-pool-create.md"
doc_path.write_text(textwrap.dedent('''\
# Common Ground Pool in Create

`/trades/new` includes **Common Ground Pool** as a compact Fund structure. It is not a standalone public page.

The creator supplies one shared project, one target and deadline, and two to eight participants. Each participant row records a no-pool default and controlled budget. Relative value estimates remain only in the browser tab. The browser proposes a balanced split and enables review only when every participant has a positive estimated gain, each contribution fits the stated budget, contributions exactly meet the target, and the creator confirms the no-pool defaults.

The submitted review record contains the shared target, deadline, participant names, no-pool defaults, budgets, and contribution split. It explicitly excludes private value estimates. The adapter reuses the reviewed `pool_create` persistence path as a single-threshold, no-failure-bonus pool that stops at the target. Submission remains private and creates no pledge or payment obligation.
'''), encoding="utf-8")

print("Materialized compact Common Ground Pool in the unified Create flow.")

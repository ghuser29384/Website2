(() => {
  "use strict";

  const originalIsDirectPoolRoute = isDirectPoolRoute;
  const originalGetCreationFormatLabel = getCreationFormatLabel;
  const originalUpdateRequestPageCopy = updateRequestPageCopy;
  const originalUpdateRequestKindSelection = updateRequestKindSelection;
  const originalUpdateRequestContinue = updateRequestContinue;
  const originalContinueFromRequest = continueFromRequest;
  const originalShowStep = showStep;
  const originalBuildCreateSubmissionPayload = buildCreateSubmissionPayload;
  const originalRenderSubmittedReceipt = renderSubmittedReceipt;
  const originalSelectFundMode = selectFundMode;

  fundModeMeta.commonGround = {
    label: "Common Ground Pool",
    fieldLabel: "Shared project",
    placeholder: "e.g. Shared research and coordination",
    note: "",
  };

  fundModeSuggestions.commonGround = [
    "Shared research and coordination for {cause}",
    "Shared evidence infrastructure for {cause}",
    "A jointly valued project for {cause}",
  ];

  function isCommonGroundRoute() {
    return state.requestKind === "fund" && state.fundMode === "commonGround";
  }

  isDirectPoolRoute = function commonGroundAwareDirectPoolRoute() {
    return isCommonGroundRoute() || originalIsDirectPoolRoute();
  };

  getCreationFormatLabel = function commonGroundAwareFormatLabel() {
    return isCommonGroundRoute() ? "Common Ground Pool" : originalGetCreationFormatLabel();
  };

  function defaultDeadline() {
    const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  }

  function exampleParticipants() {
    return [
      {
        id: "cg-a",
        name: "Participant A",
        defaultProject: "Animal-welfare project",
        budget: "10000.00",
        contribution: "5000.00",
      },
      {
        id: "cg-b",
        name: "Participant B",
        defaultProject: "Long-term-future project",
        budget: "10000.00",
        contribution: "5000.00",
      },
    ];
  }

  const resumedCommonGroundDraft =
    state.fundMode === "commonGround" && Array.isArray(state.commonGroundParticipants);
  let privateValueBps = new Map();

  function initializeState() {
    if (!Array.isArray(state.commonGroundParticipants) || state.commonGroundParticipants.length < 2) {
      state.commonGroundParticipants = exampleParticipants();
    }

    state.commonGroundParticipants = state.commonGroundParticipants
      .slice(0, 8)
      .map((participant, index) => ({
        id: String(participant.id || `cg-${index + 1}`),
        name: String(participant.name || ""),
        defaultProject: String(participant.defaultProject || ""),
        budget: String(participant.budget || ""),
        contribution: String(participant.contribution || "0.00"),
      }));
    state.commonGroundTarget = String(state.commonGroundTarget || "10000.00");
    state.commonGroundDeadline = String(state.commonGroundDeadline || defaultDeadline());
    state.commonGroundBaselineConfirmed = resumedCommonGroundDraft
      ? false
      : Boolean(state.commonGroundBaselineConfirmed);
    state.commonGroundParticipantGainChecked = false;
    state.commonGroundCause = String(state.commonGroundCause || "");

    privateValueBps = new Map(
      state.commonGroundParticipants.map((participant, index) => [
        participant.id,
        resumedCommonGroundDraft ? 0 : index < 2 ? 6000 : 0,
      ]),
    );
  }

  function resetExample({ setProject = true } = {}) {
    state.commonGroundTarget = "10000.00";
    state.commonGroundDeadline = defaultDeadline();
    state.commonGroundParticipants = exampleParticipants();
    state.commonGroundBaselineConfirmed = false;
    state.commonGroundParticipantGainChecked = false;
    state.commonGroundCause = String(state.cause || "");
    privateValueBps = new Map([
      ["cg-a", 6000],
      ["cg-b", 6000],
    ]);

    if (setProject) {
      const project = `Shared research and coordination for ${state.cause || "a common cause"}`;
      state.requestAction = project;
      const input = $("#requestActionInput");
      if (input) input.value = project;
    }

    syncPanel();
  }

  function parseCents(value) {
    const normalized = String(value ?? "").replace(/[$,\s]/g, "");
    const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) return null;

    const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
    return Number.isSafeInteger(cents) ? cents : null;
  }

  function moneyInput(cents) {
    return (Number(cents || 0) / 100).toFixed(2);
  }

  function formatUsd(cents) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Number(cents) % 100 === 0 ? 0 : 2,
    }).format(Number(cents || 0) / 100);
  }

  function balancedShares(valuesInBps) {
    const values = valuesInBps.map((value) => value / 10000);
    if (values.reduce((sum, value) => sum + value, 0) <= 1) return null;

    const active = new Set(values.map((_, index) => index));
    let lambda = 0;

    while (active.size) {
      const activeTotal = [...active].reduce((sum, index) => sum + values[index], 0);
      lambda = (activeTotal - 1) / active.size;
      const nonPositive = [...active].filter((index) => values[index] <= lambda + 1e-12);
      if (!nonPositive.length) break;
      nonPositive.forEach((index) => active.delete(index));
    }

    if (!active.size) return null;
    const shares = values.map((value, index) =>
      active.has(index) ? Math.max(0, value - lambda) : 0,
    );
    const total = shares.reduce((sum, value) => sum + value, 0);
    return total > 0 ? shares.map((value) => value / total) : null;
  }

  function allocateCents(targetCents, shares) {
    const raw = shares.map((share) => targetCents * share);
    const allocations = raw.map(Math.floor);
    let remainder = targetCents - allocations.reduce((sum, value) => sum + value, 0);

    raw
      .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
      .forEach((entry) => {
        if (remainder <= 0) return;
        allocations[entry.index] += 1;
        remainder -= 1;
      });

    return allocations;
  }

  function evaluatePool() {
    const calculationBlockers = [];
    const project = $("#requestActionInput")?.value.trim() || state.requestAction.trim();
    const targetCents = parseCents(state.commonGroundTarget);
    const deadline = state.commonGroundDeadline.trim();
    const deadlineTime = Date.parse(deadline);
    const participants = state.commonGroundParticipants;

    if (!project) calculationBlockers.push("Name the shared project.");
    if (!(targetCents > 0)) calculationBlockers.push("Enter a positive target.");
    if (!deadline) calculationBlockers.push("Add a deadline.");
    else if (!Number.isFinite(deadlineTime)) {
      calculationBlockers.push("Use a clear deadline with a timezone.");
    } else if (deadlineTime <= Date.now() + 30 * 60 * 1000) {
      calculationBlockers.push("Use a deadline at least 30 minutes away.");
    }
    if (participants.length < 2 || participants.length > 8) {
      calculationBlockers.push("Use 2–8 participants.");
    }

    const parsed = participants.map((participant, index) => {
      const budgetCents = parseCents(participant.budget);
      const participantPrivateValueBps = Number(privateValueBps.get(participant.id) || 0);
      if (!participant.name.trim()) calculationBlockers.push(`Name participant ${index + 1}.`);
      if (!participant.defaultProject.trim()) {
        calculationBlockers.push(`Add participant ${index + 1}’s no-pool default.`);
      }
      if (!(budgetCents > 0)) calculationBlockers.push(`Add participant ${index + 1}’s budget.`);
      if (!(participantPrivateValueBps > 0)) {
        calculationBlockers.push(`Add participant ${index + 1}’s private value.`);
      }
      return { participant, budgetCents, privateValueBps: participantPrivateValueBps };
    });

    let allocations = participants.map(() => 0);
    let gains = participants.map(() => 0);

    if (targetCents > 0 && parsed.every((row) => row.privateValueBps > 0)) {
      const shares = balancedShares(parsed.map((row) => row.privateValueBps));
      if (!shares) {
        calculationBlockers.push("Combined private value must exceed 100%.");
      } else {
        allocations = allocateCents(targetCents, shares);
        parsed.forEach((row, index) => {
          const contributionCents = allocations[index];
          const sharedValueCents = Math.floor(
            (targetCents * row.privateValueBps + 5000) / 10000,
          );
          gains[index] = sharedValueCents - contributionCents;

          if (!(contributionCents > 0)) {
            calculationBlockers.push("Every listed participant needs a positive share.");
          }
          if (row.budgetCents != null && contributionCents > row.budgetCents) {
            calculationBlockers.push(
              `${row.participant.name || `Participant ${index + 1}`} cannot cover the suggested share.`,
            );
          }
          if (!(gains[index] > 0)) {
            calculationBlockers.push("No positive-gain split exists for every participant.");
          }
        });
      }
    }

    const uniqueCalculationBlockers = [...new Set(calculationBlockers)];
    const calculationOk = uniqueCalculationBlockers.length === 0;
    const blockers = [...uniqueCalculationBlockers];
    if (!state.commonGroundBaselineConfirmed) blockers.push("Confirm the no-pool defaults.");

    return {
      ok: blockers.length === 0,
      calculationOk,
      blockers,
      calculationBlockers: uniqueCalculationBlockers,
      project,
      targetCents: targetCents || 0,
      deadline,
      parsed,
      allocations,
      gains,
    };
  }

  function gainStatus(result) {
    if (!result.calculationOk) {
      return result.calculationBlockers[0] || "Complete the shared split.";
    }

    const minimumGain = Math.min(...result.gains);
    const gainText =
      result.gains.length === 2 && result.gains[0] === result.gains[1]
        ? `Both gain ${formatUsd(result.gains[0])} by their own estimates.`
        : `All ${result.gains.length} gain at least ${formatUsd(minimumGain)} by their own estimates.`;
    return state.commonGroundBaselineConfirmed
      ? gainText
      : `${gainText} Confirm defaults to continue.`;
  }

  function recalculate() {
    const result = evaluatePool();
    state.commonGroundParticipants.forEach((participant, index) => {
      participant.contribution = moneyInput(result.allocations[index] || 0);
      const output = $(`[data-cg-contribution="${participant.id}"]`);
      if (output) output.value = participant.contribution;
    });
    state.commonGroundParticipantGainChecked = result.calculationOk;

    const status = $("#commonGroundStatus");
    if (status) {
      status.textContent = gainStatus(result);
      status.classList.toggle("ready", result.calculationOk);
      status.classList.toggle("blocked", !result.calculationOk);
    }
    return result;
  }

  function renderParticipants() {
    const list = $("#commonGroundParticipantList");
    if (!list) return;

    $("#commonGroundParticipantCount").textContent =
      `${state.commonGroundParticipants.length} participants`;
    list.innerHTML = state.commonGroundParticipants
      .map((participant, index) => {
        const privateValue = Number(privateValueBps.get(participant.id) || 0);
        return `
          <div class="common-ground-participant-row" data-cg-row="${escapeHTML(participant.id)}">
            <div class="offer-field">
              <label for="cg-name-${index}">Name</label>
              <input id="cg-name-${index}" data-cg-field="name" data-cg-id="${escapeHTML(participant.id)}" maxlength="80" value="${escapeHTML(participant.name)}" />
            </div>
            <div class="offer-field">
              <label for="cg-default-${index}">Without pool</label>
              <input id="cg-default-${index}" data-cg-field="defaultProject" data-cg-id="${escapeHTML(participant.id)}" maxlength="160" value="${escapeHTML(participant.defaultProject)}" />
            </div>
            <div class="offer-field">
              <label for="cg-budget-${index}">Budget</label>
              <input id="cg-budget-${index}" data-cg-field="budget" data-cg-id="${escapeHTML(participant.id)}" type="number" inputmode="decimal" min="0.01" step="0.01" value="${escapeHTML(participant.budget)}" />
            </div>
            <div class="offer-field">
              <label for="cg-value-${index}">Value (private)</label>
              <input id="cg-value-${index}" data-cg-field="privateValue" data-cg-id="${escapeHTML(participant.id)}" type="number" inputmode="decimal" min="0.01" max="500" step="0.01" value="${privateValue > 0 ? privateValue / 100 : ""}" aria-label="${escapeHTML(participant.name || `Participant ${index + 1}`)} private value percentage" />
            </div>
            <div class="offer-field">
              <label for="cg-pay-${index}">Pays</label>
              <input id="cg-pay-${index}" data-cg-contribution="${escapeHTML(participant.id)}" readonly value="${escapeHTML(participant.contribution)}" />
            </div>
            ${
              state.commonGroundParticipants.length > 2
                ? `<button type="button" class="common-ground-remove" data-cg-remove="${escapeHTML(participant.id)}" aria-label="Remove ${escapeHTML(participant.name || `participant ${index + 1}`)}">Remove</button>`
                : ""
            }
          </div>`;
      })
      .join("");

    $$('[data-cg-field]', list).forEach((input) => {
      input.addEventListener("input", () => {
        const participant = state.commonGroundParticipants.find(
          (row) => row.id === input.dataset.cgId,
        );
        if (!participant) return;

        if (input.dataset.cgField === "privateValue") {
          const value = Number(input.value);
          privateValueBps.set(
            participant.id,
            Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0,
          );
        } else {
          participant[input.dataset.cgField] = input.value;
        }
        setRequestError("");
        updateRequestContinue();
      });
    });

    $$('[data-cg-remove]', list).forEach((button) => {
      button.addEventListener("click", () => {
        if (state.commonGroundParticipants.length <= 2) return;
        const id = button.dataset.cgRemove;
        state.commonGroundParticipants = state.commonGroundParticipants.filter(
          (row) => row.id !== id,
        );
        privateValueBps.delete(id);
        renderParticipants();
        updateRequestContinue();
      });
    });
  }

  function syncPanel() {
    const target = $("#commonGroundTargetInput");
    const deadline = $("#commonGroundDeadlineInput");
    const confirmation = $("#commonGroundBaselineConfirm");
    if (target) target.value = state.commonGroundTarget;
    if (deadline) deadline.value = state.commonGroundDeadline;
    if (confirmation) confirmation.checked = Boolean(state.commonGroundBaselineConfirmed);
    renderParticipants();
    updateRequestContinue();
  }

  function addParticipant() {
    if (state.commonGroundParticipants.length >= 8) return;
    const id = `cg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    state.commonGroundParticipants.push({
      id,
      name: `Participant ${state.commonGroundParticipants.length + 1}`,
      defaultProject: "",
      budget: state.commonGroundTarget || "10000.00",
      contribution: "0.00",
    });
    privateValueBps.set(id, 0);
    renderParticipants();
    updateRequestContinue();
  }

  function syncPoolState(result) {
    state.requestAction = result.project;
    state.poolThresholds = [{ amount: moneyInput(result.targetCents) }];
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
    state.poolActivation =
      "Every named participant must confirm the same frozen split before the pool can open.";
    state.offers = [];
    state.offerPhase = "choose";
    state.offerDetails = createEmptyOfferDetails();
  }

  function continueFromCommonGround() {
    const result = recalculate();
    if (!result.ok) {
      setRequestError(result.blockers[0] || "Complete the Common Ground Pool split.");
      return;
    }

    syncPoolState(result);
    setRequestError("");
    closeSuggestions();
    showStep(4);
  }

  function renderCompactSummary() {
    const result = recalculate();
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
      ["Target", `${formatUsd(result.targetCents)} · ${result.deadline}`],
      ...state.commonGroundParticipants.map((participant) => [
        participant.name,
        `${formatUsd(parseCents(participant.contribution) || 0)} · without pool: ${participant.defaultProject}`,
      ]),
    ];
    $("#summaryOffers").innerHTML = rows
      .map(
        ([label, value], index) => `
          <div class="seed-offer-item">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div><strong class="seed-offer-title">${escapeHTML(label)}</strong><ul><li>${escapeHTML(value)}</li></ul></div>
          </div>`,
      )
      .join("");

    $("#publishKicker").textContent = "Private review";
    $("#publishHeading").textContent = "Submit this pool for review.";
    $("#publishDescription").textContent =
      "No pledge opens until every named participant confirms and Moral Trade approves the recipient.";
    $("#publishFacts").innerHTML = `
      <div class="publish-fact"><span>Target</span><strong>${escapeHTML(formatUsd(result.targetCents))}</strong></div>
      <div class="publish-fact"><span>Participants</span><strong>${state.commonGroundParticipants.length}</strong></div>
      <div class="publish-fact"><span>Visibility</span><strong>Private until approved</strong></div>`;
    $("#publishConfirmTitle").textContent = "The split and no-pool defaults are accurate.";
    $("#publishConfirmCopy").textContent = "Private value estimates stay in this tab.";
    $("#publishOffer").textContent = "Submit for review →";
    $("#boundaryNote").innerHTML =
      "<strong>No money moves</strong> Every named participant must confirm the same frozen split before the pool can open.";
  }

  updateRequestPageCopy = function commonGroundAwareRequestCopy() {
    if (!isCommonGroundRoute()) return originalUpdateRequestPageCopy();
    $("#requestHeading").textContent = "What should everyone fund together?";
    $("#requestIntroCopy").textContent = "Name one shared project and split the target.";
  };

  updateRequestKindSelection = function commonGroundAwareRequestSelection() {
    originalUpdateRequestKindSelection();
    const active = isCommonGroundRoute();
    $("#commonGroundFields").hidden = !active;
    if (!active) return;

    $("#dacCreateFields").hidden = true;
    $("#dacExistingFields").hidden = true;
    $("#requestModeNote").hidden = true;
    $("#requestBottomHint").textContent = "Review the shared split.";
    $("#continueRequest").textContent = "Review pool →";
    syncPanel();
    updateRequestPageCopy();
  };

  updateRequestContinue = function commonGroundAwareContinueState() {
    if (!isCommonGroundRoute()) return originalUpdateRequestContinue();
    const result = recalculate();
    $("#continueRequest").disabled = !result.ok;
  };

  continueFromRequest = function commonGroundAwareContinue() {
    if (isCommonGroundRoute()) return continueFromCommonGround();
    return originalContinueFromRequest();
  };

  showStep = function commonGroundAwareShowStep(step) {
    originalShowStep(step);
    if (step === 2 && isCommonGroundRoute()) syncPanel();
    if (step === 4 && isCommonGroundRoute()) renderCompactSummary();
  };

  selectFundMode = function commonGroundAwareFundMode(button) {
    const enteringCommonGround = button.dataset.fundMode === "commonGround";
    const causeChanged = state.commonGroundCause !== String(state.cause || "");
    originalSelectFundMode(button);

    if (enteringCommonGround && (causeChanged || !$("#requestActionInput").value.trim())) {
      resetExample({ setProject: true });
    } else if (isCommonGroundRoute()) {
      syncPanel();
    }
  };

  buildCreateSubmissionPayload = function commonGroundAwarePayload() {
    const payload = originalBuildCreateSubmissionPayload();
    if (!isCommonGroundRoute()) return payload;

    const result = evaluatePool();
    if (!result.ok) {
      throw new Error(result.blockers[0] || "The Common Ground Pool split is incomplete.");
    }

    payload.fundMode = "dac";
    payload.dacPath = "create";
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
        contributionCents: result.allocations[index],
      })),
    };
    return payload;
  };

  renderSubmittedReceipt = function commonGroundAwareReceipt(submission) {
    originalRenderSubmittedReceipt(submission);
    if (!isCommonGroundRoute()) return;

    const result = evaluatePool();
    $("#publishedObjectLabel").textContent = "Common Ground Pool proposal";
    $("#publishedHeadline").textContent = result.project;
    $("#publishedLede").textContent =
      "Saved for review. It stays private and cannot accept pledges until every named participant confirms and the review gates pass.";
    $("#publishedOfferList").innerHTML = [
      `<li>Target: ${escapeHTML(formatUsd(result.targetCents))}</li>`,
      `<li>Deadline: ${escapeHTML(result.deadline)}</li>`,
      ...state.commonGroundParticipants.map(
        (participant) =>
          `<li>${escapeHTML(participant.name)}: ${escapeHTML(formatUsd(parseCents(participant.contribution) || 0))}; without pool: ${escapeHTML(participant.defaultProject)}</li>`,
      ),
      "<li>Private value estimates were not submitted.</li>",
    ].join("");
    $("#boundaryNote").innerHTML =
      "<strong>Submitted</strong> This private review record creates no pledge or payment obligation.";
  };

  initializeState();

  $("#commonGroundTargetInput").addEventListener("input", (event) => {
    state.commonGroundTarget = event.target.value;
    setRequestError("");
    updateRequestContinue();
  });
  $("#commonGroundDeadlineInput").addEventListener("input", (event) => {
    state.commonGroundDeadline = event.target.value;
    setRequestError("");
    updateRequestContinue();
  });
  $("#commonGroundBaselineConfirm").addEventListener("change", (event) => {
    state.commonGroundBaselineConfirmed = event.target.checked;
    setRequestError("");
    updateRequestContinue();
  });
  $("#addCommonGroundParticipant").addEventListener("click", addParticipant);
  $("#commonGroundExample").addEventListener("click", () =>
    resetExample({ setProject: true }),
  );

  $("#continueRequest").addEventListener(
    "click",
    (event) => {
      if (!isCommonGroundRoute()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      continueFromCommonGround();
    },
    true,
  );

  ["#startOver", "#makeAnotherOffer"].forEach((selector) => {
    $(selector).addEventListener("click", () => {
      window.setTimeout(() => resetExample({ setProject: false }), 0);
    });
  });

  if (resumedCommonGroundDraft) {
    state.commonGroundBaselineConfirmed = false;
    state.commonGroundParticipantGainChecked = false;
    updateRequestKindSelection();
    showStep(2);
  } else {
    $("#commonGroundFields").hidden = true;
  }
})();

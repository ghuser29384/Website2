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
    label: "Co-Fund",
    fieldLabel: "Shared project",
    placeholder: "e.g. Shared research and coordination",
    note: "",
  };

  fundModeSuggestions.commonGround = [
    "Shared research and coordination for {cause}",
    "Shared evidence infrastructure for {cause}",
    "A jointly valued project for {cause}",
  ];

  const picker = window.MoralTradeParticipantPicker;
  const pickerCleanups = new Map();
  let viewerLoadSequence = 0;

  function isCommonGroundRoute() {
    return state.requestKind === "fund" && state.fundMode === "commonGround";
  }

  isDirectPoolRoute = function commonGroundAwareDirectPoolRoute() {
    return isCommonGroundRoute() || originalIsDirectPoolRoute();
  };

  getCreationFormatLabel = function commonGroundAwareFormatLabel() {
    return isCommonGroundRoute() ? "Co-Fund" : originalGetCreationFormatLabel();
  };

  function defaultDeadline() {
    const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  }

  function rowId() {
    return `cg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function blankRow() {
    return {
      id: rowId(),
      target: null,
      defaultProject: "",
      budget: "",
      participationBeatsDefault: false,
    };
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

  function selectedRows() {
    return state.commonGroundParticipants.filter((row) => row.target);
  }

  function creatorRow() {
    return state.commonGroundParticipants.find((row) => row.target?.isCreator) || null;
  }

  function initializeState() {
    const hasNewDraft =
      Array.isArray(state.commonGroundParticipants) &&
      state.commonGroundParticipants.some((participant) => "target" in participant);

    if (!hasNewDraft) {
      // Old free-text drafts are deliberately left unresolved instead of silently matching accounts.
      state.commonGroundParticipants = [blankRow(), blankRow()];
      state.commonGroundCreatorParticipation = "";
    } else {
      state.commonGroundParticipants = state.commonGroundParticipants
        .slice(0, 100)
        .map((participant) => ({
          id: String(participant.id || rowId()),
          target: participant.target && typeof participant.target === "object"
            ? participant.target
            : null,
          defaultProject: String(participant.defaultProject || ""),
          budget: String(participant.budget || ""),
          participationBeatsDefault: participant.participationBeatsDefault === true,
        }));
    }

    while (state.commonGroundParticipants.length < 2) {
      state.commonGroundParticipants.push(blankRow());
    }
    state.commonGroundTarget = String(state.commonGroundTarget || "10000.00");
    state.commonGroundDeadline = String(state.commonGroundDeadline || defaultDeadline());
    state.commonGroundCreatorParticipation =
      state.commonGroundCreatorParticipation === "participating" ||
      state.commonGroundCreatorParticipation === "organizer-only"
        ? state.commonGroundCreatorParticipation
        : "";
    state.commonGroundCause = String(state.commonGroundCause || "");
  }

  function resetDraft({ setProject = true } = {}) {
    cleanupPickers();
    state.commonGroundTarget = "10000.00";
    state.commonGroundDeadline = defaultDeadline();
    state.commonGroundParticipants = [blankRow(), blankRow()];
    state.commonGroundCreatorParticipation = "";
    state.commonGroundCause = String(state.cause || "");
    if (setProject) {
      const project = `Shared research and coordination for ${state.cause || "a common cause"}`;
      state.requestAction = project;
      const input = $("#requestActionInput");
      if (input) input.value = project;
    }
    syncPanel();
  }

  function targetLabel(target) {
    return target?.kind === "account"
      ? `@${target.usernameSnapshot}`
      : target?.displayNameSnapshot
        ? `${target.displayNameSnapshot} (unclaimed invitee)`
        : "Participant";
  }

  function evaluatePool() {
    const blockers = [];
    const project = $("#requestActionInput")?.value.trim() || state.requestAction.trim();
    const targetCents = parseCents(state.commonGroundTarget);
    const deadline = state.commonGroundDeadline.trim();
    const deadlineTime = Date.parse(deadline);
    const selected = selectedRows();

    if (!project) blockers.push("Name the shared project.");
    if (!(targetCents > 0)) blockers.push("Enter a positive target.");
    if (!deadline) blockers.push("Add a deadline.");
    else if (!Number.isFinite(deadlineTime)) blockers.push("Use a clear deadline with a timezone.");
    else if (deadlineTime <= Date.now() + 30 * 60 * 1000) {
      blockers.push("Use a deadline at least 30 minutes away.");
    }
    if (!state.commonGroundCreatorParticipation) {
      blockers.push("Choose whether you are participating or organizing only.");
    }
    if (selected.length < 2 || selected.length > 100) {
      blockers.push("Select between two and 100 participants.");
    }
    if (state.commonGroundParticipants.some((row) => !row.target)) {
      blockers.push("Select a participant for every row, or remove the unused row.");
    }

    const seenProfileIds = new Set();
    for (const row of selected) {
      if (row.target.kind === "account") {
        if (seenProfileIds.has(row.target.profileId)) blockers.push("The same account cannot be added twice.");
        seenProfileIds.add(row.target.profileId);
      }
    }

    const creator = creatorRow();
    if (state.commonGroundCreatorParticipation === "participating") {
      if (!creator) {
        blockers.push("Your account must have a username before you can participate.");
      } else {
        const budgetCents = parseCents(creator.budget);
        if (!(budgetCents > 0)) blockers.push("Enter your private maximum contribution.");
        if (!creator.defaultProject.trim()) blockers.push("Enter what you would fund instead.");
        if (!creator.participationBeatsDefault) {
          blockers.push("Confirm that this Co-Fund is better by your lights than your stated default.");
        }
      }
    } else if (state.commonGroundCreatorParticipation === "organizer-only" && creator) {
      blockers.push("An organizer-only creator cannot be included as a participant.");
    }

    return {
      ok: blockers.length === 0,
      blockers: [...new Set(blockers)],
      project,
      targetCents: targetCents || 0,
      deadline,
      selected,
      creator,
    };
  }

  function statusText(result) {
    if (!result.ok) return result.blockers[0] || "Complete the Co-Fund participant proposal.";
    const pending = result.selected.filter((row) => !row.target.isCreator).length;
    return `${result.selected.length} participant identities selected. ${pending} invitee${pending === 1 ? "" : "s"} must enter and confirm their own private terms before any allocation can be frozen.`;
  }

  function recalculate() {
    const result = evaluatePool();
    const status = $("#commonGroundStatus");
    if (status) {
      status.textContent = statusText(result);
      status.classList.toggle("ready", result.ok);
      status.classList.toggle("blocked", !result.ok);
    }
    return result;
  }

  function cleanupPickers() {
    pickerCleanups.forEach((cleanup) => cleanup?.());
    pickerCleanups.clear();
  }

  function directoryTarget(target, row, isCreator = false) {
    return {
      ...target,
      rowId: row.id,
      isCreator,
    };
  }

  function ensureCreatorParticipant() {
    const sequence = ++viewerLoadSequence;
    if (!picker?.loadViewer) {
      setRequestError("Participant search is unavailable. Reload Create and try again.");
      renderParticipants();
      updateRequestContinue();
      return;
    }
    picker.loadViewer().then((viewer) => {
      if (sequence !== viewerLoadSequence || state.commonGroundCreatorParticipation !== "participating") return;
      if (!viewer || viewer.usernameRequired || !viewer.username) {
        setRequestError("Choose a Moral Trade username in Complete Profile before participating in a Co-Fund.");
        renderParticipants();
        updateRequestContinue();
        return;
      }
      const existing = creatorRow();
      const target = {
        kind: "account",
        profileId: viewer.profileId,
        usernameSnapshot: viewer.username,
        displayNameSnapshot: viewer.displayName,
        accountType: viewer.accountType,
        verification: viewer.verification,
        publicMention: viewer.publicMention,
        invitationState: "draft",
        isCreator: true,
      };
      if (existing) {
        existing.target = directoryTarget(target, existing, true);
      } else {
        const availableRow = state.commonGroundParticipants.find((row) => !row.target);
        if (availableRow) {
          availableRow.target = directoryTarget(target, availableRow, true);
          state.commonGroundParticipants = [
            availableRow,
            ...state.commonGroundParticipants.filter((row) => row !== availableRow),
          ];
        } else {
          const creator = blankRow();
          creator.target = directoryTarget(target, creator, true);
          state.commonGroundParticipants.unshift(creator);
        }
      }
      setRequestError("");
      renderParticipants();
      updateRequestContinue();
    }).catch((error) => {
      if (sequence !== viewerLoadSequence) return;
      setRequestError(error?.requiresAuth
        ? "Sign in before participating in a Co-Fund."
        : error?.message || "Your participant identity could not be loaded.");
      renderParticipants();
      updateRequestContinue();
    });
  }

  function applyCreatorParticipation(value) {
    state.commonGroundCreatorParticipation = value;
    viewerLoadSequence += 1;
    if (value === "organizer-only") {
      state.commonGroundParticipants = state.commonGroundParticipants.filter(
        (row) => !row.target?.isCreator,
      );
      while (state.commonGroundParticipants.length < 2) state.commonGroundParticipants.push(blankRow());
      setRequestError("");
      renderParticipants();
      updateRequestContinue();
      return;
    }
    ensureCreatorParticipant();
  }

  function renderParticipantTerms(row) {
    if (!row.target) {
      return `<div class="common-ground-participant-terms pending"><strong>Identity required</strong>Typed text is never silently converted into a participant.</div>`;
    }
    if (!row.target.isCreator) {
      return `<div class="common-ground-participant-terms pending"><strong>Participant-owned terms</strong>${escapeHTML(targetLabel(row.target))} will enter and confirm their own fallback, private maximum contribution, payment terms, and final share after accepting. You cannot enter those terms for them.</div>`;
    }
    return `<div class="common-ground-participant-terms">
      <div class="offer-field">
        <label for="cg-default-${escapeHTML(row.id)}">What would you fund instead?</label>
        <input id="cg-default-${escapeHTML(row.id)}" data-cg-own-field="defaultProject" data-cg-id="${escapeHTML(row.id)}" maxlength="240" value="${escapeHTML(row.defaultProject)}" />
      </div>
      <div class="offer-field">
        <label for="cg-budget-${escapeHTML(row.id)}">Your private maximum contribution</label>
        <input id="cg-budget-${escapeHTML(row.id)}" data-cg-own-field="budget" data-cg-id="${escapeHTML(row.id)}" type="number" inputmode="decimal" min="0.01" step="0.01" value="${escapeHTML(row.budget)}" />
        <p class="common-ground-private-note">Stored only as your participant term in the private review record. It is not shown to invitees.</p>
      </div>
      <label class="common-ground-own-confirm"><input type="checkbox" data-cg-own-field="participationBeatsDefault" data-cg-id="${escapeHTML(row.id)}" ${row.participationBeatsDefault ? "checked" : ""} /><span>This Co-Fund is better by my lights than my stated default.</span></label>
    </div>`;
  }

  function renderParticipants() {
    cleanupPickers();
    const list = $("#commonGroundParticipantList");
    if (!list) return;
    const rows = state.commonGroundParticipants;
    const selected = selectedRows();
    $("#commonGroundParticipantCount").textContent = `${selected.length} participant${selected.length === 1 ? "" : "s"} selected`;
    const addButton = $("#addCommonGroundParticipant");
    if (addButton) addButton.disabled = rows.length >= 100;

    list.innerHTML = rows.map((row, index) => `
      <div class="common-ground-participant-row ${row.target?.isCreator ? "creator-row" : ""}" data-cg-row="${escapeHTML(row.id)}">
        <div>
          <div data-cg-picker="${escapeHTML(row.id)}"></div>
          ${!row.target?.isCreator && rows.length > 2
            ? `<button type="button" class="common-ground-remove" data-cg-remove-row="${escapeHTML(row.id)}">Remove row</button>`
            : ""}
        </div>
        ${renderParticipantTerms(row)}
      </div>`).join("");

    const selectedProfileIds = selected
      .filter((row) => row.target.kind === "account")
      .map((row) => row.target.profileId);

    rows.forEach((row, index) => {
      const root = list.querySelector(`[data-cg-picker="${CSS.escape(row.id)}"]`);
      if (!root || !picker?.mount) return;
      const cleanup = picker.mount(root, {
        label: row.target?.isCreator ? "Your participant identity" : `Participant ${index + 1}`,
        selected: row.target,
        locked: Boolean(row.target?.isCreator),
        excludedProfileIds: selectedProfileIds.filter(
          (profileId) => row.target?.kind !== "account" || profileId !== row.target.profileId,
        ),
        allowExternalClaim: true,
        onSelect(target) {
          row.target = directoryTarget(target, row, false);
          setRequestError("");
          renderParticipants();
          updateRequestContinue();
        },
        onClear() {
          row.target = null;
          setRequestError("");
          renderParticipants();
          updateRequestContinue();
        },
      });
      pickerCleanups.set(row.id, cleanup);
    });

    $$('[data-cg-own-field]', list).forEach((input) => {
      const eventName = input.type === "checkbox" ? "change" : "input";
      input.addEventListener(eventName, () => {
        const row = state.commonGroundParticipants.find((candidate) => candidate.id === input.dataset.cgId);
        if (!row) return;
        const field = input.dataset.cgOwnField;
        if (field === "participationBeatsDefault") row.participationBeatsDefault = input.checked;
        else if (field === "defaultProject") row.defaultProject = input.value;
        else if (field === "budget") row.budget = input.value;
        setRequestError("");
        updateRequestContinue();
      });
    });

    $$('[data-cg-remove-row]', list).forEach((button) => {
      button.addEventListener("click", () => {
        state.commonGroundParticipants = state.commonGroundParticipants.filter(
          (row) => row.id !== button.dataset.cgRemoveRow,
        );
        while (state.commonGroundParticipants.length < 2) state.commonGroundParticipants.push(blankRow());
        setRequestError("");
        renderParticipants();
        updateRequestContinue();
      });
    });
  }

  function syncPanel() {
    const target = $("#commonGroundTargetInput");
    const deadline = $("#commonGroundDeadlineInput");
    if (target) target.value = state.commonGroundTarget;
    if (deadline) deadline.value = state.commonGroundDeadline;
    $$('input[name="common_ground_creator_participation"]').forEach((input) => {
      input.checked = input.value === state.commonGroundCreatorParticipation;
    });
    renderParticipants();
    updateRequestContinue();
  }

  function addParticipant() {
    if (state.commonGroundParticipants.length >= 100) return;
    state.commonGroundParticipants.push(blankRow());
    setRequestError("");
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
      "Every selected participant must accept, enter their own private terms, and unanimously confirm the final allocation before the Co-Fund can open.";
    state.offers = [];
    state.offerPhase = "choose";
    state.offerDetails = createEmptyOfferDetails();
  }

  function continueFromCommonGround() {
    const result = recalculate();
    if (!result.ok) {
      setRequestError(result.blockers[0] || "Complete the Co-Fund participant proposal.");
      return;
    }
    syncPoolState(result);
    setRequestError("");
    closeSuggestions();
    showStep(4);
  }

  function renderCompactSummary() {
    const result = recalculate();
    $("#summaryHeading").textContent = "Review participants.";
    $("#summaryStepLabel").textContent = "Review and submit · 3 of 3";
    $("#summaryIntro").textContent = "Check the shared project and the identities invited to supply their own terms.";
    $("#summaryLeftLabel").textContent = "Shared project";
    $("#summaryLeftFoot").textContent = "One project and one target.";
    $("#summaryJoin").textContent = "→";
    $("#summaryRightLabel").textContent = "Participants";
    $("#summaryRightFoot").textContent = "No final split or invitation is created at this review stage.";
    $("#summaryRequestKind").textContent = "Fund · Co-Fund";
    $("#summaryRequestAction").textContent = result.project;

    const rows = [
      ["Target", `${formatUsd(result.targetCents)} · ${result.deadline}`],
      ...result.selected.map((row) => [
        targetLabel(row.target),
        row.target.isCreator
          ? "Creator participating · private terms attached"
          : "Invitation target selected · participant terms pending",
      ]),
    ];
    $("#summaryOffers").innerHTML = rows.map(([label, value], index) => `
      <div class="seed-offer-item">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div><strong class="seed-offer-title">${escapeHTML(label)}</strong><ul><li>${escapeHTML(value)}</li></ul></div>
      </div>`).join("");

    $("#publishKicker").textContent = "Private review";
    $("#publishHeading").textContent = "Submit this participant-bound proposal for review.";
    $("#publishDescription").textContent =
      "Submitting stores a private review record. It does not send invitations, enroll anyone, freeze a split, or authorize payment.";
    $("#publishFacts").innerHTML = `
      <div class="publish-fact"><span>Target</span><strong>${escapeHTML(formatUsd(result.targetCents))}</strong></div>
      <div class="publish-fact"><span>Participants</span><strong>${result.selected.length}</strong></div>
      <div class="publish-fact"><span>Allocation</span><strong>Open</strong></div>`;
    $("#publishConfirmTitle").textContent = "The project and selected participant identities are accurate.";
    $("#publishConfirmCopy").textContent =
      "Each invitee must supply their own private and financial terms before any final allocation exists.";
    $("#publishOffer").textContent = "Submit for review →";
    $("#boundaryNote").innerHTML =
      "<strong>No invitation or money moves</strong> This review record creates no participant acceptance, payment authorization, or obligation.";
  }

  updateRequestPageCopy = function commonGroundAwareRequestCopy() {
    if (!isCommonGroundRoute()) return originalUpdateRequestPageCopy();
    $("#requestHeading").textContent = "Who should fund one project together?";
    $("#requestIntroCopy").textContent = "Choose the project, identify participants, and let each participant enter their own terms.";
  };

  updateRequestKindSelection = function commonGroundAwareRequestSelection() {
    originalUpdateRequestKindSelection();
    const active = isCommonGroundRoute();
    $("#commonGroundFields").hidden = !active;
    if (!active) return;
    $("#dacCreateFields").hidden = true;
    $("#dacExistingFields").hidden = true;
    $("#requestModeNote").hidden = true;
    $("#requestBottomHint").textContent = "Review the participant-bound proposal.";
    $("#continueRequest").textContent = "Review Co-Fund →";
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
      state.commonGroundCause = String(state.cause || "");
      const project = `Shared research and coordination for ${state.cause || "a common cause"}`;
      state.requestAction = project;
      $("#requestActionInput").value = project;
      syncPanel();
    } else if (isCommonGroundRoute()) {
      syncPanel();
    }
  };

  buildCreateSubmissionPayload = function commonGroundAwarePayload() {
    const payload = originalBuildCreateSubmissionPayload();
    if (!isCommonGroundRoute()) return payload;
    const result = evaluatePool();
    if (!result.ok) throw new Error(result.blockers[0] || "The Co-Fund proposal is incomplete.");

    payload.fundMode = "dac";
    payload.dacPath = "create";
    payload.pool.commonGround = {
      targetAmountCents: result.targetCents,
      allocationStatus: "open",
      creatorParticipation: state.commonGroundCreatorParticipation,
      privateValueEstimatesStored: false,
      participants: result.selected.map((row) => ({
        target: {
          ...row.target,
          rowId: row.id,
          isCreator: Boolean(row.target.isCreator),
        },
        participantTerms: row.target.isCreator
          ? {
              maximumBudgetMinor: parseCents(row.budget),
              noPoolDefault: row.defaultProject.trim(),
              participationBeatsDefault: true,
              preauthorizeExecutableFallback: false,
            }
          : null,
      })),
    };
    return payload;
  };

  renderSubmittedReceipt = function commonGroundAwareReceipt(submission) {
    originalRenderSubmittedReceipt(submission);
    if (!isCommonGroundRoute()) return;
    const result = evaluatePool();
    $("#publishedObjectLabel").textContent = "Co-Fund proposal";
    $("#publishedHeadline").textContent = result.project;
    $("#publishedLede").textContent =
      "Saved for private review. No invitation was sent, no participant was enrolled, and no final allocation or payment authority exists.";
    $("#publishedOfferList").innerHTML = [
      `<li>Target: ${escapeHTML(formatUsd(result.targetCents))}</li>`,
      `<li>Deadline: ${escapeHTML(result.deadline)}</li>`,
      ...result.selected.map((row) => `<li>${escapeHTML(targetLabel(row.target))}: ${row.target.isCreator ? "creator terms attached privately" : "participant terms pending"}</li>`),
      "<li>Private value estimates and other participants’ financial terms were not submitted.</li>",
    ].join("");
    $("#boundaryNote").innerHTML =
      "<strong>Submitted</strong> This private review record creates no invitation, pledge, participant acceptance, or payment obligation.";
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
  $$('input[name="common_ground_creator_participation"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) applyCreatorParticipation(input.value);
    });
  });
  $("#addCommonGroundParticipant").addEventListener("click", addParticipant);
  $("#commonGroundReset").addEventListener("click", () => resetDraft({ setProject: false }));

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
      window.setTimeout(() => resetDraft({ setProject: false }), 0);
    });
  });

  $("#commonGroundFields").hidden = true;
})();

const HEADER_COPY = [
  "Create a trade, conditional donation, or public-goods pool.",
  "Create a trade, Donation Upgrade, or public-goods pool.",
] as const;

const REQUEST_COPY = [
  "Choose Commitment, Skill, or Fund. Fund includes pledge-swaps, donation redirects, conditional donations, and public-goods pools.",
  "Choose Commitment, Skill, or Fund. Fund includes swaps, redirects, Donation Upgrades, shared-project pools, and threshold pools.",
] as const;

const FUND_KICKER = [
  '<div class="fund-mode-kicker">If you chose Fund, choose the structure</div>',
  '<div class="fund-mode-kicker">Choose a funding structure</div>',
] as const;

const BLANK_FAVICON = '  <link rel="icon" href="data:," />\n';
const CANONICAL_FAVICONS = `  <link rel="icon" type="image/png" sizes="512x512" href="/brand/moral-trade-mark.png?v=20260730" />
  <link rel="shortcut icon" type="image/png" sizes="512x512" href="/brand/moral-trade-mark.png?v=20260730" />
  <link rel="apple-touch-icon" sizes="512x512" href="/brand/moral-trade-mark.png?v=20260730" />
`;

const THRESHOLD_POOL_CARD = `                <button type="button" class="fund-mode-choice" data-fund-mode="dac" aria-pressed="false">
                  <span class="fund-mode-mark">Public-good pool</span>
                  <strong>Dominant assurance contract pool</strong>
                  <p>Either launch a new threshold pool or ask a counterparty to contribute to a pool that already exists.</p>
                </button>`;

const COMPACT_POOL_CARDS = `                <button type="button" class="fund-mode-choice" data-fund-mode="commonGround" aria-pressed="false">
                  <span class="fund-mode-mark">Shared project</span>
                  <strong>Co-Fund</strong>
                  <p>Split one shared project across people who value it for different reasons.</p>
                </button>
                <button type="button" class="fund-mode-choice" data-fund-mode="dac" aria-pressed="false">
                  <span class="fund-mode-mark">Threshold</span>
                  <strong>Threshold pool</strong>
                  <p>Fund only if a target is reached. Add a failure bonus only when needed.</p>
                </button>`;

const COMMON_GROUND_PANEL = `
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
              <p class="common-ground-fallback-help" id="commonGroundFallbackHelp">If this Co-Fund does not happen, where would you otherwise use this money?</p>
              <div class="common-ground-participant-list" id="commonGroundParticipantList"></div>
              <label class="common-ground-confirm">
                <input type="checkbox" id="commonGroundBaselineConfirm" />
                <span>These are the projects we would honestly fund if this Co-Fund did not happen.</span>
              </label>
              <div class="common-ground-status" id="commonGroundStatus" role="status" aria-live="polite"></div>
            </div>
`;

const HARM_ASSESSMENT_PANEL = `
          <section class="harm-assessment-panel" id="harmAssessmentPanel" data-route="pending" data-harmful-offer-assessment-v2 aria-live="polite">
            <div class="harm-assessment-mark" aria-hidden="true">◇</div>
            <div class="harm-assessment-copy">
              <div class="harm-assessment-kicker">Private automatic harm assessment</div>
              <strong id="harmAssessmentTitle">Runs on the completed draft and again at submission.</strong>
              <p id="harmAssessmentMessage">The system checks monetary and non-monetary terms, affected non-signatories, public-goods effects, genuine no-offer baselines, coercion, reversibility, and categorical restrictions. Uncertain cases remain private for human review.</p>
              <ul id="harmAssessmentCategories" hidden></ul>
              <details class="harm-assessment-details" id="harmAssessmentDetails" hidden>
                <summary>Assessment basis</summary>
                <div id="harmAssessmentReasonCodes"></div>
                <div id="harmAssessmentAffectedFields"></div>
                <div id="harmAssessmentPolicyBasis"></div>
              </details>
              <details class="harm-assessment-appeal" id="harmAssessmentAppeal" hidden>
                <summary>Request human reconsideration</summary>
                <p>One ordinary reconsideration is decided by a different reviewer. Later requests require new evidence or a procedural-error claim.</p>
                <label for="harmAssessmentAppealKind">Request type</label>
                <select id="harmAssessmentAppealKind">
                  <option value="ordinary">Ordinary reconsideration</option>
                  <option value="new_evidence">New evidence after ordinary reconsideration</option>
                  <option value="procedural_error">Procedural error after ordinary reconsideration</option>
                </select>
                <label for="harmAssessmentAppealStatement">Why should the assessment be reconsidered?</label>
                <textarea id="harmAssessmentAppealStatement" minlength="20" maxlength="4000" rows="5"></textarea>
                <label for="harmAssessmentAppealEvidence">Optional new evidence or procedural detail</label>
                <textarea id="harmAssessmentAppealEvidence" maxlength="12000" rows="3"></textarea>
                <button type="button" id="harmAssessmentAppealSubmit">Request reconsideration</button>
                <div class="harm-assessment-appeal-status" id="harmAssessmentAppealStatus" role="status"></div>
              </details>
            </div>
            <span class="harm-assessment-status" id="harmAssessmentStatus">Not run yet</span>
          </section>
`;

const HARM_ASSESSMENT_STYLES = `  <style>
    .harm-assessment-panel {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr) auto;
      gap: 14px;
      align-items: start;
      margin-top: 18px;
      padding: 16px 18px;
      border: 1px solid var(--line-strong);
      background: rgba(251,250,246,.9);
    }
    .harm-assessment-mark {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line-strong);
      color: var(--blue);
      font: 700 15px/1 var(--mono);
    }
    .harm-assessment-kicker {
      color: var(--blue);
      font: 700 9px/1.2 var(--mono);
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .harm-assessment-copy > strong {
      display: block;
      margin-top: 5px;
      font-size: 14px;
      line-height: 1.3;
    }
    .harm-assessment-copy > p,
    .harm-assessment-appeal > p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .harm-assessment-copy > ul {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 0;
      padding: 0;
      list-style: none;
    }
    .harm-assessment-copy > ul li {
      padding: 6px 8px;
      border: 1px solid var(--line);
      background: white;
      font-size: 10px;
      line-height: 1.25;
    }
    .harm-assessment-status {
      padding: 7px 9px;
      border: 1px solid var(--line);
      color: var(--muted);
      font: 700 8px/1.2 var(--mono);
      letter-spacing: .06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .harm-assessment-details,
    .harm-assessment-appeal {
      margin-top: 11px;
      padding-top: 9px;
      border-top: 1px solid var(--line);
    }
    .harm-assessment-details summary,
    .harm-assessment-appeal summary {
      cursor: pointer;
      font: 700 9px/1.3 var(--mono);
      letter-spacing: .055em;
      text-transform: uppercase;
    }
    .harm-assessment-details div {
      margin-top: 7px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .harm-assessment-appeal label {
      display: block;
      margin-top: 11px;
      font: 700 9px/1.3 var(--mono);
      letter-spacing: .045em;
      text-transform: uppercase;
    }
    .harm-assessment-appeal select,
    .harm-assessment-appeal textarea {
      width: 100%;
      margin-top: 5px;
      border: 1px solid var(--line);
      border-radius: 0;
      padding: 9px 10px;
      background: white;
      color: var(--ink);
      font-size: 12px;
      line-height: 1.45;
    }
    .harm-assessment-appeal button {
      min-height: 42px;
      margin-top: 10px;
      border: 1px solid var(--line-strong);
      padding: 0 14px;
      background: var(--surface-solid);
      font: 700 9px/1 var(--mono);
      letter-spacing: .05em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .harm-assessment-appeal button:disabled { opacity: .55; cursor: not-allowed; }
    .harm-assessment-appeal-status {
      min-height: 16px;
      margin-top: 7px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }
    .harm-assessment-panel[data-route="allow"] {
      border-left: 5px solid #657a5f;
      background: #edf2e9;
    }
    .harm-assessment-panel[data-route="human_review"] {
      border-left: 5px solid var(--sand);
      background: var(--sand-soft);
    }
    .harm-assessment-panel[data-route="block"] {
      border-left: 5px solid #9b2f25;
      background: #f7e6df;
    }
    .harm-assessment-panel[data-route="allow"] .harm-assessment-status {
      border-color: #657a5f;
      color: #3d5137;
    }
    .harm-assessment-panel[data-route="human_review"] .harm-assessment-status {
      border-color: #8b7625;
      color: #5b4b18;
    }
    .harm-assessment-panel[data-route="block"] .harm-assessment-status {
      border-color: #9b2f25;
      color: #7a251d;
    }
    @media (max-width: 700px) {
      .harm-assessment-panel { grid-template-columns: 34px minmax(0, 1fr); }
      .harm-assessment-status { grid-column: 2; justify-self: start; }
    }
  </style>
`;

const HARM_ASSESSMENT_SCRIPT = `    let harmAssessmentRequestSequence = 0;

    function textList(target, label, values) {
      const list = Array.isArray(values) ? values.filter(Boolean) : [];
      target.textContent = list.length ? label + ": " + list.join(" · ") : "";
      target.hidden = list.length === 0;
    }

    function renderHarmAssessment(assessment) {
      const panel = $("#harmAssessmentPanel");
      const title = $("#harmAssessmentTitle");
      const message = $("#harmAssessmentMessage");
      const status = $("#harmAssessmentStatus");
      const categories = $("#harmAssessmentCategories");
      const details = $("#harmAssessmentDetails");
      const appeal = $("#harmAssessmentAppeal");
      if (!assessment) {
        panel.dataset.route = "pending";
        title.textContent = "Runs on the completed draft and again at submission.";
        message.textContent = "The system checks monetary and non-monetary terms, affected non-signatories, public-goods effects, genuine no-offer baselines, coercion, reversibility, and categorical restrictions. Uncertain cases remain private for human review.";
        status.textContent = "Not run yet";
        categories.hidden = true;
        categories.replaceChildren();
        details.hidden = true;
        appeal.hidden = true;
        appeal.dataset.assessmentId = "";
        return;
      }
      panel.dataset.route = assessment.route || "human_review";
      title.textContent = assessment.title || "Assessment complete.";
      message.textContent = assessment.message || "The proposal was assessed.";
      status.textContent = assessment.statusLabel || "Assessment complete";
      categories.replaceChildren();
      (Array.isArray(assessment.categories) ? assessment.categories : []).forEach((category) => {
        const item = document.createElement("li");
        item.textContent = category;
        categories.appendChild(item);
      });
      categories.hidden = categories.childElementCount === 0;
      textList($("#harmAssessmentReasonCodes"), "Reason codes", assessment.reasonCodes);
      textList($("#harmAssessmentAffectedFields"), "Affected fields", assessment.affectedFields);
      textList($("#harmAssessmentPolicyBasis"), "Policy basis", assessment.policyBasis);
      details.hidden = !(
        (Array.isArray(assessment.reasonCodes) && assessment.reasonCodes.length) ||
        (Array.isArray(assessment.affectedFields) && assessment.affectedFields.length) ||
        (Array.isArray(assessment.policyBasis) && assessment.policyBasis.length)
      );
      const canAppeal = Boolean(assessment.assessmentId && assessment.appeal?.eligible);
      appeal.hidden = !canAppeal;
      appeal.dataset.assessmentId = canAppeal ? assessment.assessmentId : "";
      if (canAppeal) {
        $("#harmAssessmentAppealStatus").textContent = assessment.appeal.instructions || "";
      }
      if (assessment.route === "block") {
        panel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      }
    }

    function renderHarmAssessmentFallback(message) {
      renderHarmAssessment({
        route: "human_review",
        title: "Automatic assessment is unavailable.",
        message: message || "The proposal will remain private for human review rather than being automatically permitted.",
        statusLabel: "Human review fallback",
        categories: [],
        reasonCodes: ["REVIEW_MODEL_UNRESOLVED"],
        affectedFields: [],
        policyBasis: ["Automatic permission requires a completed high-confidence low-risk assessment."],
        assessmentId: null,
        appeal: { eligible: false }
      });
    }

    async function runLiveHarmAssessment() {
      const sequence = ++harmAssessmentRequestSequence;
      renderHarmAssessment({
        route: "pending",
        title: "Assessing the completed draft…",
        message: "This private advisory scan does not publish, bind, pair, or move money.",
        statusLabel: "Assessing",
        categories: [],
        reasonCodes: [],
        affectedFields: [],
        policyBasis: [],
        assessmentId: null,
        appeal: { eligible: false }
      });
      try {
        const response = await fetch("/api/create/assess", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCreateSubmissionPayload())
        });
        const result = await response.json().catch(() => null);
        if (sequence !== harmAssessmentRequestSequence) return;
        if (response.status === 401 && result?.requiresAuth) {
          renderHarmAssessment({
            route: "pending",
            title: "Sign in to run the private advisory scan.",
            message: "The authoritative assessment will run at submission. If it cannot complete, the proposal remains private for human review.",
            statusLabel: "Sign-in required",
            categories: [],
            reasonCodes: [],
            affectedFields: [],
            policyBasis: [],
            assessmentId: null,
            appeal: { eligible: false }
          });
          return;
        }
        if (!response.ok || !result?.ok || !result.harmAssessment) {
          renderHarmAssessmentFallback(result?.message);
          return;
        }
        renderHarmAssessment(result.harmAssessment);
      } catch {
        if (sequence === harmAssessmentRequestSequence) renderHarmAssessmentFallback();
      }
    }

    async function submitHarmAssessmentAppeal() {
      const appeal = $("#harmAssessmentAppeal");
      const assessmentId = appeal.dataset.assessmentId;
      const statement = $("#harmAssessmentAppealStatement").value.trim();
      const evidenceText = $("#harmAssessmentAppealEvidence").value.trim();
      const button = $("#harmAssessmentAppealSubmit");
      const status = $("#harmAssessmentAppealStatus");
      if (!assessmentId) {
        status.textContent = "A durable assessment receipt is required before reconsideration.";
        return;
      }
      if (statement.length < 20) {
        status.textContent = "Explain the reconsideration request in at least 20 characters.";
        $("#harmAssessmentAppealStatement").focus();
        return;
      }
      button.disabled = true;
      status.textContent = "Saving reconsideration request…";
      try {
        const response = await fetch("/api/create/harm-assessment/appeal", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            appealKind: $("#harmAssessmentAppealKind").value,
            statement,
            evidence: evidenceText ? { userProvidedDetail: evidenceText } : {}
          })
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok || !result.appeal) {
          throw new Error(result?.message || "The reconsideration request could not be saved.");
        }
        status.textContent = result.appeal.message;
        button.textContent = "Reconsideration requested";
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "The reconsideration request could not be saved.";
        button.disabled = false;
      }
    }

    $("#harmAssessmentAppealSubmit")?.addEventListener("click", submitHarmAssessmentAppeal);

`;

const ASSET_LINKS = `  <link rel="stylesheet" href="/moral-trade-create/common-ground.css" />
`;
const DEFERRED_SCRIPT = `  <script defer src="/moral-trade-create/common-ground.js"></script>
`;

function occurrenceCount(source: string, value: string) {
  return source.split(value).length - 1;
}

function replaceExactCount(
  source: string,
  oldValue: string,
  newValue: string,
  expectedCount: number,
  label: string,
) {
  const actualCount = occurrenceCount(source, oldValue);
  if (actualCount !== expectedCount) {
    throw new Error(
      `The Create interface ${label} contract was expected ${expectedCount} time(s), but appeared ${actualCount}.`,
    );
  }
  return source.split(oldValue).join(newValue);
}

function replaceExactlyOnce(source: string, oldValue: string, newValue: string, label: string) {
  return replaceExactCount(source, oldValue, newValue, 1, label);
}

export function integrateCommonGroundCreateSource(source: string) {
  if (source.includes("data-common-ground-create-integration-v1")) return source;

  let integrated = source;
  integrated = replaceExactlyOnce(integrated, BLANK_FAVICON, CANONICAL_FAVICONS, "favicon");
  integrated = replaceExactlyOnce(integrated, HEADER_COPY[0], HEADER_COPY[1], "header-copy");
  integrated = replaceExactCount(integrated, REQUEST_COPY[0], REQUEST_COPY[1], 2, "request-copy");
  integrated = replaceExactCount(
    integrated,
    "Conditional donation",
    "Donation Upgrade",
    4,
    "Donation Upgrade label",
  );
  integrated = replaceExactlyOnce(
    integrated,
    "Set up a conditional donation.",
    "Set up a Donation Upgrade.",
    "Donation Upgrade heading",
  );
  integrated = replaceExactlyOnce(integrated, FUND_KICKER[0], FUND_KICKER[1], "fund-kicker");
  integrated = replaceExactlyOnce(
    integrated,
    THRESHOLD_POOL_CARD,
    COMPACT_POOL_CARDS,
    "funding-card",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '            <div class="dac-terms-panel" id="dacCreateFields" hidden>',
    `${COMMON_GROUND_PANEL}            <div class="dac-terms-panel" id="dacCreateFields" hidden>`,
    "Common Ground panel",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '          <div class="publish-panel">',
    `${HARM_ASSESSMENT_PANEL}          <div class="publish-panel">`,
    "harm-assessment panel",
  );
  integrated = replaceExactlyOnce(
    integrated,
    "</head>",
    `${ASSET_LINKS}${HARM_ASSESSMENT_STYLES}</head>`,
    "stylesheet insertion",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '  <script>\n    "use strict";',
    `${DEFERRED_SCRIPT}  <script>\n    "use strict";`,
    "deferred-script insertion",
  );
  integrated = replaceExactlyOnce(
    integrated,
    "    async function publishOffer() {",
    `${HARM_ASSESSMENT_SCRIPT}    async function publishOffer() {\n      harmAssessmentRequestSequence += 1;`,
    "harm-assessment workflow",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '        const result = await response.json().catch(() => null);',
    '        const result = await response.json().catch(() => null);\n        if (result?.harmAssessment) renderHarmAssessment(result.harmAssessment);',
    "harm-assessment final-response wiring",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '        $("#publishError").textContent = "";\n        $(".seed-card").classList.toggle("pool-route", directPool);',
    '        $("#publishError").textContent = "";\n        renderHarmAssessment(null);\n        void runLiveHarmAssessment();\n        $(".seed-card").classList.toggle("pool-route", directPool);',
    "harm-assessment live-scan trigger",
  );

  return integrated;
}

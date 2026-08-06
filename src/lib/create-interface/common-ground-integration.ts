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
          <section class="harm-assessment-panel" id="harmAssessmentPanel" data-route="pending" data-harmful-offer-assessment-v1 aria-live="polite">
            <div class="harm-assessment-mark" aria-hidden="true">◇</div>
            <div class="harm-assessment-copy">
              <div class="harm-assessment-kicker">Automatic harm assessment</div>
              <strong id="harmAssessmentTitle">Runs when you submit.</strong>
              <p id="harmAssessmentMessage">The system checks every offer, including non-monetary offers, for categorical restrictions and broader effects. Uncertain cases remain private for human review.</p>
              <ul id="harmAssessmentCategories" hidden></ul>
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
    .harm-assessment-copy > p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .harm-assessment-copy ul {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0 0;
      padding: 0;
      list-style: none;
    }
    .harm-assessment-copy li {
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

const HARM_ASSESSMENT_SCRIPT = `    function renderHarmAssessment(assessment) {
      const panel = $("#harmAssessmentPanel");
      const title = $("#harmAssessmentTitle");
      const message = $("#harmAssessmentMessage");
      const status = $("#harmAssessmentStatus");
      const categories = $("#harmAssessmentCategories");
      if (!assessment) {
        panel.dataset.route = "pending";
        title.textContent = "Runs when you submit.";
        message.textContent = "The system checks every offer, including non-monetary offers, for categorical restrictions and broader effects. Uncertain cases remain private for human review.";
        status.textContent = "Not run yet";
        categories.hidden = true;
        categories.replaceChildren();
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
      if (assessment.route === "block") {
        panel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      }
    }

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
    `${HARM_ASSESSMENT_SCRIPT}    async function publishOffer() {`,
    "harm-assessment renderer",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '        const result = await response.json().catch(() => null);',
    '        const result = await response.json().catch(() => null);\n        if (result?.harmAssessment) renderHarmAssessment(result.harmAssessment);',
    "harm-assessment response wiring",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '        $("#publishError").textContent = "";\n        $(".seed-card").classList.toggle("pool-route", directPool);',
    '        $("#publishError").textContent = "";\n        renderHarmAssessment(null);\n        $(".seed-card").classList.toggle("pool-route", directPool);',
    "harm-assessment reset",
  );

  return integrated;
}

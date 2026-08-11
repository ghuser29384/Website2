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
                <strong>Participant-bound proposal</strong>
                <button type="button" id="commonGroundReset">Reset</button>
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
              <fieldset class="common-ground-creator-choice" id="commonGroundCreatorChoice">
                <legend>Are you participating in this Co-Fund?</legend>
                <p>The organizer is not counted automatically. Choose one option before continuing.</p>
                <label><input type="radio" name="common_ground_creator_participation" value="participating" /> <span>Yes, I am a participant</span></label>
                <label><input type="radio" name="common_ground_creator_participation" value="organizer-only" /> <span>No, I am organizing only</span></label>
              </fieldset>
              <div class="common-ground-participants-head">
                <span id="commonGroundParticipantCount">0 participants selected</span>
                <button type="button" id="addCommonGroundParticipant">+ Add participant</button>
              </div>
              <p class="common-ground-fallback-help" id="commonGroundParticipantHelp">Search Moral Trade accounts by username or display name. Typed text is not a participant until you explicitly select an account. An external person may be recorded as an unclaimed invitee for a later private claim link.</p>
              <div class="common-ground-participant-list" id="commonGroundParticipantList"></div>
              <div class="common-ground-status" id="commonGroundStatus" role="status" aria-live="polite"></div>
            </div>
`;


const ASSET_LINKS = `  <link rel="stylesheet" href="/moral-trade-create/common-ground.css" />
`;
const DEFERRED_SCRIPT = `  <script defer src="/moral-trade-create/participant-picker.js"></script>
  <script defer src="/moral-trade-create/common-ground.js"></script>
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
    "</head>",
    `${ASSET_LINKS}</head>`,
    "stylesheet insertion",
  );
  integrated = replaceExactlyOnce(
    integrated,
    '  <script>\n    "use strict";',
    `${DEFERRED_SCRIPT}  <script>\n    "use strict";`,
    "deferred-script insertion",
  );

  return integrated;
}

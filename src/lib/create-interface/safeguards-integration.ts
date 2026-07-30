const SAFEGUARDS_PANEL = `          <section class="create-safeguards" aria-labelledby="createSafeguardsHeading" data-create-safeguards-v1>
            <div class="create-safeguards-head">
              <div>
                <div class="publish-kicker">Required before review</div>
                <h2 id="createSafeguardsHeading">Record the no-deal baseline and safety boundary.</h2>
                <p>These fields travel with the durable review record. They do not approve the proposal or replace the final frozen agreement.</p>
              </div>
              <a href="/safety" target="_top">Safety rules ↗</a>
            </div>

            <div class="create-safeguards-grid">
              <label class="create-safeguards-field create-safeguards-wide" for="createNoTradeBaseline">
                <span>What happens without this proposal?</span>
                <textarea id="createNoTradeBaseline" maxlength="600" rows="3" placeholder="Describe the specific action, donation, project, or default that would occur if no Moral Trade agreement is reached."></textarea>
                <small>Use the honest counterfactual, not merely “no agreement.”</small>
              </label>

              <label class="create-safeguards-check">
                <input type="checkbox" id="createBaselineConfirmed" />
                <span><strong>The stated baseline is genuine.</strong><small>It reflects what is actually expected without coordination.</small></span>
              </label>

              <label class="create-safeguards-check">
                <input type="checkbox" id="createNoManufacturedLeverage" />
                <span><strong>No harm or costly baseline was manufactured or escalated for leverage.</strong><small>The proposal is not a threat or a reward for creating a worse default.</small></span>
              </label>

              <label class="create-safeguards-field" for="createAffectedPartyStatus">
                <span>Could someone outside the proposal bear a material cost?</span>
                <select id="createAffectedPartyStatus">
                  <option value="">Choose one</option>
                  <option value="none_identified">No affected nonparticipant identified</option>
                  <option value="review_required">Possible affected party or externality — review required</option>
                </select>
              </label>

              <label class="create-safeguards-field" id="createAffectedPartyPlanField" for="createAffectedPartyPlan" hidden>
                <span>Impact, standing, and remedy plan</span>
                <textarea id="createAffectedPartyPlan" maxlength="600" rows="3" placeholder="Name the possible impact, how an affected party can safely raise it, and what remedy or review is required."></textarea>
              </label>

              <label class="create-safeguards-check create-safeguards-wide">
                <input type="checkbox" id="createIndividualCapacity" />
                <span><strong>I am acting only in my individual capacity.</strong><small>This Create flow does not authorize anyone to bind an organization, program, employer, or fund. <a href="/team-and-governance#organizational-authority" target="_top">Review the authority boundary.</a></small></span>
              </label>
            </div>

            <div class="create-safeguards-error" id="createSafeguardsError" role="alert"></div>
          </section>

`;

const PANEL_ANCHOR = '          <div class="publish-panel">';
const ASSET_LINK = '  <link rel="stylesheet" href="/moral-trade-create/safeguards.css" />\n';
const DEFERRED_SCRIPT = '  <script defer src="/moral-trade-create/safeguards.js"></script>\n';
const INLINE_SCRIPT_ANCHOR = '  <script>\n    "use strict";';

function occurrenceCount(source: string, value: string) {
  return source.split(value).length - 1;
}

function replaceExactlyOnce(
  source: string,
  oldValue: string,
  newValue: string,
  label: string,
) {
  const count = occurrenceCount(source, oldValue);
  if (count !== 1) {
    throw new Error(
      `The Create safeguards ${label} contract was expected once, but appeared ${count} times.`,
    );
  }
  return source.replace(oldValue, newValue);
}

export function integrateCreateSafeguardsSource(source: string) {
  if (source.includes("data-create-safeguards-v1")) return source;

  let integrated = source;
  integrated = replaceExactlyOnce(
    integrated,
    PANEL_ANCHOR,
    `${SAFEGUARDS_PANEL}${PANEL_ANCHOR}`,
    "panel",
  );
  integrated = replaceExactlyOnce(
    integrated,
    "</head>",
    `${ASSET_LINK}</head>`,
    "stylesheet",
  );
  integrated = replaceExactlyOnce(
    integrated,
    INLINE_SCRIPT_ANCHOR,
    `${DEFERRED_SCRIPT}${INLINE_SCRIPT_ANCHOR}`,
    "script",
  );

  return integrated;
}

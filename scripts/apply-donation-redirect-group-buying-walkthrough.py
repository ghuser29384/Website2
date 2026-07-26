from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_regex(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, found {count}")
    return updated


react_redirect = r'''  function renderRedirect() {
    if (step === 0) {
      return (
        <div className="mtw-scene mtw-stream-stage">
          <StepMark current={0} total={7} />
          <div className="mtw-stream mtw-stream-a">
            <div className="mtw-stream-label"><strong>$10</strong><span>Democrat · environment</span></div>
          </div>
          <div className="mtw-stream mtw-stream-b">
            <div className="mtw-stream-label"><strong>$10</strong><span>Republican · environment</span></div>
          </div>
          <div className="mtw-collision">Mostly<br />cancel out</div>
          <div className="mtw-stream-copy">
            <div className="mtw-scene-prompt">Donation Redirect</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              Two political donations. Almost no shared impact.
            </h1>
            <p className="mtw-scene-line">
              Both donors care most about protecting the environment, but their $10 donations pull
              in opposite directions.
            </p>
            <PrimaryAction onClick={() => setStep(1)}>Redirect the matched $20</PrimaryAction>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="mtw-scene mtw-stream-stage is-redirected">
          <StepMark current={1} total={7} />
          <div className="mtw-stream mtw-stream-a">
            <div className="mtw-stream-label"><strong>$20</strong><span>matched amount</span></div>
          </div>
          <div className="mtw-stream mtw-stream-b" />
          <div className="mtw-redirect-target">
            <div><strong>$20</strong><span>to environmental protection</span></div>
          </div>
          <div className="mtw-stream-copy">
            <div className="mtw-scene-prompt">First gain · rescue the waste</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              The matched money now creates shared impact.
            </h1>
            <p className="mtw-scene-line">
              Neither donor changes political beliefs. Their opposed spending simply stops fighting.
            </p>
            <PrimaryAction onClick={() => setStep(2)}>See how one $10 can go further</PrimaryAction>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="mtw-scene mtw-redirect-comparison-scene">
          <StepMark current={2} total={7} />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Different causes · different bottlenecks</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              Before the fallback settles, invite a better proposal.
            </h1>
            <p className="mtw-scene-line">
              The Republican&apos;s $10 will go to environmental protection in 7 days unless a trade
              she values more is accepted and completed.
            </p>
          </div>
          <div className="mtw-impact-options" aria-label="Compare uses of ten dollars">
            <article className="mtw-impact-option">
              <span>Fallback donation</span>
              <strong>$10</strong>
              <b>Environmental organization</b>
              <small>Useful, but no exchange.</small>
            </article>
            <article className="mtw-impact-option">
              <span>One-to-one trade</span>
              <strong>1 × 10 weeks</strong>
              <b>10 person-weeks</b>
              <small>One person avoids buying single-use plastic bags.</small>
            </article>
            <article className="mtw-impact-option is-group-buy">
              <span>Group-buy moral trade</span>
              <strong>100 × 2.1 days</strong>
              <b>210 person-days · 30 person-weeks</b>
              <small>Equivalent to 30 people for one week.</small>
            </article>
          </div>
          <p className="mtw-example-note">
            In this example, the environmentalist prefers the verified 210 person-days to the $10
            fallback donation.
          </p>
          <PrimaryAction onClick={() => setStep(3)}>Notify potential coalition members</PrimaryAction>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="mtw-scene mtw-coalition-scene">
          <StepMark current={3} total={7} />
          <div className="mtw-coalition-layout">
            <div>
              <div className="mtw-scene-prompt">7-day better-match window</div>
              <h1 className="mtw-scene-title" tabIndex={-1}>
                One member finds 99 close matches.
              </h1>
              <p className="mtw-scene-line">
                Moral Trade searches for people whose priorities are as similar as possible and
                whose small actions can add up.
              </p>
              <PrimaryAction onClick={() => setStep(4)}>Form the 100-person coalition</PrimaryAction>
            </div>
            <div className="mtw-coalition-card">
              <div className="mtw-coalition-profile">
                <span>Lead member&apos;s priorities</span>
                <strong>Future-focused coalition</strong>
              </div>
              <div className="mtw-priority-list" aria-label="Lead member priority allocation">
                <div><span>Future flourishing</span><b>60 / 100</b><i><em style={{ width: "60%" }} /></i></div>
                <div><span>Existential risk</span><b>25 / 100</b><i><em style={{ width: "25%" }} /></i></div>
                <div><span>Other priorities</span><b>15 / 100</b><i><em style={{ width: "15%" }} /></i></div>
              </div>
              <div className="mtw-coalition-dots" aria-hidden="true">
                {Array.from({ length: 100 }, (_, index) => <i key={index} />)}
              </div>
              <div className="mtw-coalition-math">
                <strong>100 × 2.1 days</strong>
                <span>= 210 verified person-days</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="mtw-scene mtw-group-deal-scene">
          <StepMark current={4} total={7} />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">A coalition can trade as one counterparty</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              The coalition becomes one offer.
            </h1>
          </div>
          <div className="mtw-group-deal-board">
            <article className="mtw-group-deal-card">
              <span>Environmentalist Republican gives</span>
              <strong>$10 coalition payment</strong>
              <small>Released only after the group&apos;s verified completion.</small>
            </article>
            <div className="mtw-group-deal-arrow" aria-hidden="true">↔</div>
            <article className="mtw-group-deal-card is-coalition">
              <span>100-person coalition gives</span>
              <strong>210 person-days without buying single-use plastic bags</strong>
              <small>Each member commits 2.1 days.</small>
            </article>
          </div>
          <p className="mtw-fallback-note">
            If the coalition does not form or complete, the $10 follows its environmental fallback
            after the 7-day window.
          </p>
          <PrimaryAction onClick={() => setStep(5)}>Accept the group trade</PrimaryAction>
        </div>
      );
    }

    if (step === 5) {
      const releaseLabel = coalitionRule === "vote"
        ? "Open the member vote"
        : coalitionRule === "pre-agree"
          ? "Release $10 to the pre-agreed destination"
          : "Choose how the coalition will allocate $10";

      return (
        <div className="mtw-scene mtw-coalition-settlement-scene">
          <StepMark current={5} total={7} />
          <div className="mtw-settlement-layout">
            <div>
              <div className="mtw-scene-prompt">Completion verified</div>
              <h1 className="mtw-scene-title" tabIndex={-1}>
                100 members complete 2.1 days each.
              </h1>
              <div className="mtw-coalition-progress" role="progressbar" aria-label="Coalition completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
                <div><strong>100 / 100</strong><span>members verified</span></div>
                <i><em /></i>
              </div>
            </div>
            <div className="mtw-governance-panel">
              <span>How should the coalition use the $10?</span>
              <div className="mtw-governance-choices" role="group" aria-label="Choose the coalition allocation rule">
                <button
                  aria-pressed={coalitionRule === "pre-agree"}
                  type="button"
                  onClick={() => setCoalitionRule("pre-agree")}
                >
                  <strong>Pre-agree the destination</strong>
                  <small>Send the full $10 to the coalition&apos;s chosen future-focused fund.</small>
                </button>
                <button
                  aria-pressed={coalitionRule === "vote"}
                  type="button"
                  onClick={() => setCoalitionRule("vote")}
                >
                  <strong>Vote after completion</strong>
                  <small>One verified member, one vote on the full $10.</small>
                </button>
              </div>
              <button className="mtw-primary-action" disabled={!coalitionRule} type="button" onClick={() => setStep(6)}>
                <span>{releaseLabel}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    const coalitionSettlement = coalitionRule === "vote"
      ? "A one-member-one-vote decision now allocates the coalition's $10."
      : "The coalition's $10 goes to its pre-agreed future-focused destination.";

    return (
      <div className="mtw-scene mtw-success-scene mtw-redirect-amplified-success">
        <StepMark current={6} total={7} />
        <Burst count={32} />
        <div className="mtw-success-copy">
          <div className="mtw-scene-prompt">Donation redirected · impact amplified</div>
          <h1 className="mtw-scene-title" tabIndex={-1}>
            One $10 bought 30 person-weeks of environmental action.
          </h1>
          <p className="mtw-scene-line">
            The environmentalist gets 210 verified person-days. The coalition gets the same $10 for
            its shared priorities. {coalitionSettlement}
          </p>
          <p className="mtw-example-note">
            Money moved where it was scarcer; small actions moved where they were cheaper. Both
            sides prefer this outcome to the 7-day fallback.
          </p>
          <ConversionDeck
            primary="join"
            redirectLabels
            tradeCreateHref={tradeCreateHref}
            onOpenCrowd={() => switchConcept("crowd")}
          />
        </div>
      </div>
    );
  }'''

html_redirect = r'''    function renderRedirect() {
      const coalitionDots = Array.from({ length: 100 }, function(_, index) {
        return '<i style="--dot-delay:' + ((index % 10) * 18) + 'ms"></i>';
      }).join("");

      if (state.step === 0) {
        stage.innerHTML = `<div class="scene stream-stage">${stepMark(0, 7)}<div class="stream stream-a"><div class="stream-label"><strong>$10</strong><span>Democrat · environment</span></div></div><div class="stream stream-b"><div class="stream-label"><strong>$10</strong><span>Republican · environment</span></div></div><div class="collision">Mostly<br>cancel out</div><div class="stream-copy"><div class="scene-prompt">Donation Redirect</div><h1 class="scene-title">Two political donations. Almost no shared impact.</h1><p class="scene-line">Both donors care most about protecting the environment, but their $10 donations pull in opposite directions.</p><button class="primary-action" type="button" data-action="show-basic-redirect"><span>Redirect the matched $20</span><span aria-hidden="true">→</span></button></div></div>`;
        return;
      }

      if (state.step === 1) {
        stage.innerHTML = `<div class="scene stream-stage redirected">${stepMark(1, 7)}<div class="stream stream-a"><div class="stream-label"><strong>$20</strong><span>matched amount</span></div></div><div class="stream stream-b"></div><div class="redirect-target"><div><strong>$20</strong><span>to environmental protection</span></div></div><div class="stream-copy"><div class="scene-prompt">First gain · rescue the waste</div><h1 class="scene-title">The matched money now creates shared impact.</h1><p class="scene-line">Neither donor changes political beliefs. Their opposed spending simply stops fighting.</p><button class="primary-action" type="button" data-action="show-amplification"><span>See how one $10 can go further</span><span aria-hidden="true">→</span></button></div></div>`;
        return;
      }

      if (state.step === 2) {
        stage.innerHTML = `<div class="scene redirect-comparison-scene">${stepMark(2, 7)}<div class="scene-head"><div class="scene-prompt">Different causes · different bottlenecks</div><h1 class="scene-title">Before the fallback settles, invite a better proposal.</h1><p class="scene-line">The Republican's $10 will go to environmental protection in 7 days unless a trade she values more is accepted and completed.</p></div><div class="impact-options" aria-label="Compare uses of ten dollars"><article class="impact-option"><span>Fallback donation</span><strong>$10</strong><b>Environmental organization</b><small>Useful, but no exchange.</small></article><article class="impact-option"><span>One-to-one trade</span><strong>1 × 10 weeks</strong><b>10 person-weeks</b><small>One person avoids buying single-use plastic bags.</small></article><article class="impact-option is-group-buy"><span>Group-buy moral trade</span><strong>100 × 2.1 days</strong><b>210 person-days · 30 person-weeks</b><small>Equivalent to 30 people for one week.</small></article></div><p class="example-note">In this example, the environmentalist prefers the verified 210 person-days to the $10 fallback donation.</p><button class="primary-action" type="button" data-action="notify-coalition"><span>Notify potential coalition members</span><span aria-hidden="true">→</span></button></div>`;
        return;
      }

      if (state.step === 3) {
        stage.innerHTML = `<div class="scene coalition-scene">${stepMark(3, 7)}<div class="coalition-layout"><div><div class="scene-prompt">7-day better-match window</div><h1 class="scene-title">One member finds 99 close matches.</h1><p class="scene-line">Moral Trade searches for people whose priorities are as similar as possible and whose small actions can add up.</p><button class="primary-action" type="button" data-action="form-coalition"><span>Form the 100-person coalition</span><span aria-hidden="true">→</span></button></div><div class="coalition-card"><div class="coalition-profile"><span>Lead member's priorities</span><strong>Future-focused coalition</strong></div><div class="priority-list" aria-label="Lead member priority allocation"><div><span>Future flourishing</span><b>60 / 100</b><i><em style="width:60%"></em></i></div><div><span>Existential risk</span><b>25 / 100</b><i><em style="width:25%"></em></i></div><div><span>Other priorities</span><b>15 / 100</b><i><em style="width:15%"></em></i></div></div><div class="coalition-dots" aria-hidden="true">${coalitionDots}</div><div class="coalition-math"><strong>100 × 2.1 days</strong><span>= 210 verified person-days</span></div></div></div></div>`;
        return;
      }

      if (state.step === 4) {
        stage.innerHTML = `<div class="scene group-deal-scene">${stepMark(4, 7)}<div class="scene-head"><div class="scene-prompt">A coalition can trade as one counterparty</div><h1 class="scene-title">The coalition becomes one offer.</h1></div><div class="group-deal-board"><article class="group-deal-card"><span>Environmentalist Republican gives</span><strong>$10 coalition payment</strong><small>Released only after the group's verified completion.</small></article><div class="group-deal-arrow" aria-hidden="true">↔</div><article class="group-deal-card is-coalition"><span>100-person coalition gives</span><strong>210 person-days without buying single-use plastic bags</strong><small>Each member commits 2.1 days.</small></article></div><p class="fallback-note">If the coalition does not form or complete, the $10 follows its environmental fallback after the 7-day window.</p><button class="primary-action" type="button" data-action="accept-group-trade"><span>Accept the group trade</span><span aria-hidden="true">→</span></button></div>`;
        return;
      }

      if (state.step === 5) {
        const releaseLabel = state.coalitionRule === "vote"
          ? "Open the member vote"
          : state.coalitionRule === "pre-agree"
            ? "Release $10 to the pre-agreed destination"
            : "Choose how the coalition will allocate $10";
        stage.innerHTML = `<div class="scene coalition-settlement-scene">${stepMark(5, 7)}<div class="settlement-layout"><div><div class="scene-prompt">Completion verified</div><h1 class="scene-title">100 members complete 2.1 days each.</h1><div class="coalition-progress" role="progressbar" aria-label="Coalition completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div><strong>100 / 100</strong><span>members verified</span></div><i><em></em></i></div></div><div class="governance-panel"><span>How should the coalition use the $10?</span><div class="governance-choices" role="group" aria-label="Choose the coalition allocation rule"><button aria-pressed="${state.coalitionRule === "pre-agree"}" type="button" data-action="choose-coalition-rule" data-value="pre-agree"><strong>Pre-agree the destination</strong><small>Send the full $10 to the coalition's chosen future-focused fund.</small></button><button aria-pressed="${state.coalitionRule === "vote"}" type="button" data-action="choose-coalition-rule" data-value="vote"><strong>Vote after completion</strong><small>One verified member, one vote on the full $10.</small></button></div><button class="primary-action" type="button" data-action="release-coalition" ${state.coalitionRule ? "" : "disabled"}><span>${releaseLabel}</span><span aria-hidden="true">→</span></button></div></div></div>`;
        return;
      }

      const coalitionSettlement = state.coalitionRule === "vote"
        ? "A one-member-one-vote decision now allocates the coalition's $10."
        : "The coalition's $10 goes to its pre-agreed future-focused destination.";
      stage.innerHTML = `<div class="scene success-scene redirect-amplified-success">${stepMark(6, 7)}${burstMarkup(32)}<div class="success-copy"><div class="scene-prompt">Donation redirected · impact amplified</div><h1 class="scene-title">One $10 bought 30 person-weeks of environmental action.</h1><p class="scene-line">The environmentalist gets 210 verified person-days. The coalition gets the same $10 for its shared priorities. ${coalitionSettlement}</p><p class="example-note">Money moved where it was scarcer; small actions moved where they were cheaper. Both sides prefer this outcome to the 7-day fallback.</p>${conversionDeck("join", { create: "Offer", chip: "Leverage $1", chipAction: "open-crowd" })}</div></div>`;
    }'''

react_css = r'''

/* Donation Redirect: rescue opposed donations, then amplify one side through a coalition trade. */
.mtw-redirect-comparison-scene,
.mtw-coalition-scene,
.mtw-group-deal-scene,
.mtw-coalition-settlement-scene {
  align-content: center;
}

.mtw-redirect-comparison-scene .mtw-scene-title,
.mtw-coalition-scene .mtw-scene-title,
.mtw-group-deal-scene .mtw-scene-title,
.mtw-coalition-settlement-scene .mtw-scene-title {
  max-width: 15ch;
  font-size: clamp(40px, 5.4vw, 80px);
}

.mtw-stream-stage .mtw-stream-label span {
  max-width: 210px;
  line-height: 1.05;
}

.mtw-impact-options {
  width: min(1080px, 100%);
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mtw-impact-option {
  min-height: 190px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(25, 25, 21, 0.16);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.42);
}

.mtw-impact-option.is-group-buy {
  border-color: rgba(45, 85, 61, 0.45);
  background: #dce8da;
  box-shadow: 0 18px 38px rgba(29, 58, 39, 0.1);
  transform: translateY(-7px);
}

.mtw-impact-option > span,
.mtw-group-deal-card > span,
.mtw-coalition-profile > span,
.mtw-governance-panel > span {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.58;
}

.mtw-impact-option strong {
  margin-top: auto;
  font-family: var(--mtw-serif);
  font-size: clamp(28px, 3vw, 44px);
  font-weight: 400;
  letter-spacing: -0.04em;
}

.mtw-impact-option b {
  font-size: 17px;
}

.mtw-impact-option small,
.mtw-group-deal-card small,
.mtw-governance-choices small {
  line-height: 1.35;
  opacity: 0.64;
}

.mtw-example-note,
.mtw-fallback-note {
  width: min(900px, 100%);
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.65;
}

.mtw-coalition-layout,
.mtw-settlement-layout {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(430px, 1.18fr);
  align-items: center;
  gap: clamp(30px, 6vw, 92px);
}

.mtw-coalition-card,
.mtw-governance-panel {
  padding: clamp(20px, 3vw, 34px);
  border: 1px solid rgba(25, 25, 21, 0.16);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 24px 50px rgba(25, 25, 21, 0.08);
}

.mtw-coalition-profile {
  display: grid;
  gap: 5px;
}

.mtw-coalition-profile strong {
  font-family: var(--mtw-serif);
  font-size: 29px;
  font-weight: 400;
}

.mtw-priority-list {
  margin-top: 20px;
  display: grid;
  gap: 11px;
}

.mtw-priority-list > div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px 12px;
  font-size: 12px;
}

.mtw-priority-list > div > i {
  grid-column: 1 / -1;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(25, 25, 21, 0.09);
}

.mtw-priority-list em {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: #536bc8;
}

.mtw-coalition-dots {
  width: min(210px, 62%);
  margin: 22px auto 0;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 5px;
}

.mtw-coalition-dots > i {
  aspect-ratio: 1;
  border-radius: 50%;
  background: #65785b;
  opacity: 0.78;
}

.mtw-coalition-math {
  margin-top: 18px;
  display: grid;
  gap: 4px;
  text-align: center;
}

.mtw-coalition-math strong {
  font-family: var(--mtw-serif);
  font-size: 27px;
  font-weight: 400;
}

.mtw-coalition-math span {
  font-size: 13px;
  opacity: 0.62;
}

.mtw-group-deal-board {
  width: min(1050px, 100%);
  margin-top: 30px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
}

.mtw-group-deal-card {
  min-height: 215px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(25, 25, 21, 0.17);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.5);
}

.mtw-group-deal-card.is-coalition {
  background: #dce8da;
}

.mtw-group-deal-card strong {
  margin: auto 0;
  font-family: var(--mtw-serif);
  font-size: clamp(27px, 3.2vw, 45px);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.98;
}

.mtw-group-deal-arrow {
  align-self: center;
  font-size: 34px;
  opacity: 0.5;
}

.mtw-coalition-progress {
  width: min(560px, 100%);
  margin-top: 30px;
}

.mtw-coalition-progress > div {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 13px;
}

.mtw-coalition-progress strong {
  font-size: 22px;
}

.mtw-coalition-progress > i {
  height: 16px;
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(25, 25, 21, 0.1);
}

.mtw-coalition-progress em {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
  background: linear-gradient(90deg, #536bc8, #65785b);
}

.mtw-governance-choices {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.mtw-governance-choices button {
  padding: 18px;
  display: grid;
  gap: 6px;
  border: 1px solid rgba(25, 25, 21, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.42);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.mtw-governance-choices button:hover,
.mtw-governance-choices button[aria-pressed="true"] {
  border-color: rgba(25, 25, 21, 0.52);
  background: #fff;
  transform: translateY(-2px);
}

.mtw-governance-panel .mtw-primary-action {
  width: 100%;
}

.mtw-redirect-amplified-success .mtw-success-copy {
  width: min(1060px, 100%);
}

.mtw-redirect-amplified-success .mtw-scene-title {
  max-width: 14ch;
  font-size: clamp(42px, 6vw, 88px);
}

@media (max-width: 900px) {
  .mtw-impact-options {
    grid-template-columns: 1fr;
  }

  .mtw-impact-option {
    min-height: 0;
  }

  .mtw-impact-option.is-group-buy {
    transform: none;
  }

  .mtw-coalition-layout,
  .mtw-settlement-layout {
    grid-template-columns: 1fr;
    gap: 22px;
  }
}

@media (max-width: 740px) {
  .mtw-experience[data-concept="redirect"] {
    overflow-y: auto;
  }

  .mtw-experience[data-concept="redirect"] .mtw-step-mark span {
    width: 14px;
  }

  .mtw-redirect-comparison-scene,
  .mtw-coalition-scene,
  .mtw-group-deal-scene,
  .mtw-coalition-settlement-scene {
    min-height: 100%;
    padding: 74px 20px 34px;
    align-content: start;
  }

  .mtw-redirect-comparison-scene .mtw-scene-title,
  .mtw-coalition-scene .mtw-scene-title,
  .mtw-group-deal-scene .mtw-scene-title,
  .mtw-coalition-settlement-scene .mtw-scene-title {
    font-size: 40px;
  }

  .mtw-impact-options {
    margin-top: 18px;
    gap: 8px;
  }

  .mtw-impact-option {
    padding: 14px;
    gap: 4px;
  }

  .mtw-impact-option strong {
    font-size: 27px;
  }

  .mtw-coalition-card,
  .mtw-governance-panel {
    padding: 18px;
  }

  .mtw-coalition-dots {
    width: 180px;
  }

  .mtw-group-deal-board {
    grid-template-columns: 1fr;
    margin-top: 20px;
  }

  .mtw-group-deal-card {
    min-height: 0;
    padding: 18px;
  }

  .mtw-group-deal-arrow {
    justify-self: center;
    transform: rotate(90deg);
  }

  .mtw-redirect-amplified-success .mtw-scene-title {
    font-size: 46px;
  }
}
'''

html_css = react_css.replace(".mtw-", ".").replace("--mtw-serif", "--serif").replace("--mtw-sans", "--sans")

# React fallback component.
component_path = "src/components/walkthrough/immersive-walkthrough.tsx"
component = read(component_path)
component = replace_once(
    component,
    'type MixId = "one" | "two" | "three";\n',
    'type MixId = "one" | "two" | "three";\ntype CoalitionRule = "pre-agree" | "vote";\n',
    "add coalition rule type",
)
component = replace_once(
    component,
    '    caption: "Turn opposed spending into shared impact",',
    '    caption: "Rescue waste, then group-buy more impact",',
    "update redirect caption",
)
component = replace_once(
    component,
    '  const [sharedCause, setSharedCause] = useState<string | null>(null);',
    '  const [coalitionRule, setCoalitionRule] = useState<CoalitionRule | null>(null);',
    "replace redirect state",
)
component = replace_once(
    component,
    '    setSharedCause(null);',
    '    setCoalitionRule(null);',
    "reset coalition rule",
)
component = replace_regex(
    component,
    r'  function renderRedirect\(\) \{.*?\n  \}\n\n  function renderMix\(\)',
    react_redirect + '\n\n  function renderMix()',
    "replace React redirect walkthrough",
)
write(component_path, component)

# React fallback styles.
css_path = "src/app/walkthrough/walkthrough.css"
css = read(css_path)
if "Donation Redirect: rescue opposed donations" in css:
    raise RuntimeError("React redirect CSS marker already exists")
write(css_path, (css.rstrip() + react_css).rstrip() + "\n")

# Standalone walkthrough served by the production shell.
html_path = "public/moral-trade-interactive-walkthroughs.html"
html = read(html_path)
html = replace_once(
    html,
    '  <meta name="description" content="Learn moral trade through an interactive walkthrough of value exchanges, conditional public-goods funding, and an all-or-nothing salary-gap pool for a higher-impact career.">',
    '  <meta name="description" content="Learn moral trade through value exchanges, donation redirects, coalition group-buying, conditional public-goods funding, and a higher-impact career pool.">',
    "update standalone walkthrough description",
)
html = replace_once(
    html,
    '{ id: "redirect", short: "Redirect", title: "Redirect", caption: "Turn opposed spending into shared impact" },',
    '{ id: "redirect", short: "Redirect", title: "Redirect", caption: "Rescue waste, then group-buy more impact" },',
    "update standalone redirect caption",
)
html = replace_once(
    html,
    '      sharedCause: null,\n      mix: null,',
    '      sharedCause: null,\n      coalitionRule: null,\n      mix: null,',
    "add standalone coalition state",
)
html = replace_once(
    html,
    '      state.sharedCause = null;\n      state.mix = null;',
    '      state.sharedCause = null;\n      state.coalitionRule = null;\n      state.mix = null;',
    "reset standalone coalition state",
)
html = replace_regex(
    html,
    r'    function renderRedirect\(\) \{.*?\n    \}\n\n    function equalizerMarkup\(\)',
    html_redirect + '\n\n    function equalizerMarkup()',
    "replace standalone redirect walkthrough",
)
html = replace_once(
    html,
    '      if (action === "pause-streams") { state.step = 1; render(); }\n      if (action === "choose-shared") { state.sharedCause = control.dataset.value; state.step = 2; render(); }\n      if (action === "finish-redirect") { state.step = 3; render(); }',
    '      if (action === "show-basic-redirect") { state.step = 1; render(); focusStageHeading(); }\n      if (action === "show-amplification") { state.step = 2; render(); focusStageHeading(); }\n      if (action === "notify-coalition") { state.step = 3; render(); focusStageHeading(); }\n      if (action === "form-coalition") { state.step = 4; render(); focusStageHeading(); }\n      if (action === "accept-group-trade") { state.step = 5; render(); focusStageHeading(); }\n      if (action === "choose-coalition-rule") { state.coalitionRule = control.dataset.value; render(); }\n      if (action === "release-coalition" && state.coalitionRule) { state.step = 6; render(); focusStageHeading(); }',
    "replace standalone redirect actions",
)
if "Donation Redirect: rescue opposed donations" in html:
    raise RuntimeError("Standalone redirect CSS marker already exists")
html = replace_once(html, "  </style>\n</head>", html_css + "\n  </style>\n</head>", "append standalone redirect CSS")
write(html_path, html)

# Make the first-time walkthrough mandatory, preserving the user's earlier decision.
page_path = "src/app/walkthrough/page.tsx"
page = read(page_path)
page = replace_once(page, 'import "./skip-walkthrough.css";\n', "", "remove skip stylesheet import")
page = replace_once(
    page,
    '  "Try an interactive Moral Trade walkthrough: find a deal across different priorities, redirect opposed donations, and use all-or-nothing funding to close a higher-impact job\'s salary gap.",',
    '  "Try Moral Trade: redirect opposed donations, group-buy verified action, coordinate conditional funding, and close a higher-impact job\'s salary gap.",',
    "update walkthrough metadata",
)
page = replace_regex(
    page,
    r'type WalkthroughPageProps = \{.*?export default async function WalkthroughPage\(\{ searchParams \}: WalkthroughPageProps\) \{.*?\n\}',
    'export default function WalkthroughPage() {\n  return <ImmersiveWalkthrough tradeCreateHref="/trades/new" />;\n}',
    "remove fallback skip control",
)
write(page_path, page)

skip_css = ROOT / "src/app/walkthrough/skip-walkthrough.css"
if not skip_css.exists():
    raise RuntimeError("skip walkthrough stylesheet was unexpectedly absent")
skip_css.unlink()

shell_path = "public/moral-trade-production.html"
shell = read(shell_path)
shell = replace_once(
    shell,
    '  <meta name="description" content="Moral Trade — discover reciprocal commitments and shared gains through an interactive walkthrough.">',
    '  <meta name="description" content="Moral Trade — redirect opposed donations, form coalitions, and discover reciprocal commitments through an interactive walkthrough.">',
    "update production shell description",
)
shell = replace_regex(
    shell,
    r'        const firstVisit =\n          window\.location\.pathname === "/walkthrough" &&\n          new URLSearchParams\(window\.location\.search\)\.get\("first_visit"\) === "1";\n',
    "",
    "remove production first-visit marker",
)
shell = replace_regex(
    shell,
    r'        const firstVisitStyles = firstVisit\n.*?        const firstVisitControl = firstVisit\n.*?          : "";\n',
    "",
    "remove production skip UI",
)
shell = replace_once(
    shell,
    '          `${firstVisitStyles}<link rel="stylesheet" href="/walkthrough-profile-enhancement.css"><link rel="stylesheet" href="/moral-trade-input-assist.css">${accountScripts}</head>`',
    '          `<link rel="stylesheet" href="/walkthrough-profile-enhancement.css"><link rel="stylesheet" href="/moral-trade-input-assist.css">${accountScripts}</head>`',
    "remove production skip styles interpolation",
)
shell = replace_once(shell, '        html = html.replace("<body>", `<body>${firstVisitControl}`);\n', "", "remove production skip injection")
write(shell_path, shell)

proxy_path = "src/proxy.ts"
proxy = read(proxy_path)
proxy = replace_once(proxy, '      walkthroughUrl.searchParams.set("first_visit", "1");\n', "", "remove first_visit query marker")
write(proxy_path, proxy)

proxy_test_path = "src/proxy.test.ts"
proxy_test = read(proxy_test_path)
proxy_test = replace_once(
    proxy_test,
    'test("a first human homepage visit redirects once to the walkthrough", () => {',
    'test("a first human homepage visit redirects to the mandatory walkthrough", () => {',
    "rename proxy walkthrough test",
)
proxy_test = replace_once(
    proxy_test,
    '    "https://moraltrade.org/walkthrough?utm_source=invite&first_visit=1",',
    '    "https://moraltrade.org/walkthrough?utm_source=invite",',
    "update proxy walkthrough URL",
)
write(proxy_test_path, proxy_test)

shell_test_path = "src/walkthrough-production-shell.test.ts"
shell_test = read(shell_test_path)
shell_test = replace_regex(
    shell_test,
    r'test\("the production shell only offers Skip on the first-visit walkthrough route", \(\) => \{.*?\n\}\);',
    '''test("the production walkthrough does not offer a skip control", () => {
  assert.doesNotMatch(productionShell, /first_visit/);
  assert.doesNotMatch(productionShell, /aria-label="Skip walkthrough"/);
  assert.doesNotMatch(productionShell, /mtw-first-visit-skip/);
});''',
    "update production shell test",
)
write(shell_test_path, shell_test)

# Browser coverage for the mandatory entry and complete Donation Redirect coalition path.
e2e_path = "tests/walkthrough.spec.ts"
e2e = read(e2e_path)
e2e = replace_regex(
    e2e,
    r'test\("a first homepage visit opens the walkthrough once", async \(\{ context, page \}\) => \{.*?\n\}\);\n\n',
    '''test("a first homepage visit opens the mandatory walkthrough without a skip control", async ({ context, page }) => {
  await context.clearCookies();
  await page.goto("/?utm_source=invite", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\\/walkthrough\\?utm_source=invite$/);
  await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip walkthrough" })).toHaveCount(0);

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "mt_walkthrough_seen")).toMatchObject({
    httpOnly: true,
    value: "1",
  });
});

''',
    "replace first-visit browser test",
)
e2e = replace_regex(
    e2e,
    r'test\("Crowd and Redirect preserve the requested copy and routing", async \(\{ page \}\) => \{.*?\n\}\);\n\n(?=test\("The Crowd can close)',
    '''test("Crowd and Redirect preserve the requested copy, coalition trade, and routing", async ({ page }) => {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });

  await page.getByRole("tab", { name: /The crowd/i }).click();
  await expect(page.getByText("You donate if and only if 200 other people donate enough.")).toBeVisible();
  await expect(
    page.getByText("If the threshold isn't reached, no one's donation gets donated."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your donation might be decisive for everyone's donation being donated.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer trade" })).toBeVisible();
  await page.getByRole("button", { name: "$10" }).click();
  await expect(page.getByRole("button", { name: "Offer trade" })).toHaveCount(0);

  await page.getByRole("tab", { name: /Redirect/i }).click();
  const democratMarker = page.locator(".stream-a .stream-label");
  await expect(democratMarker).toContainText("$10Democrat · environment");
  await expect(democratMarker).toBeVisible();
  await expectFullyInViewport(page, democratMarker);
  await expect(page.getByText("Republican · environment")).toBeVisible();

  await page.getByRole("button", { name: "Redirect the matched $20" }).click();
  await expect(page.getByText("$20to environmental protection")).toBeVisible();
  await page.getByRole("button", { name: "See how one $10 can go further" }).click();

  await expect(page.getByText("100 × 2.1 days")).toBeVisible();
  await expect(page.getByText("210 person-days · 30 person-weeks")).toBeVisible();
  await expect(page.getByText("1 × 10 weeks")).toBeVisible();
  await page.getByRole("button", { name: "Notify potential coalition members" }).click();

  await expect(page.getByRole("heading", { name: "One member finds 99 close matches." })).toBeVisible();
  await expect(page.getByText("Future flourishing")).toBeVisible();
  await expect(page.getByText("60 / 100")).toBeVisible();
  await expect(page.getByText("Existential risk")).toBeVisible();
  await expect(page.getByText("25 / 100")).toBeVisible();
  await page.getByRole("button", { name: "Form the 100-person coalition" }).click();

  await expect(page.getByRole("heading", { name: "The coalition becomes one offer." })).toBeVisible();
  await expect(page.getByText("$10 coalition payment")).toBeVisible();
  await expect(page.getByText("210 person-days without buying single-use plastic bags")).toBeVisible();
  await page.getByRole("button", { name: "Accept the group trade" }).click();

  await expect(page.getByText("100 / 100")).toBeVisible();
  await page.getByRole("button", { name: /Pre-agree the destination/ }).click();
  await page.getByRole("button", { name: "Release $10 to the pre-agreed destination" }).click();
  await expect(
    page.getByRole("heading", { name: "One $10 bought 30 person-weeks of environmental action." }),
  ).toBeVisible();
  await expect(page.getByText(/pre-agreed future-focused destination/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Offer Create a moral trade/ })).toBeVisible();

  const leverage = page.getByRole("button", {
    name: /Leverage \$1 Others may donate if and only if you donate\./,
  });
  await expect(leverage).toBeVisible();
  await leverage.click();
  await expect(page.getByRole("tab", { name: /The crowd/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: /Your match/i }).click();
  await expect(
    page.getByRole("heading", { name: "Offer value to gain more value." }),
  ).toBeVisible();
  await expect(page.getByText("What could you happily put on the table?")).toHaveCount(0);
});

''',
    "replace redirect browser test",
)
e2e = replace_once(e2e, "  const mobileDemocratsMarker = page.locator(\".stream-a .stream-label\");\n  await expect(mobileDemocratsMarker).toBeVisible();\n  await expectFullyInViewport(page, mobileDemocratsMarker);", "  const mobileRedirectMarker = page.locator(\".stream-a .stream-label\");\n  await expect(mobileRedirectMarker).toBeVisible();\n  await expect(mobileRedirectMarker).toContainText(\"$10\");\n  await expectFullyInViewport(page, mobileRedirectMarker);", "update mobile redirect marker")
e2e = replace_once(
    e2e,
    '  await page.getByRole("button", { name: "$10", exact: true }).click();',
    '  await page.getByRole("button", { name: "$10" }).click();',
    "make Crowd ten-dollar selector tolerate decorative input-assist glyph",
)
e2e = replace_once(
    e2e,
    '  await page.getByRole("button", { name: "$5", exact: true }).click();',
    '  await page.getByRole("button", { name: "$5" }).click();',
    "make Crowd five-dollar selector tolerate decorative input-assist glyph",
)
e2e = replace_once(
    e2e,
    '  await page.getByRole("button", { name: "$25", exact: true }).click();',
    '  await page.getByRole("button", { name: "$25" }).click();',
    "make Crowd twenty-five-dollar selector tolerate decorative input-assist glyph",
)
e2e = replace_once(
    e2e,
    '    "https://moraltrade.org/create?mode=back",',
    '    "/create?source=walkthrough&mode=back",',
    "make career-backing route assertion match production shell rewrite",
)
e2e = replace_once(
    e2e,
    '    "https://moraltrade.org/pools",',
    '    "/discover?source=walkthrough&domain=pools&view=threshold",',
    "make conditional-pools route assertion match production shell rewrite",
)
write(e2e_path, e2e)

source_test = '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standalone = readFileSync(
  new URL("../public/moral-trade-interactive-walkthroughs.html", import.meta.url),
  "utf8",
);
const fallback = readFileSync(
  new URL("./components/walkthrough/immersive-walkthrough.tsx", import.meta.url),
  "utf8",
);

for (const [name, source] of [
  ["standalone production walkthrough", standalone],
  ["React fallback walkthrough", fallback],
] as const) {
  test(`${name} explains Donation Redirect amplification through a formal coalition`, () => {
    assert.match(source, /Redirect the matched \$20/);
    assert.match(source, /100 × 2\.1 days/);
    assert.match(source, /210 person-days · 30 person-weeks/);
    assert.match(source, /One member finds 99 close matches/);
    assert.match(source, /Future flourishing/);
    assert.match(source, /60 \/ 100/);
    assert.match(source, /Existential risk/);
    assert.match(source, /25 \/ 100/);
    assert.match(source, /Pre-agree the destination/);
    assert.match(source, /Vote after completion/);
    assert.match(source, /7-day window|7 days/);
    assert.match(source, /One \$10 bought 30 person-weeks of environmental action/);
  });
}
'''
source_test_path = ROOT / "src/walkthrough-donation-redirect-group-buying.test.ts"
if source_test_path.exists():
    raise RuntimeError("Donation Redirect source-contract test already exists")
source_test_path.write_text(source_test, encoding="utf-8")

# Final assertions catch accidental partial application.
for path in [component_path, html_path]:
    source = read(path)
    required = [
        "Redirect the matched $20",
        "100 × 2.1 days",
        "One member finds 99 close matches.",
        "Pre-agree the destination",
        "Vote after completion",
        "One $10 bought 30 person-weeks of environmental action.",
    ]
    for marker in required:
        if marker not in source:
            raise RuntimeError(f"{path}: missing required marker {marker!r}")

print("Donation Redirect group-buying walkthrough patch applied successfully.")

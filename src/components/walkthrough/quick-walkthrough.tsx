"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { getQuickBargain, QUICK_BARGAINS, QUICK_EXAMPLE, type QuickBargainId } from "@/lib/quick-walkthrough";

import "./quick-walkthrough.css";

type Step = 0 | 1 | 2;
const STEP_LABELS = ["See the exchange", "Find the mix", "Your next step"];

function Arrow({ both = false }: { both?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {both ? <><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" /></> : <path d="M4 12h16m-6-6 6 6-6 6" />}
    </svg>
  );
}

export function QuickWalkthrough({ createAction }: { createAction: ReactNode }) {
  const [step, setStep] = useState<Step>(0);
  const [withTrade, setWithTrade] = useState(true);
  const [selected, setSelected] = useState<QuickBargainId | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const bargain = getQuickBargain(selected);

  useEffect(() => {
    // Do not steal focus on first load; announce only a user-requested step change.
    if (moved.current) heading.current?.focus({ preventScroll: true });
  }, [step]);

  function goTo(next: Step) {
    moved.current = true;
    setStep(next);
  }

  return (
    <div className="mt-start-demo" data-testid="quick-walkthrough" data-step={step}>
      <div className="mt-start-progress">
        <ol aria-label="Introduction progress">
          {STEP_LABELS.map((label, index) => (
            <li key={label} aria-current={step === index ? "step" : undefined}>
              <span className="mt-start-step-number">{index + 1}</span><span>{label}</span>
            </li>
          ))}
        </ol>
        {step < 2 ? <button className="mt-start-skip" type="button" onClick={() => goTo(2)}>Skip the example <Arrow /></button> : null}
      </div>

      <div className="mt-start-title">
        <h1 ref={heading} tabIndex={-1}>
          {step === 0 ? "Different priorities. A better trade." : step === 1 ? "Find terms that work for both." : "Start with your own trade."}
        </h1>
        <p>{step === 0 ? "Help someone advance their priority. They help advance yours." : step === 1 ? "Try a proposal. An exchange only works when both prefer it to no trade." : "Offer something you can do. Ask for something that matters to you."}</p>
      </div>

      <p className="mt-start-demo-note"><span aria-hidden="true" className="mt-start-demo-dot" />Illustrative example. No payment or commitment is created.</p>

      {step === 0 ? (
        <>
          <div className="mt-start-comparison" role="group" aria-label="Compare with and without a trade">
            <button type="button" aria-pressed={!withTrade} onClick={() => setWithTrade(false)}>Without a trade</button>
            <button type="button" aria-pressed={withTrade} onClick={() => setWithTrade(true)}>With a trade</button>
          </div>
          <section className="mt-start-exchange" aria-label="Example exchange">
            <article className="mt-start-person">
              <div className="mt-start-person-heading"><span className="mt-start-initial" aria-hidden="true">Y</span><span>You, in this example</span></div>
              <h2>{QUICK_EXAMPLE.yourPriority}</h2>
              <p className="mt-start-priority">You want fewer factory-farmed meals.</p>
              <div className="mt-start-offer">
                <span>{withTrade ? "YOU OFFER" : "YOUR ORIGINAL PLAN"}</span>
                <h3>{withTrade ? QUICK_EXAMPLE.yourMove : "No additional donation"}</h3>
                <p>{withTrade ? "A contribution to Rae’s priority." : "Your existing plans stay the same."}</p>
              </div>
            </article>
            <span className="mt-start-exchange-connector"><Arrow both /></span>
            <article className="mt-start-person mt-start-person-other">
              <div className="mt-start-person-heading"><span className="mt-start-initial" aria-hidden="true">R</span><span>Rae, a fictional participant</span></div>
              <h2>{QUICK_EXAMPLE.theirPriority}</h2>
              <p className="mt-start-priority">Rae wants more support for poverty relief.</p>
              <div className="mt-start-offer">
                <span>{withTrade ? "RAE OFFERS" : "RAE’S ORIGINAL PLAN"}</span>
                <h3>{withTrade ? QUICK_EXAMPLE.theirMove : "No additional dietary change"}</h3>
                <p>{withTrade ? "A contribution to your priority." : "Rae’s existing plans stay the same."}</p>
              </div>
            </article>
          </section>
          <div className="mt-start-takeaway" role="status" aria-live="polite">
            <strong>{withTrade ? "Both get more of what they value." : "Neither additional contribution happens."}</strong>
            <p>{withTrade ? "In this example, both prefer the exchange. Neither needs to change their priorities." : "The comparison is with their actual plans—not a threat or a worse alternative invented to force a deal."}</p>
          </div>
          <p className="mt-start-baseline">{QUICK_EXAMPLE.noTrade}</p>
          <div className="mt-start-actions"><button className="mt-start-primary" type="button" onClick={() => goTo(1)}>Try different terms <Arrow /></button><Link className="mt-start-text-link" href="/discover" prefetch={false}>Browse trades instead</Link></div>
        </>
      ) : step === 1 ? (
        <>
          <div className="mt-start-bargains" role="group" aria-label="Compare example proposals">
            {QUICK_BARGAINS.map((option) => (
              <button className="mt-start-bargain" type="button" key={option.id} aria-pressed={selected === option.id} onClick={() => setSelected(option.id)}>
                <span className="mt-start-bargain-label">{option.label}<span className="mt-start-radio" aria-hidden="true" /></span>
                <span className="mt-start-bargain-side"><small>You donate to poverty relief</small><strong>{option.donation}</strong></span>
                <span className="mt-start-bargain-divider" />
                <span className="mt-start-bargain-side"><small>Rae eats vegetarian for</small><strong>{option.days}</strong></span>
              </button>
            ))}
          </div>
          <div className="mt-start-verdict" role="status" aria-live="polite" aria-atomic="true">
            {bargain ? <>
              <div className="mt-start-responses"><span data-agrees={bargain.youAgree}><b>{bargain.youAgree ? "✓" : "–"}</b> You {bargain.youAgree ? "would agree" : "would decline"}</span><span data-agrees={bargain.theyAgree}><b>{bargain.theyAgree ? "✓" : "–"}</b> Rae {bargain.theyAgree ? "would agree" : "would decline"}</span></div>
              <h2>{bargain.youAgree && bargain.theyAgree ? "A trade both would choose." : "This proposal does not work for both."}</h2>
              <p>{bargain.explanation}</p>
            </> : <><h2>What makes an exchange worthwhile?</h2><p>Select a proposal above to compare each person’s response.</p></>}
          </div>
          <p className="mt-start-baseline">Responses are part of this fictional example, not measurements of your preferences.</p>
          <div className="mt-start-actions"><button className="mt-start-primary" type="button" onClick={() => goTo(2)}>See your next steps <Arrow /></button><button className="mt-start-text-link" type="button" onClick={() => goTo(0)}>Back to the exchange</button></div>
        </>
      ) : (
        <>
          <section className="mt-start-next" aria-label="Your next step">
            <div><h2>A proposal, not a commitment.</h2><p>Set out what each person would do, the limits, and how you would check completion. Review the actual terms before agreeing.</p></div>
            <div className="mt-start-next-actions">{createAction}<Link className="mt-start-secondary" href="/discover" prefetch={false}>Browse trades <Arrow /></Link></div>
            <p className="mt-start-next-note">The example is not copied into your proposal. Opening the editor does not publish or accept a trade.</p>
          </section>
          <div className="mt-start-further">
            <Link href="/walkthrough" prefetch={false}>Explore the full walkthrough <Arrow /></Link>
            <p>See group funding, redirects, and more ways to trade.</p>
          </div>
          <details className="mt-start-other"><summary>Other ways to take part</summary><div><Link href="/donate" prefetch={false}>Make a donation</Link><Link href="/pools" prefetch={false}>Explore funding pools</Link><Link href="/profile" prefetch={false}>Adjust priorities in Profile</Link></div></details>
          <button className="mt-start-text-link mt-start-replay" type="button" onClick={() => { setSelected(null); setWithTrade(true); goTo(0); }}>Replay the example</button>
        </>
      )}
    </div>
  );
}

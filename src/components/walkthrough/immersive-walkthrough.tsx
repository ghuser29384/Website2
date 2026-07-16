"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";

type ConceptId = "two-moves" | "crowd" | "redirect" | "mix" | "match";
type OfferType = "Money" | "Time" | "A pledge";
type MixId = "one" | "two" | "three";

interface MatchDeal {
  counterpart: string;
  counterpartCause: string;
  yourMove: string;
  theirMove: string;
  youGet: string;
  theyGet: string;
}

interface OfferMatch {
  name: string;
  get: string;
  give: string;
}

const concepts = [
  {
    id: "two-moves" as const,
    short: "Third option",
    title: "The Third Option",
    caption: "A two-person exchange",
  },
  {
    id: "crowd" as const,
    short: "The crowd",
    title: "The Crowd",
    caption: "A threshold that wakes up together",
  },
  {
    id: "redirect" as const,
    short: "Redirect",
    title: "Redirect",
    caption: "Turn opposed spending into shared impact",
  },
  {
    id: "mix" as const,
    short: "Find the mix",
    title: "Find the Mix",
    caption: "Tune the terms until both say yes",
  },
  {
    id: "match" as const,
    short: "Your match",
    title: "Your Match",
    caption: "Marketplace discovery that starts with you",
  },
];

const guidedFlow: ConceptId[] = ["two-moves", "mix", "crowd", "redirect", "match"];

const causeOptions = [
  { name: "Wild animal suffering", tone: "moss" },
  { name: "Factory farming", tone: "apricot" },
  { name: "Global health", tone: "blue" },
  { name: "Climate", tone: "moss" },
  { name: "Existential risk", tone: "blue" },
  { name: "Future flourishing", tone: "sand" },
  { name: "S-risks", tone: "apricot" },
  { name: "Global poverty", tone: "sand" },
  { name: "Concentration of power", tone: "moss" },
  { name: "Priorities research", tone: "blue" },
  { name: "Biological risks", tone: "apricot" },
  { name: "AI safety", tone: "blue" },
  { name: "Space governance", tone: "sand" },
  { name: "Building altruism", tone: "moss" },
] as const;

const matchData: Record<string, MatchDeal> = {
  "Wild animal suffering": {
    counterpart: "Noor",
    counterpartCause: "Global health",
    yourMove: "Fund $20 of malaria prevention",
    theirMove: "Fund $20 of wild-animal welfare research",
    youGet: "More work reducing suffering in the wild",
    theyGet: "More malaria protection",
  },
  "Factory farming": {
    counterpart: "Rae",
    counterpartCause: "Global poverty",
    yourMove: "Send $20 through cash transfers",
    theirMove: "Eat vegetarian for 30 days",
    youGet: "Fewer factory-farmed meals",
    theyGet: "More income for a family in poverty",
  },
  "Global health": {
    counterpart: "Mina",
    counterpartCause: "Climate",
    yourMove: "Replace four short car trips",
    theirMove: "Fund $25 of malaria prevention",
    youGet: "More malaria protection",
    theyGet: "Fewer car emissions",
  },
  Climate: {
    counterpart: "Sam",
    counterpartCause: "Factory farming",
    yourMove: "Eat vegetarian for 30 days",
    theirMove: "Replace four car trips with transit",
    youGet: "Fewer car emissions",
    theyGet: "Fewer factory-farmed meals",
  },
  "Existential risk": {
    counterpart: "Asha",
    counterpartCause: "Global poverty",
    yourMove: "Send $25 through cash transfers",
    theirMove: "Fund $25 of catastrophic-risk research",
    youGet: "More work on civilization-scale risks",
    theyGet: "More income for a family in poverty",
  },
  "Future flourishing": {
    counterpart: "Leo",
    counterpartCause: "Factory farming",
    yourMove: "Eat vegetarian for 30 days",
    theirMove: "Fund $25 of future-generations policy",
    youGet: "More attention to future generations",
    theyGet: "Fewer factory-farmed meals",
  },
  "S-risks": {
    counterpart: "Noor",
    counterpartCause: "Global health",
    yourMove: "Fund $20 of malaria prevention",
    theirMove: "Fund $25 of severe-suffering research",
    youGet: "More work on severe future suffering",
    theyGet: "More malaria protection",
  },
  "Global poverty": {
    counterpart: "Jin",
    counterpartCause: "AI safety",
    yourMove: "Fund $25 of technical AI-safety research",
    theirMove: "Send $25 through cash transfers",
    youGet: "More income for a family in poverty",
    theyGet: "More technical AI-safety work",
  },
  "Concentration of power": {
    counterpart: "Mina",
    counterpartCause: "Climate",
    yourMove: "Replace eight car trips with transit",
    theirMove: "Fund $20 of open civic infrastructure",
    youGet: "More open civic infrastructure",
    theyGet: "Fewer car emissions",
  },
  "Priorities research": {
    counterpart: "Ari",
    counterpartCause: "Wild animal suffering",
    yourMove: "Fund $20 of wild-animal welfare research",
    theirMove: "Fund $25 of cause-prioritization research",
    youGet: "More cause-prioritization research",
    theyGet: "More work reducing suffering in the wild",
  },
  "Biological risks": {
    counterpart: "Rae",
    counterpartCause: "Global poverty",
    yourMove: "Send $25 through cash transfers",
    theirMove: "Fund $25 of pandemic prevention",
    youGet: "More pandemic prevention",
    theyGet: "More income for a family in poverty",
  },
  "AI safety": {
    counterpart: "Sam",
    counterpartCause: "Factory farming",
    yourMove: "Eat vegetarian for 30 days",
    theirMove: "Fund $25 of technical AI-safety research",
    youGet: "More technical AI-safety work",
    theyGet: "Fewer factory-farmed meals",
  },
  "Space governance": {
    counterpart: "Noor",
    counterpartCause: "Global health",
    yourMove: "Fund $20 of malaria prevention",
    theirMove: "Fund $25 of peaceful space governance",
    youGet: "More work on peaceful space rules",
    theyGet: "More malaria protection",
  },
  "Building altruism": {
    counterpart: "Mina",
    counterpartCause: "Climate",
    yourMove: "Replace eight car trips with transit",
    theirMove: "Recruit three new monthly donors",
    youGet: "More people acting to help",
    theyGet: "Fewer car emissions",
  },
};

const offerMatches: Record<OfferType, OfferMatch[]> = {
  Money: [
    { name: "Rae", get: "30 vegetarian days", give: "$20 to malaria prevention" },
    { name: "Omar", get: "8 transit commutes", give: "$25 to a clinic fund" },
    { name: "Lin", get: "3 hours of peer review", give: "$30 to open science" },
  ],
  Time: [
    { name: "Nia", get: "2 car-free weeks", give: "2 hours of clinic outreach" },
    { name: "Maya", get: "14 vegetarian days", give: "2 hours of tutoring" },
    { name: "Jo", get: "$25 to animal welfare", give: "2 hours of research help" },
  ],
  "A pledge": [
    { name: "Mina", get: "$25 to poverty relief", give: "7 vegetarian days" },
    { name: "Ari", get: "$20 to public health", give: "4 transit commutes" },
    { name: "Sam", get: "2 hours for climate data", give: "7 low-carbon days" },
  ],
};

function StepMark({ current, total }: { current: number; total: number }) {
  return (
    <div className="mtw-step-mark" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span className={index <= current ? "is-done" : ""} key={index} />
      ))}
    </div>
  );
}

function Burst({ count = 34 }: { count?: number }) {
  const colors = ["#526cff", "#657a5f", "#d88d64", "#e5c968"];

  return (
    <div className="mtw-success-burst" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count;
        const distance = 140 + (index % 7) * 28;
        const style = {
          "--x": `${Math.round(Math.cos(angle) * distance)}px`,
          "--y": `${Math.round(Math.sin(angle) * distance)}px`,
          "--delay": `${(index % 5) * 28}ms`,
          "--particle": colors[index % colors.length],
        } as CSSProperties;

        return <i key={index} style={style} />;
      })}
    </div>
  );
}

function CrowdDots({ growing }: { growing: boolean }) {
  const colors = ["#6f86df", "#e5c86f", "#7b9670", "#d88b65"];

  return (
    <div className={`mtw-crowd-field ${growing ? "is-growing" : ""}`} aria-hidden="true">
      {Array.from({ length: 118 }, (_, index) => {
        const style = {
          "--left": `${4 + ((index * 37) % 93)}%`,
          "--top": `${5 + ((index * 61) % 90)}%`,
          "--size": `${6 + (index % 4) * 2}px`,
          "--delay": `${(index % 24) * 45}ms`,
          "--dot-color": colors[index % colors.length],
        } as CSSProperties;

        return <i className={index === 52 ? "is-you" : ""} key={index} style={style} />;
      })}
    </div>
  );
}

function Portrait({ name }: { name: string }) {
  return (
    <svg role="img" aria-label={`Illustrated portrait of ${name}`} viewBox="0 0 300 300">
      <circle cx="150" cy="150" fill="#d9c6ae" r="132" />
      <path d="M64 272c14-64 47-94 87-94 45 0 76 30 88 94" fill="#536bc8" />
      <ellipse cx="151" cy="127" fill="#d89a73" rx="65" ry="76" />
      <path
        d="M89 113c1-66 37-91 75-88 38 3 66 31 61 85-25-2-39-14-52-38-17 26-43 40-84 41Z"
        fill="#282621"
      />
      <circle cx="126" cy="132" fill="#282621" r="4" />
      <circle cx="177" cy="132" fill="#282621" r="4" />
      <path
        d="M132 161c13 10 27 10 40 0"
        fill="none"
        stroke="#713f32"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle cx="249" cy="61" fill="#efe8dc" r="34" stroke="#1b1b17" />
      <text
        fill="#1b1b17"
        fontFamily="Georgia"
        fontSize="34"
        textAnchor="middle"
        x="249"
        y="72"
      >
        {name.charAt(0)}
      </text>
    </svg>
  );
}

function PrimaryAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="mtw-primary-action" type="button" onClick={onClick}>
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function ConversionDeck({
  onOpenCrowd,
  primary,
  redirectLabels = false,
  tradeCreateHref,
}: {
  onOpenCrowd: () => void;
  primary: "create" | "join" | "chip";
  redirectLabels?: boolean;
  tradeCreateHref: string;
}) {
  const items = [
    {
      id: "create" as const,
      title: redirectLabels ? "Offer" : "Create a trade",
      note: "Create a moral trade",
      href: tradeCreateHref,
    },
    {
      id: "join" as const,
      title: "Join a trade",
      note: "Find a deal worth taking",
      href: "/offers?view=live",
    },
    {
      id: "chip" as const,
      title: redirectLabels ? "Leverage $1" : "Chip in",
      note: "Others may donate if and only if you donate.",
      href: "/pools",
    },
  ];

  return (
    <div className="mtw-conversion-deck" aria-label="Choose what to do next">
      {items.map((item) => {
        const contents = (
          <>
            <span>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </span>
            <span aria-hidden="true">→</span>
          </>
        );

        if (redirectLabels && item.id === "chip") {
          return (
            <button
              className={`mtw-conversion-link ${item.id === primary ? "is-primary" : ""}`}
              key={item.id}
              type="button"
              onClick={onOpenCrowd}
            >
              {contents}
            </button>
          );
        }

        return (
          <Link
            className={`mtw-conversion-link ${item.id === primary ? "is-primary" : ""}`}
            href={item.href}
            key={item.id}
          >
            {contents}
          </Link>
        );
      })}
    </div>
  );
}

export function ImmersiveWalkthrough({ tradeCreateHref }: { tradeCreateHref: string }) {
  const [conceptId, setConceptId] = useState<ConceptId>("two-moves");
  const [step, setStep] = useState(0);
  const [cause, setCause] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [amount, setAmount] = useState<number | null>(null);
  const [crowdGrowing, setCrowdGrowing] = useState(false);
  const [sharedCause, setSharedCause] = useState<string | null>(null);
  const [mix, setMix] = useState<MixId | null>(null);
  const [offer, setOffer] = useState<OfferType | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const focusHeadingRef = useRef(true);

  const concept = concepts.find((item) => item.id === conceptId) ?? concepts[0];
  const deal = cause ? matchData[cause] : null;
  const matches = offer ? offerMatches[offer] : [];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimer();
    setStep(0);
    setCause(null);
    setMoves([]);
    setAmount(null);
    setCrowdGrowing(false);
    setSharedCause(null);
    setMix(null);
    setOffer(null);
    setSelectedMatch(null);
  }, [clearTimer]);

  const switchConcept = useCallback(
    (nextConcept: ConceptId, focusHeading = true) => {
      focusHeadingRef.current = focusHeading;
      resetState();
      setConceptId(nextConcept);
    },
    [resetState],
  );

  const moveThroughGuidedFlow = useCallback(
    (offset: number) => {
      const currentIndex = guidedFlow.indexOf(conceptId);
      const nextIndex = (currentIndex + offset + guidedFlow.length) % guidedFlow.length;
      switchConcept(guidedFlow[nextIndex]);
    },
    [conceptId, switchConcept],
  );

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (!focusHeadingRef.current) {
      focusHeadingRef.current = true;
      return;
    }

    const heading = stageRef.current?.querySelector<HTMLElement>("h1");
    heading?.focus({ preventScroll: true });
  }, [conceptId, step]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const toastTimer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(toastTimer);
  }, [toast]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        moveThroughGuidedFlow(1);
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        moveThroughGuidedFlow(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveThroughGuidedFlow]);

  const tabIndex = concepts.findIndex((item) => item.id === conceptId);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % concepts.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + concepts.length) % concepts.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = concepts.length - 1;
    if (nextIndex === index) return;

    event.preventDefault();
    switchConcept(concepts[nextIndex].id, false);
    window.setTimeout(() => {
      document.getElementById(`walkthrough-tab-${nextIndex}`)?.focus();
    }, 0);
  }

  function restart() {
    resetState();
    setToast("Experience restarted");
  }

  function wakeCrowd() {
    setStep(2);
    setCrowdGrowing(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timerRef.current = window.setTimeout(
      () => {
        setCrowdGrowing(false);
        setStep(3);
        timerRef.current = null;
      },
      reducedMotion ? 180 : 2300,
    );
  }

  function renderThirdOption() {
    if (step === 0) {
      return (
        <div className="mtw-scene mtw-cause-picker-scene">
          <StepMark current={0} total={4} />
          <div className="mtw-cause-sun" aria-hidden="true" />
          <div className="mtw-cause-intro">
            <div className="mtw-scene-prompt">Click one</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>What do you want more of?</h1>
            <p className="mtw-scene-line">
              Start with your values. Nobody will ask you to rank everyone else&apos;s.
            </p>
          </div>
          <div className="mtw-cause-grid" role="group" aria-label="Choose a cause">
            {causeOptions.map((item) => (
              <button
                className={`mtw-cause-choice is-${item.tone}`}
                key={item.name}
                type="button"
                onClick={() => {
                  setCause(item.name);
                  setStep(1);
                }}
              >
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (!deal || !cause) return null;

    if (step === 1) {
      return (
        <div className="mtw-scene mtw-meeting-scene">
          <StepMark current={1} total={4} />
          <div>
            <div className="mtw-scene-prompt">A different priority appears</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>You chose {cause.toLowerCase()}.</h1>
            <p className="mtw-scene-line">
              {deal.counterpart} cares most about {deal.counterpartCause.toLowerCase()}. You do not
              need to change each other&apos;s minds.
            </p>
            <PrimaryAction onClick={() => setStep(2)}>See what you can trade</PrimaryAction>
          </div>
          <div className="mtw-portrait-wrap">
            <Portrait name={deal.counterpart} />
            <div className="mtw-cause-stamp">{deal.counterpartCause}</div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      const isReady = moves.length === 2;
      const toggleMove = (move: string) => {
        setMoves((current) =>
          current.includes(move) ? current.filter((item) => item !== move) : [...current, move],
        );
      };

      return (
        <div className="mtw-scene">
          <StepMark current={2} total={4} />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Click both moves</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>The third option is a trade.</h1>
          </div>
          <div className={`mtw-move-board ${isReady ? "is-ready" : ""}`}>
            <button
              aria-pressed={moves.includes("you")}
              className="mtw-move-card"
              type="button"
              onClick={() => toggleMove("you")}
            >
              <span>Your move</span>
              <strong>{deal.yourMove}</strong>
              <small>{deal.counterpart} gets: {deal.theyGet}</small>
            </button>
            <div className="mtw-move-join" aria-hidden="true">↔</div>
            <button
              aria-pressed={moves.includes("them")}
              className="mtw-move-card"
              type="button"
              onClick={() => toggleMove("them")}
            >
              <span>{deal.counterpart}&apos;s move</span>
              <strong>{deal.theirMove}</strong>
              <small>You get: {deal.youGet}</small>
            </button>
          </div>
          <button
            className="mtw-primary-action"
            disabled={!isReady}
            type="button"
            onClick={() => setStep(3)}
          >
            <span>Make the trade</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      );
    }

    return (
      <div className="mtw-scene mtw-success-scene">
        <StepMark current={3} total={4} />
        <Burst />
        <div className="mtw-success-copy">
          <div className="mtw-scene-prompt">Better by both lights</div>
          <h1 className="mtw-scene-title" tabIndex={-1}>
            You didn&apos;t agree. You made more of both happen.
          </h1>
          <p className="mtw-scene-line">
            That is moral trade. Now find terms both people would actually accept.
          </p>
          <PrimaryAction onClick={() => switchConcept("mix")}>Continue to Find the Mix</PrimaryAction>
        </div>
      </div>
    );
  }

  function renderCrowd() {
    if (step === 0) {
      return (
        <div className="mtw-scene mtw-crowd-scene">
          <StepMark current={0} total={3} />
          <CrowdDots growing={false} />
          <div className="mtw-project-silhouette" aria-hidden="true" />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Choose your maximum</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              A shared good nobody can fund alone.
            </h1>
          </div>
          <div className="mtw-crowd-condition">
            <span>You donate if and only if 200 other people donate enough.</span>
            <span>If the threshold isn&apos;t reached, no one&apos;s donation gets donated.</span>
            <span>Your donation might be decisive for everyone&apos;s donation being donated.</span>
          </div>
          <div className="mtw-choice-row mtw-pledge-choices">
            {[5, 10, 25].map((value) => (
              <button
                className="mtw-choice"
                key={value}
                type="button"
                onClick={() => {
                  setAmount(value);
                  setStep(1);
                }}
              >
                <strong>${value}</strong>
              </button>
            ))}
          </div>
          <button
            className="mtw-crowd-alternative"
            type="button"
            onClick={() => switchConcept("match")}
          >
            <span>Offer trade</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="mtw-scene mtw-crowd-scene">
          <StepMark current={1} total={3} />
          <CrowdDots growing={false} />
          <div className="mtw-project-silhouette" aria-hidden="true" />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Your conditional donation is ready</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              It moves only if the crowd arrives.
            </h1>
            <p className="mtw-scene-line">
              Your maximum is ${amount}. If 200 other people do not donate enough, nobody&apos;s
              donation activates.
            </p>
            <div className="mtw-threshold-panel">
              <div className="mtw-threshold-top">
                <strong>0 / 200</strong>
                <span>other donors</span>
              </div>
              <div className="mtw-threshold-track" aria-label="0 of 200 other donors">
                <span className="mtw-threshold-fill" style={{ width: "0.5%" }} />
                <span className="mtw-threshold-line" />
              </div>
            </div>
            <PrimaryAction onClick={wakeCrowd}>Pledge conditionally</PrimaryAction>
          </div>
        </div>
      );
    }

    if (step === 2 && crowdGrowing) {
      return (
        <div className="mtw-scene mtw-crowd-scene mtw-crowd-success">
          <StepMark current={2} total={3} />
          <CrowdDots growing />
          <div className="mtw-project-silhouette" aria-hidden="true" />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">See how a threshold can cross</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              Your donation may have tipped the whole crowd.
            </h1>
            <div className="mtw-threshold-panel">
              <div className="mtw-threshold-top">
                <strong>200 / 200</strong>
                <span>other donors · every conditional donation activates</span>
              </div>
              <div className="mtw-threshold-track" aria-label="Illustration: 200 of 200 other donors">
                <span className="mtw-threshold-fill" style={{ width: "100%" }} />
                <span className="mtw-threshold-line" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mtw-scene mtw-success-scene mtw-crowd-success">
        <StepMark current={2} total={3} />
        <CrowdDots growing />
        <div className="mtw-project-silhouette" aria-hidden="true" />
        <div className="mtw-success-copy">
          <div className="mtw-scene-prompt">Threshold reached</div>
          <h1 className="mtw-scene-title" tabIndex={-1}>
            Pledge a little. Make the shared good possible.
          </h1>
          <p className="mtw-scene-line">
            Nobody had to care most. Everyone only had to care enough.
          </p>
          <ConversionDeck
            primary="chip"
            tradeCreateHref={tradeCreateHref}
            onOpenCrowd={() => switchConcept("crowd")}
          />
        </div>
      </div>
    );
  }

  function renderRedirect() {
    if (step === 0) {
      return (
        <div className="mtw-scene mtw-stream-stage">
          <StepMark current={0} total={3} />
          <div className="mtw-stream mtw-stream-a">
            <div className="mtw-stream-label"><strong>$100</strong><span>Democrats</span></div>
          </div>
          <div className="mtw-stream mtw-stream-b">
            <div className="mtw-stream-label"><strong>$100</strong><span>Republicans</span></div>
          </div>
          <div className="mtw-collision">Opposite<br />directions</div>
          <div className="mtw-stream-copy">
            <div className="mtw-scene-prompt">Click to intervene</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              Two donations. Pulling against each other.
            </h1>
            <PrimaryAction onClick={() => setStep(1)}>Pause the tug-of-war</PrimaryAction>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="mtw-scene">
          <StepMark current={1} total={3} />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Choose a shared destination</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              Where would both donors rather create $200 of impact?
            </h1>
          </div>
          <div className="mtw-shared-causes">
            {[
              ["+", "Malaria prevention"],
              ["⌁", "Disaster response"],
              ["✦", "Open science"],
            ].map(([icon, label]) => (
              <button
                className="mtw-shared-cause"
                key={label}
                type="button"
                onClick={() => {
                  setSharedCause(label);
                  setStep(2);
                }}
              >
                <span aria-hidden="true">{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="mtw-scene mtw-stream-stage is-redirected">
          <StepMark current={2} total={3} />
          <div className="mtw-stream mtw-stream-a">
            <div className="mtw-stream-label"><strong>$200</strong><span>matched amount</span></div>
          </div>
          <div className="mtw-stream mtw-stream-b" />
          <div className="mtw-redirect-target">
            <div><strong>$200</strong><span>to {sharedCause}</span></div>
          </div>
          <div className="mtw-stream-copy">
            <div className="mtw-scene-prompt">Same beliefs · same budget</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>
              Now the matched money moves together.
            </h1>
            <PrimaryAction onClick={() => setStep(3)}>See the result</PrimaryAction>
          </div>
        </div>
      );
    }

    return (
      <div className="mtw-scene mtw-success-scene">
        <StepMark current={2} total={3} />
        <Burst count={28} />
        <div className="mtw-success-copy">
          <div className="mtw-scene-prompt">Donation offset</div>
          <h1 className="mtw-scene-title" tabIndex={-1}>
            Keep your beliefs. Redirect the matched part.
          </h1>
          <p className="mtw-scene-line">
            Opposed donors can move the amount they match to something both value.
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
  }

  function renderMix() {
    const values = {
      one: { you: 84, them: 34, verdict: "Great for you. Sam would pass." },
      two: { you: 28, them: 88, verdict: "Great for Sam. You would pass." },
      three: { you: 72, them: 74, verdict: "Both say yes." },
    }[mix ?? "one"];
    const waiting = mix === null;

    return (
      <div className="mtw-scene mtw-mix-scene">
        <StepMark current={0} total={1} />
        <div className="mtw-equalizer" aria-hidden="true">
          {Array.from({ length: 55 }, (_, index) => (
            <i
              key={index}
              style={{
                "--height": `${18 + ((index * 19) % 76)}%`,
                "--speed": `${620 + (index % 7) * 120}ms`,
              } as CSSProperties}
            />
          ))}
        </div>
        <div className="mtw-mix-layout">
          <div>
            <div className="mtw-scene-prompt">Click a bargain</div>
            <h1 className="mtw-scene-title" tabIndex={-1}>Find the mix where both say yes.</h1>
            <div className="mtw-meters">
              {[
                ["You", waiting ? 50 : values.you, "#5368a5"],
                ["Sam", waiting ? 50 : values.them, "#c77f5f"],
              ].map(([label, value, color]) => {
                const numericValue = Number(value);
                return (
                  <div key={String(label)}>
                    <div className="mtw-meter-head">
                      <strong>{label}</strong>
                      <span>{waiting ? "Waiting" : numericValue > 50 ? "Yes" : "No"}</span>
                    </div>
                    <div className="mtw-meter-track">
                      <div
                        className="mtw-meter-fill"
                        style={{ width: `${numericValue}%`, background: String(color) }}
                      />
                      <span className="mtw-meter-mid" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mtw-mix-verdict" aria-live="polite">
              {waiting ? "Pick a bargain." : values.verdict}
            </div>
            {mix === "three" ? (
              <div className="mtw-mix-actions">
                <Link className="mtw-primary-action" href={tradeCreateHref}>
                  <span>Lock this deal</span><span aria-hidden="true">→</span>
                </Link>
                <button
                  className="mtw-mix-alternative"
                  type="button"
                  onClick={() => switchConcept("redirect")}
                >
                  Redirect ineffective donations.
                </button>
              </div>
            ) : null}
          </div>
          <div className="mtw-mixes">
            {[
              ["one", "A", "$5 to global health", "12 vegetarian months"],
              ["two", "B", "5% of income", "1 vegetarian month"],
              ["three", "C", "1% to global health", "12 vegetarian months"],
            ].map(([id, number, yourSide, theirSide]) => (
              <button
                aria-pressed={mix === id}
                className="mtw-mix-card"
                key={id}
                type="button"
                onClick={() => setMix(id as MixId)}
              >
                <span className="mtw-mix-number">{number}</span>
                <div className="mtw-mix-side"><span>You give</span><strong>{yourSide}</strong></div>
                <div className="mtw-mix-side"><span>Sam gives</span><strong>{theirSide}</strong></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderMatch() {
    if (step === 0) {
      return (
        <div className="mtw-scene mtw-match-scene">
          <StepMark current={0} total={3} />
          <div className="mtw-match-orbit" aria-hidden="true" />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Click what feels easy to offer</div>
            <h1 className="mtw-scene-title is-sans" tabIndex={-1}>
              What could you happily put on the table?
            </h1>
          </div>
          <div className="mtw-choice-row mtw-offer-choices">
            {[
              ["Money", "$", "A bounded donation or payment", "blue"],
              ["Time", "◷", "Useful work, help, or review", "moss"],
              ["A pledge", "✓", "A concrete action for a set time", "apricot"],
            ].map(([label, icon, note, tone]) => (
              <button
                className={`mtw-choice is-${tone}`}
                key={label}
                type="button"
                onClick={() => {
                  setOffer(label as OfferType);
                  setStep(1);
                }}
              >
                <span className="mtw-choice-icon" aria-hidden="true">{icon}</span>
                <strong>{label}</strong>
                <small>{note}</small>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="mtw-scene mtw-match-scene">
          <StepMark current={1} total={3} />
          <div className="mtw-scene-head">
            <div className="mtw-scene-prompt">Three illustrative trades</div>
            <h1 className="mtw-scene-title is-sans" tabIndex={-1}>
              Someone may want exactly what you can offer.
            </h1>
          </div>
          <div className="mtw-match-stack">
            {matches.map((item, index) => (
              <button
                aria-pressed={selectedMatch === index}
                className="mtw-match-card"
                key={`${item.name}-${item.get}`}
                type="button"
                onClick={() => setSelectedMatch(index)}
              >
                <span className="mtw-avatar-mini" aria-hidden="true">{item.name.charAt(0)}</span>
                <div className="mtw-match-name">{item.name}</div>
                <div className="mtw-match-exchange">
                  <div><span>You get</span><strong>{item.get}</strong></div>
                  <div><span>You offer</span><strong>{item.give}</strong></div>
                </div>
                <small>Illustrative match</small>
              </button>
            ))}
          </div>
          {selectedMatch !== null ? (
            <PrimaryAction onClick={() => setStep(2)}>Open this match</PrimaryAction>
          ) : null}
        </div>
      );
    }

    const selected = selectedMatch === null ? null : matches[selectedMatch];
    if (!selected) return null;

    return (
      <div className="mtw-scene mtw-success-scene mtw-match-scene">
        <StepMark current={2} total={3} />
        <div className="mtw-match-success-visual" aria-hidden="true" />
        <div className="mtw-success-copy">
          <div className="mtw-scene-prompt">Your possible match · {selected.name}</div>
          <h1 className="mtw-scene-title is-sans" tabIndex={-1}>
            The market starts with one thing you can offer.
          </h1>
          <p className="mtw-scene-line">
            You get {selected.get.toLowerCase()}. You offer {selected.give.toLowerCase()}.
          </p>
          <ConversionDeck
            primary="join"
            tradeCreateHref={tradeCreateHref}
            onOpenCrowd={() => switchConcept("crowd")}
          />
        </div>
      </div>
    );
  }

  let scene: ReactNode;
  if (conceptId === "two-moves") scene = renderThirdOption();
  else if (conceptId === "crowd") scene = renderCrowd();
  else if (conceptId === "redirect") scene = renderRedirect();
  else if (conceptId === "mix") scene = renderMix();
  else scene = renderMatch();

  return (
    <main className="mtw-shell" id="main-content">
      <header className="mtw-labbar">
        <Link aria-label="Moral Trade, home" className="mtw-brand" href="/">
          <MoralTradeWordmark />
        </Link>
        <div className="mtw-concept-switcher" role="tablist" aria-label="Interactive walkthroughs">
          {concepts.map((item, index) => (
            <button
              aria-controls="walkthrough-panel"
              aria-selected={item.id === conceptId}
              className="mtw-concept-tab"
              id={`walkthrough-tab-${index}`}
              key={item.id}
              role="tab"
              tabIndex={item.id === conceptId ? 0 : -1}
              type="button"
              onClick={() => switchConcept(item.id, false)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{item.short}</span>
            </button>
          ))}
        </div>
        <button className="mtw-icon-button" type="button" aria-label="Restart this experience" onClick={restart}>
          ↻
        </button>
      </header>

      <div className="mtw-simulation-note">
        Interactive walkthrough · no payment or commitment is created here
      </div>

      <section
        aria-labelledby={`walkthrough-tab-${tabIndex}`}
        className="mtw-experience"
        data-concept={conceptId}
        id="walkthrough-panel"
        ref={stageRef}
        role="tabpanel"
      >
        {scene}
      </section>

      <footer className="mtw-labfooter">
        <button className="mtw-footer-button" type="button" onClick={() => moveThroughGuidedFlow(-1)}>
          ← Previous
        </button>
        <div className="mtw-concept-caption" aria-live="polite">
          <strong>{concept.title}</strong>
          <span>{concept.caption}</span>
        </div>
        <button className="mtw-footer-button" type="button" onClick={() => moveThroughGuidedFlow(1)}>
          Next →
        </button>
      </footer>

      <div className={`mtw-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}

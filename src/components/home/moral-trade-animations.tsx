import type { ReactNode } from "react";
import Link from "next/link";

type MoralTradeScene =
  | "reciprocal"
  | "prudential"
  | "pure"
  | "intrapersonal"
  | "bargained"
  | "lottery"
  | "sidePayment"
  | "market";

const animationCards: ReadonlyArray<{
  alt: string;
  id: string;
  href: string;
  scene: MoralTradeScene;
  summary: string;
  title: string;
  typeLabel: string;
}> = [
  {
    id: "reciprocal-mixed",
    href: "/offers/examples/reciprocal-mixed",
    scene: "reciprocal",
    typeLabel: "A. Reciprocal mixed trade",
    title: "Two sacrifices become two moral gains",
    summary:
      "Victoria gives on income, Paul gives on diet, and each side sees the other action as worth more than their own cost.",
    alt:
      "Two labeled parties exchange offer cards over a bridge while moral meters rise and prudential meters dip slightly.",
  },
  {
    id: "moral-for-prudential",
    href: "/offers/examples/moral-for-prudential",
    scene: "prudential",
    typeLabel: "B. Moral-for-prudential trade",
    title: "An incentive buys a behavior change",
    summary:
      "One participant pays for an act they value morally while the counterparty receives a prudential gain.",
    alt:
      "Amber payment packets travel from a wallet to a behavior target, changing the target from old habit to adopted pledge.",
  },
  {
    id: "pure-opposed-cause",
    href: "/offers/examples/pure-opposed-cause",
    scene: "pure",
    typeLabel: "C. Pure opposed-cause trade",
    title: "Opposed efforts redirect into a shared good",
    summary:
      "Resources that would cancel each other move into a compromise destination both parties judge better.",
    alt:
      "Two opposed campaign arrows collide, fade, and reroute into a central shared reservoir that fills upward.",
  },
  {
    id: "intrapersonal",
    href: "/offers/examples/intrapersonal",
    scene: "intrapersonal",
    typeLabel: "D. Intrapersonal trade",
    title: "A divided self finds a better bundle",
    summary:
      "Prudential desire and moral concern reorganize into one action package that improves both internal ledgers.",
    alt:
      "Two halves of one person converge as offset rings unlock a route line and two internal value meters rise.",
  },
  {
    id: "bargained-coordination",
    href: "/offers/examples/bargained-coordination",
    scene: "bargained",
    typeLabel: "E. Bargained coordination",
    title: "Repeated structure recovers blocked gains",
    summary:
      "A one-shot project is unacceptable to one side, but alternation across rounds can make cooperation feasible.",
    alt:
      "A Pareto map shows a default point, two project points, and a weekly alternation strip averaging the deal space.",
  },
  {
    id: "lottery-mediated",
    href: "/offers/examples/lottery-mediated",
    scene: "lottery",
    typeLabel: "F. Lottery-mediated trade",
    title: "Chance creates a bridge certainty cannot",
    summary:
      "A probability marker slides along the arc between projects until the randomized option enters the win-win region.",
    alt:
      "A purple probability arc connects two project points while a marker moves into the acceptable upper-right zone.",
  },
  {
    id: "side-payment",
    href: "/offers/examples/side-payment",
    scene: "sidePayment",
    typeLabel: "G. Side-payment trade",
    title: "Compensation reshapes the feasible set",
    summary:
      "Side payments move the active deal point across the acceptability boundary without pretending values agree.",
    alt:
      "Amber compensation packets move along diagonal lines and push a deal point into the mutually acceptable quadrant.",
  },
  {
    id: "market-mediated",
    href: "/offers/examples/market-mediated",
    scene: "market",
    typeLabel: "H. Market-mediated trade",
    title: "A clearing layer scales moral barter",
    summary:
      "Offers, ratios, receipts, and residual unmatched flows turn single trades into an auditable matching network.",
    alt:
      "A network board batches order rows into matched nodes while escrow and reputation markers pulse beside residual orders.",
  },
];

function SceneLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`moral-animation-label ${className}`}>{children}</span>;
}

function Meter({
  className = "",
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <span className={`moral-animation-meter ${className}`} aria-hidden="true">
      <span />
      <small>{label}</small>
    </span>
  );
}

function ReciprocalScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-reciprocal">
      <SceneLabel className="moral-animation-cause moral-animation-cause-top">
        Animal welfare
      </SceneLabel>
      <SceneLabel className="moral-animation-cause moral-animation-cause-bottom">
        Global poverty
      </SceneLabel>
      <span className="moral-animation-actor moral-animation-actor-left">
        <strong>Victoria</strong>
        <small>poverty first</small>
      </span>
      <span className="moral-animation-actor moral-animation-actor-right">
        <strong>Paul</strong>
        <small>animals first</small>
      </span>
      <span className="moral-animation-offer moral-animation-offer-left">1% income</span>
      <span className="moral-animation-offer moral-animation-offer-right">vegetarian</span>
      <span className="moral-animation-bridge" />
      <span className="moral-animation-token moral-animation-token-left moral-animation-token-square" />
      <span className="moral-animation-token moral-animation-token-right moral-animation-token-circle" />
      <Meter className="moral-animation-meter-left" label="moral" />
      <Meter className="moral-animation-meter-right" label="moral" />
      <Meter className="moral-animation-meter-prudential-left" label="cost" />
      <Meter className="moral-animation-meter-prudential-right" label="cost" />
    </div>
  );
}

function PrudentialScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-prudential">
      <SceneLabel className="moral-animation-wallet">moral agent</SceneLabel>
      <span className="moral-animation-wallet-pocket" />
      <SceneLabel className="moral-animation-behavior-target">habit target</SceneLabel>
      <SceneLabel className="moral-animation-counterparty">prudential gain</SceneLabel>
      <span className="moral-animation-token moral-animation-payment-token moral-animation-payment-token-1" />
      <span className="moral-animation-token moral-animation-payment-token moral-animation-payment-token-2" />
      <span className="moral-animation-token moral-animation-payment-token moral-animation-payment-token-3" />
      <span className="moral-animation-habit-before">old habit</span>
      <span className="moral-animation-habit-after">adopted pledge</span>
      <span className="moral-animation-halo" />
      <Meter className="moral-animation-prudential-meter" label="prudential" />
    </div>
  );
}

function PureScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-pure">
      <SceneLabel className="moral-animation-opposed moral-animation-opposed-left">
        Campaign A
      </SceneLabel>
      <SceneLabel className="moral-animation-opposed moral-animation-opposed-right">
        Campaign B
      </SceneLabel>
      <span className="moral-animation-arrow moral-animation-arrow-left" />
      <span className="moral-animation-arrow moral-animation-arrow-right" />
      <span className="moral-animation-cancel-pulse">cancel</span>
      <span className="moral-animation-reservoir">
        <strong>shared aid</strong>
        <span />
      </span>
      <span className="moral-animation-token moral-animation-reroute-left" />
      <span className="moral-animation-token moral-animation-reroute-right" />
      <Meter className="moral-animation-pure-meter-left" label="party A" />
      <Meter className="moral-animation-pure-meter-right" label="party B" />
    </div>
  );
}

function IntrapersonalScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-intrapersonal">
      <span className="moral-animation-self moral-animation-self-left">
        <strong>desire</strong>
        <small>travel</small>
      </span>
      <span className="moral-animation-self moral-animation-self-right">
        <strong>concern</strong>
        <small>climate</small>
      </span>
      <span className="moral-animation-route">
        <span />
      </span>
      <span className="moral-animation-route-label">route unlocked</span>
      <span className="moral-animation-offset-ring moral-animation-offset-ring-one" />
      <span className="moral-animation-offset-ring moral-animation-offset-ring-two" />
      <span className="moral-animation-plane">plane</span>
      <Meter className="moral-animation-internal-meter-left" label="prudential" />
      <Meter className="moral-animation-internal-meter-right" label="moral" />
    </div>
  );
}

function BargainedScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-bargained">
      <span className="moral-animation-axis moral-animation-axis-x" />
      <span className="moral-animation-axis moral-animation-axis-y" />
      <SceneLabel className="moral-animation-axis-label moral-animation-axis-label-x">
        party 1
      </SceneLabel>
      <SceneLabel className="moral-animation-axis-label moral-animation-axis-label-y">
        party 2
      </SceneLabel>
      <span className="moral-animation-default-point">default</span>
      <span className="moral-animation-graph-point moral-animation-point-a">A</span>
      <span className="moral-animation-graph-point moral-animation-point-b">B</span>
      <span className="moral-animation-feasible-zone">win-win zone</span>
      <div className="moral-animation-calendar" aria-hidden="true">
        <span>A</span>
        <span>B</span>
        <span>A</span>
        <span>B</span>
      </div>
      <span className="moral-animation-average-line" />
    </div>
  );
}

function LotteryScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-lottery">
      <span className="moral-animation-axis moral-animation-axis-x" />
      <span className="moral-animation-axis moral-animation-axis-y" />
      <span className="moral-animation-default-point">default</span>
      <span className="moral-animation-graph-point moral-animation-lottery-a">A</span>
      <span className="moral-animation-graph-point moral-animation-lottery-b">B</span>
      <span className="moral-animation-feasible-zone">feasible</span>
      <svg className="moral-animation-lottery-arc" viewBox="0 0 320 180" aria-hidden="true">
        <path d="M54 130 C104 30 224 30 276 130" />
      </svg>
      <span className="moral-animation-lottery-marker" />
      <span className="moral-animation-lottery-weight">weighted draw</span>
      <span className="moral-animation-spinner" />
    </div>
  );
}

function SidePaymentScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-side-payment">
      <span className="moral-animation-axis moral-animation-axis-x" />
      <span className="moral-animation-axis moral-animation-axis-y" />
      <span className="moral-animation-default-point">default</span>
      <span className="moral-animation-graph-point moral-animation-side-a">project</span>
      <span className="moral-animation-feasible-zone">acceptable</span>
      <span className="moral-animation-compensation-line moral-animation-compensation-line-one" />
      <span className="moral-animation-compensation-line moral-animation-compensation-line-two" />
      <span className="moral-animation-token moral-animation-payment-packet moral-animation-payment-packet-one" />
      <span className="moral-animation-token moral-animation-payment-packet moral-animation-payment-packet-two" />
      <span className="moral-animation-deal-point">deal</span>
    </div>
  );
}

function MarketScene() {
  return (
    <div className="moral-animation-scene moral-animation-scene-market">
      <div className="moral-animation-order-book" aria-hidden="true">
        <span>offer</span>
        <span>ratio</span>
        <span>match</span>
      </div>
      <span className="moral-animation-market-node moral-animation-market-node-one">A</span>
      <span className="moral-animation-market-node moral-animation-market-node-two">B</span>
      <span className="moral-animation-market-node moral-animation-market-node-three">C</span>
      <span className="moral-animation-market-node moral-animation-market-node-four">D</span>
      <span className="moral-animation-market-line moral-animation-market-line-one" />
      <span className="moral-animation-market-line moral-animation-market-line-two" />
      <span className="moral-animation-market-line moral-animation-market-line-three" />
      <SceneLabel className="moral-animation-market-engine">clearing layer</SceneLabel>
      <SceneLabel className="moral-animation-market-escrow">receipt</SceneLabel>
      <SceneLabel className="moral-animation-market-residual">residual</SceneLabel>
    </div>
  );
}

function renderScene(scene: MoralTradeScene) {
  switch (scene) {
    case "reciprocal":
      return <ReciprocalScene />;
    case "prudential":
      return <PrudentialScene />;
    case "pure":
      return <PureScene />;
    case "intrapersonal":
      return <IntrapersonalScene />;
    case "bargained":
      return <BargainedScene />;
    case "lottery":
      return <LotteryScene />;
    case "sidePayment":
      return <SidePaymentScene />;
    case "market":
      return <MarketScene />;
  }
}

export function MoralTradeAnimations() {
  return (
    <section className="section section-white moral-animation-section" id="moral-trade-animations">
      <div className="section-head">
        <p className="eyebrow">Animated typology</p>
        <h2>Eight moral trade types, in motion</h2>
        <p>
          The suite turns Ord&apos;s pure, mixed, intrapersonal, bargaining, lottery,
          side-payment, and market mechanisms into short web-native motion diagrams with labels,
          shapes, and reduced-motion fallbacks.
        </p>
      </div>

      <div className="moral-animation-controls">
        <input
          className="sr-only moral-animation-pause-input"
          id="moral-animation-pause"
          type="checkbox"
        />
        <label className="button button-secondary button-mini moral-animation-pause" htmlFor="moral-animation-pause">
          <span aria-hidden="true" className="moral-animation-pause-icon" />
          <span className="moral-animation-pause-copy">Pause motion</span>
          <span className="moral-animation-resume-copy">Resume motion</span>
        </label>

        <div className="moral-animation-grid">
          {animationCards.map((card) => (
            <Link
              aria-label={`Create ${card.typeLabel.replace(/^[A-H]\. /, "")}`}
              className="panel moral-animation-card"
              href={card.href}
              key={card.id}
            >
              <div
                aria-label={card.alt}
                className={`moral-animation-frame moral-animation-frame-${card.scene}`}
                role="img"
              >
                {renderScene(card.scene)}
              </div>
              <div className="moral-animation-card-copy">
                <p className="detail-kicker">{card.typeLabel}</p>
                <h3>{card.title}</h3>
                <p className="moral-animation-card-summary">{card.summary}</p>
                <span className="moral-animation-card-action">Create this trade</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

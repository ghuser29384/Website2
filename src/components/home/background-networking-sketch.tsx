import Link from "next/link";

const networkingLayers = [
  {
    title: "Wish profiles",
    text: "Individuals or collectives record hopes, capabilities, asks, constraints, verification preferences, and uncertainty notes.",
  },
  {
    title: "Semi-private registry",
    text: "Broad previews and cause tags can be searched while exact wishes, identity details, and sensitive constraints stay gated.",
  },
  {
    title: "Rule-based scans",
    text: "For now, matches come from explicit fields: shared causes, payment or pledge compatibility, and stated first-step boundaries.",
  },
  {
    title: "Consent-gated introductions",
    text: "A potential match becomes actionable only after notification, opt-in, and a bounded proposal with burden, duration, evidence, and exit terms.",
  },
] as const;

const privacyControls = [
  "Manual source notes only; no automatic social, email, or chatbot ingestion",
  "Strict, broad, and limited preview stages",
  "Mutual consent before identity-specific wish details are revealed",
  "Safety filters for coercion, harassment, illegal asks, and exploitation",
] as const;

const feasibilityTracks = [
  {
    title: "Privacy without total opacity",
    text: "Broad previews, field-level grants, and match-scoped consent keep exact wishes hidden while still leaving enough surface area for review and abuse prevention.",
  },
  {
    title: "Portable before decentralised",
    text: "Profile export and explicit source records make the registry easier to move later, even while the first prototype stays centralised and simple.",
  },
  {
    title: "Cold-start niches",
    text: "Saved searches, network invite drafts, and collectives let early users focus on smaller communities before a general-purpose market has density.",
  },
  {
    title: "Speculative incentives",
    text: "Brokerage bounties record willingness to pay for useful matches without charging automatically or pretending speculative coordination is already priced.",
  },
] as const;

const participationModes = [
  {
    title: "Passive delegate mode",
    text: "You can log consented source connections, import scope, and review rules for blogs, email archives, chatbot logs, search profiles, or other records without importing raw data yet.",
  },
  {
    title: "Proactive wish mode",
    text: "If you want to steer the search directly, the interview and dashboard let you write explicit wishes, asks, capabilities, constraints, and verification terms in your own words.",
  },
  {
    title: "Collective mode",
    text: "Existing groups can open a collective profile, add delegated members, and record approvals so background networking can represent a real team instead of a single spokesperson.",
  },
] as const;

const milestoneRows = [
  {
    label: "Built now",
    items: [
      "explicit wish profile",
      "manual source consent ledger",
      "broad registry search",
      "non-AI delegate heartbeats",
      "consent-gated first-step plans",
    ],
  },
  {
    label: "Kept out for now",
    items: [
      "automatic account ingestion",
      "LLM wish synthesis",
      "chatbot interviewing",
      "auto-sent introductions",
      "unbounded private data search",
    ],
  },
] as const;

export function BackgroundNetworkingSketch({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="section section-white background-networking-section" id="background-networking">
      <div className="section-head">
        <p className="eyebrow">Background networking</p>
        <h2>A non-AI sketch for finding possible counterparties in the background</h2>
        <p>
          Moral trade needs people to find one another before they can bargain. This version turns
          the Forethought design sketch into a cautious marketplace of profiles, searches, alerts,
          and first-step proposals without ingesting private feeds or adding AI synthesis yet.
        </p>
      </div>

      <div className="background-networking-grid">
        <div className="network-sketch panel" aria-label="Diagram of background networking flow">
          <div className="network-node network-node-principal network-node-left">
            <span className="network-node-label">You</span>
            <span className="network-node-detail">values, asks, capabilities</span>
          </div>
          <div className="network-node network-node-helper">
            <span className="network-node-label">Helper market</span>
            <span className="network-node-detail">non-AI scans and filters</span>
          </div>
          <div className="network-node network-node-principal network-node-right">
            <span className="network-node-label">Counterparty</span>
            <span className="network-node-detail">broad preview first</span>
          </div>
          <div className="network-node network-node-registry">
            <span className="network-node-label">Wish registry</span>
            <span className="network-node-detail">semi-private searchable fields</span>
          </div>
          <div className="network-node network-node-proposal">
            <span className="network-node-label">First proposal</span>
            <span className="network-node-detail">action, duration, proof, exit</span>
          </div>

          <span className="network-line network-line-left" />
          <span className="network-line network-line-right" />
          <span className="network-line network-line-down" />
          <span className="network-line network-line-up" />
          <span className="network-pulse network-pulse-left" />
          <span className="network-pulse network-pulse-right" />
          <span className="network-pulse network-pulse-down" />
          <span className="network-pulse network-pulse-up" />
        </div>

        <div className="network-copy-panel">
          <div className="networking-layer-list">
            {networkingLayers.map((layer, index) => (
              <article className="panel networking-layer-card" key={layer.title}>
                <span className="flow-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{layer.title}</h3>
                  <p>{layer.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="networking-actions">
            <Link className="button button-primary" href={isAuthenticated ? "/dashboard" : "/signup"}>
              {isAuthenticated ? "Open background scans" : "Create a wish profile"}
            </Link>
            <Link className="button button-secondary" href="/dashboard">
              Review consent gates
            </Link>
          </div>
        </div>
      </div>

      <div className="privacy-callout panel">
        <div>
          <p className="detail-kicker">Privacy-first constraints</p>
          <h3>The prototype is deliberately less powerful than the full AI idea</h3>
          <p>
            The sketch in the article imagines attentive helpers distilling many sensitive sources.
            This site keeps the first milestone narrower: explicit wish profiles, manual notes,
            rule-based matching, and consent-gated reveal.
          </p>
        </div>
        <ul className="clean-list">
          {privacyControls.map((control) => (
            <li key={control}>{control}</li>
          ))}
        </ul>
      </div>

      <div className="networking-roadmap panel">
        <div>
          <p className="detail-kicker">Participation modes</p>
          <h3>Individuals, collectives, and delegates can all enter the network</h3>
          <p>
            The original sketch allows passive background help as well as deliberate wish entry.
            This prototype exposes both shapes without turning on automatic ingestion yet.
          </p>
        </div>
        <div className="networking-roadmap-rows">
          {participationModes.map((mode) => (
            <div className="networking-roadmap-row" key={mode.title}>
              <strong>{mode.title}</strong>
              <p>{mode.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="networking-feasibility-grid" aria-label="Background networking feasibility plan">
        {feasibilityTracks.map((track) => (
          <article className="panel networking-feasibility-card" key={track.title}>
            <h3>{track.title}</h3>
            <p>{track.text}</p>
          </article>
        ))}
      </div>

      <div className="networking-roadmap panel">
        <div>
          <p className="detail-kicker">Implementation boundary</p>
          <h3>Move toward background networking without pretending the AI layer is ready</h3>
          <p>
            The article points toward personalised helpers, synthesis, and interviews. This
            prototype first makes the institutional surface visible: what can be searched, what can
            be revealed, who can consent, and what counts as a serious first step.
          </p>
        </div>
        <div className="networking-roadmap-rows">
          {milestoneRows.map((row) => (
            <div className="networking-roadmap-row" key={row.label}>
              <strong>{row.label}</strong>
              <ul className="clean-list">
                {row.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

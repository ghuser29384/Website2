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
    </section>
  );
}

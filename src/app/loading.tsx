const loadingRecoverySteps = [
  {
    label: "No state change",
    text: "This fallback does not submit drafts, disclose counterparties, or change review status.",
  },
  {
    label: "Public route",
    text: "Contract pages, examples, and standards should render without private account data.",
  },
  {
    label: "Recovery path",
    text: "If a route cannot finish, the error boundary offers retry and safe public navigation.",
  },
] as const;

export default function Loading() {
  return (
    <div className="page-shell">
      <main
        className="section section-white state-page route-state-page"
        id="main-content"
        tabIndex={-1}
      >
        <div className="section-head">
          <p className="eyebrow">Preparing route</p>
          <h1>Preparing the requested view.</h1>
          <p>
            Public Moral Trade routes are expected to resolve into server-rendered content,
            validator JSON, or a recoverable route error state.
          </p>
        </div>

        <div aria-label="Route loading safeguards" className="route-state-grid">
          {loadingRecoverySteps.map((step, index) => (
            <article className="route-state-card" key={step.label}>
              <span className="route-state-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="loading-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </main>
    </div>
  );
}

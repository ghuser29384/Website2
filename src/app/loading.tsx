export default function Loading() {
  return (
    <div className="page-shell">
      <main className="section section-white state-page" id="main-content" tabIndex={-1}>
        <div className="section-head">
          <p className="eyebrow">Loading</p>
          <h1>Loading Moral Trade.</h1>
          <p>Opening the requested workflow.</p>
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

export default function Loading() {
  return (
    <div className="page-shell">
      <main className="section section-white state-page">
        <div className="section-head">
          <p className="eyebrow">Loading</p>
          <h1>Preparing the latest public records.</h1>
          <p>
            Offers, profiles, and wish previews may take a moment when the database is warming up.
          </p>
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

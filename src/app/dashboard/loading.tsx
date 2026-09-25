export default function DashboardLoading() {
  return (
    <div className="page-shell dashboard-page marketplace-app-shell">
      <main id="main-content" tabIndex={-1} aria-busy="true">
        <section className="v72-private-surface v72-account-surface" aria-labelledby="account-heading">
          <div className="v72-owner-strip">
            <h1 id="account-heading">Account</h1>
            <p>Account — saved settings and records.</p>
          </div>
          <div className="v72-account-header panel" role="status" aria-live="polite">
            Loading your dashboard…
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="page-shell dashboard-page marketplace-app-shell">
      <main id="main-content" tabIndex={-1} aria-busy="true">
        <div className="v72-account-header panel" role="status" aria-live="polite">
          Loading your profile…
        </div>
      </main>
    </div>
  );
}

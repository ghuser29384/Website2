export default function PaymentSettingsLoading() {
  return <main aria-busy="true" aria-label="Payment settings" style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
    <h1>Payment methods & receiving</h1>
    <p role="status">Loading payment settings…</p>
  </main>;
}

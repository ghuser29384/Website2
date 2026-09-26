// Explicitly opt-in, loopback-only test records. Never imported by application code.
export function createCommitmentsLayoutFixture() {
  let scenario = "empty";
  const user = "fa100000-0000-4000-8000-000000000630";
  const other = "fa100000-0000-4000-8000-000000000631";
  const agreementId = "fa100000-0000-4000-8000-000000000701";
  function reply(response, status, value) {
    response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify(value));
  }
  return {
    handle(request, response, url) {
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
        throw new Error("Commitments layout fixtures require loopback.");
      }
      if (request.method === "POST" && url.pathname === "/__fixture/reset") scenario = "empty";
      // The parent server checks the fixture control secret before reaching this.
      if (request.method === "POST" && url.pathname === "/__fixture/commitments-layout") {
        const next = url.searchParams.get("scenario");
        if (!["empty", "populated", "partial"].includes(next)) {
          reply(response, 400, { message: "Unsupported layout scenario" });
        } else {
          scenario = next;
          reply(response, 200, { scenario });
        }
        return true;
      }
      if (scenario === "empty" || request.method !== "GET") return false;
      const at = new Date().toISOString();
      if (scenario === "partial" && url.pathname === "/rest/v1/donation_offset_matches") {
        reply(response, 503, { message: "Layout fixture: redirects unavailable", code: "FIXTURE_UNAVAILABLE" });
        return true;
      }
      if (url.pathname === "/rest/v1/agreements") {
        reply(response, 200, [{
          id: agreementId, offer_id: null, proposer_id: user, responder_id: other,
          status: "active", completion_state: "pending", privacy_scope: "Private to participants",
          source: "Layout QA: a longer commitment description to exercise wrapping without truncating the participant’s terms.",
          created_at: at, updated_at: at, challenge_window_ends_at: null,
        }]);
        return true;
      }
      if (url.pathname === "/rest/v1/agreement_payments") {
        reply(response, 200, [
          { id: "layout-usd", currency: "USD", amount_cents: 125000, authorization_status: "authorization_pending" },
          { id: "layout-eur", currency: "EUR", amount_cents: 7000, authorization_status: "authorized" },
        ].map((payment) => ({
          ...payment, agreement_id: agreementId, payer_id: user, status: "pending",
          created_at: at, updated_at: at, paid_at: null, authorization_expires_at: null,
        })));
        return true;
      }
      return false;
    },
  };
}

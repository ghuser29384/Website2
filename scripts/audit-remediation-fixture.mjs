// Loopback-only, opt-in test adapter. Never imported by application code.
const USER_ID = "fa100000-0000-4000-8000-000000000630";
const OTHER_ID = "fa100000-0000-4000-8000-000000000631";
const agreementId = "fa200000-0000-4000-8000-000000000001";
const offerId = "fa300000-0000-4000-8000-000000000001";
let state = "empty";

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type":"application/json", "cache-control":"no-store", ...headers });
  response.end(JSON.stringify(body));
}

export function auditFixture(request, response, url) {
  if (process.env.AUTH_RESOLUTION_AUDIT_FIXTURE !== "1") return false;
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname)) throw new Error("Audit fixture must be loopback-only");
  if (url.pathname === "/__fixture/reset") state = "empty";
  if (url.pathname === "/__fixture/audit-state" && request.method === "POST") {
    // The parent server has already checked the control-secret header.
    const next = url.searchParams.get("state");
    if (!["empty", "populated", "partial", "cart-unavailable", "unavailable", "offers", "budget-unavailable"].includes(next)) {
      send(response,400,{message:"Unknown audit fixture state"}); return true;
    }
    state = next; send(response,200,{state}); return true;
  }
  if (request.method !== "GET" || !url.pathname.startsWith("/rest/v1/")) return false;
  const table = url.pathname.slice("/rest/v1/".length);
  if ((state === "partial" && table === "donation_offset_matches") || (state === "cart-unavailable" && table === "offer_carts") ||
      (state === "unavailable" && table === "agreements") || (state === "budget-unavailable" && table === "donation_offset_offers")) {
    send(response,503,{message:"Deliberate isolated source failure"}); return true;
  }
  if (["populated","partial","cart-unavailable"].includes(state) && table === "agreements") {
    send(response,200,[{id:agreementId, offer_id:null, proposer_id:USER_ID, responder_id:OTHER_ID,
      status:"active",completion_state:"open", created_at:"2026-09-20T12:00:00Z",updated_at:"2026-09-21T12:00:00Z",
      proposer_completed_at:null,responder_completed_at:null,completed_at:null,notes:"Synthetic agreement for audit QA only"}]);return true;
  }
  if (["populated","partial","cart-unavailable"].includes(state) && table === "agreement_payments") {
    send(response,200,[{id:"usd-fixture",agreement_id:agreementId,payer_id:USER_ID,amount_cents:1250,currency:"USD",status:"pending",authorization_status:"authorized",created_at:"2026-09-20T12:00:00Z"},
      {id:"eur-fixture",agreement_id:agreementId,payer_id:USER_ID,amount_cents:2000,currency:"EUR",status:"pending",authorization_status:"authorized",created_at:"2026-09-20T12:00:00Z"}]);return true;
  }
  if (["offers", "budget-unavailable"].includes(state) && table === "offers") {
    const row = {id:offerId,owner_id:OTHER_ID,owner_alias:"Audit fixture owner",mode:"offset",status:"open",
      offered_cause:"Education",requested_cause:"Health",offer_action:"Maker will donate $25",request_action:"Respondent will contribute $10",
      compromise_cause:"Health",notes:"Shared pool cap $500. Fixture only.",verification:"receipt required after completion",duration:"30 days",discount_note:"",
      trust_level:0,offer_impact:1,min_counterparty_impact:1,created_at:"2026-09-20T12:00:00Z",updated_at:"2026-09-20T12:00:00Z"};
    const owner = url.searchParams.get("owner_id");
    const rows = owner === `eq.${USER_ID}` ? [] : [row];
    send(response,200,rows,{"content-range":`0-${Math.max(0,rows.length-1)}/${rows.length}`});return true;
  }
  if (state === "offers" && table === "donation_offset_offers") {
    send(response,200,[{offer_id:offerId,requested_matching_amount_cents:1000,time_horizon:"one_off",participation_mode:"direct"}]);return true;
  }
  return false;
}

// Ephemeral completion-only PostgREST adapter. Not imported by application code.
// Synthetic identities and data only; no forwarding or persistence outside memory.
export const USER_ID = "fa100000-0000-4000-8000-000000000630";
export const OTHER_ID = "fa100000-0000-4000-8000-000000000631";
export const AGREEMENT_ID = "fa200000-0000-4000-8000-000000000871";
export const VERSION_ID = "fa200000-0000-4000-8000-000000000872";
let state;
let events;
let failNext;
let fixtureMode = "legacy";
const MILESTONE_ID="fa200000-0000-4000-8000-000000000874";
const REVIEW_ID="fa200000-0000-4000-8000-000000000875";
const PAYOUT_ID="fa200000-0000-4000-8000-000000000876";
const date = "2026-09-29T12:00:00.000Z";
function reset(mode = "legacy") {
  fixtureMode = mode;
  const completed = ["completed","milestone-completed"].includes(mode);
  state = {
    agreement: {id:AGREEMENT_ID, proposer_id:USER_ID, responder_id:OTHER_ID, offer_id:null,
      current_version_id:VERSION_ID,status: completed ? "completed" : "active",lifecycle_status:completed ? "completed" : "active",
      activated_at:date,completed_at:completed ? date : null,evidence_due_at:date,created_at:date,updated_at:date},
    confirmations: ["first-confirmation","milestone-completed"].includes(mode) ? [] : [{agreement_id:AGREEMENT_ID,user_id:OTHER_ID,confirmed_at:date}],
    notifications:[],coreEvents:[],outbox:[],feedback:null,
  };
  events=[];
  failNext = mode === "confirmation-failure" ? "POST:trade_completion_confirmations" : mode === "agreement-failure" ? "PATCH:agreements" : null;
}
reset();
function send(res,status,body,headers={}) {
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*",...headers});
  res.end(body === undefined ? undefined : JSON.stringify(body));
}
function rows(res,req,data) {
  const accept=req.headers.accept ?? "";
  send(res,200,req.method === "HEAD" ? undefined : accept.includes("vnd.pgrst.object") ? (data[0] ?? null) : data,
    {"content-range": data.length ? `0-${data.length-1}/${data.length}` : "*/0"});
}
async function body(req) { let value=""; for await(const chunk of req) value+=chunk; return value ? JSON.parse(value) : {}; }
function matches(row,url) {
  for(const [field,filter] of url.searchParams) {
    if(["select","order","limit","offset","on_conflict","or"].includes(field))continue;
    if(filter.startsWith("eq.") && String(row[field]) !== filter.slice(3))return false;
    if(filter.startsWith("in.(") && !filter.slice(4,-1).split(",").includes(String(row[field])))return false;
    if(filter.startsWith("neq.") && String(row[field]) === filter.slice(4))return false;
  }
  return true;
}
export async function completionFixture(req,res,url) {
  if(url.pathname === "/__fixture/reset") reset();
  if(url.pathname === "/__fixture/completion-state" && req.method === "POST") {
    const mode=url.searchParams.get("mode") ?? "legacy";
    if(!["legacy","first-confirmation","confirmation-failure","agreement-failure","completed","milestone-completed"].includes(mode)){send(res,400,{message:"Unknown mode"});return true;}
    reset(mode); send(res,200,{mode,agreementId:AGREEMENT_ID});return true;
  }
  if(url.pathname === "/__fixture/completion-state" && req.method === "GET") {
    send(res,200,{...state,events,failNext});return true;
  }
  if(!url.pathname.startsWith("/rest/v1/"))return false;
  const table=url.pathname.slice("/rest/v1/".length);
  const key=`${req.method}:${table}`;
  const data = ["POST","PATCH"].includes(req.method) ? await body(req) : null;
  const event={sequence:events.length+1,method:req.method,table,query:Object.fromEntries(url.searchParams),body:data};
  events.push(event);
  if(failNext===key) {
    failNext=null;event.result="injected_failure";
    send(res,503,{code:"fixture_failure",message:`Synthetic ${table} write failed`});return true;
  }
  if(table === "rpc/get_safe_profile_labels_v1") {rows(res,req,[{id:USER_ID,display_name:"Completion QA"},{id:OTHER_ID,display_name:"Synthetic counterpart"}]);return true;}
  if(table.startsWith("rpc/")) {rows(res,req,[]);return true;}
  if(req.method === "GET" || req.method === "HEAD") {
    let result=[];
    if(table === "agreements") result=[state.agreement];
    if(table === "profiles") result=[USER_ID,OTHER_ID].map(id=>({id,email:"completion-smoke@qa.invalid",display_name:"Completion QA",username:"completion-smoke-qa",bio:"",city:"",country:"",public_location_granularity:"hidden",region:"",created_at:date,updated_at:date}));
    if(table === "trade_agreement_versions") result=[{id:VERSION_ID,agreement_id:AGREEMENT_ID,version:1,proposed_by:USER_ID,proposed_action:"Synthetic reciprocal action A",requested_action:"Synthetic reciprocal action B",duration:"One day",start_date:date,evidence_due_date:date,evidence_rule:"One accepted synthetic evidence record",maximum_burden:"No money or real obligations",no_trade_baseline:"No synthetic action",privacy_scope:"Private QA only",exit_conditions:"Either party may end the synthetic test",terms_hash:"synthetic-completion-smoke-only",requires_milestone_manifest:false,milestone_manifest_hash:null,created_at:date}];
    if(table === "trade_agreement_confirmations") result=[USER_ID,OTHER_ID].map(user_id=>({agreement_version_id:VERSION_ID,user_id,confirmed_at:date}));
    if(table === "trade_evidence_items") result=[{id:"fa200000-0000-4000-8000-000000000873",agreement_id:AGREEMENT_ID,submitted_by:USER_ID,status:"accepted",evidence_type:"note",storage_path:null,created_at:date,updated_at:date,body:"Synthetic accepted evidence"}];
    if(fixtureMode === "milestone-completed") {
      if(table === "trade_agreement_versions") result=result.map(row=>({...row,requires_milestone_manifest:true,milestone_manifest_hash:"synthetic-manifest"}));
      if(table === "trade_evidence_items") result=[];
      if(table === "trade_agreement_milestones") result=[{id:MILESTONE_ID,agreement_id:AGREEMENT_ID,agreement_version_id:VERSION_ID,position:1,performer_id:USER_ID,payer_id:OTHER_ID,status:"graded",description:"Synthetic completed non-financial milestone",action_category:"other",evidence_rule:"Synthetic finalized review",indivisible:true,units_total:1,unit_label:"task",currency:"USD",maximum_amount_cents:0,final_review_id:REVIEW_ID,created_at:date,updated_at:date}];
      if(table === "trade_milestone_reviews") result=[{id:REVIEW_ID,milestone_id:MILESTONE_ID,is_final:true,outcome:"graded",completion_units:1,confidence_band:100,private_reason:"Synthetic final QA review only",created_at:date}];
      if(table === "trade_milestone_payouts") result=[{id:PAYOUT_ID,milestone_id:MILESTONE_ID,is_final:true,amount_due_cents:0,payout_basis_points:10000,status:"not_due",created_at:date}];
    }
    if(table === "trade_completion_confirmations") result=state.confirmations;
    if(table === "trade_notifications") result=state.notifications;
    if(table === "recommendation_outcome_feedback") result=state.feedback ? [state.feedback] : [];
    rows(res,req,result.filter(row=>matches(row,url)));return true;
  }
  if(table === "guest_interests" && req.method === "PATCH") {event.result="no_rows";send(res,200,[]);return true;}
  if(table === "trade_completion_confirmations" && req.method === "POST") {
    if(data.agreement_id !== AGREEMENT_ID || ![USER_ID,OTHER_ID].includes(data.user_id)){send(res,400,{message:"Unexpected synthetic identity"});return true;}
    state.confirmations=state.confirmations.filter(row=>row.user_id!==data.user_id).concat(data);
    event.result="persisted";send(res,201,null);return true;
  }
  if(table === "agreements" && req.method === "PATCH") {
    const match=matches(state.agreement,url);
    if(match) Object.assign(state.agreement,data);
    event.result=match ? "persisted" : "no_rows";
    rows(res,req,match ? [{id:AGREEMENT_ID}] : []);return true;
  }
  if(table === "trade_notifications" && req.method === "POST") {
    if(state.notifications.some(row=>row.dedupe_key===data.dedupe_key)){send(res,409,{code:"23505",message:"duplicate"});return true;}
    const inserted={id:`synthetic-notification-${state.notifications.length+1}`,...data};state.notifications.push(inserted);event.result="persisted";rows(res,req,[{id:inserted.id}]);return true;
  }
  if(table === "core_loop_events" && req.method === "POST") {
    if(!state.coreEvents.some(row=>row.idempotency_key===data.idempotency_key))state.coreEvents.push(data);
    event.result="persisted";send(res,201,null);return true;
  }
  if(table === "email_outbox" && req.method === "POST") {state.outbox.push(data);event.result="persisted";send(res,201,null);return true;}
  if(table === "recommendation_outcome_feedback" && req.method === "POST") {state.feedback=data;event.result="persisted";send(res,201,null);return true;}
  event.result="unexpected_write_rejected";
  send(res,400,{message:`Unsupported synthetic write ${key}`});return true;
}

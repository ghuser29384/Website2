export function coFundSnapshot(){return {
 sourceStatus:'live',checkedAt:'2026-10-24T00:00:00Z',openCycleCount:1,
 routes:[{id:'synthetic-cofund',publicKey:'synthetic-cofund',title:'Synthetic education Co-Fund',summary:'Synthetic fixture only',causeArea:'Education',recipientName:'Synthetic recipient',intervention:'Synthetic learning materials',verificationSummary:'Synthetic review',expectedEffect:'Synthetic educational benefit',timeline:'2027',statusLabel:'Open',statusSentence:'Synthetic open cycle',fundingMode:'pledge_only',currency:'USD',minimumFundingCents:1000,targetFundingCents:10000,deadlineAt:'2027-11-01T00:00:00Z',failureBehavior:'No real collection',href:'/moral-goods-group-buying/synthetic-cofund'}],
 financial:{currency:'USD',liveMandateCount:0,openMandateCount:0,openConditionalExposureCents:0,grossChargedCents:0,refundedCents:0,netChargedCents:0,transferredCents:0,activeRecurringCommitmentCount:0,activeRecurringMonthlyCents:0,latestFinancialActivityAt:null},
 paymentReadiness:{status:'unavailable',passedGateCount:0,pendingGateCount:0,blockedGateCount:0,totalGateCount:0,gates:[]}
};}
export async function handleCoFundRpc(request,{available=true}={}){
 const u=new URL(request.url);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.pathname!=='/rest/v1/rpc/get_public_group_buying_snapshot'||u.search||request.method!=='POST')throw Error('Only synthetic read-only snapshot RPC allowed');
 const body=await request.text();if(body.length>256)throw Error('Unexpected RPC arguments');const args=JSON.parse(body||'{}');if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length)throw Error('Unexpected RPC arguments');
 return available?Response.json(coFundSnapshot()):Response.json({message:'Synthetic source unavailable'},{status:503});
}

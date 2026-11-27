import assert from "node:assert/strict";
import {simulateProtectedSubmission as submit} from "../cloudflare/guesty-nonblocking-submission-candidate.js";
const id="1234567890abcdef12345678",requestId="request-001",attemptId="attempt-001",claimToken="claim-001";
function fixture(){
 let claimed=false,calls=0,audits=0;
 const record={request_id:requestId,guesty_quote_id:id,property_id:"listing",check_in:"2027-01-18",check_out:"2027-01-20",guests:6,quote_currency:"CAD",quote_total_cents:10000};
 const db={prepare(sql){return {bind(...args){return {sql,args,first:async()=>record,run:async()=>{audits++;return {success:true,meta:{changes:1}}}}}}},async batch(){if(claimed)return [{success:true,results:[]},{success:true,meta:{changes:0}}];claimed=true;return [{success:true,results:[{request_id:requestId,guesty_sync_claim_token:claimToken}]},{success:true,meta:{changes:1}}]}};
 const input={db,requestId,attemptId,claimToken,now:0,authorization:{offlineSimulation:true,approvedForDatabaseClaim:true,approvedRequestId:requestId,approvedAttemptId:attemptId},guest:{firstName:"Test",lastName:"Guest",email:"test@example.com",phones:["+14165550100"]},quote:{status:"valid",_id:id,unitTypeId:"listing",checkInDateLocalized:record.check_in,checkOutDateLocalized:record.check_out,guestsCount:6,expiresAt:"2027-01-01T00:00:00Z",rates:{ratePlans:[{ratePlan:{_id:"default-rateplan-id",money:{currency:"CAD",invoiceItems:[{amount:100}]}}}]}},simulateTransport:async body=>{calls++;assert.equal(body.status,"inquiry");return {status:200,body:{_id:id}}}};
 return {input,counts:()=>({calls,audits})};
}
let f=fixture();
const results=await Promise.all([submit(f.input),submit(f.input)]);
assert.equal(results.filter(x=>x.state==="manual_review").length,1);
assert.equal(results.filter(x=>x.state==="blocked").length,1);
assert.deepEqual(f.counts(),{calls:1,audits:1});
f=fixture();f.input.simulateTransport=async()=>{throw Error("timeout")};
assert.equal((await submit(f.input)).state,"uncertain");
assert.equal((await submit(f.input)).state,"blocked");
f=fixture();f.input.authorization.offlineSimulation=false;
assert.equal((await submit(f.input)).state,"blocked");assert.deepEqual(f.counts(),{calls:0,audits:0});
f=fixture();f.input.quote.guestsCount=7;
assert.equal((await submit(f.input)).state,"blocked");assert.deepEqual(f.counts(),{calls:0,audits:0});
console.log("PASS: protected submission simulation");

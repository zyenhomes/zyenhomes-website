import assert from "node:assert/strict";
import {runTrustedMock as run} from "../cloudflare/guesty-nonblocking-trusted-candidate.js";
const id="1234567890abcdef12345678";
function fixture(){
 let claims=0,sends=0;
 const record={request_id:"request-001",property_id:"116-tyrolean",guesty_quote_id:id,guest_name:"Test Guest",guest_email:"test@example.com",guest_phone:"+14165550100",check_in:"2027-01-18",check_out:"2027-01-20",guests:6,quote_currency:"CAD",quote_total_cents:10000};
 const quote={_id:id,unitTypeId:"6914041adf75040043bc8ed8",checkInDateLocalized:record.check_in,checkOutDateLocalized:record.check_out,guestsCount:6,expiresAt:"2027-01-01T00:00:00Z",rates:{ratePlans:[{ratePlan:{_id:"default-rateplan-id",money:{currency:"CAD",invoiceItems:[{amount:100}]}}}]}};
 const db={prepare(){return {bind(){return {first:async()=>record,run:async()=>({success:true,meta:{changes:1}})}}}},async batch(){claims++;return [{success:true,results:[{request_id:record.request_id,guesty_sync_claim_token:"claim-001"}]},{success:true,meta:{changes:1}}]}};
 const input={env:{GUESTY_TEST_MODE:"mock",GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true",GUESTY_ISOLATED_APPROVAL_JSON:JSON.stringify({requestId:record.request_id,attemptId:"attempt-001",quoteId:id,expiresAt:quote.expiresAt})},db,requestId:record.request_id,attemptId:"attempt-001",claimToken:"claim-001",now:0,readQuote:async()=>quote,transport:async(url,opts)=>{sends++;assert.equal(JSON.parse(opts.body).guest.email,record.guest_email);return {status:200,json:async()=>({_id:id})}}};
 return {input,record,quote,counts:()=>[claims,sends]};
}
let f=fixture();assert.equal((await run(f.input)).state,"manual_review");assert.deepEqual(f.counts(),[1,1]);
for(const mutate of [f=>f.record.property_id="unknown",f=>f.quote.unitTypeId="wrong",f=>f.record.guest_name="Single",f=>f.record.guesty_quote_id="wrong",f=>f.input.readQuote=async()=>{throw Error("read failed")}]){f=fixture();mutate(f);assert.equal((await run(f.input)).state,"blocked");assert.deepEqual(f.counts(),[0,0]);}
console.log("PASS: trusted input boundary");

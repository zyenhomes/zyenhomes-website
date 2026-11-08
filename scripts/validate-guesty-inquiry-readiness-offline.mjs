import assert from "node:assert/strict";
import {checkGuestyInquiryReadiness} from "../cloudflare/guesty-inquiry-readiness.js";
let tokenCalls=0,dbReads=0,writes=0;
const db={prepare(sql){
 dbReads++;
 assert.match(sql,/^PRAGMA (table_info|index_list)\(booking_requests\)$/);
 return {all:async()=>sql.includes("table_info")?{results:[
  "guesty_quote_id","guesty_sync_claim_token","request_idempotency_key","request_payload_fingerprint"
 ].map(name=>({name}))}:{results:[{name:"idx_booking_requests_idempotency_key",unique:1}]}};
}};
const env={BOOKING_REQUESTS_ENABLED:"false",GUESTY_INQUIRY_WRITES_ENABLED:"false",
 GUESTY_OPEN_API_AUTH_ENABLED:"true",GUESTY_OPEN_API_CLIENT_ID:"test-id",
 GUESTY_OPEN_API_CLIENT_SECRET:"test-secret"};
const tokenTransport=async(url,opts)=>{
 tokenCalls++;
 assert.match(url,/oauth2\/token$/);
 assert.match(opts.body,/scope=open-api/);
 return {ok:true,json:async()=>({access_token:"secret-test-token",expires_in:86400})};
};
const r=await checkGuestyInquiryReadiness({env,db,tokenTransport});
assert.equal(r.readyForControlledWrite,false);
assert.equal(r.authenticated,true);
assert.equal(r.requiresExplicitLiveWriteApproval,true);
assert.ok(r.blockers.includes("quote_cross_api_contract_unverified"));
assert.ok(r.blockers.includes("inquiry_write_permission_unverified"));
assert.ok(r.blockers.includes("reconciliation_not_ready"));
assert.equal(tokenCalls,1);
assert.equal(dbReads,2);
assert.equal(writes,0);
assert.ok(!JSON.stringify(r).includes("secret-test-token"));
const failed=await checkGuestyInquiryReadiness({env:{...env,BOOKING_REQUESTS_ENABLED:"true",
 GUESTY_INQUIRY_WRITES_ENABLED:"true"},db:{prepare(){throw Error("private")}},tokenTransport:async()=>{throw Error("private")}});
assert.equal(failed.readyForControlledWrite,false);
assert.ok(failed.blockers.includes("booking_request_gate_not_confirmed_disabled"));
assert.ok(failed.blockers.includes("guesty_write_gate_not_disabled"));
assert.ok(failed.blockers.includes("database_schema_unverified"));
assert.ok(!JSON.stringify(failed).includes("private"));
console.log("PASS: read-only inquiry readiness preflight reports blockers without live writes or secret exposure.");

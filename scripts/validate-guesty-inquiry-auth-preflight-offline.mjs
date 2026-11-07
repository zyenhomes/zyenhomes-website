import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessInquiryPreflight } from "./guesty-inquiry-auth-preflight-offline.mjs";

const record = {
  guestyQuoteId:"6adb5d7320cb330ec34a3507",
  listingId:"6abf9b85caf2480012c82479",
  guestySyncStatus:"pending", guestyReference:null
};
const guest = {firstName:"Jane",lastName:"Test",email:"jane@example.invalid",phones:["+14165550101"]};
const checks = {quoteOwnershipVerified:true,quoteFreshnessVerified:true,claimAndAuditVerified:true,reconciliationReady:true};
const openApiAuth = {credentialType:"guesty_open_api",openApiWritePermissionVerified:true};
const base = {record,guest,checks,auth:openApiAuth};
const valid = assessInquiryPreflight(base);
assert.equal(valid.readyForLiveWrite,false);
assert.deepEqual(valid.missing,[]);
assert.equal(valid.payloadPreview.status,"inquiry");
assert.equal(valid.payloadPreview.reservedUntil,-1);
assert.equal("email" in valid.payloadPreview,false);
assert.equal(assessInquiryPreflight({...base,auth:{credentialType:"booking_engine",openApiWritePermissionVerified:true}}).missing.includes("open_api_write_permission"),true);
assert.equal(assessInquiryPreflight({...base,record:{...record,guestyQuoteId:null}}).missing.includes("server_saved_quote_id"),true);
assert.equal(assessInquiryPreflight({...base,record:{...record,guestySyncStatus:"uncertain"}}).missing.includes("unsynchronized_pending_request"),true);
assert.equal(assessInquiryPreflight({...base,checks:{...checks,reconciliationReady:false}}).missing.includes("deduplication_and_reconciliation"),true);
assert.equal(assessInquiryPreflight({...base,guest:{...guest,phones:["4165550101"]}}).missing.includes("validated_guest_payload"),true);
const worker=readFileSync("cloudflare/worker.js","utf8");
assert.match(worker,/scope: "booking_engine:api"/);
assert.doesNotMatch(worker,/guesty-inquiry-auth-preflight-offline\.mjs/);
console.log("PASS: Open API write credentials are distinct from Booking Engine OAuth; preflight never enables writes.");

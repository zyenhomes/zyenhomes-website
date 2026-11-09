import assert from "node:assert/strict";
import {diagnoseQuoteContract} from "../cloudflare/guesty-quote-contract-diagnostic.js";
const expected={quoteId:"a".repeat(24),listingId:"b".repeat(24),checkIn:"2027-01-18",checkOut:"2027-01-20",guests:6};
const quote={_id:expected.quoteId,unitTypeId:expected.listingId,checkInDateLocalized:expected.checkIn,
 checkOutDateLocalized:expected.checkOut,guestsCount:6,status:"valid",
 createdAt:"2026-11-09T12:00:00Z",expiresAt:"2026-11-10T12:00:00Z",
 guest:{email:"private@example.com"},access_token:"private-secret"};
const now=Date.parse("2026-11-09T15:00:00Z");
const pass=diagnoseQuoteContract(quote,expected,now);
assert.equal(pass.verified,true);assert.equal(pass.writeAuthorized,false);
assert.equal(pass.fieldsPresent.unitTypeId,true);
const {status:removedStatus,...withoutStatus}=quote;
const optional=diagnoseQuoteContract(withoutStatus,expected,now);
assert.equal(optional.fieldsPresent.status,false);
assert.equal(optional.fieldsMatch.status,true);
assert.equal(optional.verified,true);
assert.equal(diagnoseQuoteContract({...withoutStatus,expiresAt:"2026-11-09T14:00:00Z"},expected,now).verified,false);
assert.equal(diagnoseQuoteContract({...withoutStatus,createdAt:"2026-11-10T12:00:00Z"},expected,now).verified,false);
const failed=diagnoseQuoteContract({...quote,unitTypeId:"c".repeat(24),status:"draft"},expected,now);
assert.equal(failed.verified,false);assert.equal(failed.fieldsMatch.listingId,false);
assert.equal(failed.fieldsMatch.status,false);
const serialized=JSON.stringify(failed);
assert.ok(!serialized.includes("private@example.com")&&!serialized.includes("private-secret"));
assert.ok(!serialized.includes(expected.quoteId)&&!serialized.includes(expected.listingId));
const invalid=diagnoseQuoteContract(null,expected,now);
assert.equal(invalid.verified,false);assert.equal(invalid.shape,"invalid");
console.log("PASS: read-only contract diagnostics report only boolean field presence/matches; no raw values.");

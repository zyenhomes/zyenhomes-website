import assert from "node:assert/strict";
import { fingerprintBookingRequest, canonicalBookingRequestFields } from "./guesty-booking-request-idempotency-offline.mjs";
const request = {
  propertyId: "149-tyrolean", name: "Jane Test", email: "JANE@example.invalid",
  phone: "+14165550101", checkIn: "2027-01-14", checkOut: "2027-01-18",
  guests: 6, message: "Please advise", marketingConsent: false
};
const hash = await fingerprintBookingRequest(request);
assert.match(hash, /^[a-f0-9]{64}$/);
assert.equal(await fingerprintBookingRequest({...request, email: " jane@example.invalid ", quoteId: "attacker", status: "confirmed", total: 1}),hash);
assert.equal(await fingerprintBookingRequest({...request, name: " Jane Test "}),hash);
for (const changes of [
  {checkOut: "2027-01-19"}, {guests: 7}, {propertyId: "105-pilsen"},
  {email: "someone@example.invalid"}, {marketingConsent: true},
  {message: "different"}
]) assert.notEqual(await fingerprintBookingRequest({...request,...changes}),hash);
assert.deepEqual(Object.keys(canonicalBookingRequestFields(request)),[
  "propertyId","name","email","phone","checkIn","checkOut","guests","message","marketingConsent"
]);
await assert.rejects(fingerprintBookingRequest({...request,guests:"6"}));
await assert.rejects(fingerprintBookingRequest({...request,marketingConsent:"false"}));
console.log("PASS: deterministic offline booking request fingerprint excludes untrusted quote/pricing fields.");

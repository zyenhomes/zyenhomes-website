import assert from "node:assert/strict";
import { planBookingRequestIdempotency, BOOKING_REQUEST_IDEMPOTENCY_SCHEMA } from "./guesty-booking-request-idempotency-offline.mjs";
const key = "request_key_12345678901234567890";
const fingerprint = "a".repeat(64);
const plan = planBookingRequestIdempotency({requestKey:key,payloadFingerprint:fingerprint});
assert.equal(plan.accepted,false);
assert.equal(plan.reason,"database_unique_constraint_not_verified");
assert.equal(plan.onDuplicateDifferentFingerprint,"reject_conflict");
assert.match(plan.onDuplicateSameFingerprint,/without_new_quote_or_guesty_write/);
assert.match(plan.onUncertainDatabaseResult,/no_automatic_retry/);
assert.match(BOOKING_REQUEST_IDEMPOTENCY_SCHEMA,/CREATE UNIQUE INDEX/);
assert.match(BOOKING_REQUEST_IDEMPOTENCY_SCHEMA,/request_idempotency_key/);
for (const bad of ["", "short", "has spaces and punctuation!", null, undefined])
  assert.equal(planBookingRequestIdempotency({requestKey:bad,payloadFingerprint:fingerprint}).accepted,false);
for (const bad of ["", "abc", "g".repeat(64), null])
  assert.equal(planBookingRequestIdempotency({requestKey:key,payloadFingerprint:bad}).accepted,false);
assert.equal(planBookingRequestIdempotency({requestKey:key,payloadFingerprint:fingerprint.toUpperCase()}).payloadFingerprint,fingerprint);
console.log("PASS: offline request idempotency remains fail-closed until database unique constraint and endpoint wiring are verified.");

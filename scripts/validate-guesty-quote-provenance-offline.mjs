import assert from "node:assert/strict";
import { assessQuoteProvenance, planQuoteSync, REQUIRED_SYNC_GATES } from "./guesty-quote-provenance-offline.mjs";

const record = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  quoteId: "6adb5d7320cb330ec34a3507",
  listingId: "6abf9b85caf2480012c82479",
  verifiedListingId: "6abf9b85caf2480012c82479",
  checkIn: "2026-11-10",
  checkOut: "2026-11-12",
  guests: 6,
  guestySyncStatus: "pending"
};
assert.deepEqual(assessQuoteProvenance(record), {
  eligible: false, reason: "quote_ownership_and_freshness_unverified"
});
for (const [change, reason] of [
  [{ quoteId: "" }, "missing_quote_id"],
  [{ listingId: "invalid" }, "missing_listing_id"],
  [{ verifiedListingId: "000000000000000000000000" }, "listing_mapping_mismatch"],
  [{ checkIn: "2026-02-30" }, "invalid_stay_dates"],
  [{ checkOut: "2026-11-10" }, "invalid_stay_dates"],
  [{ guests: 0 }, "invalid_guest_count"],
  [{ guestySyncStatus: "succeeded" }, "not_pending"]
]) assert.equal(assessQuoteProvenance({ ...record, ...change }).reason, reason);
assert.equal(planQuoteSync().allowed, false);
assert.equal(planQuoteSync().missing.length, REQUIRED_SYNC_GATES.length);
assert.equal(planQuoteSync(Object.fromEntries(REQUIRED_SYNC_GATES.map(k => [k, true]))).allowed, false);

// Client-supplied flags must never bypass independent Guesty quote verification.
for (const flags of [
  { quoteOwnershipVerified: true, quoteFreshnessVerified: true },
  { guestyWritePermissionVerified: true, apiResponseContractVerified: true },
  { verified: true, allowSync: true, force: true }
]) {
  assert.deepEqual(assessQuoteProvenance({ ...record, ...flags }), {
    eligible: false,
    reason: "quote_ownership_and_freshness_unverified"
  });
}
for (const [change, reason] of [
  [{ quoteId: "000000000000000000000000" }, "quote_ownership_and_freshness_unverified"],
  [{ quoteId: "6adb5d7320cb330ec34a3507", listingId: "000000000000000000000000" }, "listing_mapping_mismatch"],
  [{ checkIn: "2027-02-29" }, "invalid_stay_dates"],
  [{ checkIn: "2026-11-12", checkOut: "2026-11-10" }, "invalid_stay_dates"],
  [{ guests: 41 }, "invalid_guest_count"],
  [{ guestySyncStatus: "processing" }, "not_pending"],
  [{ guestySyncStatus: "uncertain" }, "not_pending"],
  [{ guestySyncStatus: "manual_review" }, "not_pending"]
]) assert.equal(assessQuoteProvenance({ ...record, ...change }).reason, reason);
for (const gate of REQUIRED_SYNC_GATES) {
  const gates = Object.fromEntries(REQUIRED_SYNC_GATES.map(key => [key, true]));
  delete gates[gate];
  const plan = planQuoteSync(gates);
  assert.equal(plan.allowed, false);
  assert.ok(plan.missing.includes(gate));
}

console.log("PASS: quote provenance checks remain offline and fail closed.");

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
console.log("PASS: quote provenance checks remain offline and fail closed.");

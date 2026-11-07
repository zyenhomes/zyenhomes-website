import assert from "node:assert/strict";
import { assessInquirySync, planSyncAttempt, SYNC_STATES } from "./guesty-inquiry-sync-offline.mjs";
const valid = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  propertyId: "149-tyrolean",
  listingId: "6abf9b85caf2480012c82479",
  checkIn: "2026-11-10",
  checkOut: "2026-11-12",
  guests: 6
};
assert.deepEqual(assessInquirySync(valid), {
  status: SYNC_STATES.PENDING, reason: "guesty_write_contract_unverified"
});
for (const [change, reason] of [
  [{ listingId: "" }, "unverified_listing_mapping"],
  [{ checkIn: "2026-02-30" }, "invalid_stay_dates"],
  [{ checkOut: "2026-11-10" }, "invalid_stay_dates"],
  [{ guests: 0 }, "invalid_guest_count"],
  [{ propertyId: "../bad" }, "invalid_property_id"]
]) {
  assert.equal(assessInquirySync({ ...valid, ...change }).reason, reason);
}
assert.equal(planSyncAttempt({ requestId: valid.requestId, previousStatus: "succeeded" }).allowed, false);
assert.equal(planSyncAttempt({ requestId: valid.requestId, previousStatus: "pending" }).allowed, false);
assert.equal(planSyncAttempt({
  requestId: valid.requestId, previousStatus: "pending",
  permissionVerified: true, endpointVerified: true, idempotencyVerified: true
}).reason, "atomic_deduplication_not_implemented");
console.log("PASS: inquiry sync remains fail-closed; no network, database or Guesty writes.");

// Offline-only inquiry synchronization planning helpers.
// No Guesty endpoint, credentials, network calls, or database writes.
export const SYNC_STATES = Object.freeze({
  PENDING: "pending",
  BLOCKED: "blocked",
  READY: "ready",
  SUCCEEDED: "succeeded",
  FAILED: "failed"
});

export function assessInquirySync(input) {
  if (!input || typeof input !== "object") throw Error("Invalid inquiry");
  const { requestId, propertyId, listingId, checkIn, checkOut, guests } = input;
  if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return { status: SYNC_STATES.BLOCKED, reason: "invalid_request_id" };
  }
  if (typeof propertyId !== "string" || !/^[a-z0-9-]{1,80}$/.test(propertyId)) {
    return { status: SYNC_STATES.BLOCKED, reason: "invalid_property_id" };
  }
  if (typeof listingId !== "string" || !/^[0-9a-f]{24}$/i.test(listingId)) {
    return { status: SYNC_STATES.BLOCKED, reason: "unverified_listing_mapping" };
  }
  const date = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
  if (!date(checkIn) || !date(checkOut) || checkOut <= checkIn) {
    return { status: SYNC_STATES.BLOCKED, reason: "invalid_stay_dates" };
  }
  if (!Number.isSafeInteger(guests) || guests < 1 || guests > 40) {
    return { status: SYNC_STATES.BLOCKED, reason: "invalid_guest_count" };
  }
  // Readiness is only structural; Guesty permissions and endpoint are unverified.
  return { status: SYNC_STATES.PENDING, reason: "guesty_write_contract_unverified" };
}

export function planSyncAttempt({ requestId, previousStatus, permissionVerified = false,
  endpointVerified = false, idempotencyVerified = false } = {}) {
  if (typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId)) {
    return { allowed: false, reason: "invalid_request_id" };
  }
  if (previousStatus === SYNC_STATES.SUCCEEDED) {
    return { allowed: false, reason: "already_synchronized" };
  }
  if (![SYNC_STATES.PENDING, SYNC_STATES.FAILED].includes(previousStatus)) {
    return { allowed: false, reason: "invalid_previous_status" };
  }
  if (!permissionVerified || !endpointVerified || !idempotencyVerified) {
    return { allowed: false, reason: "write_prerequisites_unverified" };
  }
  // A future implementation must separately enforce atomic claim + durable deduplication.
  return { allowed: false, reason: "atomic_deduplication_not_implemented" };
}

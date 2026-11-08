// Offline-only booking request idempotency contract.
// Does not import production Worker, connect to D1, or call Guesty.
// A caller must provide a stable request key for every logical form submission.
// A database UNIQUE constraint is required; this helper alone is not a lock.
const keyPattern = /^[A-Za-z0-9_-]{24,128}$/;
export function planBookingRequestIdempotency({ requestKey, payloadFingerprint } = {}) {
  if (typeof requestKey !== "string" || !keyPattern.test(requestKey))
    return Object.freeze({ accepted: false, reason: "invalid_request_key" });
  if (typeof payloadFingerprint !== "string" || !/^[a-f0-9]{64}$/i.test(payloadFingerprint))
    return Object.freeze({ accepted: false, reason: "invalid_payload_fingerprint" });
  return Object.freeze({
    accepted: false,
    reason: "database_unique_constraint_not_verified",
    requestKey,
    payloadFingerprint: payloadFingerprint.toLowerCase(),
    // The unique index prevents two rows with the same key; a fingerprint
    // mismatch must be a 409, never reuse the original response.
    onDuplicateSameFingerprint: "return_existing_request_without_new_quote_or_guesty_write",
    onDuplicateDifferentFingerprint: "reject_conflict",
    onUncertainDatabaseResult: "manual_review_no_automatic_retry"
  });
}
export const BOOKING_REQUEST_IDEMPOTENCY_SCHEMA = `
ALTER TABLE booking_requests ADD COLUMN request_idempotency_key TEXT;
ALTER TABLE booking_requests ADD COLUMN request_payload_fingerprint TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_requests_idempotency_key
ON booking_requests(request_idempotency_key)
WHERE request_idempotency_key IS NOT NULL;
`.trim();
// PREPARATION ONLY: do not apply this schema to production without approval.

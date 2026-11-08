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

const FINGERPRINT_FIELDS = Object.freeze([
  "propertyId", "name", "email", "phone", "checkIn", "checkOut",
  "guests", "message", "marketingConsent"
]);

// Canonicalize only server-validated booking fields; ignore browser-provided
// price, quote ID, sync status, and approval flags.
export function canonicalBookingRequestFields(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Invalid booking request");
  const result = {};
  for (const field of FINGERPRINT_FIELDS) {
    const value = input[field];
    if (field === "guests") {
      if (!Number.isSafeInteger(value) || value < 1) throw Error("Invalid guests");
      result[field] = value;
    } else if (field === "marketingConsent") {
      if (typeof value !== "boolean") throw Error("Invalid consent");
      result[field] = value;
    } else {
      if (typeof value !== "string") throw Error("Invalid " + field);
      result[field] = field === "email" ? value.trim().toLowerCase() : value.trim();
    }
  }
  return Object.freeze(result);
}

export async function fingerprintBookingRequest(input) {
  const canonical = canonicalBookingRequestFields(input);
  const bytes = new TextEncoder().encode(JSON.stringify(canonical));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

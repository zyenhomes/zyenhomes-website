// Offline-only quote provenance and synchronization eligibility.
// No network calls, Guesty writes, Cloudflare changes, or database mutations.
const id24 = value => typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
const uuid = value => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const date = value => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0,10) === value;

export function assessQuoteProvenance(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { eligible: false, reason: "invalid_record" };
  }
  if (!uuid(record.requestId)) return { eligible: false, reason: "invalid_request_id" };
  if (!id24(record.quoteId)) return { eligible: false, reason: "missing_quote_id" };
  if (!id24(record.listingId)) return { eligible: false, reason: "missing_listing_id" };
  if (record.verifiedListingId !== record.listingId) {
    return { eligible: false, reason: "listing_mapping_mismatch" };
  }
  if (!date(record.checkIn) || !date(record.checkOut) || record.checkOut <= record.checkIn) {
    return { eligible: false, reason: "invalid_stay_dates" };
  }
  if (!Number.isSafeInteger(record.guests) || record.guests < 1 || record.guests > 40) {
    return { eligible: false, reason: "invalid_guest_count" };
  }
  if (record.guestySyncStatus !== "pending") {
    return { eligible: false, reason: "not_pending" };
  }
  // Structural checks are not proof of Guesty ownership, freshness or permission.
  return { eligible: false, reason: "quote_ownership_and_freshness_unverified" };
}

export const REQUIRED_SYNC_GATES = Object.freeze([
  "quote_ownership", "quote_freshness", "account_write_permission",
  "atomic_claim", "durable_deduplication", "reconciliation"
]);

export function planQuoteSync(gates = {}) {
  const missing = REQUIRED_SYNC_GATES.filter(gate => gates[gate] !== true);
  // Even if declared complete, no executable sync is permitted by this offline helper.
  return { allowed: false, reason: missing.length ? "unverified_gates" : "live_sync_not_implemented", missing };
}

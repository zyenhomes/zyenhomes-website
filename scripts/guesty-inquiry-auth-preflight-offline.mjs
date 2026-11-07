// Preflight for the separate Guesty Open API inquiry credentials.
// Does not make network calls, request tokens, or authorize any write.
// Booking Engine OAuth tokens MUST NOT be assumed valid for Open API writes.
import { buildGuestyInquiryRequest } from "./build-guesty-inquiry-request-offline.mjs";

const HEX24 = /^[0-9a-f]{24}$/i;
export function assessInquiryPreflight({ record, guest, auth, checks } = {}) {
  const missing = [];
  if (!record || typeof record !== "object" || !HEX24.test(record.guestyQuoteId ?? ""))
    missing.push("server_saved_quote_id");
  if (!record || typeof record !== "object" || !HEX24.test(record.listingId ?? ""))
    missing.push("verified_listing_id");
  if (record?.guestySyncStatus !== "pending" || record?.guestyReference)
    missing.push("unsynchronized_pending_request");
  if (auth?.credentialType !== "guesty_open_api" || auth?.openApiWritePermissionVerified !== true)
    missing.push("open_api_write_permission");
  if (checks?.quoteOwnershipVerified !== true || checks?.quoteFreshnessVerified !== true)
    missing.push("quote_provenance");
  if (checks?.claimAndAuditVerified !== true || checks?.reconciliationReady !== true)
    missing.push("deduplication_and_reconciliation");
  let payload = null;
  try {
    payload = buildGuestyInquiryRequest({
      quoteId: record?.guestyQuoteId,
      firstName: guest?.firstName,
      lastName: guest?.lastName,
      email: guest?.email,
      phones: guest?.phones
    });
  } catch {
    missing.push("validated_guest_payload");
  }
  // This is a preflight report, not permission to execute a Guesty write.
  return Object.freeze({
    readyForLiveWrite: false,
    missing: Object.freeze([...new Set(missing)]),
    payloadPreview: payload && Object.freeze({
      quoteId: payload.quoteId,
      status: payload.status,
      reservedUntil: payload.reservedUntil,
      guestFields: Object.freeze(Object.keys(payload.guest))
    }),
    reason: "live_write_requires_separate_approval"
  });
}

// Isolated read-only bridge from a stored booking request to quote verification.
// This module cannot submit an inquiry, mutate D1, or authorize a Guesty write.
import {verifyGuestyQuoteReadOnly} from "./guesty-quote-readonly.js";

export async function preflightStoredBookingQuote({record,listingId,token,transport,now}={}) {
 const block=reason=>Object.freeze({readyForInquiry:false,reason,writeAuthorized:false,retryAutomatically:false});
 if(!record||typeof record!=="object"||record.guesty_sync_status!=="pending")
   return block("booking_request_not_pending");
 if(record.guesty_sync_claim_token||Number(record.guesty_sync_attempt_count)>0)
   return block("prior_or_active_sync_claim_requires_reconciliation");
 if(typeof record.request_idempotency_key!=="string"||
    !/^[A-Za-z0-9_-]{24,128}$/.test(record.request_idempotency_key)||
    typeof record.request_payload_fingerprint!=="string"||
    !/^[a-f0-9]{64}$/i.test(record.request_payload_fingerprint))
   return block("request_idempotency_unverified");
 const result=await verifyGuestyQuoteReadOnly({
   quoteId:record.guesty_quote_id,listingId,
   checkIn:record.check_in,checkOut:record.check_out,
   guests:record.guests,token,transport,now
 });
 if(!result.verified) return block(result.reason);
 // Verification is read-only. Never turn this into an implicit write approval.
 return Object.freeze({readyForInquiry:false,reason:"live_write_approval_and_reconciliation_required",
   quoteReadOnlyVerified:true,writeAuthorized:false,retryAutomatically:false});
}

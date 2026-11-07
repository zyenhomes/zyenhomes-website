// Integration boundary for the Zyen Homes booking-request -> Guesty inquiry flow.
// OFFLINE ONLY: no Worker import, Guesty HTTP call, D1 mutation or automatic retry.
import { assessQuoteProvenance } from "./guesty-quote-provenance-offline.mjs";
import { prepareGuestyInquiry, classifyGuestyInquiryResponse } from "./guesty-inquiry-submission-adapter-offline.mjs";

const REQUIRED_APPROVALS = Object.freeze([
  "quoteOwnershipVerified",
  "quoteFreshnessVerified",
  "guestyWritePermissionVerified",
  "apiResponseContractVerified",
  "reconciliationReady"
]);

export function planInquiryOrchestration({ record, guest, approvals = {} } = {}) {
  const provenance = assessQuoteProvenance(record);
  if (!provenance.eligible) {
    return Object.freeze({
      ready: false,
      reason: provenance.reason,
      payload: null,
      missingApprovals: REQUIRED_APPROVALS.filter(key => approvals[key] !== true)
    });
  }
  // Even after future provenance implementation, preparation must remain distinct
  // from permission to execute an external API write.
  const prepared = prepareGuestyInquiry({ ...guest, quoteId: record.quoteId });
  const missingApprovals = REQUIRED_APPROVALS.filter(key => approvals[key] !== true);
  return Object.freeze({
    ready: false,
    reason: missingApprovals.length ? "unverified_approvals" : "live_orchestration_not_implemented",
    payload: prepared.payload,
    missingApprovals
  });
}

export function planPostSubmission({ response, claimed = false } = {}) {
  if (!claimed) return Object.freeze({ state: "blocked", retryAutomatically: false, requiresReconciliation: false });
  const result = classifyGuestyInquiryResponse(response);
  return Object.freeze({
    state: result.state,
    retryAutomatically: false,
    requiresReconciliation: true,
    reference: result.reference ?? null,
    // A 2xx response must be independently verified against Guesty before D1 success.
    canMarkSucceeded: false
  });
}

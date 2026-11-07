// Pure offline Guesty inquiry synchronization state model.
// Does not execute API requests, database writes, retries, or background jobs.
export const STATES = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  UNCERTAIN: "uncertain",
  REVIEW: "manual_review"
});

const transitions = Object.freeze({
  pending: Object.freeze(["processing", "manual_review"]),
  processing: Object.freeze(["succeeded", "failed", "uncertain"]),
  failed: Object.freeze(["manual_review"]),
  uncertain: Object.freeze(["manual_review"]),
  manual_review: Object.freeze(["pending", "succeeded"]),
  succeeded: Object.freeze([])
});

export function planTransition(current, next, evidence = {}) {
  if (!Object.values(STATES).includes(current) || !Object.values(STATES).includes(next)) {
    return { allowed: false, reason: "unknown_state" };
  }
  if (!transitions[current].includes(next)) {
    return { allowed: false, reason: "transition_not_allowed" };
  }
  if (current === STATES.PENDING && next === STATES.PROCESSING) {
    return { allowed: false, reason: "atomic_claim_not_implemented" };
  }
  if (current === STATES.PROCESSING && next === STATES.SUCCEEDED) {
    if (typeof evidence.guestyReference !== "string" ||
        !/^[a-f0-9]{24}$/i.test(evidence.guestyReference)) {
      return { allowed: false, reason: "verified_guesty_reference_required" };
    }
    return { allowed: false, reason: "response_verification_not_implemented" };
  }
  if (current === STATES.MANUAL_REVIEW && next === STATES.PENDING) {
    return { allowed: false, reason: "manual_reconciliation_required" };
  }
  if (current === STATES.MANUAL_REVIEW && next === STATES.SUCCEEDED) {
    return { allowed: false, reason: "manual_reference_verification_required" };
  }
  // This module is deliberately a non-executable policy description.
  return { allowed: false, reason: "offline_policy_only" };
}

export function classifyAttemptOutcome({ transport, httpStatus, verifiedReference } = {}) {
  if (transport === "timeout" || transport === "connection_lost" ||
      transport === "unknown" || httpStatus >= 500) {
    return { state: STATES.UNCERTAIN, retryAutomatically: false };
  }
  if (httpStatus >= 200 && httpStatus < 300) {
    if (typeof verifiedReference === "string" && /^[a-f0-9]{24}$/i.test(verifiedReference)) {
      return { state: STATES.SUCCEEDED, retryAutomatically: false, verificationRequired: true };
    }
    return { state: STATES.UNCERTAIN, retryAutomatically: false };
  }
  // Even a client error is not permission to retry automatically.
  return { state: STATES.FAILED, retryAutomatically: false };
}

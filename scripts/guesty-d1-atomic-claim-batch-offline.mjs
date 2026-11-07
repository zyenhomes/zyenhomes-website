// Offline-only SQL plan for an atomic D1 batch claim plus audit.
// No database connection, Worker route, network call, or Guesty write.
import { CLAIM_SQL } from "./guesty-sync-claim-sql-offline.mjs";

// The INSERT is conditional on the claim's committed state within the same batch.
// If another contender claimed first, it inserts zero audit rows.
export const CONDITIONAL_ATTEMPT_SQL = `
INSERT INTO guesty_inquiry_sync_attempts
  (attempt_id, request_id, claim_token, outcome)
SELECT ?, request_id, guesty_sync_claim_token, 'processing'
FROM booking_requests
WHERE request_id = ?
  AND guesty_sync_status = 'processing'
  AND guesty_sync_claim_token = ?
  AND guesty_sync_attempt_count > 0
`.trim();

export function buildAtomicClaimBatchPlan({ requestId, claimToken, attemptId } = {}) {
  const nonempty = v => typeof v === "string" && v.length >= 8 && v.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(v);
  if (![requestId, claimToken, attemptId].every(nonempty) || claimToken === attemptId) {
    throw Error("Invalid claim identifiers");
  }
  return Object.freeze({
    executable: false,
    requiresAtomicBatch: true,
    statements: Object.freeze([
      Object.freeze({ sql: CLAIM_SQL, binds: Object.freeze([claimToken, requestId]) }),
      Object.freeze({ sql: CONDITIONAL_ATTEMPT_SQL, binds: Object.freeze([attemptId, requestId, claimToken]) })
    ]),
    postconditions: Object.freeze([
      "exactly one claim row returned",
      "exactly one audit row inserted",
      "both operations committed atomically",
      "request quote and account provenance verified separately"
    ])
  });
}

// A real adapter must use D1Database.batch([...preparedStatements]) and check
// BOTH result sets before any external Guesty call. No adapter is implemented here.
// A batch commit alone does not guarantee exactly-once external API delivery.

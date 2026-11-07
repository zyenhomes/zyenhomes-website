// SQL templates only. No database connection, execution, Guesty call or automatic retry.
// Callers must use D1 batch/transaction semantics when implementing a real claim.
export const CLAIM_SQL = `
UPDATE booking_requests
SET guesty_sync_status = 'processing',
    guesty_sync_claim_token = ?,
    guesty_sync_claimed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    guesty_sync_attempt_count = guesty_sync_attempt_count + 1
WHERE request_id = ?
  AND guesty_sync_status = 'pending'
  AND guesty_sync_claim_token IS NULL
  AND guesty_quote_id IS NOT NULL
RETURNING request_id, guesty_sync_claim_token
`.trim();

export const RECORD_ATTEMPT_SQL = `
INSERT INTO guesty_inquiry_sync_attempts
  (attempt_id,request_id,claim_token,outcome)
VALUES (?,?,?,'processing')
`.trim();

export const MARK_UNCERTAIN_SQL = `
UPDATE booking_requests
SET guesty_sync_status = 'uncertain'
WHERE request_id = ?
  AND guesty_sync_status = 'processing'
  AND guesty_sync_claim_token = ?
`.trim();

export const MARK_SUCCESS_SQL = `
UPDATE booking_requests
SET guesty_sync_status = 'succeeded', guesty_reference = ?
WHERE request_id = ?
  AND guesty_sync_status = 'processing'
  AND guesty_sync_claim_token = ?
  AND guesty_reference IS NULL
`.trim();

// These SQL templates are not sufficient alone for exactly-once external delivery.
// A crash after a Guesty write but before D1 commit requires manual reconciliation.
export function explainClaimSafety() {
  return Object.freeze({
    executable: false,
    automaticRetry: false,
    externalExactlyOnceGuaranteed: false,
    requires: ["atomic D1 claim", "attempt audit", "Guesty reference verification", "manual reconciliation"]
  });
}

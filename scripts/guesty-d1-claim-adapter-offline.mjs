// Standalone D1 adapter: not imported by the production Worker.
// No Guesty API calls, background jobs, automatic retries or deployment.
import { buildAtomicClaimBatchPlan } from "./guesty-d1-atomic-claim-batch-offline.mjs";

export async function claimInquiryWithAudit(db, ids) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function")
    throw Error("D1 database binding required");
  const plan = buildAtomicClaimBatchPlan(ids);
  const prepared = plan.statements.map(statement =>
    db.prepare(statement.sql).bind(...statement.binds));
  // D1 batch runs these statements transactionally; both results must be checked.
  const results = await db.batch(prepared);
  if (!Array.isArray(results) || results.length !== 2 ||
      results.some(result => result?.success !== true))
    throw Error("D1 batch did not return two successful statements");
  const [claim, audit] = results;
  const claimed = claim.results;
  const auditChanges = audit.meta?.changes;
  if (!Array.isArray(claimed) || claimed.length !== 1) {
    if (Array.isArray(claimed) && claimed.length === 0 && auditChanges === 0)
      return Object.freeze({ claimed: false, reason: "not_pending_or_already_claimed" });
    throw Error("Inconsistent claim result; manual review required");
  }
  if (claimed[0]?.request_id !== ids.requestId ||
      claimed[0]?.guesty_sync_claim_token !== ids.claimToken ||
      auditChanges !== 1)
    throw Error("Claim/audit mismatch; manual review required");
  // A successful claim is NOT permission to send to Guesty.
  // Quote provenance, API permissions, idempotency and reconciliation remain unverified.
  return Object.freeze({
    claimed: true,
    guestyWriteAuthorized: false,
    requestId: ids.requestId,
    attemptId: ids.attemptId
  });
}

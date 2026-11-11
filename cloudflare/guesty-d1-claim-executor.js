// D1 claim executor, isolated from production Worker and Guesty transport.
// Only a separately authorized caller can invoke it with a D1 binding.
// It NEVER submits an inquiry, retries a claim, or marks a request successful.
import {claimInquiryWithAudit} from "../scripts/guesty-d1-claim-adapter-offline.mjs";
export async function executeInquiryClaimWithAudit({db,ids,authorization}={}) {
 const deny=(reason)=>Object.freeze({claimed:false,reason,canSendInquiry:false,
  guestyWriteAuthorized:false,retryAutomatically:false});
 // Explicit per-invocation authorization; no environment flag can bypass this.
 if(authorization?.approvedForDatabaseClaim!==true||
    authorization?.approvedRequestId!==ids?.requestId||
    authorization?.approvedAttemptId!==ids?.attemptId)
  return deny("database_claim_not_authorized");
 if(!db||typeof db.prepare!=="function"||typeof db.batch!=="function")
  return deny("database_binding_missing");
 try {
  const outcome=await claimInquiryWithAudit(db,ids);
  if(outcome.claimed!==true)return deny(outcome.reason??"not_claimed");
  return Object.freeze({claimed:true,reason:"atomic_claim_and_audit_committed",
   requestId:ids.requestId,attemptId:ids.attemptId,
   canSendInquiry:false,guestyWriteAuthorized:false,retryAutomatically:false,
   requiresIndependentReconciliation:true});
 }catch {
  // Batch failures can be ambiguous; never attempt a second claim automatically.
  return deny("database_claim_uncertain_manual_review");
 }
}

// Offline-only synchronization review. Never executes SQL or Guesty HTTP.
import {planBookingEngineInquiry} from "./guesty-booking-engine-inquiry-plan.js";
import {buildAtomicClaimBatchPlan} from "../scripts/guesty-d1-atomic-claim-batch-offline.mjs";
import {classifyBookingEngineInquiryResult} from "./guesty-booking-engine-inquiry.js";
export function reviewBookingEngineInquiryClaim({record,quoteResponse,guest,claimToken,attemptId,now}={}) {
 const blocked=(reason,details={})=>Object.freeze({ready:false,reason,writeAuthorized:false,
  retryAutomatically:false,claimPlan:null,...details});
 const inquiry=planBookingEngineInquiry({record,quoteResponse,guest,now});
 if(!inquiry.prepared)return blocked(inquiry.reason);
 let claimPlan;
 try {claimPlan=buildAtomicClaimBatchPlan({requestId:record.request_id,claimToken,attemptId});}
 catch{return blocked("invalid_claim_identifiers");}
 if(claimPlan.statements.length!==2||claimPlan.requiresAtomicBatch!==true)
  return blocked("atomic_claim_unverified");
 // A successful offline review is not authorization to execute either the claim or POST.
 return blocked("manual_write_approval_and_reconciliation_required",{
  claimPlan,prepared:inquiry.prepared,ratePlanVerified:true
 });
}
export function reviewBookingEngineInquiryOutcome({claimed,responseStatus,responseBody,transportError}={}) {
 if(claimed!==true)return Object.freeze({state:"blocked",retryAutomatically:false,canMarkSucceeded:false});
 const result=classifyBookingEngineInquiryResult({status:responseStatus,body:responseBody,error:transportError});
 return Object.freeze({...result,retryAutomatically:false,canMarkSucceeded:false,
  requiresIndependentGuestyVerification:true});
}

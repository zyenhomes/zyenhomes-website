// Isolated candidate: no route, no Guesty transport, no automatic retry.
import {prepareNonblockingInquiry} from "./guesty-nonblocking-inquiry-candidate.js";
import {executeInquiryClaimWithAudit} from "./guesty-d1-claim-executor.js";
export async function prepareAndClaimNonblockingInquiry({db,record,quote,guest,now,claimToken,attemptId,authorization}={}){
 const blocked=reason=>({state:"blocked",reason,writeAuthorized:false,retryAutomatically:false});
 if(!record?.request_id||authorization?.approvedForDatabaseClaim!==true||
 authorization.approvedRequestId!==record.request_id||authorization.approvedAttemptId!==attemptId)
 return blocked("database_claim_not_authorized");
 let prepared;
 try{prepared=prepareNonblockingInquiry({record,quote,guest,now});}
 catch{return blocked("quote_preflight_failed");}
 const claim=await executeInquiryClaimWithAudit({db,ids:{requestId:record.request_id,claimToken,attemptId},authorization});
 if(!claim.claimed)return blocked(claim.reason);
 return {state:"claimed_pending_review",requestId:claim.requestId,attemptId:claim.attemptId,prepared,writeAuthorized:false,retryAutomatically:false};
}

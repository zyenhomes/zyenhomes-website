// Unwired mock-only candidate. Never supply real fetch or credentials.
import {prepareNonblockingInquiry} from "./guesty-nonblocking-inquiry-candidate.js";
import {executeInquiryClaimWithAudit} from "./guesty-d1-claim-executor.js";
import {simulateAuthorizedHttp} from "./guesty-nonblocking-http-candidate.js";
import {recordNonblockingOutcome} from "./guesty-nonblocking-outcome-candidate.js";
export async function simulateApprovedInquiry({env,db,requestId,attemptId,claimToken,quote,guest,transport,now=Date.now()}={}){
 const stop=reason=>({state:"blocked",reason,retryAutomatically:false,writeAuthorized:false});
 if(env?.GUESTY_TEST_MODE!=="mock"||env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true"||typeof transport!=="function")return stop("disabled");
 let approval;
 try{approval=JSON.parse(env.GUESTY_ISOLATED_APPROVAL_JSON);}catch{return stop("invalid_approval");}
 if(!requestId||!attemptId||!quote?._id||approval?.requestId!==requestId||approval?.attemptId!==attemptId||approval?.quoteId!==quote._id||!(Date.parse(approval.expiresAt)>now))return stop("approval_mismatch");
 let record,prepared;
 try{
 record=await db.prepare("SELECT * FROM booking_requests WHERE request_id=?").bind(requestId).first();
 if(record?.request_id!==requestId)return stop("record_missing");
 prepared=prepareNonblockingInquiry({record,quote,guest,now});
 }catch{return stop("preflight_failed");}
 const claim=await executeInquiryClaimWithAudit({db,ids:{requestId,attemptId,claimToken},authorization:{approvedForDatabaseClaim:true,approvedRequestId:requestId,approvedAttemptId:attemptId}});
 if(!claim.claimed)return stop(claim.reason);
 const result=await simulateAuthorizedHttp({env,requestId,attemptId,body:prepared.body,token:"mock-token",transport,now});
 const audit=await recordNonblockingOutcome({db,requestId,attemptId,claimToken,result});
 return {state:audit.recorded?audit.outcome:"manual_review",reference:result.reference??null,auditRecorded:audit.recorded,retryAutomatically:false,writeAuthorized:false};
}

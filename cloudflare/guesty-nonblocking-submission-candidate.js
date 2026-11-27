// Offline simulation only. No fetch, credentials, Worker route or live authorization.
import {prepareAndClaimNonblockingInquiry} from "./guesty-nonblocking-claim-candidate.js";
import {reviewNonblockingResponse} from "./guesty-nonblocking-response-candidate.js";
import {recordNonblockingOutcome} from "./guesty-nonblocking-outcome-candidate.js";
export async function simulateProtectedSubmission({db,requestId,quote,guest,now,claimToken,attemptId,authorization,simulateTransport}={}){
 const stop=reason=>({state:"blocked",reason,retryAutomatically:false,writeAuthorized:false});
 if(authorization?.offlineSimulation!==true||authorization.approvedRequestId!==requestId||typeof simulateTransport!=="function")return stop("simulation_not_authorized");
 let record;
 try{record=await db.prepare("SELECT * FROM booking_requests WHERE request_id=?").bind(requestId).first();}
 catch{return stop("record_read_failed");}
 if(!record||record.request_id!==requestId)return stop("record_missing");
 const claim=await prepareAndClaimNonblockingInquiry({db,record,quote,guest,now,claimToken,attemptId,authorization});
 if(claim.state!=="claimed_pending_review")return stop(claim.reason);
 let response;
 try{response=await simulateTransport(structuredClone(claim.prepared.body));}
 catch{response={transportError:true};}
 const result=reviewNonblockingResponse({status:response?.status,body:response?.body,transportError:response?.transportError,record});
 const audit=await recordNonblockingOutcome({db,requestId,attemptId,claimToken,result});
 return {state:audit.recorded?audit.outcome:"manual_review",auditRecorded:audit.recorded,reference:result.reference,retryAutomatically:false,writeAuthorized:false};
}

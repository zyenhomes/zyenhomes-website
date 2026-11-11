// Isolated Booking Engine inquiry transport. NOT imported by production Worker.
// A claimed request alone never authorizes a POST. No automatic retries.
import {classifyBookingEngineInquiryResult} from "./guesty-booking-engine-inquiry.js";
export async function submitGuestyInquiryControlled({prepared,claim,authorization,token,transport}={}) {
 const deny=reason=>Object.freeze({state:"blocked",reason,canMarkSucceeded:false,
  retryAutomatically:false,reservationId:null});
 if(prepared?.executable!==false||prepared?.writeAuthorized!==false||
    prepared?.method!=="POST"||
    !/^https:\/\/booking\.guesty\.com\/api\/reservations\/quotes\/[a-f0-9]{24}\/inquiry$/i.test(prepared.endpoint)||
    !/^[a-f0-9]{24}$/i.test(prepared?.body?.ratePlanId??"")||
    prepared?.body?.ccToken!==undefined)
  return deny("invalid_inquiry_preparation");
 if(claim?.claimed!==true||claim?.claimCommitted!==true||
    claim?.auditCommitted!==true||claim?.canSendInquiry!==false)
  return deny("atomic_claim_audit_not_verified");
 if(authorization?.explicitLiveWriteApproval!==true||
    authorization?.approvedRequestId!==claim.requestId||
    authorization?.approvedAttemptId!==claim.attemptId||
    authorization?.approvedQuoteId!==prepared.endpoint.split("/").at(-2))
  return deny("live_write_not_authorized");
 if(typeof token!=="string"||token.length<8||typeof transport!=="function")
  return deny("transport_or_token_missing");
 let response;
 try {
  response=await transport(prepared.endpoint,{method:"POST",headers:{
   Authorization:"Bearer "+token,Accept:"application/json",
   "Content-Type":"application/json"
  },body:JSON.stringify(prepared.body)});
 }catch{return Object.freeze({state:"uncertain",reason:"transport_uncertain",
  canMarkSucceeded:false,retryAutomatically:false,reservationId:null});}
 let body=null;
 try {body=await response.json();}catch {}
 return classifyBookingEngineInquiryResult({status:response?.status,body});
}

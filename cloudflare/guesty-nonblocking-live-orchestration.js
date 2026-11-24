// Unwired candidate. No default network transport. Never enable without review.
import {EXECUTION_ENABLED,executeIsolatedInquiry} from "./guesty-nonblocking-execution-candidate.js";
import {lookupBookingRequestListing} from "./booking-request-listings.js";
import {prepareNonblockingInquiry} from "./guesty-nonblocking-inquiry-candidate.js";
import {executeInquiryClaimWithAudit} from "./guesty-d1-claim-executor.js";
import {recordNonblockingOutcome} from "./guesty-nonblocking-outcome-candidate.js";
export async function runIsolatedLiveCandidate({env,db,readQuote,getToken,transport}={}){
 const stop=reason=>({state:"blocked",reason,retryAutomatically:false});
 if(!EXECUTION_ENABLED||env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true")return stop("execution_disabled");
 let a;try{a=JSON.parse(env.GUESTY_ISOLATED_APPROVAL_JSON)}catch{return stop("invalid_approval")}
 if(!a?.requestId||!a.attemptId||!a.claimToken||!a.quoteId||!(Date.parse(a.expiresAt)>Date.now()))return stop("approval_invalid");
 let record,prepared,token,quoteExpiry;
 try{
 record=await db.prepare("SELECT * FROM booking_requests WHERE request_id=?").bind(a.requestId).first();
 if(record?.request_id!==a.requestId||record.guesty_quote_id!==a.quoteId)return stop("record_mismatch");
 const listing=lookupBookingRequestListing(record.property_id);
 const quote=await readQuote(a.quoteId);
 quoteExpiry=Date.parse(quote?.expiresAt);
 if(!listing||quote?.unitTypeId!==listing)return stop("listing_mismatch");
 const names=String(record.guest_name??"").trim().split(/\s+/);
 prepared=prepareNonblockingInquiry({record,quote:{...quote,unitTypeId:record.property_id},guest:{firstName:names.shift(),lastName:names.join(" "),email:record.guest_email,phones:[record.guest_phone]}});
 token=await getToken();
 if(typeof token!=="string"||!token.trim()||typeof transport!=="function")return stop("transport_unavailable");
 if(!(Date.parse(a.expiresAt)>Date.now()))return stop("approval_expired");
 }catch{return stop("preflight_failed")}
 const claim=await executeInquiryClaimWithAudit({db,ids:{requestId:a.requestId,attemptId:a.attemptId,claimToken:a.claimToken},authorization:{approvedForDatabaseClaim:true,approvedRequestId:a.requestId,approvedAttemptId:a.attemptId}});
 if(!claim.claimed)return stop(claim.reason);
 const result=Date.now()>=Math.min(Date.parse(a.expiresAt),quoteExpiry)?{state:"manual_review",reference:null}:await executeIsolatedInquiry({env,body:prepared.body,token,transport});
 const audit=await recordNonblockingOutcome({db,requestId:a.requestId,attemptId:a.attemptId,claimToken:a.claimToken,result});
 return {state:audit.recorded?audit.outcome:"manual_review",auditRecorded:audit.recorded,retryAutomatically:false};
}

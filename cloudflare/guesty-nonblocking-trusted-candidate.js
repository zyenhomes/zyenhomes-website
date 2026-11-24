// Mock-only trusted input boundary; no live fetch or Worker route.
import {lookupBookingRequestListing} from "./booking-request-listings.js";
import {simulateApprovedInquiry} from "./guesty-nonblocking-e2e-candidate.js";
export async function runTrustedMock({env,db,requestId,attemptId,claimToken,readQuote,transport,now=Date.now()}={}){
 const stop=reason=>({state:"blocked",reason,writeAuthorized:false,retryAutomatically:false});
 if(env?.GUESTY_TEST_MODE!=="mock"||env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true")return stop("disabled");
 let approval;
 try{approval=JSON.parse(env.GUESTY_ISOLATED_APPROVAL_JSON);}catch{return stop("invalid_approval");}
 if(!requestId||!attemptId||approval?.requestId!==requestId||approval?.attemptId!==attemptId||!(Date.parse(approval.expiresAt)>now))return stop("approval_mismatch");
 try{
 const record=await db.prepare("SELECT * FROM booking_requests WHERE request_id=?").bind(requestId).first();
 if(record?.request_id!==requestId||record.guesty_quote_id!==approval.quoteId)return stop("record_mismatch");
 const listing=lookupBookingRequestListing(record.property_id);
 if(!listing)return stop("unknown_property");
 const names=String(record.guest_name??"").trim().split(/\s+/);
 if(names.length<2)return stop("invalid_guest_name");
 const guest={firstName:names.shift(),lastName:names.join(" "),email:record.guest_email,phones:[record.guest_phone]};
 const quote=await readQuote(record.guesty_quote_id);
 if(quote?.unitTypeId!==listing)return stop("listing_mismatch");
 // Preserve the stored slug for the underlying preflight; mapping was verified above.
 return await simulateApprovedInquiry({env,db,requestId,attemptId,claimToken,quote:{...quote,unitTypeId:record.property_id},guest,transport,now});
 }catch{return stop("trusted_preflight_failed");}
}

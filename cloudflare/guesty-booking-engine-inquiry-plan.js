// Offline preparation pipeline. No Worker route, D1 mutations, or HTTP writes.
import {selectBookingEngineRatePlan} from "./guesty-booking-engine-rate-plan.js";
import {prepareBookingEngineInquiry} from "./guesty-booking-engine-inquiry.js";
const ID=/^[a-f0-9]{24}$/i;
export function planBookingEngineInquiry({record,quoteResponse,guest,selectedRatePlanId,now=Date.now()}={}) {
 const block=reason=>Object.freeze({ready:false,reason,writeAuthorized:false,retryAutomatically:false,prepared:null});
 if(!record||typeof record!=="object"||record.guesty_sync_status!=="pending"||
   record.guesty_sync_claim_token||record.guesty_sync_attempt_count!==0)
  return block("not_pending_or_previously_attempted");
 if(typeof record.request_idempotency_key!=="string"||
    !/^[A-Za-z0-9_-]{24,128}$/.test(record.request_idempotency_key)||
    !/^[a-f0-9]{64}$/i.test(record.request_payload_fingerprint??""))
  return block("request_deduplication_unverified");
 const quoteId=record.guesty_quote_id,listingId=record.listing_id;
 if(!ID.test(quoteId??"")||!ID.test(listingId??""))
  return block("quote_or_listing_missing");
 const data=quoteResponse?.results??quoteResponse;
 const quote=Array.isArray(data)?(data.length===1?data[0]:null):data;
 if(!quote||quote._id!==quoteId)return block("quote_identity_mismatch");
 if(![quote.unitTypeId,quote.unitId,quote.listingId].includes(listingId))
  return block("listing_mismatch");
 if(quote.checkInDateLocalized!==record.check_in||quote.checkOutDateLocalized!==record.check_out||
    quote.guestsCount!==record.guests)return block("stay_details_mismatch");
 const created=Date.parse(quote.createdAt),expires=Date.parse(quote.expiresAt);
 if(!Number.isFinite(created)||!Number.isFinite(expires)||created>now||expires<=now||expires<=created)
  return block("quote_expired_or_unverified");
 if(Object.hasOwn(quote,"status")&&quote.status!=="valid")return block("quote_invalid_status");
 const plan=selectBookingEngineRatePlan({response:quote,quoteId,selectedRatePlanId});
 if(!plan.verified)return block(plan.reason);
 let prepared;
 try {prepared=prepareBookingEngineInquiry({...guest,quoteId,ratePlanId:plan.ratePlanId});}
 catch{return block("invalid_guest_details");}
 return Object.freeze({ready:false,reason:"atomic_claim_permission_and_reconciliation_required",
   ratePlanVerified:true,prepared,writeAuthorized:false,retryAutomatically:false});
}

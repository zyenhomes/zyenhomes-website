// Offline response classification only. No network or database writes.
import {classifyGuestyInquiryResponse} from "../scripts/guesty-inquiry-submission-adapter-offline.mjs";
export function reviewNonblockingResponse({status,body,transportError,record,reservation,expectedAccountId}={}){
 const result=classifyGuestyInquiryResponse({status,body,transportError});
 const base={reference:result.reference,retryAutomatically:false,canMarkSucceeded:false,writeAuthorized:false};
 if(result.state!=="needs_verification")return {...base,state:result.state};
 if(!record||!reservation||!expectedAccountId)return {...base,state:"manual_review",reason:"independent_verification_required"};
 if(reservation._id!==result.reference||reservation.status!=="inquiry"||
 reservation.quoteId!==record.guesty_quote_id||reservation.listingId!==record.property_id||
 reservation.accountId!==expectedAccountId)return {...base,state:"manual_review",reason:"reservation_identity_or_status_mismatch"};
 return {...base,state:"matched_pending_manual_verification",reason:"calendar_message_center_payment_and_schema_unverified"};
}

// Offline-only non-blocking inquiry candidate. No live transport or route.
import {buildGuestyInquiryRequest} from "../scripts/build-guesty-inquiry-request-offline.mjs";
export function prepareNonblockingInquiry({guest,quote,record,now=Date.now()}={}){
 if(!record||!quote||!guest)throw Error("missing_input");
 if(quote._id!==record.guesty_quote_id||quote.unitTypeId!==record.property_id||
 quote.checkInDateLocalized!==record.check_in||quote.checkOutDateLocalized!==record.check_out||
 quote.guestsCount!==record.guests)throw Error("quote_mismatch");
 const expiry=Date.parse(quote.expiresAt);
 if(!Number.isFinite(expiry)||expiry<=now)throw Error("expired_quote");
 const plans=quote.rates?.ratePlans;
 if(!Array.isArray(plans)||plans.length!==1)throw Error("ambiguous_rate_plan");
 const plan=plans[0],ratePlanId=plan?.ratePlan?._id;
 if(typeof ratePlanId!=="string"||!ratePlanId.trim())throw Error("missing_rate_plan");
 const money=plan.ratePlan?.money??plan.money?.money??plan.money;
 if(!money||money.currency!==record.quote_currency||!Array.isArray(money.invoiceItems)||!money.invoiceItems.length)throw Error("missing_invoice");
 let cents=0;
 for(const item of money.invoiceItems){
 if(typeof item.amount!=="number"||!Number.isFinite(item.amount)|| (item.currency!=null&&item.currency!==money.currency))throw Error("invalid_invoice");
 const n=Math.round(item.amount*100);
 if(!Number.isSafeInteger(n)||Math.abs(item.amount*100-n)>0.00001)throw Error("invalid_invoice");
 cents+=n;
 }
 if(!Number.isSafeInteger(cents)||cents<=0||cents!==record.quote_total_cents)throw Error("price_mismatch");
 const {reservedUntil,...body}=buildGuestyInquiryRequest({...guest,quoteId:quote._id});
 return {body:{...body,ratePlanId,ignoreCalendar:false,ignoreTerms:false,ignoreBlocks:false},writeAuthorized:false};
}

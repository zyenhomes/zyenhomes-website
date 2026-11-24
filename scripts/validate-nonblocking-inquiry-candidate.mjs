import assert from "node:assert/strict";
import {prepareNonblockingInquiry as prepare} from "../cloudflare/guesty-nonblocking-inquiry-candidate.js";
const id="1234567890abcdef12345678";
const fixture=()=>({now:0,guest:{firstName:"Test",lastName:"Guest",email:"test@example.com",phones:["+14165550100"],status:"confirmed",ccToken:"ignored"},record:{guesty_quote_id:id,property_id:"listing",check_in:"2027-01-18",check_out:"2027-01-20",guests:6,quote_currency:"CAD",quote_total_cents:349830},quote:{_id:id,unitTypeId:"listing",checkInDateLocalized:"2027-01-18",checkOutDateLocalized:"2027-01-20",guestsCount:6,expiresAt:"2027-01-01T00:00:00Z",rates:{ratePlans:[{ratePlan:{_id:"default-rateplan-id",money:{currency:"CAD",invoiceItems:[2500,490,119.6,388.7].map(amount=>({amount}))}}}]}}});
const result=prepare(fixture());
assert.equal(result.body.status,"inquiry");
assert.equal(result.body.ratePlanId,"default-rateplan-id");
assert.equal(result.writeAuthorized,false);
for(const key of ["ignoreCalendar","ignoreTerms","ignoreBlocks"])assert.equal(result.body[key],false);
for(const key of ["reservedUntil","ccToken","payment"])assert.equal(key in result.body,false);
for(const [mutate,error] of [
 [f=>f.record.quote_total_cents++,/price_mismatch/],
 [f=>f.now=Date.parse(f.quote.expiresAt),/expired_quote/],
 [f=>f.record.guests++,/quote_mismatch/],
 [f=>f.record.property_id="other",/quote_mismatch/],
 [f=>f.record.quote_currency="USD",/missing_invoice/],
 [f=>f.quote.rates.ratePlans.push(f.quote.rates.ratePlans[0]),/ambiguous_rate_plan/],
 [f=>f.quote.rates.ratePlans[0].ratePlan.money.invoiceItems[0].amount="2500",/invalid_invoice/]
]){const f=fixture();mutate(f);assert.throws(()=>prepare(f),error);}
console.log("PASS: offline nonblocking inquiry candidate");

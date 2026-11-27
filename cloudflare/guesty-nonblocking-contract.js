// Official contract: https://open-api-docs.guesty.com/docs/reservations-v3-booking-flow
// Offline validation only. No network or payment operations.
export function selectedRatePlan(quote,approvedId){
 if(quote?.status!=="valid")throw Error("quote_not_valid");
 const plans=quote.rates?.ratePlans;
 if(!Array.isArray(plans))throw Error("missing_plans");
 const applicable=plans.filter(p=>p?.notApplicable==null|| (typeof p.notApplicable==="object"&&!Array.isArray(p.notApplicable)&&Object.values(p.notApplicable).every(v=>v===false)));
 const matching=applicable.filter(p=>{const r=p.ratePlan;return r&&(!r.id||!r._id||r.id===r._id)&&(approvedId?(r.id??r._id)===approvedId:applicable.length===1)});
 if(matching.length!==1)throw Error("ambiguous_or_blocked_rate_plan");
 const plan=matching[0],id=plan.ratePlan.id??plan.ratePlan._id;
 if(typeof id!=="string"||!id.trim())throw Error("missing_rate_plan");
 return {plan,id};
}
export function verifyV3InquiryResponse(body,expected){
 const id=body?.reservationId;
 if(!/^[a-f0-9]{24}$/i.test(id??"")||body.status!=="inquiry"||body.quoteId!==expected.quoteId||body.unitTypeId!==expected.unitTypeId||body.confirmedAt!=null)return {state:"manual_review",retryAutomatically:false};
 return {state:"needs_verification",reference:id,retryAutomatically:false};
}
export function assertInquiryOnly(body){
 if(!body||body.status!=="inquiry"||! /^[a-f0-9]{24}$/i.test(body.quoteId??"")||typeof body.ratePlanId!=="string"||!body.ratePlanId.trim()||["ignoreCalendar","ignoreTerms","ignoreBlocks"].some(k=>body[k]!==false))throw Error("unsafe_payload");
 if(Object.keys(body).some(k=>!["quoteId","status","ratePlanId","guest","ignoreCalendar","ignoreTerms","ignoreBlocks"].includes(k)))throw Error("unsafe_payload");
 if(!body.guest||Object.keys(body.guest).some(k=>!["firstName","lastName","email","phones"].includes(k)))throw Error("unsafe_guest");
 if(!["firstName","lastName","email"].every(k=>typeof body.guest[k]==="string"&&body.guest[k].trim())||!Array.isArray(body.guest.phones)||!body.guest.phones.length||!body.guest.phones.every(v=>typeof v==="string"&&/^\+[1-9]\d{7,14}$/.test(v)))throw Error("unsafe_guest");
}

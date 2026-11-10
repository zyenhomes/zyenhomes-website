// Offline Booking Engine quote rate-plan verification.
// Never select a rate plan by guess or perform a Guesty write.
const ID=/^[a-f0-9]{24}$/i;
export function selectBookingEngineRatePlan({response,quoteId,selectedRatePlanId}={}) {
 const blocked=reason=>Object.freeze({verified:false,reason,ratePlanId:null,writeAuthorized:false});
 if(!ID.test(quoteId??""))return blocked("invalid_quote_id");
 const data=response?.results??response;
 const quote=Array.isArray(data)?(data.length===1?data[0]:null):data;
 if(!quote||typeof quote!=="object"||quote._id!==quoteId)return blocked("quote_identity_unverified");
 const plans=quote?.rates?.ratePlans;
 if(!Array.isArray(plans)||plans.length===0)return blocked("rate_plans_missing");
 const ids=plans.map(p=>p?.ratePlan?._id??p?.ratePlanId??p?._id);
 if(!ids.every(id=>ID.test(id??"")))return blocked("rate_plan_shape_unverified");
 if(new Set(ids).size!==ids.length)return blocked("duplicate_rate_plan_ids");
 let id;
 if(selectedRatePlanId!==undefined) {
  if(!ID.test(selectedRatePlanId))return blocked("invalid_selected_rate_plan");
  if(!ids.includes(selectedRatePlanId))return blocked("rate_plan_not_in_quote");
  id=selectedRatePlanId;
 } else if(ids.length===1) id=ids[0];
 else return blocked("multiple_rate_plans_selection_required");
 return Object.freeze({verified:true,reason:"rate_plan_from_quote_verified",ratePlanId:id,
   writeAuthorized:false});
}

// Unwired candidate. No default fetch, no route, no credentials stored.
// Live transport remains compile-time disabled until a separately reviewed release.
export const LIVE_TEST_TRANSPORT_ENABLED=false;
export const INQUIRY_URL="https://open-api.guesty.com/v1/reservations-v3/quote";
export function prepareLiveTestTransport({env,approval,requestId,attemptId,quoteId,body}={}){
 const deny=reason=>Object.freeze({allowed:false,reason,retryAutomatically:false});
 if(env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true")return deny("test_disabled");
 if(!requestId||!attemptId||!quoteId||approval?.requestId!==requestId||approval?.attemptId!==attemptId||approval?.quoteId!==quoteId||approval?.approved!==true)return deny("approval_mismatch");
 if(!body||body.quoteId!==quoteId||body.status!=="inquiry"||body.ignoreCalendar!==false||body.ignoreTerms!==false||body.ignoreBlocks!==false)return deny("unsafe_payload");
 const allowed=new Set(["quoteId","status","ratePlanId","ignoreCalendar","ignoreTerms","ignoreBlocks","guest"]);
 if(Object.keys(body).some(k=>!allowed.has(k)))return deny("unexpected_payload_field");
 if(!body.guest||Object.keys(body.guest).some(k=>!["firstName","lastName","email","phones"].includes(k)))return deny("unexpected_guest_field");
 return deny("compile_time_live_transport_disabled");
}

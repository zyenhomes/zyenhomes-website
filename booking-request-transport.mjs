// Isolated booking-request transport. Not imported by the live form.
// Activation requires a separate review and must not be inferred from HTTP success.
export const BOOKING_REQUEST_API_URL =
  "https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/public/booking-request";

export function createBookingRequestTransport({fetchImpl,endpoint=BOOKING_REQUEST_API_URL}={}) {
  if(typeof fetchImpl!=="function") throw Error("Fetch implementation required");
  if(endpoint!==BOOKING_REQUEST_API_URL) throw Error("Unapproved booking endpoint");
  return async function submitBookingRequest(body) {
    if(!body||typeof body!=="object"||!(/^[A-Za-z0-9_-]{24,128}$/.test(body.requestKey||"")))
      throw Error("Missing validated request key");
    let response;
    try {
      response=await fetchImpl(endpoint,{
        method:"POST",
        mode:"cors",
        credentials:"omit",
        cache:"no-store",
        redirect:"error",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
    } catch {
      // A request may have reached D1 even when the response was lost.
      // Never automatically retry or generate a fresh key.
      return Object.freeze({submitted:false,reason:"uncertain_manual_review",retryAutomatically:false});
    }
    let data;
    try {data=await response.json();} catch {
      return Object.freeze({submitted:false,reason:"uncertain_manual_review",retryAutomatically:false});
    }
    if((response.status===200||response.status===201)&&data?.success===true&&
      typeof data.requestId==="string"&&data.status==="received")
      return Object.freeze({submitted:true,requestId:data.requestId,
        confirmedReservation:false,duplicate:response.status===200});
    if(response.status===409)
      return Object.freeze({submitted:false,reason:"conflict_review_details",retryAutomatically:false});
    if(response.status===503)
      return Object.freeze({submitted:false,reason:"booking_api_unavailable",retryAutomatically:false});
    return Object.freeze({submitted:false,reason:"manual_review",retryAutomatically:false});
  };
}

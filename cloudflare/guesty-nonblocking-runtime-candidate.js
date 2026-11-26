import {requestGuestyOpenApiToken} from "./guesty-open-api-auth.js";
import {EXECUTION_ENABLED} from "./guesty-nonblocking-execution-candidate.js";
// No production binding fallback. Transport must be supplied by reviewed caller.
export function createIsolatedRuntime(env,transport){
 if(!EXECUTION_ENABLED||env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true")return null;
 const db=env.ISOLATED_BOOKING_DB;
 if(!db||typeof db.prepare!=="function"||typeof db.batch!=="function"||typeof transport!=="function")return null;
 let tokenPromise;
 async function getToken(){
 tokenPromise??=requestGuestyOpenApiToken({env,transport:(url,options)=>transport(url,{...options,redirect:"error",signal:AbortSignal.timeout(15000)})});
 const result=await tokenPromise;
 if(!result.ok)throw Error("open_api_auth_failed");
 return result.accessToken;
 }
 async function readQuote(id){
 if(!/^[a-f0-9]{24}$/i.test(id))throw Error("invalid_quote_id");
 const token=await getToken();
 const r=await transport("https://open-api.guesty.com/v1/quotes/"+id,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
 if(!r.ok)throw Error("quote_read_failed");
 const raw=await r.json(),q=raw?.results??raw;
 if(!q||q._id!==id||q.status!=="valid"||q.accountId!==env.GUESTY_EXPECTED_ACCOUNT_ID||!env.GUESTY_EXPECTED_ACCOUNT_ID||!(Date.parse(q.createdAt)<=Date.now())||!(Date.parse(q.expiresAt)>Date.now()))throw Error("quote_provenance_failed");
 return q;
 }
 async function readReservation(id){
 if(!/^[a-f0-9]{24}$/i.test(id))throw Error("invalid_reservation_id");
 const token=await getToken();
 const url = "https://open-api.guesty.com/v1/reservations-v3?reservationIds=" + encodeURIComponent(id) + "&includePaymentsTemplate=false&mergeAccommodationFarePriceComponents=false&applyGuestFacingMerges=false";
const r = await transport(url,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
 if(!r.ok)throw Error("reservation_read_failed");
 const raw = await r.json();
const records = Array.isArray(raw) ? raw : raw?.results;
if (!Array.isArray(records) || records.length !== 1) {
  throw Error("reservation_response_invalid");
}
const reservation = records[0];
if (reservation?._id !== id) {
  throw Error("reservation_identity_mismatch");
}
return reservation;
 }
 return {db,getToken,readQuote,readReservation,transport};
}

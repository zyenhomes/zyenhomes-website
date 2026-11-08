// Read-only preflight for the Zyen Homes Guesty inquiry integration.
// This helper performs no Guesty inquiry write, reservation creation, or D1 mutation.
// Never expose credentials, tokens, guest PII, or internal errors to the browser.
import {requestGuestyOpenApiToken} from "./guesty-open-api-auth.js";

export async function checkGuestyInquiryReadiness({env,db,tokenTransport,verifyQuoteContract}={}) {
  const blockers=[];
  if(env?.BOOKING_REQUESTS_ENABLED!=="false")
    blockers.push("booking_request_gate_not_confirmed_disabled");
  if(env?.GUESTY_INQUIRY_WRITES_ENABLED==="true")
    blockers.push("guesty_write_gate_not_disabled");
  if(!db||typeof db.prepare!=="function")
    blockers.push("database_unavailable");
  else {
    try {
      const columns=await db.prepare("PRAGMA table_info(booking_requests)").all();
      const names=new Set((columns?.results||[]).map(x=>x.name));
      for(const name of ["guesty_quote_id","guesty_sync_claim_token","request_idempotency_key","request_payload_fingerprint"])
        if(!names.has(name)) blockers.push("missing_column_"+name);
      const indexes=await db.prepare("PRAGMA index_list(booking_requests)").all();
      if(!(indexes?.results||[]).some(x=>x.name==="idx_booking_requests_idempotency_key"&&x.unique===1))
        blockers.push("missing_unique_request_key_index");
    } catch {blockers.push("database_schema_unverified");}
  }
  // An OAuth token proves authentication only, NOT reservation/inquiry-write scope.
  const token=await requestGuestyOpenApiToken({env,transport:tokenTransport});
  if(!token.ok) blockers.push("open_api_auth_"+token.reason);
  // Quote provenance between Booking Engine and Open API remains unverified.
  // A caller must supply an independently implemented, read-only contract verifier.
  let quoteContractVerified=false;
  if(typeof verifyQuoteContract==="function") {
    try {quoteContractVerified=(await verifyQuoteContract())===true;} catch {}
  }
  if(!quoteContractVerified) blockers.push("quote_cross_api_contract_unverified");
  if(env?.GUESTY_INQUIRY_WRITE_PERMISSION_VERIFIED!=="true")
    blockers.push("inquiry_write_permission_unverified");
  if(env?.GUESTY_INQUIRY_RECONCILIATION_READY!=="true")
    blockers.push("reconciliation_not_ready");
  return Object.freeze({
    readyForControlledWrite:false,
    blockers:Object.freeze(blockers),
    authenticated:token.ok===true,
    quoteContractVerified,
    requiresExplicitLiveWriteApproval:true
  });
}

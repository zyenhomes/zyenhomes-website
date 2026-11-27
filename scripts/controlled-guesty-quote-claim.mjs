// Isolated test quote authorization. No default network transport or CLI.
import {DB} from "./nonblocking-upload-preflight.mjs";
import {TEST_BOOKING,createControlledQuote} from "./controlled-guesty-quote.mjs";

// Fixed for the entire approved test, not a per-run or per-commit key.
// Never delete or reset after an uncertain request.
export const QUOTE_TEST_KEY="quote-149-tyrolean-20270118-20270120-6-v1";
export const CLAIM_QUOTE_SQL=`
INSERT INTO controlled_quote_attempts (test_key,run_id,commit_sha)
VALUES (?,?,?)
ON CONFLICT(test_key) DO NOTHING
RETURNING test_key,run_id,commit_sha
`.trim();
export const VERIFY_QUOTE_SQL=`
UPDATE controlled_quote_attempts
SET state='verified',completed_at=CURRENT_TIMESTAMP,
    quote_id=?,quote_expires_at=?,rate_plan_id=?,currency=?,total_cents=?
WHERE test_key=? AND run_id=? AND commit_sha=? AND state='claimed'
RETURNING test_key,run_id,commit_sha,state
`.trim();
export const UNCERTAIN_QUOTE_SQL=`
UPDATE controlled_quote_attempts
SET state='uncertain',completed_at=CURRENT_TIMESTAMP
WHERE test_key=? AND run_id=? AND commit_sha=? AND state='claimed'
RETURNING test_key,run_id,commit_sha,state
`.trim();

function validRun(runId,commitSha){
  if(typeof runId!=="string"||!/^[0-9]{1,30}$/.test(runId)||
     typeof commitSha!=="string"||!/^[a-f0-9]{40}$/.test(commitSha))
    throw Error("invalid_quote_run_identity");
}

function exactRow(row,runId,commitSha){
  return row?.test_key===QUOTE_TEST_KEY&&row.run_id===runId&&row.commit_sha===commitSha;
}

export async function createIsolatedQuoteStore({account,token,transport}={}){
  if(typeof account!=="string"||!/^[a-f0-9]{32}$/i.test(account)||
     typeof token!=="string"||!token.trim()||typeof transport!=="function")
    throw Error("missing_isolated_quote_store");
  const root="https://api.cloudflare.com/client/v4/accounts/"+account+"/d1/database/"+DB;
  async function request(path,method,body){
    const r=await transport(root+path,{
      method,redirect:"error",signal:AbortSignal.timeout(15000),
      headers:{Authorization:"Bearer "+token,Accept:"application/json","Content-Type":"application/json"},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    if(!r?.ok)throw Error("isolated_quote_store_http_failure");
    const j=await r.json();
    if(j?.success!==true||!j.result||
       (Array.isArray(j.errors)&&j.errors.length))
      throw Error("isolated_quote_store_api_failure");
    return j.result;
  }
  const metadata=await request("","GET");
  if(metadata.uuid!==DB||metadata.name!=="zyenhomes-booking-test")
    throw Error("wrong_quote_database");
  async function query(sql,params){
    const rows=await request("/query","POST",{sql,params});
    const r=Array.isArray(rows)&&rows.length===1?rows[0]:null;
    if(r?.success!==true||!Array.isArray(r.results)||
       !Number.isSafeInteger(r.meta?.changes)||r.meta.changes<0)
      throw Error("quote_claim_result_unverified");
    return r;
  }
  return Object.freeze({
    async claim(runId,commitSha){
      validRun(runId,commitSha);
      const r=await query(CLAIM_QUOTE_SQL,[QUOTE_TEST_KEY,runId,commitSha]);
      if(r.meta.changes===0&&r.results.length===0)return false;
      if(r.meta.changes!==1||r.results.length!==1||
         !exactRow(r.results[0],runId,commitSha))
        throw Error("quote_claim_result_unverified");
      return true;
    },
    async verified(runId,commitSha,quote){
      validRun(runId,commitSha);
      if(!/^[a-f0-9]{24}$/i.test(quote?.quoteId??"")||
         !Number.isFinite(Date.parse(quote?.expiresAt))||
         typeof quote?.ratePlanId!=="string"||!quote.ratePlanId.trim()||
         quote.currency!=="CAD"||!Number.isSafeInteger(quote.totalCents)||quote.totalCents<=0)
        throw Error("invalid_quote_audit");
      const r=await query(VERIFY_QUOTE_SQL,[
        quote.quoteId,quote.expiresAt,quote.ratePlanId,quote.currency,String(quote.totalCents),
        QUOTE_TEST_KEY,runId,commitSha
      ]);
      if(r.meta.changes!==1||r.results.length!==1||
         !exactRow(r.results[0],runId,commitSha)||r.results[0].state!=="verified")
        throw Error("quote_audit_result_unverified");
    },
    async uncertain(runId,commitSha){
      validRun(runId,commitSha);
      const r=await query(UNCERTAIN_QUOTE_SQL,[QUOTE_TEST_KEY,runId,commitSha]);
      if(r.meta.changes!==1||r.results.length!==1||
         !exactRow(r.results[0],runId,commitSha)||r.results[0].state!=="uncertain")
        throw Error("quote_audit_result_unverified");
    }
  });
}

// Claim before authentication: even an ambiguous claim or auth failure blocks a retry.
// Never release the key, including after timeout, crash or failed audit.
export async function runClaimedControlledQuote({
  store,runId,commitSha,authenticate,transport,now=Date.now
}={}){
  validRun(runId,commitSha);
  if(typeof store?.claim!=="function"||typeof store?.verified!=="function"||
     typeof store?.uncertain!=="function"||typeof authenticate!=="function"||
     typeof transport!=="function"||typeof now!=="function")
    throw Error("missing_quote_authorization_dependencies");
  if(await store.claim(runId,commitSha)!==true)
    throw Error("quote_authorization_already_consumed");

  let quote;
  try{
    const auth=await authenticate();
    if(auth?.ok!==true||typeof auth.accessToken!=="string"||!auth.accessToken.trim())
      throw Error("quote_authentication_failed");
    quote=await createControlledQuote({token:auth.accessToken,transport,now});
  }catch{
    try{await store.uncertain(runId,commitSha);}catch{/* permanent claim remains */}
    throw Error("quote_attempt_uncertain_do_not_retry");
  }
  try{await store.verified(runId,commitSha,quote);}
  catch{throw Error("quote_audit_uncertain_do_not_retry");}
  return quote;
}

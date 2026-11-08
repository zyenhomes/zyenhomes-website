import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnoseGuestyOpenApiAuth } from "../cloudflare/guesty-open-api-auth-diagnostic.js";

const env={
  GUESTY_OPEN_API_AUTH_ENABLED:"true",
  GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"true",
  GUESTY_OPEN_API_CLIENT_ID:"example-client",
  GUESTY_OPEN_API_CLIENT_SECRET:"example-secret"
};
let calls=0;
const transport=async(url,init)=>{
  calls++;
  assert.equal(url,"https://open-api.guesty.com/oauth2/token");
  assert.equal(init.method,"POST");
  assert.equal(new URLSearchParams(init.body).get("client_id"),"example-client");
  return {ok:true,status:200,json:async()=>({access_token:"never-expose-token",expires_in:86400})};
};
assert.deepEqual(await diagnoseGuestyOpenApiAuth({env:{...env,GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"false"},transport}),
  {success:false,reason:"diagnostic_disabled"});
assert.equal(calls,0);
const success=await diagnoseGuestyOpenApiAuth({env,transport});
assert.equal(success.success,true);
assert.equal(calls,1);
assert.equal(JSON.stringify(success).includes("never-expose-token"),false);
assert.equal(JSON.stringify(success).includes("example-secret"),false);
assert.equal(JSON.stringify(success).includes("example-client"),false);
assert.equal(success.message.includes("not verified"),true);
const unauthorized=await diagnoseGuestyOpenApiAuth({env,transport:async()=>({ok:false,status:401})});
assert.deepEqual(unauthorized,{success:false,reason:"authentication_rejected",httpStatus:401});
const failed=await diagnoseGuestyOpenApiAuth({env,transport:async()=>{throw Error("sensitive transport error")}});
assert.deepEqual(failed,{success:false,reason:"transport_error"});
const worker=readFileSync("cloudflare/worker.js","utf8");
assert.doesNotMatch(worker,/guesty-open-api-auth-diagnostic\.js/);
assert.match(readFileSync("cloudflare/wrangler.toml","utf8"),/BOOKING_REQUESTS_ENABLED = "false"/);
assert.match(readFileSync("cloudflare/wrangler.toml","utf8"),/GUESTY_WEBHOOKS_ENABLED = "false"/);
console.log("PASS: gated auth-only diagnostic returns no secrets/tokens and remains disconnected from production.");

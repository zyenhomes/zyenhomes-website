import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requestGuestyOpenApiToken, OPEN_API_TOKEN_ENDPOINT } from "../cloudflare/guesty-open-api-auth.js";

const env = {
  GUESTY_OPEN_API_AUTH_ENABLED: "true",
  GUESTY_OPEN_API_CLIENT_ID: "test-open-client",
  GUESTY_OPEN_API_CLIENT_SECRET: "test-open-secret",
  GUESTY_CLIENT_ID: "must-not-use-booking-client",
  GUESTY_CLIENT_SECRET: "must-not-use-booking-secret"
};
let calls=0;
const transport=async (url,init)=>{
  calls++;
  assert.equal(url,OPEN_API_TOKEN_ENDPOINT);
  assert.equal(init.method,"POST");
  assert.equal(init.headers["Content-Type"],"application/x-www-form-urlencoded");
  const params=new URLSearchParams(init.body);
  assert.equal(params.get("grant_type"),"client_credentials");
  assert.equal(params.get("client_id"),env.GUESTY_OPEN_API_CLIENT_ID);
  assert.equal(params.get("client_secret"),env.GUESTY_OPEN_API_CLIENT_SECRET);
  assert.equal(params.has("scope"),false);
  return {ok:true,status:200,json:async()=>({access_token:"test-open-token",expires_in:86400})};
};
assert.equal((await requestGuestyOpenApiToken({env:{...env,GUESTY_OPEN_API_AUTH_ENABLED:"false"},transport})).reason,"disabled");
assert.equal((await requestGuestyOpenApiToken({env:{...env,GUESTY_OPEN_API_CLIENT_SECRET:""},transport})).reason,"missing_open_api_credentials");
assert.equal(calls,0);
const success=await requestGuestyOpenApiToken({env,transport,now:1000});
assert.equal(success.ok,true);
assert.equal(success.api,"guesty_open_api");
assert.equal(success.expiresAt,1000+(86400-300)*1000);
assert.equal(calls,1);
for (const response of [
  {ok:false,status:401},
  {ok:true,json:async()=>({})},
  {ok:true,json:async()=>({access_token:"abc",expires_in:20})},
  {ok:true,json:async()=>{throw Error("invalid json")}}
]) assert.equal((await requestGuestyOpenApiToken({env,transport:async()=>response})).ok,false);
assert.equal((await requestGuestyOpenApiToken({env,transport:async()=>{throw Error("timeout")}})).reason,"transport_error");
const worker=readFileSync("cloudflare/worker.js","utf8");
assert.match(worker,/scope: "booking_engine:api"/);
assert.doesNotMatch(worker,/guesty-open-api-auth\.js/);
console.log("PASS: separate Open API credentials, disabled-by-default authentication, and isolated token handling.");

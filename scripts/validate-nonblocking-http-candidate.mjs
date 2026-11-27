import assert from "node:assert/strict";
import {simulateAuthorizedHttp as send} from "../cloudflare/guesty-nonblocking-http-candidate.js";
let calls=0;
const fixture=()=>({now:0,env:{GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true",GUESTY_TEST_MODE:"mock",GUESTY_ISOLATED_APPROVAL_JSON:JSON.stringify({requestId:"request-001",attemptId:"attempt-001",quoteId:"quote-001",expiresAt:"2027-01-01T00:00:00Z"})},requestId:"request-001",attemptId:"attempt-001",body:{quoteId:"quote-001",status:"inquiry",ratePlanId:"default-rateplan-id",ignoreCalendar:false,ignoreTerms:false,ignoreBlocks:false,guest:{firstName:"Test",lastName:"Guest",email:"test@example.com",phones:["+14165550100"]}},token:"mock-token",transport:async(url,options)=>{calls++;assert.equal(url,"https://open-api.guesty.com/v1/reservations-v3/quote");assert.equal(options.method,"POST");assert.equal(options.redirect,"error");assert.equal(options.headers.Authorization,"Bearer mock-token");assert.equal(JSON.parse(options.body).status,"inquiry");return {status:200,json:async()=>({_id:"1234567890abcdef12345678"})};}});
assert.equal((await send(fixture())).state,"needs_verification");
for(const mutate of [f=>f.env.GUESTY_TEST_MODE="live",f=>f.env.GUESTY_ISOLATED_APPROVAL_JSON="bad",f=>f.attemptId="other",f=>f.now=Date.parse("2027-01-01"),f=>f.body.status="confirmed",f=>f.body.reservedUntil=-1,f=>f.body.guest.payment="bad"]){const f=fixture();mutate(f);assert.equal((await send(f)).state,"blocked");}
assert.equal(calls,1);
const f=fixture();f.transport=async()=>{throw Error("timeout")};const r=await send(f);assert.equal(r.state,"uncertain");assert.equal(r.retryAutomatically,false);
console.log("PASS: mocked HTTP and server approval gates");

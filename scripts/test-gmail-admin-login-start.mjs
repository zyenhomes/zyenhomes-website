import assert from "node:assert/strict";
import {handleAdminLoginStart} from "../gmail-archive-oauth/admin-login-start-route.js";
const origin="https://example.test",path=origin+"/admin/google/start";
let stored=null;
const deps={expectedOrigin:origin,clientId:"fictional-client",
 redirectUri:origin+"/admin/google/callback",
 authorizeInitiation:async()=>true,
 persistLoginState:async x=>{stored=x;}
};
const request=(method="POST",requestOrigin=origin)=>new Request(path,{method,headers:{"Origin":requestOrigin}});
const result=await handleAdminLoginStart(request(),deps);
assert.equal(result.status,303);
const redirect=new URL(result.headers.get("Location"));
assert.equal(redirect.origin,"https://accounts.google.com");
assert.equal(redirect.searchParams.get("scope"),"openid email");
assert.equal(redirect.searchParams.get("access_type"),null);
assert.equal(redirect.searchParams.get("state"),stored.state);
assert.equal(redirect.searchParams.get("nonce"),stored.nonce);
assert.equal(stored.ttlSeconds,600);
assert.equal((await handleAdminLoginStart(request("GET"),deps)).status,405);
assert.equal((await handleAdminLoginStart(request("POST","https://evil.test"),deps)).status,403);
assert.equal((await handleAdminLoginStart(request(),{...deps,authorizeInitiation:async()=>false})).status,403);
await assert.rejects(()=>handleAdminLoginStart(request(),{...deps,persistLoginState:async()=>{throw Error("store unavailable");}}),/store unavailable/);
console.log("PASS: synthetic admin OAuth start route, origin/authorization gating and minimal scopes");

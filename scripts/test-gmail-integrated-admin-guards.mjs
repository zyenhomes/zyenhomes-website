import assert from "node:assert/strict";
import {issueLoginCsrf} from "../gmail-archive-oauth/admin-login-csrf.js";
import {protectedAdminLoginStart} from "../gmail-archive-oauth/protected-admin-login-start.js";
const origin="https://example.test",csrf=issueLoginCsrf().token;
let persisted=0,limited=0;
const request=(token=csrf)=>new Request(origin+"/admin/google/start",{method:"POST",headers:{"Origin":origin,"X-Zyen-CSRF":token,"Cookie":"__Host-zyen_login_csrf="+csrf}});
const deps={
 expectedOrigin:origin,clientId:"fictional-client",redirectUri:origin+"/admin/google/callback",
 rateLimitKey:"admin-login:fictional-ip",
 limiter:{limit:async()=>{limited++;return {success:true};}},
 authorizeInitiation:async()=>true,
 persistLoginState:async()=>{persisted++;}
};
const ok=await protectedAdminLoginStart(request(),deps);
assert.equal(ok.status,303);assert.equal(persisted,1);assert.equal(limited,1);
assert.equal(new URL(ok.headers.get("Location")).searchParams.get("scope"),"openid email");
assert.equal((await protectedAdminLoginStart(request("f".repeat(64)),deps)).status,403);
assert.equal(persisted,1);assert.equal(limited,1);
assert.equal((await protectedAdminLoginStart(request(),{...deps,limiter:{limit:async()=>({success:false})}})).status,429);
assert.equal(persisted,1);
assert.equal((await protectedAdminLoginStart(request(),{...deps,limiter:null})).status,503);
assert.equal((await protectedAdminLoginStart(request(),{...deps,authorizeInitiation:async()=>false})).status,403);
assert.equal(persisted,1);
await assert.rejects(()=>protectedAdminLoginStart(request(),{...deps,persistLoginState:async()=>{throw Error("D1 unavailable");}}),/D1 unavailable/);
console.log("PASS: combined CSRF, rate-limit, initiation authorization and fail-closed session persistence");
console.log("No live Worker routing, Google API calls, or production D1 writes");

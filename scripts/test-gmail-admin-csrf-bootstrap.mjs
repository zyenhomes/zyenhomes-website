import assert from "node:assert/strict";
import {bootstrapAdminLoginCsrf} from "../gmail-archive-oauth/admin-csrf-bootstrap.js";
import {validateLoginCsrf} from "../gmail-archive-oauth/admin-login-csrf.js";
const origin="https://example.test",url=origin+"/admin/login/csrf";
const make=(method="POST",from=origin)=>new Request(url,{method,headers:{"Origin":from}});
const config={expectedOrigin:origin,authorizeBootstrap:()=>true};
const response=bootstrapAdminLoginCsrf(make(),config);
assert.equal(response.status,200);
assert.equal(response.headers.get("Cache-Control"),"no-store");
assert.equal(response.headers.get("Access-Control-Allow-Origin"),null);
const cookie=response.headers.get("Set-Cookie");
assert.match(cookie,/HttpOnly; SameSite=Strict/);
const {csrfToken}=await response.json();
assert.match(csrfToken,/^[0-9a-f]{64}$/);
const login=new Request(origin+"/admin/google/start",{method:"POST",headers:{
 "Origin":origin,"Cookie":cookie.split(";")[0],"X-Zyen-CSRF":csrfToken
}});
assert.equal(validateLoginCsrf(login,origin),true);
assert.equal(bootstrapAdminLoginCsrf(make("GET"),config).status,405);
assert.equal(bootstrapAdminLoginCsrf(make("POST","https://evil.test"),config).status,403);
assert.equal(bootstrapAdminLoginCsrf(make(),{expectedOrigin:origin}).status,403);
assert.equal(bootstrapAdminLoginCsrf(make(),{expectedOrigin:origin,authorizeBootstrap:()=>false}).status,403);
console.log("PASS: synthetic same-origin CSRF bootstrap, HttpOnly cookie, token header and denial cases");
console.log("Not wired to live Worker; no Google access or production changes");

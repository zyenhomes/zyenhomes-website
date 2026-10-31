import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import worker from "../gmail-archive-oauth/worker.js";
const source=readFileSync("gmail-archive-oauth/worker.js","utf8");
assert.match(source,/import \{dispatchAdminRoutes\}/);
assert.match(source,/const LIVE_ADMIN_ROUTES_ENABLED=false;/);
const paths=["/admin/login/csrf","/admin/google/start","/admin/google/callback","/oauth/google/start","/oauth/google/callback"];
for(const path of paths){
 for(const flag of ["true","false"]){
  const req=new Request("https://example.test"+path,{method:"POST",headers:{"Origin":"https://example.test","X-Zyen-CSRF":"a".repeat(64)}});
  const response=await worker.fetch(req,{GMAIL_ARCHIVE_ENABLED:flag});
  assert.equal(response.status,503,path);
  assert.equal(response.headers.get("Cache-Control"),"no-store");
  assert.equal(response.headers.get("Location"),null);
  assert.equal(response.headers.get("Set-Cookie"),null);
 }
}
assert.equal((await worker.fetch(new Request("https://example.test/unrelated"),{})).status,404);
console.log("PASS: Worker imports admin dispatcher but all admin/archive OAuth routes remain hard-disabled.");
console.log("No real OAuth, D1, Gmail, or Cloudflare deployment.");

import assert from "node:assert/strict";
import worker from "../gmail-archive-oauth/worker.js";
for(const path of ["/oauth/google/start","/oauth/google/callback?code=fake&state=fake"]){
 for(const flag of ["false","true"]){
  const response=await worker.fetch(new Request("https://example.test"+path),{GMAIL_ARCHIVE_ENABLED:flag});
  assert.equal(response.status,503);
  assert.equal(response.headers.get("Cache-Control"),"no-store");
 }
}
assert.equal((await worker.fetch(new Request("https://example.test/other"),{})).status,404);
console.log("PASS: both OAuth routes fail closed regardless of feature flag.");

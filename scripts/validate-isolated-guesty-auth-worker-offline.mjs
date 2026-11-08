import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../tests/guesty-open-api-auth-worker/worker.mjs";

const url = "https://test.invalid/internal/auth-check";
const post = key => new Request(url,{method:"POST",headers:key?{"X-Zyen-Auth-Test-Key":key}:{}});
const key = "offline-test-admin-token-32-characters-plus";
const env = {
  GUESTY_OPEN_API_AUTH_ENABLED:"false",
  GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"false",
  GUESTY_AUTH_TEST_ADMIN_TOKEN:key,
  GUESTY_OPEN_API_CLIENT_ID:"offline-client",
  GUESTY_OPEN_API_CLIENT_SECRET:"offline-secret"
};
const disabled=await worker.fetch(post(key),env);
assert.equal(disabled.status,503);
assert.equal((await disabled.json()).reason,"disabled");
const enabled={...env,GUESTY_OPEN_API_AUTH_ENABLED:"true",GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"true"};
for(const supplied of [undefined,"wrong","offline-test-admin-token-32-characters-pluz"]){
  const result=await worker.fetch(post(supplied),enabled);
  assert.equal(result.status,401);
  assert.equal((await result.json()).reason,"unauthorized");
}
const notFound=await worker.fetch(new Request("https://test.invalid/"),enabled);
assert.equal(notFound.status,404);
const cfg=readFileSync("tests/guesty-open-api-auth-worker/wrangler.toml","utf8");
assert.match(cfg,/workers_dev = false/);
assert.match(cfg,/GUESTY_OPEN_API_AUTH_ENABLED = "false"/);
assert.match(cfg,/GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED = "false"/);
assert.doesNotMatch(cfg,/zyenhomes-booking-api/);
const src=readFileSync("tests/guesty-open-api-auth-worker/worker.mjs","utf8");
assert.doesNotMatch(src,/guesty-inquiry-submit|reservations-v3\/quote|BOOKING_DB|GUESTY_WEBHOOKS_ENABLED/);
assert.doesNotMatch(readFileSync("cloudflare/worker.js","utf8"),/guesty-open-api-auth-worker/);
console.log("PASS: isolated test Worker is gated, admin-protected, and disconnected from production.");
console.log("No external Guesty call made by these tests.");

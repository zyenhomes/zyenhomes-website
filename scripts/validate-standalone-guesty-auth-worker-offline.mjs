import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../tests/guesty-open-api-auth-worker/standalone-dashboard-worker.mjs";

const source = readFileSync("tests/guesty-open-api-auth-worker/standalone-dashboard-worker.mjs","utf8");
assert.doesNotMatch(source,/^import\s/m);
assert.doesNotMatch(source,/reservations-v3\/quote|booking\.guesty\.com|BOOKING_DB|guesty-inquiry-submit/);
const env = {
  GUESTY_OPEN_API_AUTH_ENABLED:"false",
  GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"false",
  GUESTY_AUTH_TEST_ADMIN_TOKEN:"test-admin-token-with-more-than-32-chars",
  GUESTY_OPEN_API_CLIENT_ID:"test-id",
  GUESTY_OPEN_API_CLIENT_SECRET:"test-secret"
};
const url="https://test.invalid/internal/auth-check";
const request = key => new Request(url,{method:"POST",headers:key?{"X-Zyen-Auth-Test-Key":key}:{}});
let response=await worker.fetch(request(env.GUESTY_AUTH_TEST_ADMIN_TOKEN),env);
assert.equal(response.status,503);
assert.equal((await response.json()).reason,"disabled");
const enabled={...env,GUESTY_OPEN_API_AUTH_ENABLED:"true",GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"true"};
for (const key of [undefined,"wrong","test-admin-token-with-more-than-32-charz"]) {
  response=await worker.fetch(request(key),enabled);
  assert.equal(response.status,401);
  assert.equal((await response.json()).reason,"unauthorized");
}
response=await worker.fetch(new Request("https://test.invalid/"),enabled);
assert.equal(response.status,404);
const prod=readFileSync("cloudflare/worker.js","utf8");
assert.doesNotMatch(prod,/standalone-dashboard-worker/);
console.log("PASS: standalone dashboard Worker has no imports and denies disabled or unauthorized requests without network.");

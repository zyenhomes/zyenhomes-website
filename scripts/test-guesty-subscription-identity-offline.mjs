// Synthetic-only endpoint identity tests. No Guesty API calls or secrets.
import assert from "node:assert/strict";
const endpoint="https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/webhooks/guesty/messages";
const matching=subscriptions=>subscriptions.filter(item=>item&&typeof item==="object"&&item.url===endpoint);
assert.equal(matching([{url:endpoint}]).length,1);
assert.equal(matching([]).length,0);
assert.equal(matching([{url:"https://example.invalid/other"}]).length,0);
assert.equal(matching([{url:endpoint},{url:endpoint}]).length,2);
assert.equal(matching([{url:endpoint},{url:"https://example.invalid/other"}]).length,1);
const {readFileSync}=await import("node:fs");
const script=readFileSync("scripts/install-guesty-signing-secret.mjs","utf8");
assert.match(script,/matching\.length!==1/);
assert.match(script,/item\.url===endpoint/);
assert.ok(script.indexOf("matching.length!==1")<script.indexOf('const url=new URL("https://open-api.guesty.com/v1/webhooks-v2/secret")'));
console.log("PASS: endpoint identity matching rejects absent, wrong, and duplicate subscriptions.");

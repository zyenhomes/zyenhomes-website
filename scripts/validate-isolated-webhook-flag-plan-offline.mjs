import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const doc=readFileSync("docs/isolated-guesty-webhook-flag-version-test.md","utf8");
const config=readFileSync("cloudflare/wrangler.toml","utf8");
const checks=[
 ["Isolated Worker hardcoded",doc.includes("zyenhomes-webhook-test")],
 ["Never target production Worker",doc.includes("NEVER `zyenhomes-booking-api`")],
 ["Explicit approval before write",doc.includes("separate explicit user approval")],
 ["Undeployed only",doc.includes("*undeployed* version")],
 ["Dummy secret preservation",doc.includes("TEST_DUMMY_SECRET")],
 ["Binding parity",doc.includes("binding names, types, exposed targets")],
 ["No traffic change",doc.includes("100% of traffic")],
 ["Production booking gate remains disabled",/^BOOKING_REQUESTS_ENABLED\s*=\s*"false"$/m.test(config)],
 ["Production webhook gate remains disabled",/^GUESTY_WEBHOOKS_ENABLED\s*=\s*"false"$/m.test(config)]
];
for(const [name,ok] of checks)console.log((ok?"PASS: ":"FAIL: ")+name);
if(checks.some(([,ok])=>!ok))process.exitCode=1;

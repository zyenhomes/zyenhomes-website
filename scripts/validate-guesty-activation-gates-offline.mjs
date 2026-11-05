// Offline-only guardrail for activation preparation. No Cloudflare API calls.
import {readFileSync} from "node:fs";
const config=readFileSync("cloudflare/wrangler.toml","utf8");
const plan=readFileSync("docs/guesty-webhook-enabled-rollout-gates.md","utf8");
const receiver=readFileSync("cloudflare/guesty-webhooks.js","utf8");
const checks=[
 ["Current repository webhook flag remains disabled",/^GUESTY_WEBHOOKS_ENABLED\s*=\s*"false"\s*$/m.test(config)],
 ["Booking submissions remain disabled",/^BOOKING_REQUESTS_ENABLED\s*=\s*"false"\s*$/m.test(config)],
 ["Receiver requires signing secret",receiver.includes("!env.GUESTY_WEBHOOK_SECRET")],
 ["Receiver verifies signatures",receiver.includes("verifyGuestySvix(request.headers,raw,env.GUESTY_WEBHOOK_SECRET)")],
 ["Plan requires separate candidate creation approval",plan.includes("separate explicit user approval")],
 ["Plan prohibits unverified wrangler deploy",plan.includes("regular `wrangler deploy` is **not acceptable**")],
 ["Plan requires distinct promotion approval",plan.includes("another explicit user approval")],
 ["Plan preserves manual replay approval",plan.includes("separate approval before manual replay")]
];
for(const [name,ok] of checks)console.log((ok?"PASS: ":"FAIL: ")+name);
if(checks.some(([,ok])=>!ok))process.exitCode=1;

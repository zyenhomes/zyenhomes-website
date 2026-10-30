// Safe activation readiness check: no external writes and no secret output.
import {readFileSync} from "node:fs";
const worker=readFileSync("cloudflare/guesty-webhooks.js","utf8");
const config=readFileSync("cloudflare/wrangler.toml","utf8");
const plan=readFileSync("docs/guesty-webhook-activation-plan.md","utf8");
const checks=[
 ["Receiver disabled in repository",/^GUESTY_WEBHOOKS_ENABLED\s*=\s*"false"\s*$/m.test(config)],
 ["Booking submissions disabled in repository",/^BOOKING_REQUESTS_ENABLED\s*=\s*"false"\s*$/m.test(config)],
 ["Signature verification present",worker.includes("verifyGuestySvix(request.headers,raw,env.GUESTY_WEBHOOK_SECRET)")],
 ["Signing secret required",worker.includes("!env.GUESTY_WEBHOOK_SECRET")],
 ["Message received supported",worker.includes("reservation.messageReceived")],
 ["Message sent supported",worker.includes("reservation.messageSent")],
 ["D1 archive insert present",worker.includes("INSERT OR IGNORE INTO guesty_message_events")],
 ["Signing secret handoff documented",plan.includes("GUESTY_WEBHOOK_SECRET")]
];
for(const [label,ok] of checks)console.log((ok?"PASS: ":"FAIL: ")+label);
if(checks.some(([,ok])=>!ok))process.exit(1);
console.log("Code readiness passed. This does NOT verify live Cloudflare settings or create subscriptions.");

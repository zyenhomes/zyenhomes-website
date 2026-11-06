// Offline-only candidate configuration preparation.
// Does NOT create or upload a Cloudflare Worker version.
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const original=readFileSync("cloudflare/wrangler.toml","utf8");
const source=readFileSync("cloudflare/worker.js","utf8");
const receiver=readFileSync("cloudflare/guesty-webhooks.js","utf8");
const oldFlag='GUESTY_WEBHOOKS_ENABLED = "false"';
const newFlag='GUESTY_WEBHOOKS_ENABLED = "true"';
assert.equal(original.split(oldFlag).length,2,"Expected exactly one disabled webhook flag");
assert.match(original,/^BOOKING_REQUESTS_ENABLED\s*=\s*"false"$/m);
assert.match(original,/^keep_vars\s*=\s*true$/m);
assert.match(original,/^name\s*=\s*"zyenhomes-booking-api"$/m);
assert.match(original,/^main\s*=\s*"worker.js"$/m);
for(const name of ["BOOKING_DB","GUESTY_TOKEN_KV","BOOKING_RATE_LIMITER"])assert.ok(original.includes(name),"Missing resource binding: "+name);
assert.match(source,/receiveGuestyMessageWebhook/);
assert.match(receiver,/verifyGuestySvix/);
const candidate=original.replace(oldFlag,newFlag);
assert.equal(candidate.replace(newFlag,oldFlag),original,"Unexpected configuration change");
assert.match(candidate,/^BOOKING_REQUESTS_ENABLED\s*=\s*"false"$/m);
assert.equal(readFileSync("cloudflare/wrangler.toml","utf8"),original,"Repository config modified");
console.log("PASS: hypothetical candidate changes only webhook flag false to true; booking gate remains disabled.");
console.log("PASS: repository Worker source remains untouched; existing resource binding declarations remain in candidate.");
console.log("LIMITATION: offline comparison cannot establish deployed code parity, secret value preservation, or upload behavior.");
console.log("NO WRITES: candidate config was never uploaded, saved, or deployed.");

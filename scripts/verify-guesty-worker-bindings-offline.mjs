// Offline-only assertions: does not invoke Wrangler or contact external services.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const config=readFileSync("cloudflare/wrangler.toml","utf8");
const handoff=readFileSync("scripts/install-guesty-signing-secret.mjs","utf8");
for(const required of [
 'keep_vars = true',
 'binding = "BOOKING_DB"',
 'binding = "GUESTY_TOKEN_KV"',
 'name = "BOOKING_RATE_LIMITER"',
 'BOOKING_REQUESTS_ENABLED = "false"',
 'GUESTY_WEBHOOKS_ENABLED = "false"'
])assert.ok(config.includes(required),"Missing expected configuration declaration");
assert.ok(handoff.includes('GUESTY_WEBHOOK_SECRET'),"Secret target missing");
assert.ok(handoff.includes('wrangler.toml'),"Wrangler config target missing");
console.log("PASS: expected binding declarations and disabled flags are present in repository");
console.log("LIMITATION: offline checks cannot prove production secret installation preserves bindings");

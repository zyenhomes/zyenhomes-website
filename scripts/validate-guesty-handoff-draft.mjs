// Offline structural preflight only. Never contacts Guesty or Cloudflare.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const handoff=readFileSync("scripts/install-guesty-signing-secret.mjs","utf8");
const workflow=readFileSync(".github/workflows/install-guesty-signing-secret.yml","utf8");
const config=readFileSync("cloudflare/wrangler.toml","utf8");
assert.match(handoff,/INSTALL_GUESTY_SIGNING_SECRET/);
assert.match(handoff,/GUESTY_WEBHOOK_SECRET/);
assert.match(handoff,/webhooks-v2\/secret/);
assert.match(handoff,/spawnSync/);
assert.match(handoff,/\["versions","secret","put","GUESTY_WEBHOOK_SECRET"/);
assert.match(handoff,/Object\.keys\(payload\)\.length!==1/);
assert.match(workflow,/environment: guesty-webhook-activation/);
assert.match(workflow,/secrets\.CLOUDFLARE_API_TOKEN/);
assert.match(workflow,/vars\.CLOUDFLARE_ACCOUNT_ID/);
assert.match(config,/GUESTY_WEBHOOKS_ENABLED = "false"/);
assert.match(config,/BOOKING_REQUESTS_ENABLED = "false"/);
console.log("PASS: static handoff guards and disabled repository flags");
console.log("NOT VERIFIED: real Guesty response shape, activation environment account ID, Wrangler secret installation behavior, live Worker state.");

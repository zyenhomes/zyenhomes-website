// Read-only production upload readiness gate; no upload command exists here.
// Deliberately fails closed when source code identity cannot be established.
import {readFileSync} from "node:fs";
const config=readFileSync("cloudflare/wrangler.toml","utf8");
const worker=readFileSync("cloudflare/worker.js","utf8");
const receiver=readFileSync("cloudflare/guesty-webhooks.js","utf8");
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!uuid.test(expected||""))throw Error("Exact production baseline UUID required");
if(!/^GUESTY_WEBHOOKS_ENABLED\s*=\s*"false"$/m.test(config)||!/^BOOKING_REQUESTS_ENABLED\s*=\s*"false"$/m.test(config))throw Error("Repository safety flags differ");
if(!/^keep_vars\s*=\s*true$/m.test(config))throw Error("keep_vars missing");
for(const name of ["BOOKING_DB","GUESTY_TOKEN_KV","BOOKING_RATE_LIMITER"])if(!config.includes(name))throw Error("Resource binding missing");
if(!worker.includes("receiveGuestyMessageWebhook")||!receiver.includes("verifyGuestySvix"))throw Error("Signed receiver code missing");
console.log("PASS: repository preparation checks only.");
console.log("BLOCKED: deployed Worker script byte identity and preservation of signing-secret value are not proven by repository checks.");
console.log("NO WRITES: no Cloudflare calls, version creation, or deployment.");

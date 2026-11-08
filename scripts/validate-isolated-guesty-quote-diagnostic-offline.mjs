import assert from "node:assert/strict";
import isolated from "../cloudflare/guesty-quote-diagnostic-isolated.js";
import {readFileSync} from "node:fs";
const req=(path="/internal/quote-readonly",method="GET")=>new Request("https://isolated.invalid"+path,{method});
const disabled=await isolated.fetch(req(),{});
assert.equal(disabled.status,403);
assert.equal((await disabled.json()).reason,"diagnostic_disabled");
const notFound=await isolated.fetch(req("/"),{});
assert.equal(notFound.status,404);
const method=await isolated.fetch(req("/internal/quote-readonly","POST"),{});
assert.equal(method.status,405);
const blocked=await isolated.fetch(req(),{GUESTY_QUOTE_READONLY_DIAGNOSTIC_ENABLED:"true"});
assert.equal((await blocked.json()).reason,"access_not_verified");
const configured=await isolated.fetch(req(),{
 GUESTY_QUOTE_READONLY_DIAGNOSTIC_ENABLED:"true",
 GUESTY_QUOTE_DIAGNOSTIC_ACCESS_VERIFIED:"true"
});
assert.equal((await configured.json()).reason,"quote_not_configured");
const src=readFileSync("cloudflare/guesty-quote-diagnostic-isolated.js","utf8");
assert.doesNotMatch(src,/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
assert.doesNotMatch(src,/submitGuestyInquiry|reservations-v3\/quote/);
assert.doesNotMatch(readFileSync("cloudflare/worker.js","utf8"),/guesty-quote-diagnostic-isolated/);
console.log("PASS: isolated quote diagnostic remains disabled and never imports into production.");

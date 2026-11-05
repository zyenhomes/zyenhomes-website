import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const s=readFileSync("scripts/inspect-isolated-extra-bindings-readonly.mjs","utf8");
assert.match(s,/zyenhomes-webhook-test/);
assert.match(s,/Additional test binding/);
assert.match(s,/READ ONLY/);
assert.doesNotMatch(s,/method:"(?:POST|PUT|PATCH|DELETE)"/);
assert.doesNotMatch(s,/console\.log\([^\n]*(?:\.text|\.id|token|account)/);
console.log("PASS: isolated binding inspection is read-only and omits values.");

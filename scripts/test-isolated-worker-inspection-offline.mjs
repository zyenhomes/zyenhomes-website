// Offline guard: the isolated Worker inspection must remain read-only.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const script=readFileSync("scripts/inspect-isolated-guesty-worker-readonly.mjs","utf8");
const workflow=readFileSync(".github/workflows/inspect-isolated-guesty-worker-readonly.yml","utf8");
assert.match(script,/const name="zyenhomes-webhook-test"/);
assert.match(script,/workers\/scripts\/\$\{name\}\/settings/);
assert.match(script,/method:?"?GET"?|await fetch\(url,\{headers:/);
assert.doesNotMatch(script,/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
assert.doesNotMatch(script,/spawnSync|execSync|wrangler|secret put|versions secret put/);
assert.doesNotMatch(script,/zyenhomes-booking-api/);
assert.match(workflow,/workflow_dispatch:/);
assert.match(workflow,/environment: guesty-webhook-activation/);
assert.match(workflow,/scripts\/inspect-isolated-guesty-worker-readonly\.mjs/);
console.log("PASS: isolated Worker inspection is structurally read-only and targets only the test Worker.");

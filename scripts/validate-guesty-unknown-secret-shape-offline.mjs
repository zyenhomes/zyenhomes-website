import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("scripts/inspect-guesty-secret-response.mjs","utf8");
assert.match(source,/Single unrecognized field type:/);
assert.match(source,/Field name suppressed/);
assert.match(source,/keys\.length===1&&unknownKeys\.length===1/);
assert.doesNotMatch(source,/console\.log\([^\n]*(?:unknownKeys\[0\]|payload\[unknownKeys)/);
assert.doesNotMatch(source,/method\s*:\s*["'](?:PUT|PATCH|DELETE)["']/);
console.log("PASS: unknown secret field classification remains metadata-only.");

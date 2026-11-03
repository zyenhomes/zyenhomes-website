import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("scripts/inspect-guesty-secret-response.mjs","utf8");
assert.match(source,/const candidateNames=\[/);
assert.match(source,/Fixed candidate field-name match:/);
assert.match(source,/matched\.length===1\?matched\[0\]:"none"/);
assert.doesNotMatch(source,/console\.log\([^\n]*unknownKeys\[0\]/);
assert.doesNotMatch(source,/console\.log\([^\n]*payload\[unknownKeys/);
console.log("PASS: diagnostic only discloses reviewed fixed-name matches.");

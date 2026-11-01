import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const script=readFileSync("scripts/create-guesty-message-subscription.mjs","utf8");
const workflow=readFileSync(".github/workflows/create-guesty-message-subscription.yml","utf8");
assert.match(workflow,/receiver_activation_ready:/);
assert.match(workflow,/default: false/);
assert.match(workflow,/inputs\.receiver_activation_ready == true/);
assert.match(workflow,/RECEIVER_ACTIVATION_READY: \$\{\{ inputs\.receiver_activation_ready \}\}/);
assert.match(script,/RECEIVER_ACTIVATION_READY!=="true"/);
const run=spawnSync(process.execPath,["scripts/create-guesty-message-subscription.mjs"],{
 env:{PATH:process.env.PATH,ACTIVATION_CONFIRMATION:"CREATE_GUESTY_MESSAGE_SUBSCRIPTION"},
 encoding:"utf8",timeout:5000
});
assert.equal(run.status,1);
assert.match(run.stderr,/Coordinated receiver activation readiness not approved/);
console.log("PASS: unapproved subscription creation fails before network requests.");

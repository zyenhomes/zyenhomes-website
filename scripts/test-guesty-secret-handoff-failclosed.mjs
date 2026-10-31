// Execute the real handoff script with no credentials and no network access.
// The script MUST stop at its explicit gates before any Guesty/Cloudflare call.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
const target="scripts/install-guesty-signing-secret.mjs";
function check(env,expected){
 const run=spawnSync(process.execPath,[target],{
  env:{PATH:process.env.PATH,HOME:process.env.HOME,...env},
  encoding:"utf8",timeout:5000,maxBuffer:16000
 });
 assert.equal(run.status,1,"Handoff must fail closed");
 assert.match(run.stderr,expected);
 assert.doesNotMatch(run.stdout,/token|secret value|Bearer /i);
}
check({},/Explicit handoff confirmation required/);
check({HANDOFF_CONFIRMATION:"INSTALL_GUESTY_SIGNING_SECRET"},/Isolated Worker secret installation has not been verified/);
check({HANDOFF_CONFIRMATION:"INSTALL_GUESTY_SIGNING_SECRET",ISOLATED_WORKER_SECRET_PUT_VERIFIED:"true"},/Missing required credentials\/configuration/);
console.log("PASS: secret handoff refuses unapproved, unverified, or unconfigured execution.");

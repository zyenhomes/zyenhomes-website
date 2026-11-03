// Explicitly approved production version promotion only. No secret values are logged.
import {spawnSync} from "node:child_process";
const worker="zyenhomes-booking-api";
const candidate=process.env.CANDIDATE_VERSION_ID;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const confirm=process.env.DEPLOY_CONFIRMATION;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(confirm!=="DEPLOY_REVIEWED_GUESTY_VERSION")throw Error("Explicit production deployment confirmation required");
if(!uuid.test(candidate||"")||!uuid.test(expected||"")||candidate===expected)throw Error("Distinct exact candidate and baseline UUIDs required");
if(process.env.VERSION_PREFLIGHT_APPROVED!=="true")throw Error("Independent candidate version review required");
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[0-9a-f]{32}$/i.test(account||""))throw Error("Missing Cloudflare credentials");
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/deployments`;
const response=await fetch(endpoint,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
if(!response.ok)throw Error("Cannot verify active deployment; stop");
const payload=await response.json();
const rows=Array.isArray(payload?.result)?payload.result:payload?.result?.deployments;
if(payload?.success!==true||!Array.isArray(rows)||rows.length===0)throw Error("Unexpected deployment listing; stop");
const latest=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
const allocations=latest?.versions;
if(!Array.isArray(allocations)||allocations.length!==1||allocations[0]?.version_id!==expected)throw Error("Current deployment differs from approved baseline; stop");
// Non-interactive exact version promotion. Output suppressed to avoid accidental data disclosure.
const cli="node_modules/.bin/wrangler";
const run=spawnSync(cli,["versions","deploy",candidate+"@100%","--name",worker,"--config","cloudflare/wrangler.toml","--yes"],{
 encoding:"utf8",env:{...process.env,CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account},timeout:120000,maxBuffer:100000
});
if(run.status!==0)throw Error("Version promotion did not confirm success; inspect deployments before retrying");
console.log("Version promotion command completed; independently verify active deployment and booking routes now.");

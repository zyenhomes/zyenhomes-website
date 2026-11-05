// Approval-gated isolated Worker experiment. Creates ONE undeployed version.
// NEVER target production. No secrets or raw API responses are logged.
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const worker="zyenhomes-webhook-test";
if(process.env.TEST_CONFIRMATION!=="CREATE_ONE_ISOLATED_FLAG_VERSION")throw Error("Explicit isolated version creation confirmation required");
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token)throw Error("Cloudflare credentials unavailable");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Isolated metadata read failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Unexpected isolated metadata");
 return j.result;
}
const [history,listing]=await Promise.all([read("/deployments"),read("/versions")]);
const rows=Array.isArray(history)?history:history.deployments;
const versions=Array.isArray(listing)?listing:listing.items;
if(!Array.isArray(rows)||!rows.length||!Array.isArray(versions)||!versions.length)throw Error("Missing isolated baseline");
const latest=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(!Array.isArray(latest.versions)||latest.versions.length!==1||latest.versions[0].percentage!==100)throw Error("Isolated traffic baseline must be 100% on one version");
const activeId=latest.versions[0].version_id;
const baseline=await read("/versions/"+encodeURIComponent(activeId));
const bindings=baseline?.resources?.bindings;
if(!Array.isArray(bindings)||!bindings.some(b=>b.name==="TEST_DUMMY_SECRET"&&b.type==="secret_text")||!bindings.some(b=>b.name==="TEST_PRESERVE_VARIABLE"))throw Error("Required isolated baseline bindings missing");
if(bindings.some(b=>b.name==="TEST_WEBHOOKS_ENABLED"))throw Error("Test flag already exists; stop");
const fingerprint=JSON.stringify(rows.map(r=>({id:r.id,versions:r.versions})));
const existing=new Set(versions.map(v=>v.id));
const dir=mkdtempSync(join(tmpdir(),"zyenhomes-isolated-flag-"));
try{
 writeFileSync(join(dir,"worker.mjs"),'export default {fetch(){return new Response("isolated flag test")}};\n');
 writeFileSync(join(dir,"wrangler.toml"),'name = "zyenhomes-webhook-test"\nmain = "worker.mjs"\ncompatibility_date = "2026-10-24"\nkeep_vars = true\n[vars]\nTEST_WEBHOOKS_ENABLED = "true"\n');
 const run=spawnSync("node_modules/.bin/wrangler",["versions","upload","--config",join(dir,"wrangler.toml")],{
  encoding:"utf8",env:{...process.env,CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:token},timeout:90000,maxBuffer:100000
 });
 if(run.status!==0)throw Error("Isolated version upload did not confirm success; inspect version history before retry");
}finally{rmSync(dir,{recursive:true,force:true});}
const [afterHistory,afterListing]=await Promise.all([read("/deployments"),read("/versions")]);
const afterRows=Array.isArray(afterHistory)?afterHistory:afterHistory.deployments;
const afterVersions=Array.isArray(afterListing)?afterListing:afterListing.items;
if(!Array.isArray(afterRows)||!Array.isArray(afterVersions))throw Error("Post-upload metadata unavailable");
if(JSON.stringify(afterRows.map(r=>({id:r.id,versions:r.versions})))!==fingerprint)throw Error("ALERT: isolated deployment history changed");
const added=afterVersions.filter(v=>!existing.has(v.id));
if(added.length!==1)throw Error("Expected exactly one new isolated version");
const candidate=await read("/versions/"+encodeURIComponent(added[0].id));
const candidateBindings=candidate?.resources?.bindings;
if(!Array.isArray(candidateBindings))throw Error("Candidate binding metadata missing");
const c=new Map(candidateBindings.map(b=>[b.name,b]));
for(const b of bindings){
 const next=c.get(b.name);
 if(!next||next.type!==b.type)throw Error("Candidate dropped or changed an isolated baseline binding");
}
if(c.get("TEST_WEBHOOKS_ENABLED")?.text!=="true")throw Error("Candidate flag not confirmed");
console.log("PASS: exactly one isolated undeployed version created; deployed traffic unchanged; baseline binding names/types preserved.");
console.log("LIMITATION: secret values and Worker code parity are not verified; never promote this test version.");

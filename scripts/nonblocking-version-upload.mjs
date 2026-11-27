// Manual execution only. Never deploy or retry an uncertain upload.
import {TARGET,DB,planUpload,verifyCandidate} from "./nonblocking-upload-preflight.mjs";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
export async function uploadOne({read,upload,approvedVersion,approvedLatestVersion=approvedVersion}){
 const snapshot=async()=>{
 const [d,v]=await Promise.all([read("/deployments"),read("/versions")]);
 const deployments=Array.isArray(d)?d:d.deployments,versions=Array.isArray(v)?v:v.items;
 if(!deployments?.length||!versions?.length)throw Error("baseline_missing");
 const active=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0].versions;
 if(active?.length!==1||active[0].percentage!==100)throw Error("unexpected_rollout");
 const latest=[...versions].sort((a,b)=>Date.parse(b.metadata?.created_on??b.created_on)-Date.parse(a.metadata?.created_on??a.created_on))[0];
 return {active:active[0].version_id,latest:latest.id,ids:versions.map(x=>x.id),fingerprint:JSON.stringify(deployments.map(x=>({id:x.id,versions:x.versions})))};
 };
 const before=await snapshot();
 if(before.active!==approvedVersion||before.latest!==approvedLatestVersion)throw Error("approved_baseline_changed");
 const baseline=await read("/versions/"+encodeURIComponent(before.active));
 const bindings=baseline.resources?.bindings;
 const latestBindings=(await read("/versions/"+encodeURIComponent(before.latest))).resources?.bindings;
 if(!Array.isArray(latestBindings)||!Array.isArray(bindings))throw Error("missing_baseline_bindings");
 const signature=b=>JSON.stringify(b.filter(x=>x.type==="secret_text").map(x=>x.name).sort());
 if(signature(bindings)!==signature(latestBindings))throw Error("credential_baseline_mismatch");
 const plan=planUpload({worker:TARGET,bindings,activeVersion:before.active,latestVersion:before.latest,approvedLatestVersion});
  planUpload({worker:TARGET,bindings:latestBindings,activeVersion:before.active,latestVersion:before.latest,approvedLatestVersion});
 await upload(plan.command);
 const after=await snapshot();
 if(after.fingerprint!==before.fingerprint)throw Error("deployment_changed");
 const added=after.ids.filter(x=>!before.ids.includes(x));
 if(added.length!==1)throw Error("unexpected_version_count");
 const candidate=await read("/versions/"+encodeURIComponent(added[0]));
 if(before.ids.some(id=>!after.ids.includes(id)))throw Error("baseline_version_missing");
 verifyCandidate(bindings,candidate.resources?.bindings);
 verifyCandidate(latestBindings,candidate.resources?.bindings);
 return {versionId:added[0],deployed:false};
}
// No invocation at module import. Explicit CLI approval and pinned commit required.
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 if(process.env.TEST_CONFIRMATION!=="UPLOAD_ONE_DISABLED_ISOLATED_VERSION")throw Error("approval_required");
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN,approvedVersion=process.env.APPROVED_ACTIVE_VERSION,approvedLatestVersion=process.env.APPROVED_LATEST_VERSION;
  const approvedBaseline="27eadf90-91a5-4da7-a917-1bc934a2d979";
 if(!/^[a-f0-9]{32}$/i.test(account??"")||!token||approvedVersion!==approvedBaseline||approvedLatestVersion!==approvedBaseline)throw Error("missing_configuration");
 const sha=spawnSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).stdout?.trim();
 if(!/^[a-f0-9]{40}$/.test(sha??"")||sha!==process.env.APPROVED_COMMIT)throw Error("commit_not_approved");
 const config=readFileSync("cloudflare/wrangler.nonblocking-isolated-review.toml","utf8");
 if(!config.includes('name = "'+TARGET+'"')||!config.includes('database_id = "'+DB+'"'))throw Error("config_mismatch");
 const root="https://api.cloudflare.com/client/v4/accounts/"+account;
 async function get(path){const r=await fetch(root+path,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,Accept:"application/json"}});if(!r.ok)throw Error("inspection_failed");const j=await r.json();if(!j.success||!j.result)throw Error("inspection_failed");return j.result;}
 const db=await get("/d1/database/"+DB);if(db.uuid!==DB||db.name!=="zyenhomes-booking-test")throw Error("database_mismatch");
 const result=await uploadOne({approvedVersion,approvedLatestVersion,read:p=>get("/workers/scripts/"+TARGET+p),upload:async args=>{const r=spawnSync("node_modules/.bin/wrangler",args,{encoding:"utf8",timeout:90000});if(r.status!==0)throw Error("upload_uncertain_inspect_before_retry");}});
 console.log("Verified inactive candidate:",result.versionId);
}

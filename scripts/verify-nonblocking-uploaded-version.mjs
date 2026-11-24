import {verifyCandidate,DB,TARGET} from "./nonblocking-upload-preflight.mjs";
const active="6315c368-e952-474c-a67f-c9de71ca19b6",saved="cc3a7f0d-bf88-44cc-a084-63db65392793",candidate="27eadf90-91a5-4da7-a917-1bc934a2d979";
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[a-f0-9]{32}$/i.test(account??"")||!token)throw Error("missing_configuration");
const root="https://api.cloudflare.com/client/v4/accounts/"+account;
async function get(label,path){
 const r=await fetch(root+path,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
 if(!r.ok)throw Error(label+" HTTP "+r.status);
 const j=await r.json();if(j.success!==true||!j.result)throw Error(label+" invalid response");return j.result;
}
const worker="/workers/scripts/"+TARGET;
const db=await get("D1","/d1/database/"+DB);
if(db.uuid!==DB||db.name!=="zyenhomes-booking-test")throw Error("database_mismatch");
const d=await get("Deployments",worker+"/deployments");
const rows=Array.isArray(d)?d:d.deployments;
if(!rows?.length)throw Error("missing_deployment");
const latest=[...rows].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];
if(latest.versions?.length!==1||latest.versions[0].version_id!==active||latest.versions[0].percentage!==100)throw Error("active_traffic_mismatch");
const bindings=[];
for(const id of [active,saved,candidate]){
 const v=await get("Version "+id.slice(0,8),worker+"/versions/"+id);
 if(v.id!==id||!Array.isArray(v.resources?.bindings))throw Error("version_metadata_mismatch");
 bindings.push(v.resources.bindings);
 console.log("PASS: exact version exists "+id.slice(0,8));
}
verifyCandidate(bindings[0],bindings[2]);verifyCandidate(bindings[1],bindings[2]);
console.log("PASS: active traffic unchanged, exact D1 identity and candidate binding, baseline binding names/types and disabled flags verified");
console.log("Secret values are not accessible or verified.");

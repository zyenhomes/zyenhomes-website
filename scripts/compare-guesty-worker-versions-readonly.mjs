// Read-only comparison of two exact Cloudflare Worker versions.
// Never log IDs, raw bindings, values, or secret contents.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const activeId=process.env.ACTIVE_VERSION_ID,candidateId=process.env.CANDIDATE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!token||!/^[0-9a-f]{32}$/i.test(account||""))throw Error("Missing Cloudflare read credentials");
if(!uuid.test(activeId||"")||!uuid.test(candidateId||"")||activeId===candidateId)throw Error("Distinct exact version UUIDs required");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare read failed: HTTP "+r.status);
 const body=await r.json();
 if(body?.success!==true||!body.result)throw Error("Unexpected Cloudflare response");
 return body.result;
}
const deployment=await read("/deployments");
const rows=Array.isArray(deployment)?deployment:deployment.deployments;
if(!Array.isArray(rows)||rows.length===0)throw Error("Deployment history unavailable");
const latest=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(!Array.isArray(latest?.versions)||latest.versions.length!==1||latest.versions[0].version_id!==activeId)throw Error("Active deployment identity or traffic shape differs; stop");
const [active,candidate]=await Promise.all([read("/versions/"+activeId),read("/versions/"+candidateId)]);
function bindings(version){
 const arr=version?.resources?.bindings;
 if(!Array.isArray(arr))throw Error("Version binding metadata unavailable");
 const map=new Map();
 for(const b of arr){if(typeof b.name!=="string"||map.has(b.name))throw Error("Invalid or duplicate binding name");map.set(b.name,b);}
 return map;
}
const a=bindings(active),c=bindings(candidate);
const allowedAdded=new Set(["GUESTY_WEBHOOK_SECRET"]);
for(const [name,old] of a){
 const next=c.get(name);
 if(!next)throw Error("Candidate missing baseline binding: "+name);
 if(next.type!==old.type)throw Error("Candidate changed baseline binding type: "+name);
 // Compare stable, non-secret resource identifiers when exposed.
 for(const field of ["id","namespace_id","database_id","class_name"]){
  if((old[field]!==undefined||next[field]!==undefined)&&old[field]!==next[field])throw Error("Resource target mismatch for "+name);
 }
 if(old.type==="plain_text"&&old.text!==next.text)throw Error("Plain-text binding differs: "+name);
}
for(const name of c.keys())if(!a.has(name)&&!allowedAdded.has(name))throw Error("Unexpected candidate binding addition: "+name);
if(!c.has("GUESTY_WEBHOOK_SECRET"))throw Error("Candidate missing signing-secret binding");
for(const flag of ["GUESTY_WEBHOOKS_ENABLED","BOOKING_REQUESTS_ENABLED"]){
 if(c.get(flag)?.type!=="plain_text"||c.get(flag)?.text!=="false")throw Error("Disabled flag not confirmed: "+flag);
}
console.log("PASS: baseline binding names/types and exposed resource identifiers preserved; expected secret binding present; flags disabled.");
console.log("LIMITATION: secret values, hidden resource identifiers, code parity, and future traffic changes cannot be verified by this comparison.");
console.log("READ ONLY: no deployment or Worker changes.");

// Read-only Cloudflare Worker version script hash comparison.
// No raw etags, secrets, version IDs, or code bytes printed.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const active=process.env.ACTIVE_VERSION_ID,candidate=process.env.CANDIDATE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!token||!/^[0-9a-f]{32}$/i.test(account||"")||!uuid.test(active||"")||!uuid.test(candidate||"")||active===candidate)throw Error("Missing or invalid read-only inputs");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare metadata read failed: HTTP "+r.status);
 const body=await r.json();
 if(body?.success!==true||!body.result)throw Error("Unexpected metadata response");
 return body.result;
}
const [a,b,deployment]=await Promise.all([read("/versions/"+active),read("/versions/"+candidate),read("/deployments")]);
const rows=Array.isArray(deployment)?deployment:deployment.deployments;
if(!Array.isArray(rows)||!rows.length)throw Error("Deployment history unavailable");
const latest=[...rows].sort((x,y)=>Date.parse(y.created_on||0)-Date.parse(x.created_on||0))[0];
if(!Array.isArray(latest.versions)||latest.versions.length!==1||latest.versions[0].version_id!==active)throw Error("Active version changed; stop");
const ah=a?.resources?.script?.etag,bh=b?.resources?.script?.etag;
if(typeof ah!=="string"||!ah||typeof bh!=="string"||!bh)throw Error("INCONCLUSIVE: version script etag missing; do not infer code parity");
if(ah!==bh)throw Error("MISMATCH: version script hashes differ; do not deploy without review");
console.log("PASS: Cloudflare script etags match; active baseline unchanged.");
const ar=a?.resources?.script_runtime,br=b?.resources?.script_runtime;
if(!ar||!br){
 console.log("INCONCLUSIVE: runtime metadata unavailable.");
}else{
 if(!ar.compatibility_date||!br.compatibility_date){
  console.log("INCONCLUSIVE: runtime compatibility date unavailable.");
 }else if(ar.compatibility_date!==br.compatibility_date){
  throw Error("MISMATCH: runtime compatibility date differs");
 }else{
  console.log("PASS: runtime compatibility dates match.");
 }
 const af=ar.compatibility_flags,bf=br.compatibility_flags;
 if(!Array.isArray(af)||!Array.isArray(bf)){
  console.log("INCONCLUSIVE: runtime compatibility flags unavailable.");
 }else if(JSON.stringify([...af].sort())!==JSON.stringify([...bf].sort())){
  throw Error("MISMATCH: runtime compatibility flags differ");
 }else{
  console.log("PASS: runtime compatibility flags match.");
 }
}
console.log("LIMITATION: matching script etags do not verify secrets, binding targets, or full runtime behavior.");
console.log("READ ONLY: no deployment or Worker changes.");

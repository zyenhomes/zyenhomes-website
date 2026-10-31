// Read-only comparison of isolated Worker version IDs against deployment references.
// Prints only counts and match status, never IDs, secrets, response bodies, or tokens.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-webhook-test`;
async function get(suffix){
 const response=await fetch(base+suffix,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 console.log(suffix==="/versions"?"Versions status:":"Deployments status:",response.status);
 if(!response.ok)throw Error("Read-only metadata unavailable");
 const json=await response.json();
 if(json?.success!==true||!json.result)throw Error("Unexpected metadata response");
 return json.result;
}
const versions=await get("/versions"),deployments=await get("/deployments");
const versionRows=Array.isArray(versions)?versions:versions.items;
const deploymentRows=Array.isArray(deployments)?deployments:deployments.deployments;
if(!Array.isArray(versionRows)||!Array.isArray(deploymentRows))throw Error("Unrecognized listing shape");
const known=new Set(versionRows.map(v=>v?.id).filter(v=>typeof v==="string"));
if(!known.size)throw Error("No version identifiers available");
let referenced=0,unmatched=0;
for(const deployment of deploymentRows){
 const refs=Array.isArray(deployment?.versions)?deployment.versions:[];
 for(const entry of refs){
  const id=entry?.version_id??entry?.id;
  if(typeof id!=="string")continue;
  referenced++;
  if(!known.has(id))unmatched++;
 }
}
console.log("Version entries:",versionRows.length);
console.log("Deployment entries:",deploymentRows.length);
console.log("Deployment version references:",referenced);
console.log("References absent from returned version page:",unmatched);
console.log("READ ONLY: no secret or version created, no deployment performed.");
console.log("LIMITATION: listing may be paginated; reference counts do not establish active traffic allocation.");

// Read-only metadata for isolated Worker only. No values, IDs, or secrets printed.
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!/^[0-9a-f]{32}$/i.test(account||""))throw Error("Missing Cloudflare credentials");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-webhook-test`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Read failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Unexpected metadata response");
 return j.result;
}
const [listing,history]=await Promise.all([read("/versions"),read("/deployments")]);
const versions=Array.isArray(listing)?listing:listing.items;
const deployments=Array.isArray(history)?history:history.deployments;
if(!Array.isArray(versions)||!versions.length||!Array.isArray(deployments)||!deployments.length)throw Error("Version history unavailable");
const latest=[...versions].sort((a,b)=>Date.parse(b?.metadata?.created_on||b?.created_on||0)-Date.parse(a?.metadata?.created_on||a?.created_on||0))[0];
const current=[...deployments].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
const activeId=current?.versions?.length===1?current.versions[0].version_id:null;
if(!activeId||!latest?.id)throw Error("Cannot identify baseline versions");
const [active,candidate]=await Promise.all([read("/versions/"+encodeURIComponent(activeId)),read("/versions/"+encodeURIComponent(latest.id))]);
const safe=b=>{const arr=b?.resources?.bindings;if(!Array.isArray(arr))throw Error("Bindings unavailable");return new Map(arr.map(x=>[x.name,x.type]));};
const a=safe(active),c=safe(candidate);
for(const [name,type] of a)if(c.get(name)!==type)throw Error("Missing or type-changed baseline binding");
console.log("Deployed binding count:",a.size);
console.log("Latest binding count:",c.size);
for(const [name,type] of c)if(!a.has(name)){
 if(!/^TEST_[A-Z0-9_]+$/.test(name))throw Error("Unexpected non-test binding name");
 console.log("Additional test binding:",name,"Type:",type);
}
console.log("READ ONLY: no values, secret contents, version IDs, or Worker changes.");

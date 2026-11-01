// Read-only version-specific binding comparison for the isolated Worker.
// Never log IDs, secret values, tokens, full responses, or variable contents.
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-webhook-test`;
async function get(path){
 const response=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("Read-only Cloudflare request failed: HTTP "+response.status);
 const payload=await response.json();
 if(payload?.success!==true||!payload.result)throw Error("Unexpected Cloudflare response");
 return payload.result;
}
const listing=await get("/versions");
const versions=Array.isArray(listing)?listing:listing.items;
const deploymentsResult=await get("/deployments");
const deployments=Array.isArray(deploymentsResult)?deploymentsResult:deploymentsResult.deployments;
if(!Array.isArray(versions)||!versions.length||!Array.isArray(deployments)||!deployments.length)throw Error("Unrecognized version or deployment listing");
const byTime=(a,b)=>Date.parse(b?.metadata?.created_on||b?.created_on||0)-Date.parse(a?.metadata?.created_on||a?.created_on||0);
const latest=[...versions].sort(byTime)[0];
const deployment=[...deployments].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
const refs=deployment?.versions;
if(!Array.isArray(refs)||refs.length!==1||typeof refs[0]?.version_id!=="string")throw Error("Cannot uniquely identify deployed version; stop");
const deployedId=refs[0].version_id;
if(typeof latest?.id!=="string")throw Error("Latest version identifier unavailable");
const active=await get("/versions/"+encodeURIComponent(deployedId));
const candidate=await get("/versions/"+encodeURIComponent(latest.id));
function bindings(version){
 const b=version?.resources?.bindings;
 if(!Array.isArray(b))throw Error("Version bindings are unavailable or in an unexpected format");
 return b.map(x=>({name:x?.name,type:x?.type})).filter(x=>typeof x.name==="string"&&typeof x.type==="string").sort((a,b)=>a.name.localeCompare(b.name));
}
const before=bindings(active),after=bindings(candidate);
const baseline=["TEST_PRESERVE_VARIABLE","TEST_DUMMY_SECRET"];
for(const name of baseline)if(!before.some(x=>x.name===name)||!after.some(x=>x.name===name))throw Error("Baseline binding missing from a compared version");
const previous=new Map(before.map(x=>[x.name,x.type]));
const missing=before.filter(x=>!after.some(y=>y.name===x.name&&y.type===x.type));
const newBindings=after.filter(x=>!previous.has(x.name));
console.log("Compared latest listed version with latest deployment's single referenced version.");
console.log("Same version:",deployedId===latest.id);
console.log("Deployed version binding count:",before.length);
console.log("Latest version binding count:",after.length);
console.log("Missing or type-changed baseline bindings:",missing.length);
console.log("Additional binding count:",newBindings.length);
console.log("READ ONLY: no secrets, IDs, or binding values printed.");
if(missing.length)throw Error("New version does not preserve all deployed binding names and types");
console.log("PASS: latest version preserves deployed binding names and types.");

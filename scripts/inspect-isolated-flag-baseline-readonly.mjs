// Read-only isolated Worker flag and binding inspection. Never print secret values.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token)throw Error("Missing credentials");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-webhook-test`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare read failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Unexpected response");
 return j.result;
}
const [history,listing]=await Promise.all([read("/deployments"),read("/versions")]);
const deployments=Array.isArray(history)?history:history.deployments;
const versions=Array.isArray(listing)?listing:listing.items;
if(!Array.isArray(deployments)||!deployments.length||!Array.isArray(versions)||!versions.length)throw Error("Version history missing");
const current=[...deployments].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
const active=current?.versions?.length===1?current.versions[0].version_id:null;
const latest=[...versions].sort((a,b)=>Date.parse(b?.metadata?.created_on||b?.created_on||0)-Date.parse(a?.metadata?.created_on||a?.created_on||0))[0];
if(!active||!latest?.id||active===latest.id)throw Error("Expected distinct active and undeployed test version");
const [a,c]=await Promise.all([read("/versions/"+encodeURIComponent(active)),read("/versions/"+encodeURIComponent(latest.id))]);
const bindings=v=>{const arr=v?.resources?.bindings;if(!Array.isArray(arr))throw Error("Bindings unavailable");return new Map(arr.map(x=>[x.name,x]));};
const before=bindings(a),after=bindings(c);
for(const [name,old] of before)if(after.get(name)?.type!==old.type)throw Error("Deployed baseline binding missing or changed");
const flag=after.get("TEST_WEBHOOKS_ENABLED");
if(flag?.type!=="plain_text"||flag.text!=="true")throw Error("Test flag missing or not true");
if(before.has("TEST_WEBHOOKS_ENABLED"))throw Error("Test flag unexpectedly present in deployed version");
const expected=["TEST_VERSION_ONLY_41254234591","TEST_VERSION_ONLY_SECRET_2026","TEST_VERSION_ONLY_SECRET_2026_B"];
for(const name of expected)if(after.get(name)?.type!=="secret_text")throw Error("Expected test secret missing or type changed");
console.log("PASS: isolated candidate flag true; three expected test secret bindings present; deployed version distinct and unchanged in binding schema.");
console.log("LIMITATION: secret values, full code parity, and historical traffic allocation are not independently established.");
console.log("READ ONLY: no Worker changes or deployment.");

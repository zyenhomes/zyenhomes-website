// Read-only binding target/type assessment for active production Guesty Worker.
// Never outputs binding targets, secret values, raw metadata, or account identifiers.
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Missing credentials or exact expected version");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function get(path){const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("Cloudflare read failed HTTP "+r.status);const j=await r.json();if(j?.success!==true||!j.result)throw Error("Invalid Cloudflare response");return j.result;}
const [deployments,version]=await Promise.all([get("/deployments"),get("/versions/"+encodeURIComponent(expected))]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
if(!Array.isArray(rows)||!rows.length)throw Error("Deployment history missing");
const latest=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(latest?.versions?.length!==1||latest.versions[0].version_id!==expected||Number(latest.versions[0].percentage)!==100)throw Error("Active production baseline changed");
const bindings=version?.resources?.bindings;
if(!Array.isArray(bindings))throw Error("Binding metadata missing");
const m=new Map(bindings.map(b=>[b.name,b]));if(m.size!==bindings.length)throw Error("Duplicate binding names");
const checks=[
 ["GUESTY_WEBHOOK_SECRET",["secret_text"]],
 ["BOOKING_DB",["d1"]],
 ["GUESTY_TOKEN_KV",["kv_namespace"]],
 ["BOOKING_RATE_LIMITER",["ratelimit"]],
 ["BOOKING_REQUESTS_ENABLED",["plain_text"]],
 ["GUESTY_WEBHOOKS_ENABLED",["plain_text"]]
];
for(const [name,types] of checks){const b=m.get(name);if(!b||!types.includes(b.type))throw Error("Required binding missing or unexpected type: "+name);}
for(const name of ["BOOKING_REQUESTS_ENABLED","GUESTY_WEBHOOKS_ENABLED"])if(m.get(name).text!=="false")throw Error("Safety flag not disabled: "+name);
const d1=m.get("BOOKING_DB"),kv=m.get("GUESTY_TOKEN_KV");
const d1Expected="6669a8ef-2b3b-41d0-ad24-4e881873bd2e";
const kvExpected="f8be7cfd423f45ef90f9dccc1f4d232a";
function targetStatus(b,keys,expectedValue){const values=keys.filter(k=>typeof b[k]==="string").map(k=>b[k]);return values.length===0?"UNAVAILABLE":values.includes(expectedValue)?"MATCH":"MISMATCH";}
const d1Status=targetStatus(d1,["id","database_id"],d1Expected);
const kvStatus=targetStatus(kv,["namespace_id","id"],kvExpected);
console.log("PASS: expected active Worker remains at 100% traffic.");
console.log("PASS: required binding names/types present and both safety flags disabled.");
console.log("D1 target metadata:",d1Status);
console.log("KV target metadata:",kvStatus);
console.log("Rate limiter target verification: NOT ESTABLISHED (metadata schema/target may be opaque).");
console.log("Secret value preservation: NOT ESTABLISHED (secret values are intentionally inaccessible).");
if(d1Status==="MISMATCH"||kvStatus==="MISMATCH")throw Error("Binding target mismatch; block candidate preparation");
console.log("READ ONLY: no Worker upload, deployment, secret changes, or replay.");

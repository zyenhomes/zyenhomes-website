// Read-only check of active production Worker artifact metadata.
// Never prints secret values, raw script hashes, or full binding metadata.
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Missing valid read-only credentials or exact version ID");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare metadata GET failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Unexpected Cloudflare response");
 return j.result;
}
const [deployments,version]=await Promise.all([read("/deployments"),read("/versions/"+encodeURIComponent(expected))]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
if(!Array.isArray(rows)||rows.length===0)throw Error("Deployment metadata unavailable");
const latest=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(latest?.versions?.length!==1||latest.versions[0].version_id!==expected||Number(latest.versions[0].percentage)!==100)throw Error("Active deployment changed or split traffic");
console.log("PASS: exact expected production version remains at 100% traffic.");
const etag=version?.resources?.script?.etag;
if(typeof etag==="string"&&etag.length>0)console.log("PASS: active version script etag is available for future candidate comparison.");
else console.log("INCONCLUSIVE: active script etag unavailable; cannot use metadata for code parity.");
const runtime=version?.resources?.script_runtime;
console.log(runtime?.compatibility_date?"PASS: compatibility date metadata available.":"INCONCLUSIVE: compatibility date metadata unavailable.");
console.log(Array.isArray(runtime?.compatibility_flags)?"PASS: compatibility flags metadata available.":"INCONCLUSIVE: compatibility flags metadata unavailable.");
const bindings=version?.resources?.bindings;
if(!Array.isArray(bindings))throw Error("Active binding metadata unavailable");
const byName=new Map(bindings.map(b=>[b.name,b]));
if(byName.size!==bindings.length)throw Error("Duplicate binding names");
for(const name of ["GUESTY_WEBHOOK_SECRET","BOOKING_DB","GUESTY_TOKEN_KV","BOOKING_RATE_LIMITER"])if(!byName.has(name))throw Error("Missing required binding: "+name);
for(const name of ["GUESTY_WEBHOOKS_ENABLED","BOOKING_REQUESTS_ENABLED"])if(byName.get(name)?.type!=="plain_text"||byName.get(name)?.text!=="false")throw Error("Safety flag changed: "+name);
console.log("PASS: required binding names and disabled flags present.");
console.log("LIMITATION: no deployed source-code bytes or secret values were retrieved; metadata alone cannot establish repository parity.");
console.log("READ ONLY: no version upload, deployment, or Guesty replay.");

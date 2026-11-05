// Read-only production activation preflight. No writes, no secrets or IDs printed.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Invalid read-only inputs");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function read(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare read failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Unexpected response");
 return j.result;
}
const [history,version]=await Promise.all([read("/deployments"),read("/versions/"+encodeURIComponent(expected))]);
const rows=Array.isArray(history)?history:history.deployments;
if(!Array.isArray(rows)||!rows.length)throw Error("Deployment history unavailable");
const current=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(current?.versions?.length!==1||current.versions[0].version_id!==expected||Number(current.versions[0].percentage)!==100)throw Error("Active version or traffic allocation differs from expected");
const bindings=version?.resources?.bindings;
if(!Array.isArray(bindings))throw Error("Binding metadata unavailable");
const map=new Map(bindings.map(b=>[b.name,b]));
if(map.size!==bindings.length)throw Error("Duplicate binding names");
for(const name of ["GUESTY_WEBHOOK_SECRET","BOOKING_DB","GUESTY_TOKEN_KV","BOOKING_RATE_LIMITER"])if(!map.has(name))throw Error("Required binding missing: "+name);
if(map.get("BOOKING_REQUESTS_ENABLED")?.type!=="plain_text"||map.get("BOOKING_REQUESTS_ENABLED")?.text!=="false")throw Error("Booking gate not disabled");
if(map.get("GUESTY_WEBHOOKS_ENABLED")?.type!=="plain_text"||map.get("GUESTY_WEBHOOKS_ENABLED")?.text!=="false")throw Error("Webhook gate not disabled");
console.log("PASS: exact active version has 100% traffic, required binding names present, and both flags disabled.");
console.log("LIMITATION: this does not verify secret values or implement candidate creation.");
console.log("READ ONLY: no Worker version creation, deployment, or activation.");

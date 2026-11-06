// Read-only rate limiter metadata inspection. Never print binding values or raw payloads.
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Missing valid inputs");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function get(path){const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("Cloudflare GET failed HTTP "+r.status);const j=await r.json();if(j?.success!==true||!j.result)throw Error("Unexpected response");return j.result;}
const [deployments,version]=await Promise.all([get("/deployments"),get("/versions/"+encodeURIComponent(expected))]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
if(!Array.isArray(rows)||!rows.length)throw Error("Missing deployment history");
const active=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(active?.versions?.length!==1||active.versions[0].version_id!==expected||Number(active.versions[0].percentage)!==100)throw Error("Active baseline changed");
const bindings=version?.resources?.bindings;
if(!Array.isArray(bindings))throw Error("Bindings unavailable");
const rate=bindings.filter(b=>b.name==="BOOKING_RATE_LIMITER");
if(rate.length!==1||rate[0].type!=="ratelimit")throw Error("Rate limiter missing or type changed");
const b=rate[0];
const keys=["namespace_id","id","simple","limit","period"];
console.log("PASS: expected production version at 100% traffic and rate limiter binding type present.");
console.log("Rate limiter metadata fields available:",keys.filter(k=>Object.hasOwn(b,k)).join(", ")||"none");
const namespace=b.namespace_id??b.id;
console.log("Rate limiter namespace verification:",namespace==null?"UNAVAILABLE":String(namespace)==="1001"?"MATCH":"MISMATCH");
const simple=b.simple&&typeof b.simple==="object"?b.simple:null;
console.log("Rate limiter limit verification:",simple?.limit==null?"UNAVAILABLE":Number(simple.limit)===10?"MATCH":"MISMATCH");
console.log("Rate limiter period verification:",simple?.period==null?"UNAVAILABLE":Number(simple.period)===60?"MATCH":"MISMATCH");
if(namespace!=null&&String(namespace)!=="1001"||simple?.limit!=null&&Number(simple.limit)!==10||simple?.period!=null&&Number(simple.period)!==60)throw Error("Rate limiter metadata conflicts with repository baseline");
console.log("LIMITATION: missing metadata is not evidence of target preservation; secret values and code identity remain unverified.");
console.log("READ ONLY: no production upload, deployment, secret change, or replay.");

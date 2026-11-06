// Read-only metadata-only assessment of whether the active Worker artifact can be
// compared or reconstructed. Does not retrieve script source or secret values.
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Missing valid inputs");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function get(path){const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("Cloudflare metadata read failed HTTP "+r.status);const j=await r.json();if(j?.success!==true||!j.result)throw Error("Unexpected metadata");return j.result;}
const [deployments,version]=await Promise.all([get("/deployments"),get("/versions/"+encodeURIComponent(expected))]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
if(!Array.isArray(rows)||!rows.length)throw Error("Deployment history unavailable");
const active=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(active?.versions?.length!==1||active.versions[0].version_id!==expected||Number(active.versions[0].percentage)!==100)throw Error("Production active baseline changed");
const script=version?.resources?.script;
const runtime=version?.resources?.script_runtime;
if(!script||typeof script!=="object")throw Error("Script metadata unavailable");
const allowed=["etag","size","main_module","content_type","modules","source","content"];
console.log("PASS: expected production version remains at 100% traffic.");
console.log("Script metadata field presence:",allowed.filter(k=>Object.hasOwn(script,k)).join(", ")||"none");
console.log("Script etag available:",typeof script.etag==="string"&&script.etag.length>0);
console.log("Runtime compatibility date available:",typeof runtime?.compatibility_date==="string");
console.log("Runtime flags array available:",Array.isArray(runtime?.compatibility_flags));
console.log("Secret binding present:",Array.isArray(version?.resources?.bindings)&&version.resources.bindings.some(b=>b.name==="GUESTY_WEBHOOK_SECRET"&&b.type==="secret_text"));
console.log("LIMITATION: field presence is not a supported code download, executable parity proof, or secret-value preservation guarantee.");
console.log("READ ONLY: no source content, secret values, Worker changes, uploads, or deployments.");

// Read-only Cloudflare version response-shape diagnostic.
// Reports only allowlisted structural facts; never prints IDs, timestamps, secrets or raw payloads.
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Missing valid read-only credentials or exact version UUID");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function get(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare GET failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Unexpected Cloudflare response");
 return j;
}
const [deploy,listed,detail]=await Promise.all([get("/deployments"),get("/versions"),get("/versions/"+encodeURIComponent(expected))]);
const deployments=Array.isArray(deploy.result)?deploy.result:deploy.result.deployments;
if(!Array.isArray(deployments)||!deployments.length)throw Error("No deployment history");
const current=[...deployments].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(current?.versions?.length!==1||current.versions[0].version_id!==expected||Number(current.versions[0].percentage)!==100)throw Error("Active version differs from expected 100% baseline");
console.log("PASS: expected active version remains at 100% traffic.");
const list=Array.isArray(listed.result)?listed.result:listed.result.items;
if(!Array.isArray(list)||!list.length)throw Error("Version list missing");
const fields=["id","created_on","created_at","created","uploaded_on","uploaded_at","timestamp","number","version","metadata"];
const available=x=>fields.filter(k=>Object.prototype.hasOwnProperty.call(x||{},k));
const first=list[0];
console.log("Version listing is array:",Array.isArray(listed.result));
console.log("Version list length:",list.length);
console.log("First listed item recognized fields:",available(first).join(", ")||"none");
console.log("Active version detail recognized fields:",available(detail.result).join(", ")||"none");
console.log("First item timestamp fields with parseable values:",["created_on","created_at","created","uploaded_on","uploaded_at","timestamp"].filter(k=>Number.isFinite(Date.parse(first?.[k]||""))).join(", ")||"none");
console.log("Active detail timestamp fields with parseable values:",["created_on","created_at","created","uploaded_on","uploaded_at","timestamp"].filter(k=>Number.isFinite(Date.parse(detail.result?.[k]||""))).join(", ")||"none");
console.log("List response has result_info:",!!listed.result_info);
console.log("List response has cursor-like pagination:",!!(listed.result_info?.cursor||listed.result_info?.next_cursor||listed.result?.cursor||listed.result?.next_cursor));
console.log("First listed ID matches active:",first?.id===expected);
console.log("LIMITATION: API response ordering is not assumed; no latest uploaded version inferred.");
console.log("READ ONLY: no Worker changes, version creation, deployment, or replay.");

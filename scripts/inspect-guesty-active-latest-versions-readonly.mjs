// Read-only: compare deployed production version with latest uploaded version.
// No secrets, hashes, or raw version metadata printed.
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN;
const expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Missing valid credentials or exact version UUID");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function get(path){
 const r=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare GET failed HTTP "+r.status);
 const j=await r.json();if(j?.success!==true||!j.result)throw Error("Unexpected Cloudflare response");
 return j.result;
}
const [deployments,listing]=await Promise.all([get("/deployments"),get("/versions")]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
const versions=Array.isArray(listing)?listing:listing.items;
if(!Array.isArray(rows)||rows.length===0||!Array.isArray(versions)||versions.length===0)throw Error("Missing deployment/version history");
const deployed=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(deployed?.versions?.length!==1||deployed.versions[0].version_id!==expected||Number(deployed.versions[0].percentage)!==100)throw Error("Active version differs from expected 100% baseline");
const valid=versions.filter(v=>uuid.test(v.id||"")&&Number.isFinite(Date.parse(v.created_on||"")));
if(valid.length!==versions.length)throw Error("Cannot reliably order uploaded versions");
const ordered=[...valid].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on));
if(ordered.length>1&&Date.parse(ordered[0].created_on)===Date.parse(ordered[1].created_on))throw Error("Latest uploaded version ambiguous due to equal timestamps");
const latest=ordered[0];
const [activeVersion,latestVersion]=await Promise.all([get("/versions/"+encodeURIComponent(expected)),get("/versions/"+encodeURIComponent(latest.id))]);
const a=activeVersion?.resources?.bindings,b=latestVersion?.resources?.bindings;
if(!Array.isArray(a)||!Array.isArray(b))throw Error("Binding metadata unavailable");
function names(rows){const m=new Map(rows.map(x=>[x.name,x.type]));if(m.size!==rows.length)throw Error("Duplicate binding names");return m;}
const am=names(a),bm=names(b);
const missing=[...am].filter(([name,type])=>bm.get(name)!==type);
const extra=[...bm].filter(([name])=>!am.has(name));
console.log("PASS: expected active version still receives 100% traffic.");
console.log("Latest uploaded version equals active version:",latest.id===expected);
console.log("Active binding count:",a.length);
console.log("Latest uploaded binding count:",b.length);
console.log("Missing or type-changed active bindings in latest:",missing.length);
console.log("Additional latest bindings:",extra.length);
const etagA=activeVersion?.resources?.script?.etag,etagB=latestVersion?.resources?.script?.etag;
console.log(typeof etagA==="string"&&etagA&&typeof etagB==="string"&&etagB?"Script fingerprints match: "+(etagA===etagB):"Script fingerprint comparison: inconclusive");
if(latest.id!==expected)console.log("BLOCKED: latest uploaded differs from active; do not inherit bindings without a reviewed strategy.");
else console.log("PASS: latest uploaded and deployed version IDs match.");
console.log("LIMITATION: matching binding names/types do not prove secret values or binding targets.");
console.log("READ ONLY: no Worker changes, upload, deployment, or Guesty replay.");

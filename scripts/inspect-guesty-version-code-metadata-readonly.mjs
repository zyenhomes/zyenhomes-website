// Read-only version metadata comparison. This does NOT prove code byte parity.
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
const active=process.env.ACTIVE_VERSION_ID,candidate=process.env.CANDIDATE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!token||!/^[0-9a-f]{32}$/i.test(account||"")||!uuid.test(active||"")||!uuid.test(candidate||"")||active===candidate)throw Error("Missing or invalid read-only inputs");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function read(path){
 const r=await fetch(base+path,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("Cloudflare read failed HTTP "+r.status);
 const j=await r.json();
 if(j?.success!==true||!j.result)throw Error("Invalid metadata response");
 return j.result;
}
const [a,b,deployments]=await Promise.all([read("/versions/"+active),read("/versions/"+candidate),read("/deployments")]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
if(!Array.isArray(rows)||rows.length===0)throw Error("No deployment history");
const latest=[...rows].sort((x,y)=>Date.parse(y.created_on||0)-Date.parse(x.created_on||0))[0];
if(!Array.isArray(latest.versions)||latest.versions.length!==1||latest.versions[0].version_id!==active)throw Error("Active deployment changed; stop");
function readMetadata(v){
 const main=v?.metadata?.main_module??v?.main_module??null;
 const compatibility=v?.metadata?.compatibility_date??v?.compatibility_date??null;
 const flags=v?.metadata?.compatibility_flags??v?.compatibility_flags??null;
 return {main,compatibility,flags};
}
const x=readMetadata(a),y=readMetadata(b);
for(const k of Object.keys(x)){
 if(x[k]===null||y[k]===null){console.log("Metadata unavailable for:",k);continue}
 if(JSON.stringify(x[k])!==JSON.stringify(y[k]))throw Error("Candidate metadata differs for "+k);
 console.log("Matching metadata:",k);
}
console.log("PASS: exact baseline is still active; candidate metadata read completed.");
console.log("INCONCLUSIVE: Cloudflare version metadata cannot establish identical Worker code bytes or secret contents.");
console.log("READ ONLY: no traffic change, deployment, or secret modification.");

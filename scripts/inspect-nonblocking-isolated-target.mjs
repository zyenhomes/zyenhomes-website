// GET-only inspection. No deployment, database queries, or secret output.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[a-f0-9]{32}$/i.test(account??"")||!token)throw Error("Missing Cloudflare credentials");
const root="https://api.cloudflare.com/client/v4/accounts/"+account;
const worker="/workers/scripts/zyenhomes-guesty-auth-test-isolated2";
const expected="ca5a1af6-6ad5-4c6c-a4aa-ee75ecd0158e";
async function get(path){
 const r=await fetch(root+path,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
 if(!r.ok)throw Error("Read-only inspection rejected: HTTP "+r.status);
 const j=await r.json();if(j.success!==true||!j.result)throw Error("Unexpected inspection response");return j.result;
}
const db=await get("/d1/database/"+expected);
if(db.uuid!==expected||db.name!=="zyenhomes-booking-test")throw Error("Unexpected database identity");
const result=await get(worker+"/deployments");
const deployments=Array.isArray(result)?result:result.deployments;
if(!Array.isArray(deployments)||!deployments.length)throw Error("Deployment unavailable");
const latest=[...deployments].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];
if(latest.versions?.length!==1||latest.versions[0].percentage!==100)throw Error("Unexpected rollout");
const version=await get(worker+"/versions/"+encodeURIComponent(latest.versions[0].version_id));
const bindings=version.resources?.bindings;
if(!Array.isArray(bindings))throw Error("Bindings unavailable");
const d1=bindings.filter(b=>b.type==="d1");
if(d1.some(b=>b.name!=="ISOLATED_BOOKING_DB"||b.id!==expected))throw Error("Unexpected D1 binding; stop");
console.log("PASS: isolated database identity and active Worker inspected");
console.log("Active isolated D1 binding present:",d1.length===1);
console.log("Candidate binding must be verified separately after approved version upload.");

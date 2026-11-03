// Read-only exact-version deployment preflight for the production booking Worker.
// Requires explicit version ID; prints no IDs, binding values, secrets or raw API bodies.
// Does not deploy, roll back, or modify any Cloudflare resource.
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const candidateId=process.env.CANDIDATE_VERSION_ID;
if(!token||!/^[0-9a-fA-F]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
if(!/^[0-9a-fA-F-]{36}$/.test(candidateId||""))throw Error("Exact candidate version UUID required");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function read(path){
 const response=await fetch(base+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("Cloudflare metadata GET failed: HTTP "+response.status);
 const body=await response.json();
 if(body?.success!==true||!body.result)throw Error("Unexpected Cloudflare metadata shape");
 return body.result;
}
const candidate=await read("/versions/"+encodeURIComponent(candidateId));
const deployed=await read("/deployments");
const deployments=Array.isArray(deployed)?deployed:deployed.deployments;
if(!Array.isArray(deployments)||!deployments.length)throw Error("Cannot establish deployment baseline");
const bindings=candidate?.resources?.bindings;
if(!Array.isArray(bindings))throw Error("Candidate version bindings unavailable");
const types=new Map(bindings.map(b=>[b.name,b.type]));
for(const name of ["BOOKING_DB","GUESTY_TOKEN_KV","BOOKING_RATE_LIMITER","GUESTY_CLIENT_ID","GUESTY_CLIENT_SECRET","GUESTY_WEBHOOK_SECRET","GUESTY_WEBHOOKS_ENABLED"]){
 if(!types.has(name))throw Error("Required candidate binding missing: "+name);
}
const flags=new Map(bindings.filter(b=>b.type==="plain_text").map(b=>[b.name,b.text]));
if(flags.get("GUESTY_WEBHOOKS_ENABLED")!=="false")throw Error("Candidate receiver must remain disabled");
if(flags.get("BOOKING_REQUESTS_ENABLED")!=="false")throw Error("Candidate booking submissions flag not confirmed disabled");
console.log("PASS: candidate contains expected binding names and disabled flags.");
console.log("Deployment history entries available:",deployments.length);
console.log("LIMITATION: binding targets, existing secret values, live traffic allocation, and rollback readiness require separate verification.");
console.log("READ ONLY: no deployment, secret installation, or version creation.");

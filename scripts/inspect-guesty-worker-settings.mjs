// Read-only Cloudflare production configuration inspection.
// Never prints credentials, bindings values, or response bodies.
const token=process.env.CLOUDFLARE_API_TOKEN;
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing token or valid account ID");
const url="https://api.cloudflare.com/client/v4/accounts/"+account+"/workers/scripts/zyenhomes-booking-api/settings";
const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
console.log("Cloudflare Worker settings GET HTTP status:",response.status);
if(!response.ok)process.exit(1);
const payload=await response.json();
if(payload?.success!==true||!payload.result)throw Error("Unexpected settings response");
const bindings=payload.result.bindings;
if(!Array.isArray(bindings))throw Error("No bindings array; stop");
const names=new Set(bindings.map(x=>x?.name));
for(const name of ["BOOKING_DB","GUESTY_TOKEN_KV","BOOKING_RATE_LIMITER","GUESTY_CLIENT_ID","GUESTY_CLIENT_SECRET","GUESTY_WEBHOOKS_ENABLED"]){
  if(!names.has(name))throw Error("Required Worker binding missing: "+name);
  console.log("Present:",name);
}
const flag=bindings.find(x=>x.name==="GUESTY_WEBHOOKS_ENABLED");
if(flag?.text!=="false")throw Error("Production webhook receiver is not confirmed disabled");
console.log("PASS: Production bindings present and webhook receiver disabled.");
console.log("READ ONLY: No Worker modifications. Secret installation compatibility is not yet proven.");

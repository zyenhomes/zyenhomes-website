// Read-only isolated Worker inspection. Never prints binding values or secrets.
// Does not create versions, deploy, install secrets, or modify Cloudflare.
const name="zyenhomes-webhook-test";
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const url=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}/settings`;
const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
console.log("Isolated Worker settings HTTP status:",response.status);
if(!response.ok)throw Error("Isolated Worker inspection unavailable");
const payload=await response.json();
if(payload?.success!==true||!Array.isArray(payload.result?.bindings))throw Error("Unexpected settings response");
const names=new Set(payload.result.bindings.map(x=>x?.name));
for(const expected of ["TEST_PRESERVE_VARIABLE","TEST_DUMMY_SECRET"])
 if(!names.has(expected))throw Error("Missing isolated baseline binding: "+expected);
console.log("PASS: isolated Worker exists with expected baseline binding names.");
console.log("READ ONLY: No Worker changes; version-only secret behavior remains unverified.");

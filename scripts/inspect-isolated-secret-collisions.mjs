// Read-only diagnostic for two known fictional isolated-Worker secret names.
// No raw binding values, credentials, or full binding inventory in logs.
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const url=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-webhook-test/settings`;
const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
console.log("Isolated settings status:",response.status);
if(!response.ok)throw Error("Read-only inspection unavailable");
const data=await response.json();
if(data?.success!==true||!Array.isArray(data.result?.bindings))throw Error("Unexpected settings response");
const bindings=data.result.bindings;
for(const name of ["TEST_VERSION_ONLY_SECRET_2026","TEST_VERSION_ONLY_SECRET_2026_B"]){
 const found=bindings.find(x=>x?.name===name);
 console.log(name+": "+(found?"present ("+(found.type==="secret_text"?"secret_text":"other type")+")":"absent"));
}
console.log("READ ONLY: no version created, no binding changed.");

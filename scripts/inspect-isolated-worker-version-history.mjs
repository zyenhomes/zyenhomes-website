// Read-only Cloudflare isolated Worker version/deployment metadata diagnostic.
// Does not print secrets, bindings, response bodies, or tokens.
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-webhook-test`;
async function read(suffix){
 const response=await fetch(base+suffix,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 console.log(suffix==="\/versions"?"Versions HTTP status:":"Deployments HTTP status:",response.status);
 if(!response.ok)throw Error("Read-only version/deployment inspection unavailable");
 const body=await response.json();
 if(body?.success!==true||!body.result)throw Error("Unexpected Cloudflare metadata response");
 return body.result;
}
const versions=await read("/versions");
const deployments=await read("/deployments");
const versionRows=Array.isArray(versions)?versions:Array.isArray(versions.items)?versions.items:null;
const deploymentRows=Array.isArray(deployments)?deployments:Array.isArray(deployments.deployments)?deployments.deployments:null;
if(!versionRows||!deploymentRows)throw Error("Unexpected version/deployment listing shape");
console.log("Version entries in response:",versionRows.length);
console.log("Deployment entries in response:",deploymentRows.length);
console.log("READ ONLY: no version created, no secret installed, no deployment performed.");
console.log("LIMITATION: listing counts alone do not identify which version is deployed.");

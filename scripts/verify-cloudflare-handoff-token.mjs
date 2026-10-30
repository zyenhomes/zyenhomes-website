// Read-only Cloudflare API token preflight. Never print token or API response body.
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token)throw Error("Missing CLOUDFLARE_API_TOKEN environment secret");
const res=await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify",{
  headers:{Authorization:"Bearer "+token,Accept:"application/json"},
  signal:AbortSignal.timeout(15000)
});
if(!res.ok){console.log("Cloudflare token verification HTTP status:",res.status);process.exit(1);}
const data=await res.json();
if(data?.success!==true || data?.result?.status!=="active"){
  console.error("Cloudflare token is not confirmed active");process.exit(1);
}
console.log("Cloudflare API token active; no Worker changes performed.");
console.log("This does not verify Workers Scripts Edit permission or secret installation.");

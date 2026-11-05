// Offline-only environment shape validation. No network access, no credential output.
const token=process.env.CLOUDFLARE_API_TOKEN;
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const tokenPresent=typeof token==="string"&&token.length>0;
const accountPresent=typeof account==="string"&&account.length>0;
const accountFormat=/^[a-f0-9]{32}$/i.test(account||"");
console.log("Cloudflare API token present:",tokenPresent?"YES":"NO");
console.log("Cloudflare account ID present:",accountPresent?"YES":"NO");
console.log("Cloudflare account ID format (32 hexadecimal chars):",accountFormat?"VALID":"INVALID");
console.log("READ ONLY: no network calls or Cloudflare changes.");
if(!tokenPresent||!accountFormat)process.exitCode=1;

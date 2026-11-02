// Guesty -> Cloudflare signing-secret handoff. DO NOT RUN until subscription exists.
// No secret/token/body logging. Fail closed if response shape is unrecognized.
// Version-only command: do not deploy or activate the new version automatically.
import {spawnSync} from "node:child_process";
const endpoint="https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/webhooks/guesty/messages";
const id=process.env.GUESTY_OPEN_API_CLIENT_ID;
const secret=process.env.GUESTY_OPEN_API_CLIENT_SECRET;
const cloudflare=process.env.CLOUDFLARE_API_TOKEN;
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
// Additional fail-closed gate: activation requires separate confirmation that
// secret installation was tested against an isolated Worker. Do not set until verified.
if(process.env.HANDOFF_CONFIRMATION!=="INSTALL_GUESTY_SIGNING_SECRET")throw Error("Explicit handoff confirmation required");
if(process.env.ISOLATED_WORKER_SECRET_PUT_VERIFIED!=="true")throw Error("Isolated Worker secret installation has not been verified; stop");
if(process.env.GUESTY_SUBSCRIPTION_VERIFIED!=="true")throw Error("Guesty subscription identity has not been verified; stop");
if(process.env.GUESTY_SECRET_SCHEMA_VERIFIED!=="true")throw Error("Guesty signing-secret schema has not been verified; stop");
if(!id||!secret||!cloudflare||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing required credentials/configuration");
const auth=await fetch("https://open-api.guesty.com/oauth2/token",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",scope:"open-api",client_id:id,client_secret:secret}),signal:AbortSignal.timeout(20000)});
if(!auth.ok)throw Error("Guesty authentication failed: HTTP "+auth.status);
const access=(await auth.json()).access_token;
if(typeof access!=="string"||!access)throw Error("Guesty token missing");
// Independently verify the exact subscribed endpoint before requesting its secret.
const subscriptionsResponse=await fetch("https://open-api.guesty.com/v1/webhooks",{headers:{Authorization:"Bearer "+access,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
if(!subscriptionsResponse.ok)throw Error("Subscription verification unavailable: HTTP "+subscriptionsResponse.status);
const subscriptions=await subscriptionsResponse.json();
if(!Array.isArray(subscriptions))throw Error("Unexpected subscription listing shape; stop");
const matching=subscriptions.filter(item=>item&&typeof item==="object"&&item.url===endpoint);
if(matching.length!==1)throw Error("Expected exactly one subscription for the approved endpoint; stop");
const url=new URL("https://open-api.guesty.com/v1/webhooks-v2/secret");
url.searchParams.set("url",endpoint);
const response=await fetch(url,{headers:{Authorization:"Bearer "+access,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error("Guesty signing-secret request failed: HTTP "+response.status);
const payload=await response.json();
// Guesty public docs show {} rather than a concrete response schema.
// Only accept a single explicit top-level 'secret' key until verified.
if(!payload||typeof payload!=="object"||Array.isArray(payload)||Object.keys(payload).length!==1||typeof payload.secret!=="string"||!/^whsec_[A-Za-z0-9+/=]{20,}$/.test(payload.secret))throw Error("Unrecognized Guesty signing-secret response; no Cloudflare changes made");
const child=spawnSync("../node_modules/.bin/wrangler",["versions","secret","put","GUESTY_WEBHOOK_SECRET","--name","zyenhomes-booking-api","--config","wrangler.toml"],{
  cwd:"cloudflare",input:payload.secret+"\n",encoding:"utf8",
  env:{...process.env,CLOUDFLARE_API_TOKEN:cloudflare,CLOUDFLARE_ACCOUNT_ID:account},
  timeout:30000,maxBuffer:100000
});
if(child.status!==0)throw Error("Cloudflare secret installation failed; inspect permissions and Worker state without exposing output");
console.log("Guesty signing secret installation command completed. Receiver must remain disabled until separate signed-event verification.");

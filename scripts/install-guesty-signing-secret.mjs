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
// Retry at most once, and only when Guesty supplies a bounded Retry-After.
// Never log the OAuth response body, token, or Retry-After raw value.
function retryDelayMs(value){
 if(!value)return null;
 const trimmed=value.trim();
 let ms;
 if(/^[0-9]+$/.test(trimmed))ms=Number(trimmed)*1000;
 else {
   const parsed=Date.parse(trimmed);
   if(!Number.isFinite(parsed))return null;
   ms=Math.max(0,parsed-Date.now());
 }
 return Number.isFinite(ms)&&ms>=1000&&ms<=60000?ms:null;
}
async function authenticate(){
 for(let attempt=0;attempt<2;attempt++){
   const response=await fetch("https://open-api.guesty.com/oauth2/token",{
     method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},
     body:new URLSearchParams({grant_type:"client_credentials",scope:"open-api",client_id:id,client_secret:secret}),
     signal:AbortSignal.timeout(20000)
   });
   if(response.ok)return response;
   if(response.status!==429)throw Error("Guesty authentication failed: HTTP "+response.status);
   const wait=retryDelayMs(response.headers.get("Retry-After"));
   if(attempt===1||wait===null)throw Error("Guesty OAuth rate limited (HTTP 429); no further attempts made");
   console.log("Guesty OAuth rate limited; respecting bounded Retry-After before one retry.");
   await new Promise(resolve=>setTimeout(resolve,wait));
 }
 throw Error("Guesty OAuth unavailable");
}
// A securely injected, unexpired Open API token can be reused without tokenization.
// Never use a Booking Engine token here. Do not log the token or its expiry.
async function getAccessToken(){
 const supplied=process.env.GUESTY_OPEN_API_ACCESS_TOKEN;
 const expiry=process.env.GUESTY_OPEN_API_TOKEN_EXPIRES_AT;
 if(supplied||expiry){
   if(typeof supplied!=="string"||supplied.length<20||!/^\\d{13}$/.test(expiry||""))throw Error("Invalid cached Open API token metadata; stop");
   const remaining=Number(expiry)-Date.now();
   if(!Number.isSafeInteger(Number(expiry))||remaining<300000||remaining>86400000)throw Error("Cached Open API token expired or expiry invalid; stop");
   console.log("Using securely supplied unexpired Open API token; no OAuth request.");
   return supplied;
 }
 const auth=await authenticate();
 const access=(await auth.json()).access_token;
 if(typeof access!=="string"||!access)throw Error("Guesty token missing");
 return access;
}
const access=await getAccessToken();
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
// Read-only Guesty inspection #4 verified one top-level 'key' field with a Svix-format string.
// Reject all other shapes and never log the value.
if(!payload||typeof payload!=="object"||Array.isArray(payload)||Object.keys(payload).length!==1||typeof payload.key!=="string"||!/^whsec_[A-Za-z0-9+/=]{20,}$/.test(payload.key))throw Error("Unrecognized Guesty signing-secret response; no Cloudflare changes made");
const child=spawnSync("../node_modules/.bin/wrangler",["versions","secret","put","GUESTY_WEBHOOK_SECRET","--name","zyenhomes-booking-api","--config","wrangler.toml"],{
  cwd:"cloudflare",input:payload.key+"\n",encoding:"utf8",
  env:{...process.env,CLOUDFLARE_API_TOKEN:cloudflare,CLOUDFLARE_ACCOUNT_ID:account},
  timeout:30000,maxBuffer:100000
});
if(child.status!==0)throw Error("Cloudflare secret installation failed; inspect permissions and Worker state without exposing output");
console.log("Guesty signing secret installation command completed. Receiver must remain disabled until separate signed-event verification.");

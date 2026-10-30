// Read-only subscription preflight. Never print OAuth tokens or subscription destinations.
const id=process.env.GUESTY_OPEN_API_CLIENT_ID,secret=process.env.GUESTY_OPEN_API_CLIENT_SECRET;
if(!id||!secret)throw Error("Missing Open API environment secrets");
const auth=await fetch("https://open-api.guesty.com/oauth2/token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",scope:"open-api",client_id:id,client_secret:secret}),signal:AbortSignal.timeout(20000)});
if(!auth.ok){console.log("OAuth HTTP status:",auth.status);process.exit(1);}
const token=(await auth.json()).access_token;
if(typeof token!=="string"||!token)throw Error("Missing token");
const response=await fetch("https://open-api.guesty.com/v1/webhooks",{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
console.log("Webhook listing HTTP status:",response.status);
if(!response.ok)process.exit(1);
const data=await response.json();
if(!Array.isArray(data))throw Error("Unexpected subscription list shape; stop");
console.log("Existing subscription count:",data.length);
if(data.length!==0)throw Error("Subscriptions exist; stop to avoid duplicates");
console.log("Preflight passed. No webhook subscription was created.");

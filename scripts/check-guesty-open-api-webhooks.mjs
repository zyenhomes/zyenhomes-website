// Read-only Guesty Open API authentication check. Never print credentials, tokens or webhook URLs.
const clientId=process.env.GUESTY_OPEN_API_CLIENT_ID;
const clientSecret=process.env.GUESTY_OPEN_API_CLIENT_SECRET;
if(!clientId||!clientSecret)throw Error("Missing dedicated Guesty Open API GitHub Actions secrets");
const form=new URLSearchParams({grant_type:"client_credentials",scope:"open-api",client_id:clientId,client_secret:clientSecret});
const auth=await fetch("https://open-api.guesty.com/oauth2/token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded"},body:form,signal:AbortSignal.timeout(20000)});
if(!auth.ok){console.log("Open API token HTTP status:",auth.status);process.exit(1);}
const tokenResponse=await auth.json();
if(typeof tokenResponse.access_token!=="string"||!tokenResponse.access_token)throw Error("Token response missing access token");
console.log("Open API token request: successful");
const response=await fetch("https://open-api.guesty.com/v1/webhooks",{headers:{"Authorization":"Bearer "+tokenResponse.access_token,"Accept":"application/json"},signal:AbortSignal.timeout(20000)});
console.log("GET /v1/webhooks HTTP status:",response.status);
if(!response.ok)process.exit(1);
const data=await response.json();
if(Array.isArray(data))console.log("Subscription count:",data.length);
else console.log("Webhook list response received (unexpected shape; no data logged)");
console.log("Read-only authentication check complete. No subscriptions created.");

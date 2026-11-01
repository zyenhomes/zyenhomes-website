// Creates ONE Guesty subscription only after explicit approval and a zero-subscription check.
// Do not run before a secure Guesty signing-secret transfer to Cloudflare is prepared.
// Never log credentials, tokens, webhook URLs, response bodies or guest information.
const confirmation=process.env.ACTIVATION_CONFIRMATION;
if(confirmation!=="CREATE_GUESTY_MESSAGE_SUBSCRIPTION")throw Error("Explicit confirmation required");
if(process.env.RECEIVER_ACTIVATION_READY!=="true")throw Error("Coordinated receiver activation readiness not approved; stop");
const id=process.env.GUESTY_OPEN_API_CLIENT_ID,secret=process.env.GUESTY_OPEN_API_CLIENT_SECRET;
if(!id||!secret)throw Error("Missing Open API environment secrets");
const endpoint="https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/webhooks/guesty/messages";
const auth=await fetch("https://open-api.guesty.com/oauth2/token",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",scope:"open-api",client_id:id,client_secret:secret}),signal:AbortSignal.timeout(20000)});
if(!auth.ok){console.log("OAuth status:",auth.status);process.exit(1);}
const token=(await auth.json()).access_token;
if(typeof token!=="string"||!token)throw Error("Token missing");
const headers={Authorization:"Bearer "+token,Accept:"application/json"};
const listed=await fetch("https://open-api.guesty.com/v1/webhooks",{headers,signal:AbortSignal.timeout(20000)});
console.log("Subscription preflight HTTP status:",listed.status);
if(!listed.ok)process.exit(1);
const subscriptions=await listed.json();
if(!Array.isArray(subscriptions))throw Error("Unexpected subscription response; stop");
console.log("Existing subscription count:",subscriptions.length);
if(subscriptions.length!==0)throw Error("Existing subscriptions detected; do not create duplicates");
console.log("Preflight clear; making one subscription creation request.");
const created=await fetch("https://open-api.guesty.com/v1/webhooks",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({url:endpoint,events:["reservation.messageReceived","reservation.messageSent"]}),signal:AbortSignal.timeout(20000)});
console.log("Subscription creation HTTP status:",created.status);
if(created.status!==201)throw Error("Creation not confirmed; check Guesty subscriptions before any retry");
console.log("Subscription creation accepted. Receiver remains disabled. Configure signing secret before activation.");

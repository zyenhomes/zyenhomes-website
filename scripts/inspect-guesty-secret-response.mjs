// Read-only Guesty signing-secret response shape probe.
// Never log response bodies, unknown keys, credentials, endpoint URL, or secrets.
const id=process.env.GUESTY_OPEN_API_CLIENT_ID;
const secret=process.env.GUESTY_OPEN_API_CLIENT_SECRET;
if(!id||!secret)throw Error("Missing Guesty Open API environment credentials");
const auth=await fetch("https://open-api.guesty.com/oauth2/token",{
 method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},
 body:new URLSearchParams({grant_type:"client_credentials",scope:"open-api",client_id:id,client_secret:secret}),
 signal:AbortSignal.timeout(20000)
});
console.log("OAuth HTTP status:",auth.status);
if(!auth.ok)process.exit(1);
const token=(await auth.json()).access_token;
if(typeof token!=="string"||!token)throw Error("Missing OAuth access token");
const target=new URL("https://open-api.guesty.com/v1/webhooks-v2/secret");
target.searchParams.set("url","https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/webhooks/guesty/messages");
const response=await fetch(target,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
console.log("Secret endpoint HTTP status:",response.status);
const payload=await response.json().catch(()=>null);
if(!response.ok){
 console.log("Secret endpoint did not return success; response body suppressed.");
 process.exit(0); // No subscription yet may be an expected condition.
}
if(!payload||typeof payload!=="object"||Array.isArray(payload)){
 console.log("Response shape: non-object or array; value suppressed");
 process.exit(0);
}
const keys=Object.keys(payload);
console.log("Top-level field count:",keys.length);
for(const key of ["secret","signingSecret","webhookSecret","data"]){
 if(!Object.hasOwn(payload,key))continue;
 const value=payload[key];
 const kind=typeof value==="string"?( /^whsec_[A-Za-z0-9+/=]{20,}$/.test(value)?"Svix-format string":"other string" ):Array.isArray(value)?"array":value===null?"null":typeof value;
 console.log("Recognized field:",key,"type:",kind);
}
// Classify the sole unrecognized field without printing its key or value.
// Do not treat this diagnostic as authorization to install a secret.
const recognized=new Set(["secret","signingSecret","webhookSecret","data"]);
const unknownKeys=keys.filter(key=>!recognized.has(key));
if(keys.length===1&&unknownKeys.length===1){
 const value=payload[unknownKeys[0]];
 const kind=typeof value==="string"
   ? (/^whsec_[A-Za-z0-9+/=]{20,}$/.test(value)?"Svix-format string":"other string")
   : Array.isArray(value)?"array":value===null?"null":typeof value;
 console.log("Single unrecognized field type:",kind);
 // Compare only against a fixed set of plausible documented-style keys.
 // The output is a boolean match and never prints the unknown key itself.
 const candidateNames=["signing_secret","signing_key","signingKey","webhook_secret","webhookSigningSecret","webhook_signing_secret","svixSecret","svix_secret","key","value"];
 const matched=candidateNames.filter(name=>Object.hasOwn(payload,name));
 console.log("Fixed candidate field-name match:",matched.length===1?matched[0]:"none");
 console.log("Field name suppressed unless it matches the reviewed fixed candidate list; exact schema requires independent validation.");
}
console.log("No secret values or unknown field names printed. No subscriptions or Worker changes made.");

// OAuth security primitives. No Gmail API requests or token persistence.
export function randomUrlSafe(bytes=32) {
 if(!Number.isInteger(bytes)||bytes<32||bytes>128)throw Error("Invalid random length");
 const raw=new Uint8Array(bytes);crypto.getRandomValues(raw);
 return Array.from(raw,b=>b.toString(16).padStart(2,"0")).join("");
}
export async function pkceChallenge(verifier){
 if(typeof verifier!=="string"||!/^[a-zA-Z0-9._~-]{43,128}$/.test(verifier))throw Error("Invalid PKCE verifier");
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
 const b64=typeof Buffer!=="undefined"?Buffer.from(digest).toString("base64"):btoa(String.fromCharCode(...digest));
 return b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function callbackError(url,expectedOrigin){
 if(url.origin!==expectedOrigin)return "origin_mismatch";
 const params=url.searchParams;
 if(params.has("error"))return "oauth_denied";
 if(params.getAll("state").length!==1||!/^([0-9a-f]{64})$/.test(params.get("state")||""))return "invalid_state";
 if(params.getAll("code").length!==1||!(params.get("code")||"").trim())return "missing_code";
 return null;
}

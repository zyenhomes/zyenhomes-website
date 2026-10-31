// Offline-only adapter for administrator OAuth login state.
// Requires the dedicated Gmail D1 binding and an AES-GCM CryptoKey.
// Never attach to live Worker routes without integration/security review.
import {sealToken,openToken} from "./token-crypto.js";
import {createOAuthState,consumeOAuthState} from "./d1-oauth-sessions.js";

async function hashState(state) {
 if(typeof state!=="string"||!/^[0-9a-f]{64}$/.test(state))throw Error("Invalid OAuth state");
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(state));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}

export function createAdminLoginStateAdapter(db,key,{now=()=>Date.now()}={}) {
 if(!db||typeof db.prepare!=="function"||!key||typeof now!=="function")
  throw Error("Missing secure login-state dependencies");
 return {
  async persistLoginState({state,verifier,nonce,createdAt,ttlSeconds}) {
   if(typeof verifier!=="string"||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)||
      typeof nonce!=="string"||!/^[0-9a-f]{64}$/.test(nonce)||
      !Number.isSafeInteger(createdAt)||!Number.isSafeInteger(ttlSeconds)||
      ttlSeconds<1||ttlSeconds>600)throw Error("Invalid login state");
   const current=now();
   if(!Number.isSafeInteger(current)||Math.abs(current-createdAt)>60000)
    throw Error("Invalid creation time");
   const createdSeconds=Math.floor(createdAt/1000);
   const expiresSeconds=Math.floor((createdAt+ttlSeconds*1000)/1000);
   const encrypted=await sealToken(key,JSON.stringify({verifier,nonce}));
   await createOAuthState(db,await hashState(state),JSON.stringify(encrypted),createdSeconds,expiresSeconds);
  },
  async consumeLoginState(state) {
   const current=now();
   if(!Number.isSafeInteger(current)||current<0)throw Error("Invalid clock");
   const row=await consumeOAuthState(db,await hashState(state),Math.floor(current/1000));
   const plaintext=await openToken(key,JSON.parse(row.verifier_ciphertext));
   const parsed=JSON.parse(plaintext);
   if(typeof parsed?.verifier!=="string"||!/^[A-Za-z0-9._~-]{43,128}$/.test(parsed.verifier)||
      typeof parsed?.nonce!=="string"||!/^[0-9a-f]{64}$/.test(parsed.nonce))
    throw Error("Invalid decrypted login state");
   return {verifier:parsed.verifier,nonce:parsed.nonce};
  }
 };
}

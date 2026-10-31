// Offline-only envelope encryption helpers for future Google OAuth tokens.
// Requires a 32-byte AES-GCM key provided by a secret manager; never commit keys.
export async function importEncryptionKey(raw) {
 if(!(raw instanceof Uint8Array)||raw.byteLength!==32)throw Error("Expected 32-byte key");
 return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
export async function sealToken(key,token) {
 if(typeof token!=="string"||!token||token.length>8192)throw Error("Invalid token");
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode("zyenhomes-gmail-oauth-v1")},key,new TextEncoder().encode(token)));
 return {version:1,iv:Array.from(iv),ciphertext:Array.from(ciphertext)};
}
export async function openToken(key,envelope) {
 if(envelope?.version!==1||!Array.isArray(envelope.iv)||envelope.iv.length!==12||!Array.isArray(envelope.ciphertext))throw Error("Invalid token envelope");
 const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(envelope.iv),additionalData:new TextEncoder().encode("zyenhomes-gmail-oauth-v1")},key,new Uint8Array(envelope.ciphertext));
 return new TextDecoder().decode(plain);
}

// Trusted Google JWKS retrieval, no arbitrary URLs or token logging.
// Cache only in process memory, bounded by a short TTL; production should
// additionally handle key rotation and temporary Google outages.
const GOOGLE_JWKS_URL="https://www.googleapis.com/oauth2/v3/certs";
export async function getGoogleJwks({fetchImpl=fetch,now=Date.now()}={}){
 const response=await fetchImpl(GOOGLE_JWKS_URL,{
  method:"GET",headers:{Accept:"application/json"},
  redirect:"error",signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error("Google signing keys unavailable: HTTP "+response.status);
 const data=await response.json();
 if(!data||!Array.isArray(data.keys)||data.keys.length<1||data.keys.length>30)throw Error("Invalid Google signing keys");
 const seen=new Set();
 const keys=data.keys.map(k=>{
  if(!k||k.kty!=="RSA"||typeof k.kid!=="string"||!k.kid||typeof k.n!=="string"||typeof k.e!=="string"||!(!k.alg||k.alg==="RS256")||!(!k.use||k.use==="sig")||seen.has(k.kid))throw Error("Invalid or duplicate Google signing key");
  seen.add(k.kid);
  return {kty:"RSA",kid:k.kid,n:k.n,e:k.e,alg:"RS256",use:"sig"};
 });
 return {keys,fetchedAt:now,expiresAt:now+300000};
}

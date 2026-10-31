// Undeployed admin login rate-limit gate.
// Requires an atomic distributed limiter (Cloudflare Rate Limiting binding or
// equivalent); in-memory counters are NOT suitable for production Workers.
// Do not use client-supplied X-Forwarded-For or arbitrary IP headers as identity.
export async function checkAdminLoginRateLimit({limiter,key}){
 if(!limiter||typeof limiter.limit!=="function")throw Error("Rate limiter unavailable");
 if(typeof key!=="string"||!/^admin-login:[a-z0-9:_-]{8,128}$/.test(key))
  throw Error("Invalid rate limit key");
 const result=await limiter.limit({key});
 if(!result||typeof result.success!=="boolean")throw Error("Invalid limiter response");
 return result.success;
}
export async function requireAdminLoginRateLimit({limiter,key}){
 try{
  const allowed=await checkAdminLoginRateLimit({limiter,key});
  if(!allowed)return {allowed:false,status:429,reason:"rate_limited"};
  return {allowed:true,status:200,reason:"allowed"};
 }catch{
  // Fail closed when binding is missing or the limiter is unavailable.
  return {allowed:false,status:503,reason:"limiter_unavailable"};
 }
}

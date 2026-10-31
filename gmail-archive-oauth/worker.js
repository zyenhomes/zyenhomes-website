// Standalone, UNDEPLOYED Gmail OAuth Worker. All OAuth routes fail closed.
// Future live wiring requires authenticated admin access, secure state/nonce
// storage, verified Google ID token, and encrypted refresh-token persistence.
const headers={"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!["/oauth/google/start","/oauth/google/callback"].includes(url.pathname))
   return new Response("Not found",{status:404,headers});
  // The flag is intentionally not sufficient to enable live OAuth. Do not
  // activate until the reviewed security adapter and admin gate are connected.
  return new Response("Gmail OAuth authorization is not enabled.",{status:503,headers});
 }
};

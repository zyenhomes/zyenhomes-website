// Undeployed administrator route adapter. Dependencies are injected for testing.
// Live deployment requires verified Google ID tokens, atomic D1 state consumption,
// authenticated sessions, CSRF protection and exact redirect URI configuration.
import {completeAdminLogin} from "./admin-login-flow.js";
import {adminCookie} from "./admin-session.js";
const baseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function handleAdminLoginCallback(request,dependencies){
 if(request.method!=="GET")return new Response("Method not allowed",{status:405,headers:baseHeaders});
 const url=new URL(request.url);
 if(url.pathname!=="/admin/google/callback")return new Response("Not found",{status:404,headers:baseHeaders});
 if(url.origin!==dependencies.expectedOrigin)return new Response("Invalid callback origin",{status:400,headers:baseHeaders});
 if(url.searchParams.has("error"))return new Response("Authorization denied",{status:400,headers:baseHeaders});
 if(url.searchParams.getAll("state").length!==1||url.searchParams.getAll("code").length!==1)
  return new Response("Invalid callback",{status:400,headers:baseHeaders});
 const result=await completeAdminLogin({
  state:url.searchParams.get("state"),code:url.searchParams.get("code"),
  consumeLoginState:dependencies.consumeLoginState,
  exchangeCode:dependencies.exchangeCode,
  verifyAdminIdentity:dependencies.verifyAdminIdentity,
  createSession:dependencies.createSession
 });
 if(result.status!==200)return new Response("Authorization unsuccessful",{status:result.status,headers:baseHeaders});
 // createSession must return an opaque 64-hex session ID, not a prebuilt cookie.
 // This prevents arbitrary Set-Cookie attributes being injected by an adapter.
 if(!/^[0-9a-f]{64}$/.test(result.sessionCookie))throw Error("Invalid session ID from adapter");
 return new Response("Administrator authenticated",{status:200,headers:{...baseHeaders,"Set-Cookie":adminCookie(result.sessionCookie)}});
}

// Offline composition of admin-login initiation safeguards.
// The trusted Worker adapter must supply a real distributed limiter, trusted
// rate-limit key, CSRF bootstrap, and atomic session persistence.
// No production routes are enabled by this module.
import {validateLoginCsrf} from "./admin-login-csrf.js";
import {requireAdminLoginRateLimit} from "./admin-login-rate-limit.js";
import {handleAdminLoginStart} from "./admin-login-start-route.js";
export async function protectedAdminLoginStart(request,dependencies){
 const {expectedOrigin,limiter,rateLimitKey}=dependencies;
 if(!validateLoginCsrf(request,expectedOrigin))
  return new Response("Unauthorized",{status:403,headers:{"Cache-Control":"no-store"}});
 const limit=await requireAdminLoginRateLimit({limiter,key:rateLimitKey});
 if(!limit.allowed)
  return new Response("Login unavailable",{status:limit.status,headers:{"Cache-Control":"no-store"}});
 return handleAdminLoginStart(request,{
  expectedOrigin,
  clientId:dependencies.clientId,
  redirectUri:dependencies.redirectUri,
  persistLoginState:dependencies.persistLoginState,
  // CSRF checked above; still require a separately validated initiation policy.
  authorizeInitiation:dependencies.authorizeInitiation
 });
}

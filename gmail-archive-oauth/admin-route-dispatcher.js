// Offline route dispatcher for the standalone Gmail OAuth Worker.
// Never enables live routes on the deployed Worker. Dependency injection
// permits isolated security tests before any production wiring.
import {bootstrapAdminLoginCsrf} from "./admin-csrf-bootstrap.js";
import {protectedAdminLoginStart} from "./protected-admin-login-start.js";
import {handleAdminLoginCallback} from "./admin-login-route.js";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function dispatchAdminRoutes(request,dependencies){
 const pathname=new URL(request.url).pathname;
 if(!["/admin/login/csrf","/admin/google/start","/admin/google/callback"].includes(pathname))
  return new Response("Not found",{status:404,headers});
 // Separate explicit test gate; cannot be enabled by the archive feature flag.
 if(dependencies?.testMode!==true)
  return new Response("Authorization disabled",{status:503,headers});
 if(pathname==="/admin/login/csrf")
  return bootstrapAdminLoginCsrf(request,{
   expectedOrigin:dependencies.expectedOrigin,
   authorizeBootstrap:dependencies.authorizeBootstrap
  });
 if(pathname==="/admin/google/start")
  return protectedAdminLoginStart(request,dependencies);
 return handleAdminLoginCallback(request,dependencies);
}

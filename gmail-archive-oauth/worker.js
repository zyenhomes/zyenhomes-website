// Standalone UNDEPLOYED Gmail OAuth Worker.
// Route dispatcher is imported for integration, but no live routes are enabled.
// A future security-reviewed adapter must supply verified auth, atomic D1,
// CSRF initiation policy, and distributed rate limiting before activation.
import {dispatchAdminRoutes} from "./admin-route-dispatcher.js";
const headers={"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const LIVE_ADMIN_ROUTES_ENABLED=false; // Deliberate compile-time safety gate.
export default {
 async fetch(request,env){
  const pathname=new URL(request.url).pathname;
  const adminPaths=["/admin/login/csrf","/admin/google/start","/admin/google/callback"];
  const archivePaths=["/oauth/google/start","/oauth/google/callback"];
  if(!adminPaths.includes(pathname)&&!archivePaths.includes(pathname))
   return new Response("Not found",{status:404,headers});
  if(!LIVE_ADMIN_ROUTES_ENABLED)
   return new Response("Gmail OAuth authorization is not enabled.",{status:503,headers});
  // Unreachable until explicit security-reviewed code change. A feature flag,
  // query parameter or request header cannot enable these routes.
  if(adminPaths.includes(pathname))
   return dispatchAdminRoutes(request,{testMode:false});
  return new Response("Gmail archive authorization is not enabled.",{status:503,headers});
 }
};

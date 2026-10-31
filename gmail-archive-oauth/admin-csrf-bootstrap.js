// Undeployed CSRF bootstrap for a same-origin administrator login page.
// HttpOnly cookie is never read by JavaScript; a separate one-time response
// supplies the matching token to the page for its X-Zyen-CSRF request header.
// This is not authentication. Production must add rate limits, no CORS,
// abuse controls, and bind issuance to an authenticated/approved initiation.
import {issueLoginCsrf} from "./admin-login-csrf.js";
export function bootstrapAdminLoginCsrf(request,{expectedOrigin,authorizeBootstrap}={}){
 const url=new URL(request.url);
 const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Vary":"Origin"};
 if(url.pathname!=="/admin/login/csrf")return new Response("Not found",{status:404,headers});
 if(request.method!=="POST")return new Response("Method not allowed",{status:405,headers});
 if(url.origin!==expectedOrigin||request.headers.get("Origin")!==expectedOrigin)
  return new Response("Forbidden",{status:403,headers});
 // A trusted adapter must explicitly approve bootstrap; no public default.
 if(typeof authorizeBootstrap!=="function"||authorizeBootstrap(request)!==true)
  return new Response("Forbidden",{status:403,headers});
 const {token,cookie}=issueLoginCsrf();
 return new Response(JSON.stringify({csrfToken:token}),{
  status:200,headers:{...headers,"Content-Type":"application/json; charset=utf-8","Set-Cookie":cookie}
 });
}

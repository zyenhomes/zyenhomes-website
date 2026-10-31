// Standalone OAuth callback skeleton for Zyen Homes Gmail Archive.
// Not deployed. No Google token exchange or mailbox access is implemented.
export default {
 async fetch(request) {
  const url=new URL(request.url);
  if(url.pathname!=="/oauth/google/callback")return new Response("Not found",{status:404});
  return new Response("OAuth callback is not enabled. No authorization data was processed.",{
   status:503,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"}
  });
 }
};

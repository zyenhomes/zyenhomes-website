// CSRF gate for future admin login initiation (offline helper).
// Token issuance and cookie setting must happen in a trusted same-origin
// bootstrap route; never treat a request header alone as authorization.
const COOKIE="__Host-zyen_login_csrf";
function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
export function issueLoginCsrf(){
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
 const token=hex(bytes);
 return {token,cookie:COOKIE+"="+token+"; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Strict"};
}
export function validateLoginCsrf(request,expectedOrigin){
 if(request.method!=="POST"||new URL(request.url).origin!==expectedOrigin||request.headers.get("Origin")!==expectedOrigin)return false;
 const token=request.headers.get("X-Zyen-CSRF");
 if(!token||!(/^[a-f0-9]{64}$/.test(token)))return false;
 const cookieHeader=request.headers.get("Cookie")||"";
 const matching=cookieHeader.split(";").map(v=>v.trim()).filter(v=>v.startsWith(COOKIE+"="));
 if(matching.length!==1)return false;
 const cookie=matching[0].slice(COOKIE.length+1);
 if(!/^[a-f0-9]{64}$/.test(cookie))return false;
 let diff=0;
 for(let i=0;i<64;i++)diff|=token.charCodeAt(i)^cookie.charCodeAt(i);
 return diff===0;
}

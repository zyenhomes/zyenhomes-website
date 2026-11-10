// Authentication preflight for future internal inquiry submission.
// No token verification, D1 access, network calls, or write permissions.
const safeEqual=(a,b)=>{
 if(typeof a!=="string"||typeof b!=="string")return false;
 const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);
 let diff=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]??0)^(y[i]??0);
 return diff===0;
};
export function assessInternalInquiryRequest({request,env}={}) {
 const deny=(reason,status=403)=>Object.freeze({authenticated:false,authorized:false,
  reason,status,canWrite:false,canClaim:false});
 if(!request||request.method!=="POST")return deny("method_not_allowed",405);
 const url=new URL(request.url);
 if(url.pathname!=="/api/internal/guesty/inquiry")return deny("route_mismatch",404);
 if(request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase()!=="application/json")
  return deny("json_required",415);
 const supplied=request.headers.get("X-Zyen-Inquiry-Admin-Key");
 const expected=env?.ZYEN_INQUIRY_ADMIN_KEY;
 if(!expected||expected.length<32||!supplied||!safeEqual(supplied,expected))
  return deny("admin_authentication_required",401);
 // A valid internal key alone never authorizes a Guesty POST or a D1 claim.
 return Object.freeze({authenticated:true,authorized:false,canWrite:false,canClaim:false,
  reason:"live_submission_disabled_pending_review",status:503});
}

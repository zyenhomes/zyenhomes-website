// No live execution in this revision. Authentication is server-side only.
import {runIsolatedLiveCandidate} from "./guesty-nonblocking-live-orchestration.js";
import {createIsolatedRuntime} from "./guesty-nonblocking-runtime-candidate.js";
export const LIVE_EXECUTION_ENABLED=false;
export async function handleAuthenticatedInquiryTest(request,env){
 const reply=(code,status)=>Response.json({success:false,code},{status,headers:{"Cache-Control":"no-store"}});
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 if(env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true")return reply("LIVE_TEST_DISABLED",403);
 const expected=env.GUESTY_QUOTE_DIAGNOSTIC_ACCESS_TOKEN;
 const supplied=request.headers.get("Authorization")??"";
 if(typeof expected!=="string"||!/^[A-Za-z0-9_-]{48,256}$/.test(expected))return reply("NOT_AUTHORIZED",401);
 const encoder=new TextEncoder();
 const a=await crypto.subtle.digest("SHA-256",encoder.encode(supplied));
 const b=await crypto.subtle.digest("SHA-256",encoder.encode("Bearer "+expected));
 const aa=new Uint8Array(a),bb=new Uint8Array(b);
 let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
 if(diff!==0)return reply("NOT_AUTHORIZED",401);
 if(!LIVE_EXECUTION_ENABLED)return reply("LIVE_EXECUTION_DISABLED",403);
 const runtime=createIsolatedRuntime(env,globalThis.fetch.bind(globalThis));
 if(!runtime)return reply("ISOLATED_RUNTIME_DISABLED",403);
 const result=await runIsolatedLiveCandidate({env,...runtime});
 return Response.json({success:false,state:result.state,auditRecorded:result.auditRecorded===true,reason:result.reason??null,retryAutomatically:false},{status:result.state==="blocked"?403:202,headers:{"Cache-Control":"no-store"}});
}

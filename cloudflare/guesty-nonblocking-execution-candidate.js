import {assertInquiryOnly} from "./guesty-nonblocking-contract.js";
// Unwired execution candidate. No default fetch and no live execution.
import {INQUIRY_URL} from "./guesty-nonblocking-live-test-candidate.js";
import {classifyGuestyInquiryResponse} from "../scripts/guesty-inquiry-submission-adapter-offline.mjs";
export const EXECUTION_ENABLED=false;
export async function executeIsolatedInquiry({env,body,token,transport}={}){
 if(!EXECUTION_ENABLED||env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true")
 return {state:"blocked",reason:"execution_disabled",retryAutomatically:false};
 return executeWithInjectedTransport({body,token,transport});
}
// Shared implementation; callers must supply an authorized transport. No default fetch.
export async function executeWithInjectedTransport({body,token,transport}={}){
 try{assertInquiryOnly(body)}catch{return {state:"blocked",reason:"unsafe_configuration",retryAutomatically:false};}
 if(body?.status!=="inquiry"||body.ignoreCalendar!==false||body.ignoreTerms!==false||body.ignoreBlocks!==false||
 Object.keys(body).some(k=>!["quoteId","status","ratePlanId","ignoreCalendar","ignoreTerms","ignoreBlocks","guest"].includes(k))||
 !body.guest||Object.keys(body.guest).some(k=>!["firstName","lastName","email","phones"].includes(k))||
 typeof token!=="string"||!token.trim()||typeof transport!=="function")
 return {state:"blocked",reason:"unsafe_configuration",retryAutomatically:false};
 try{
 const response=await transport(INQUIRY_URL,{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});
 let payload;try{payload=await response.json()}catch{}
 return classifyGuestyInquiryResponse({status:response.status,body:payload});
 }catch{return classifyGuestyInquiryResponse({transportError:true});}
}

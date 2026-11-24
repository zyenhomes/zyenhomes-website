// Unwired adapter for mocked testing. No default fetch or live route.
import {INQUIRY_URL} from "./guesty-nonblocking-live-test-candidate.js";
import {classifyGuestyInquiryResponse} from "../scripts/guesty-inquiry-submission-adapter-offline.mjs";
export async function simulateAuthorizedHttp({env,requestId,attemptId,body,token,transport,now=Date.now()}={}){
 const deny=reason=>({state:"blocked",reason,retryAutomatically:false});
 if(env?.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED!=="true"||env?.GUESTY_TEST_MODE!=="mock")return deny("disabled");
 // Approval comes from server configuration, never the HTTP request body.
 let approval;
 try{approval=JSON.parse(env.GUESTY_ISOLATED_APPROVAL_JSON);}catch{return deny("invalid_approval");}
 if(!requestId||!attemptId||!body?.quoteId||approval?.requestId!==requestId||approval?.attemptId!==attemptId||approval?.quoteId!==body.quoteId||!Number.isFinite(Date.parse(approval.expiresAt))||Date.parse(approval.expiresAt)<=now)return deny("approval_mismatch");
 if(body.status!=="inquiry"||body.ignoreCalendar!==false||body.ignoreTerms!==false||body.ignoreBlocks!==false)return deny("unsafe_payload");
 if(Object.keys(body).some(k=>!["quoteId","status","ratePlanId","ignoreCalendar","ignoreTerms","ignoreBlocks","guest"].includes(k)))return deny("unsafe_payload");
 if(!body.guest||Object.keys(body.guest).some(k=>!["firstName","lastName","email","phones"].includes(k)))return deny("unsafe_guest");
 if(typeof token!=="string"||!token.trim()||typeof transport!=="function")return deny("missing_transport");
 try{
 const response=await transport(INQUIRY_URL,{method:"POST",redirect:"error",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});
 let payload;try{payload=await response.json();}catch{}
 return classifyGuestyInquiryResponse({status:response.status,body:payload});
 }catch{return classifyGuestyInquiryResponse({transportError:true});}
}

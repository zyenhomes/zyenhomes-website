// Test-only Cloudflare Worker. NOT imported by the production Worker.
// Cannot send Guesty requests. Never deploy without separate explicit approval.
// Requires a separately configured TEST_DB binding to zyenhomes-booking-test.
import { claimInquiryWithAudit } from "../scripts/guesty-d1-claim-adapter-offline.mjs";

const response=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const TEST_REQUEST="test-request-001";
export default {
 async fetch(request,env) {
  // No public read/write routes without an explicit secret and an exact test binding.
  if(request.method!=="POST" || new URL(request.url).pathname!=="/internal/test-claim")
   return response({error:"not_found"},404);
  if(env.TEST_MODE_ENABLED!=="true"||
     env.TEST_DB_NAME!=="zyenhomes-booking-test"||
     !env.TEST_DB || !env.TEST_ADMIN_TOKEN ||
     request.headers.get("Authorization")!==`Bearer ${env.TEST_ADMIN_TOKEN}`)
   return response({error:"test_not_authorized"},403);
  let input;
  try {input=await request.json()}catch{return response({error:"invalid_json"},400)}
  if(input?.requestId!==TEST_REQUEST ||
     !/^test-claim-[a-z0-9-]{4,40}$/.test(input.claimToken??"")||
     !/^test-attempt-[a-z0-9-]{4,40}$/.test(input.attemptId??""))
   return response({error:"invalid_test_identifiers"},400);
  try {
   const result=await claimInquiryWithAudit(env.TEST_DB,{
    requestId:TEST_REQUEST,claimToken:input.claimToken,attemptId:input.attemptId
   });
   return response({claimed:result.claimed===true,
    reason:result.reason??"claim_and_audit_checked",guestyWriteAuthorized:false});
  }catch{
   return response({claimed:false,error:"claim_uncertain_manual_review",
    guestyWriteAuthorized:false},409);
  }
 }
};

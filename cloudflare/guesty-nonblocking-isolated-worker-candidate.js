// Default Worker remains status-only. Local harness must explicitly inject
// a test database, fixture reader and simulated transport; no real fetch.
import {handleAuthenticatedInquiryTest} from "./guesty-nonblocking-authenticated-route.js";
import {runTrustedMock} from "./guesty-nonblocking-trusted-candidate.js";
export function createLocalMockHarness({db,readQuote,transport,approval,now}={}){
 return async function run(){
 if(!db||typeof readQuote!=="function"||typeof transport!=="function"||!approval)return {state:"blocked",writeAuthorized:false};
 return runTrustedMock({env:{GUESTY_TEST_MODE:"mock",GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true",GUESTY_ISOLATED_APPROVAL_JSON:JSON.stringify(approval)},db,readQuote,transport,now,requestId:approval.requestId,attemptId:approval.attemptId,claimToken:approval.claimToken});
 };
}
export const LIVE_EXECUTION_ENABLED=false;
export default {
 async fetch(request,env){
 const url=new URL(request.url);
 const headers={"Cache-Control":"no-store","Content-Type":"application/json"};
 if(request.method==="GET"&&url.pathname==="/"){
 return new Response(JSON.stringify({status:"running",mode:"isolated_candidate",liveWritesEnabled:false,databaseWritesEnabled:false}),{headers});
 }
 if(url.pathname==="/internal/inquiry-test"&&request.method==="POST"){
 return handleAuthenticatedInquiryTest(request,env);
 }
 return new Response(JSON.stringify({success:false,code:"ISOLATED_WRITES_DISABLED"}),{status:403,headers});
 }
};

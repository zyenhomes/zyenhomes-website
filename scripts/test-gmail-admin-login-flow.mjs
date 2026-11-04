import assert from "node:assert/strict";
import {completeAdminLogin} from "../gmail-archive-oauth/admin-login-flow.js";
const state="a".repeat(64);let consumed=0,created=0;
const deps={
 state,code:"fictional-code",now:1000,
 consumeLoginState:async()=>{consumed++;return {verifier:"v".repeat(64),nonce:"fictional-nonce"};},
 exchangeCode:async({verifier})=>{assert.equal(verifier,"v".repeat(64));return {idToken:"fictional-id-token"};},
 verifyAdminIdentity:async(token,nonce)=>{assert.equal(token,"fictional-id-token");assert.equal(nonce,"fictional-nonce");return {email:"admin@zyenhomes.com",subject:"fictional-subject"};},
 createSession:async()=>{created++;return {sessionCookie:"fictional-secure-cookie"};}
};
assert.equal((await completeAdminLogin(deps)).status,200);
assert.equal(consumed,1);assert.equal(created,1);
assert.deepEqual(await completeAdminLogin({...deps,verifyAdminIdentity:async()=>({email:"info@zyenhomes.com",subject:"fake"})}),{status:403,reason:"unauthorized_admin"});
assert.equal(created,1);
assert.deepEqual(await completeAdminLogin({...deps,exchangeCode:async()=>({})}),{status:502,reason:"missing_identity_token"});
assert.deepEqual(await completeAdminLogin({...deps,consumeLoginState:async()=>null}),{status:400,reason:"invalid_session"});
assert.deepEqual(await completeAdminLogin({...deps,state:"invalid"}),{status:400,reason:"invalid_callback"});
console.log("PASS: synthetic administrator login orchestration and fail-closed cases.");
console.log("No Google API calls, live D1 writes, or production deployment.");

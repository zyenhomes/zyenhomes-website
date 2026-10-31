import assert from "node:assert/strict";
import {processOAuthCallback} from "../gmail-archive-oauth/oauth-callback-flow.js";
const state="a".repeat(64),origin="https://example.test";
const request=new Request(origin+"/oauth/google/callback?state="+state+"&code=fictional");
let consumed=0,saved=0;
const deps={
 request,origin,
 consumeState:async()=>{consumed++;return {verifier:"v".repeat(64),nonce:"fictional-nonce"};},
 exchangeCode:async()=>({accessToken:"fake",idToken:"fictional-id-token",refreshToken:"fictional-refresh",scope:"https://www.googleapis.com/auth/gmail.insert"}),
 verifyMailbox:async(token,nonce)=>{assert.equal(token,"fictional-id-token");assert.equal(nonce,"fictional-nonce");return "info@zyenhomes.com";},
 encryptRefreshToken:async()=>({ciphertext:"fictional-encrypted"}),
 saveEncryptedToken:async()=>{saved++;}
};
assert.deepEqual(await processOAuthCallback(deps),{status:200,reason:"authorized"});
assert.equal(consumed,1);assert.equal(saved,1);
assert.deepEqual(await processOAuthCallback({...deps,verifyMailbox:async()=>"admin@zyenhomes.com"}),{status:403,reason:"wrong_mailbox"});
assert.equal(saved,1);
assert.deepEqual(await processOAuthCallback({...deps,exchangeCode:async()=>({accessToken:"fake",idToken:"fictional-id-token",scope:"https://www.googleapis.com/auth/gmail.insert"})}),{status:409,reason:"refresh_token_missing"});
assert.deepEqual(await processOAuthCallback({...deps,exchangeCode:async()=>({accessToken:"fake",scope:"https://www.googleapis.com/auth/gmail.insert"})}),{status:502,reason:"missing_identity_token"});
assert.deepEqual(await processOAuthCallback({...deps,request:new Request(origin+"/oauth/google/callback?code=fictional")}),{status:400,reason:"invalid_state"});
console.log("PASS: synthetic OAuth callback orchestration, mailbox/scope/refresh-token checks.");
console.log("No live OAuth token exchange, persistent storage or Gmail access.");

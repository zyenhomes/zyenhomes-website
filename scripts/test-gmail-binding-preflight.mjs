import assert from "node:assert/strict";
import {inspectGmailOAuthBindings} from "../gmail-archive-oauth/binding-preflight.js";
const empty=inspectGmailOAuthBindings({});
assert.equal(empty.ready,false);
assert.ok(empty.missing.includes("GMAIL_OAUTH_DB"));
assert.ok(empty.missing.includes("GMAIL_LOGIN_RATE_LIMITER"));
const fake={
 GMAIL_OAUTH_DB:{prepare:()=>({})},
 GMAIL_LOGIN_RATE_LIMITER:{limit:async()=>({success:true})},
 GOOGLE_OAUTH_CLIENT_ID:"fictional-client",
 GOOGLE_OAUTH_CLIENT_SECRET:"fictional-secret",
 GMAIL_TOKEN_ENCRYPTION_KEY:"fictional-key"
};
assert.deepEqual(inspectGmailOAuthBindings(fake),{ready:true,missing:[]});
assert.equal(inspectGmailOAuthBindings({...fake,GMAIL_OAUTH_DB:null}).ready,false);
assert.equal(inspectGmailOAuthBindings({...fake,GMAIL_LOGIN_RATE_LIMITER:null}).ready,false);
console.log("PASS: synthetic Gmail OAuth D1, rate-limiter and secret binding presence checks.");
console.log("No Cloudflare resource creation, live credentials or deployment.");

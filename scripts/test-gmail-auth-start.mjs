import assert from "node:assert/strict";
import {prepareGoogleAuthorization} from "../gmail-archive-oauth/google-auth-start.js";
let saved=null;
const url=new URL(await prepareGoogleAuthorization({
 clientId:"fictional-client",redirectUri:"https://example.test/oauth/google/callback",
 persistSession:async record=>{saved=record;},now:123456
}));
assert.equal(url.origin,"https://accounts.google.com");
assert.equal(url.searchParams.get("response_type"),"code");
assert.equal(url.searchParams.get("code_challenge_method"),"S256");
assert.equal(url.searchParams.get("access_type"),"offline");
assert.equal(url.searchParams.get("scope"),"openid email https://www.googleapis.com/auth/gmail.insert");
assert.equal(saved.state,url.searchParams.get("state"));
assert.equal(saved.nonce,url.searchParams.get("nonce"));
assert.equal(saved.verifier.length,96);
assert.equal(saved.expiresAt-saved.createdAt,600000);
await assert.rejects(()=>prepareGoogleAuthorization({
 clientId:"fictional-client",redirectUri:"https://example.test/oauth/google/callback",
 persistSession:async()=>{throw Error("storage unavailable");}
}),/storage unavailable/);
await assert.rejects(()=>prepareGoogleAuthorization({
 clientId:"fictional-client",redirectUri:"http://example.test/callback",persistSession:async()=>{}
}),/Invalid OAuth redirect URI/);
console.log("PASS: offline OAuth start URL, identity scopes, PKCE, state, nonce and fail-closed session persistence.");
console.log("No real authorization request, credentials or production writes.");

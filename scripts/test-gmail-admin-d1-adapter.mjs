import assert from "node:assert/strict";
import {createAdminSession,getAdminSession,revokeAdminSession,requireAdminCsrf} from "../gmail-archive-oauth/d1-admin-session-adapter.js";
const sessionId="a".repeat(64),csrfToken="b".repeat(64),nowSeconds=1000;
let row=null,revoked=false;
const db={prepare(sql){return {bind(...args){return {
 async run(){if(sql.startsWith("INSERT")){row={session_hash:args[0],admin_subject:args[1],admin_email:args[2],csrf_hash:args[3],created_at:args[4],expires_at:args[5]};return {meta:{changes:1}};}if(sql.startsWith("UPDATE")){if(revoked)return {meta:{changes:0}};revoked=true;return {meta:{changes:1}};}},
 async first(){return !revoked&&row&&nowSeconds<row.expires_at?row:null;}
};}};}};
await createAdminSession(db,{sessionId,csrfToken,subject:"fictional-admin",nowSeconds});
assert.notEqual(row.session_hash,sessionId);
assert.notEqual(row.csrf_hash,csrfToken);
const found=await getAdminSession(db,{sessionId,nowSeconds});
assert.equal(await requireAdminCsrf(found,csrfToken),true);
await assert.rejects(()=>requireAdminCsrf(found,"c".repeat(64)),/Invalid CSRF/);
assert.equal(await revokeAdminSession(db,{sessionId,nowSeconds:1001}),true);
assert.equal(await revokeAdminSession(db,{sessionId,nowSeconds:1002}),false);
await assert.rejects(()=>getAdminSession(db,{sessionId,nowSeconds}),/unavailable/);
console.log("PASS: synthetic D1 admin session hashing, lookup, CSRF, and revocation.");
console.log("No production D1, Google sign-in, or Gmail API access.");

import assert from "node:assert/strict";
import {adminCookie,clearAdminCookie,validateAdminSession} from "../gmail-archive-oauth/admin-session.js";
const id="a".repeat(64);
const cookie=adminCookie(id);
for(const part of ["__Host-zyen_admin=","Path=/","Max-Age=900","HttpOnly","Secure","SameSite=Lax"])assert.ok(cookie.includes(part));
assert.ok(clearAdminCookie().includes("Max-Age=0"));
assert.throws(()=>adminCookie("weak"));
const now=1800000000000,subject="fictional-admin-subject";
const record={email:"admin@zyenhomes.com",subject,createdAt:now-1000,expiresAt:now+500000};
assert.equal(validateAdminSession(record,{now,expectedSubject:subject}),true);
for(const change of [{email:"info@zyenhomes.com"},{subject:"other"},{expiresAt:now},{createdAt:now+1},{expiresAt:now+901000}])
 assert.throws(()=>validateAdminSession({...record,...change},{now,expectedSubject:subject}));
console.log("PASS: synthetic secure admin cookie and session validation; no live login.");

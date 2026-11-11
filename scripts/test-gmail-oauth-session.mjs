import assert from "node:assert/strict";
import {createSession,consumeSession,SESSION_TTL_SECONDS} from "../gmail-archive-oauth/oauth-session.js";
const state="a".repeat(64),now=Date.now();
const records=new Map();
const store={
 async putIfAbsent(k,v,ttl){assert.equal(ttl,SESSION_TTL_SECONDS);if(records.has(k))return false;records.set(k,v);return true;},
 async consume(k){const value=records.get(k);records.delete(k);return value;}
};
const record={mailbox:"info@zyenhomes.com",createdAt:now,verifier:"b".repeat(64)};
await createSession(store,state,record);
await assert.rejects(()=>createSession(store,state,record),/collision/);
assert.deepEqual(await consumeSession(store,state,now),record);
await assert.rejects(()=>consumeSession(store,state,now),/Expired, reused/);
const expired={...record,createdAt:now-(SESSION_TTL_SECONDS+1)*1000};
await assert.rejects(()=>createSession(store,"c".repeat(64),expired),/Invalid OAuth session/);
const other={...record,mailbox:"admin@zyenhomes.com"};
await assert.rejects(()=>createSession(store,"d".repeat(64),other),/Invalid OAuth session/);
console.log("PASS: synthetic OAuth session creation, replay rejection, expiry and mailbox allowlist.");
console.log("No live session store, token exchange or Gmail API calls.");

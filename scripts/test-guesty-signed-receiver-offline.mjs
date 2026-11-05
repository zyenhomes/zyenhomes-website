// Synthetic-only tests: no Guesty API calls, Cloudflare writes, or real credentials.
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {verifyGuestySvix,receiveGuestyMessageWebhook} from "../cloudflare/guesty-webhooks.js";
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const now=Date.now();
const stamp=String(Math.floor(now/1000));
const id="msg_synthetic_123456";
const secret="whsec_"+Buffer.alloc(32,42).toString("base64");
const event={event:"reservation.messageReceived",reservationId:"synthetic-reservation",meta:{eventId:"synthetic-event"},message:{createdAt:"2026-11-01T00:00:00Z"}};
const raw=JSON.stringify(event);
const key=await crypto.subtle.importKey("raw",Buffer.alloc(32,42),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
const signed=new TextEncoder().encode(id+"."+stamp+"."+raw);
const signature=Buffer.from(await crypto.subtle.sign("HMAC",key,signed)).toString("base64");
const headers=new Headers({"svix-id":id,"svix-timestamp":stamp,"svix-signature":"v1,"+signature});
assert.equal(await verifyGuestySvix(headers,raw,secret,now),id);
assert.equal(await verifyGuestySvix(headers,raw+" ",secret,now),null);
assert.equal(await verifyGuestySvix(headers,raw,secret,now+360000),null);
assert.equal(await verifyGuestySvix(new Headers({...Object.fromEntries(headers),"svix-signature":"v1,invalid"}),raw,secret,now),null);
let writes=0;
const seenSvixIds=new Set();
const seenEventIds=new Set();
const db={prepare(sql){
 assert.match(sql,/INSERT OR IGNORE/);
 return {bind(...values){
  const [svixId,eventId]=values;
  assert.equal(typeof svixId,"string");
  return {async run(){
   if(seenSvixIds.has(svixId)||(eventId!==null&&seenEventIds.has(eventId)))return {success:true,meta:{changes:0}};
   seenSvixIds.add(svixId);
   if(eventId!==null)seenEventIds.add(eventId);
   writes++;
   return {success:true,meta:{changes:1}};
  }};
 }};
}};
const request=()=>new Request("https://example.invalid/api/webhooks/guesty/messages",{method:"POST",headers,body:raw});
const disabled=await receiveGuestyMessageWebhook(request(),{GUESTY_WEBHOOKS_ENABLED:"false",GUESTY_WEBHOOK_SECRET:secret,BOOKING_DB:db});
assert.equal(disabled.status,503);assert.equal(writes,0);
const accepted=await receiveGuestyMessageWebhook(request(),{GUESTY_WEBHOOKS_ENABLED:"true",GUESTY_WEBHOOK_SECRET:secret,BOOKING_DB:db});
assert.equal(accepted.status,200);assert.equal(writes,1);
const duplicate=await receiveGuestyMessageWebhook(request(),{GUESTY_WEBHOOKS_ENABLED:"true",GUESTY_WEBHOOK_SECRET:secret,BOOKING_DB:db});
assert.equal(duplicate.status,200);
assert.equal(writes,1,"Duplicate delivery must not create a second archived row");
const bad=await receiveGuestyMessageWebhook(new Request("https://example.invalid",{method:"POST",headers,body:raw+" "}),{GUESTY_WEBHOOKS_ENABLED:"true",GUESTY_WEBHOOK_SECRET:secret,BOOKING_DB:db});
assert.equal(bad.status,401);assert.equal(writes,1);
console.log("PASS: synthetic signature, tampering, expiry, disabled receiver, and authenticated persistence, and duplicate delivery checks (simulated unique constraints).");

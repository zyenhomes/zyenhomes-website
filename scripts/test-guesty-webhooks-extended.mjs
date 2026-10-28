import assert from "node:assert/strict";
import {verifyGuestySvix,receiveGuestyMessageWebhook} from "../cloudflare/guesty-webhooks.js";

const key=crypto.getRandomValues(new Uint8Array(32));
const secret="whsec_"+Buffer.from(key).toString("base64");
const mac=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
const base="https://example.test/api/webhooks/guesty/messages";
const timestamp=String(Math.floor(Date.now()/1000));
async function signed(payload,id="msg_test123456",stamp=timestamp){
  const body=JSON.stringify(payload);
  const bytes=new TextEncoder().encode(id+"."+stamp+"."+body);
  const signature=Buffer.from(await crypto.subtle.sign("HMAC",mac,bytes)).toString("base64");
  return new Request(base,{method:"POST",headers:{"svix-id":id,"svix-timestamp":stamp,"svix-signature":"v1,"+signature},body});
}
const original={event:"reservation.messageReceived",reservationId:"synthetic-reservation",meta:{eventId:"synthetic-event"},conversation:{_id:"synthetic-conversation"},message:{createdAt:"2026-10-28T00:00:00Z"}};
const stored=new Map(), eventIds=new Set();
const db={prepare(sql){return {bind(...args){return {async run(){
  assert.match(sql,/INSERT OR IGNORE/);
  const [id,eventId,type,reservationId,conversationId,occurredAt,raw]=args;
  if(!stored.has(id)&&(!eventId||!eventIds.has(eventId))){
    stored.set(id,{eventId,type,reservationId,conversationId,occurredAt,raw});
    if(eventId)eventIds.add(eventId);
  }
  return {success:true};
}}}}}};
const env={GUESTY_WEBHOOKS_ENABLED:"true",GUESTY_WEBHOOK_SECRET:secret,BOOKING_DB:db};
assert.equal((await receiveGuestyMessageWebhook(await signed(original),env)).status,200);
assert.equal(stored.size,1);
assert.equal((await receiveGuestyMessageWebhook(await signed(original),env)).status,200);
assert.equal(stored.size,1,"same Svix ID must not duplicate");
assert.equal((await receiveGuestyMessageWebhook(await signed(original,"msg_another123"),env)).status,200);
assert.equal(stored.size,1,"same Guesty event ID must not duplicate");
assert.equal((await receiveGuestyMessageWebhook(await signed({...original,event:"reservation.messageSent",meta:{eventId:"second"}},"msg_second123"),env)).status,200);
assert.equal(stored.size,2);
assert.equal((await receiveGuestyMessageWebhook(await signed({...original,event:"reservation.deleted",meta:{eventId:"third"}},"msg_third123"),env)).status,400);
assert.equal(stored.size,2);
const tampered=await signed(original,"msg_tamper123");
const bad=new Request(base,{method:"POST",headers:tampered.headers,body:JSON.stringify({...original,reservationId:"tampered"})});
assert.equal((await receiveGuestyMessageWebhook(bad,env)).status,401);
assert.equal((await receiveGuestyMessageWebhook(await signed(original,"msg_old123",String(Number(timestamp)-1000)),env)).status,401);
assert.equal((await receiveGuestyMessageWebhook(await signed(original,"msg_new123",String(Number(timestamp)+1000)),env)).status,401);
assert.equal((await receiveGuestyMessageWebhook(await signed(original),{...env,GUESTY_WEBHOOKS_ENABLED:"false"})).status,503);
assert.equal((await receiveGuestyMessageWebhook(await signed(original),{...env,BOOKING_DB:undefined})).status,503);
assert.equal((await receiveGuestyMessageWebhook(await signed(original),{...env,BOOKING_DB:{prepare(){throw Error("database down")}}})).status,503);
assert.equal(stored.size,2);
console.log("Guesty webhook tests passed: signature, replay window, duplicate IDs, event allowlist, disabled gate, database errors.");

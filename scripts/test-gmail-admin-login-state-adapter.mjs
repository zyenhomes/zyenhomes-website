import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {importEncryptionKey} from "../gmail-archive-oauth/token-crypto.js";
import {createAdminLoginStateAdapter} from "../gmail-archive-oauth/admin-login-state-adapter.js";

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const key=await importEncryptionKey(webcrypto.getRandomValues(new Uint8Array(32)));
const rows=new Map();
const db={
 prepare(sql){
  return {
   bind(...args){
    return {
     async run(){
      assert.match(sql,/^INSERT INTO oauth_sessions/);
      const [hash,cipher,created,expires]=args;
      if(rows.has(hash))throw Error("Duplicate state");
      rows.set(hash,{cipher,created,expires,consumed:null});
      return {success:true};
     },
     async first(){
      assert.match(sql,/^UPDATE oauth_sessions/);
      const [consumed,hash,now]=args;
      const row=rows.get(hash);
      if(!row||row.consumed!==null||row.expires<=now)return null;
      row.consumed=consumed;
      return {verifier_ciphertext:row.cipher,created_at:row.created,expires_at:row.expires};
     }
    };
   }
  };
 }
};
let clock=1_800_000_000_000;
const adapter=createAdminLoginStateAdapter(db,key,{now:()=>clock});
const make=(c)=>({state:c.repeat(64),verifier:"v".repeat(64),nonce:"b".repeat(64),createdAt:clock,ttlSeconds:600});
const first=make("a");
await adapter.persistLoginState(first);
assert.equal(rows.size,1);
const stored=[...rows.values()][0];
assert.ok(!stored.cipher.includes(first.verifier));
assert.ok(!stored.cipher.includes(first.nonce));
assert.ok(![...rows.keys()][0].includes(first.state));
assert.deepEqual(await adapter.consumeLoginState(first.state),{verifier:first.verifier,nonce:first.nonce});
await assert.rejects(adapter.consumeLoginState(first.state),/missing, expired or previously consumed/);
const second=make("b");
await adapter.persistLoginState(second);
clock+=601000;
await assert.rejects(adapter.consumeLoginState(second.state),/missing, expired or previously consumed/);
await assert.rejects(adapter.persistLoginState({...make("c"),ttlSeconds:601}),/Invalid login state/);
await assert.rejects(adapter.consumeLoginState("invalid"),/Invalid OAuth state/);
// A different encryption key must never decrypt an existing record.
clock-=601000;
const third=make("d");
await adapter.persistLoginState(third);
const wrongKey=await importEncryptionKey(webcrypto.getRandomValues(new Uint8Array(32)));
const wrongAdapter=createAdminLoginStateAdapter(db,wrongKey,{now:()=>clock});
await assert.rejects(wrongAdapter.consumeLoginState(third.state));
// Ciphertext tampering must fail authentication.
const fourth=make("e");
await adapter.persistLoginState(fourth);
const fourthHash=[...rows.keys()].at(-1);
const fourthRow=rows.get(fourthHash);
const envelope=JSON.parse(fourthRow.cipher);
envelope.ciphertext[0]^=1;
fourthRow.cipher=JSON.stringify(envelope);
await assert.rejects(adapter.consumeLoginState(fourth.state));
console.log("PASS: encrypted D1 login state, one-time consumption, expiry and invalid input.");

// One-time OAuth state records, with atomic storage adapter.
// Store must implement putIfAbsent(key, record, ttlSeconds) and consume(key)
// where consume atomically returns+deletes a record. Do NOT use a get+delete pair.
export const SESSION_TTL_SECONDS=600;
export function validSession(record,now=Date.now()){
 return !!record && typeof record==="object" &&
 record.mailbox==="info@zyenhomes.com" &&
 typeof record.createdAt==="number" &&
 Number.isFinite(record.createdAt) &&
 record.createdAt<=now &&
 now-record.createdAt<=SESSION_TTL_SECONDS*1000 &&
 typeof record.verifier==="string" &&
 /^[a-zA-Z0-9._~-]{43,128}$/.test(record.verifier);
}
export async function createSession(store,state,record){
 if(!/^[0-9a-f]{64}$/.test(state)||!validSession(record))throw Error("Invalid OAuth session");
 const inserted=await store.putIfAbsent("gmail-oauth:"+state,record,SESSION_TTL_SECONDS);
 if(inserted!==true)throw Error("OAuth state collision");
}
export async function consumeSession(store,state,now=Date.now()){
 if(!/^[0-9a-f]{64}$/.test(state))throw Error("Invalid OAuth state");
 const record=await store.consume("gmail-oauth:"+state);
 if(!validSession(record,now))throw Error("Expired, reused, or invalid OAuth state");
 return record;
}

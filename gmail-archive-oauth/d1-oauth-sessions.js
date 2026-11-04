// D1 one-time OAuth session consumption. Undeployed and not wired to live OAuth.
// Session verifier ciphertext must be decrypted separately using a protected key.
export async function consumeOAuthState(db,stateHash,nowSeconds){
 if(!/^[0-9a-f]{64}$/.test(stateHash))throw Error("Invalid state hash");
 if(!Number.isSafeInteger(nowSeconds)||nowSeconds<0)throw Error("Invalid timestamp");
 const row=await db.prepare(
  "UPDATE oauth_sessions SET consumed_at = ? WHERE state_hash = ? AND consumed_at IS NULL AND expires_at > ? RETURNING verifier_ciphertext,created_at,expires_at"
 ).bind(nowSeconds,stateHash,nowSeconds).first();
 if(!row)throw Error("OAuth session missing, expired or previously consumed");
 if(typeof row.verifier_ciphertext!=="string"||!row.verifier_ciphertext)throw Error("Invalid stored verifier");
 return row;
}
export async function createOAuthState(db,stateHash,encryptedVerifier,createdAt,expiresAt){
 if(!/^[0-9a-f]{64}$/.test(stateHash)||typeof encryptedVerifier!=="string"||!encryptedVerifier||!Number.isSafeInteger(createdAt)||!Number.isSafeInteger(expiresAt)||expiresAt<=createdAt||expiresAt-createdAt>600)throw Error("Invalid OAuth session");
 await db.prepare(
  "INSERT INTO oauth_sessions(state_hash,verifier_ciphertext,created_at,expires_at) VALUES(?,?,?,?)"
 ).bind(stateHash,encryptedVerifier,createdAt,expiresAt).run();
}

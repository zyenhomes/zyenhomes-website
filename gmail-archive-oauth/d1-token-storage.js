// D1 adapter for encrypted Google refresh tokens. Undeployed.
// Encryption occurs before calling save; never persist plaintext tokens.
const MAILBOX="info@zyenhomes.com";
const SCOPE="https://www.googleapis.com/auth/gmail.insert";
export async function saveEncryptedGoogleToken(db,{mailbox,encrypted,scope},now=Math.floor(Date.now()/1000)){
 if(mailbox!==MAILBOX||scope!==SCOPE)throw Error("Mailbox or scope not allowed");
 if(!encrypted||encrypted.version!==1||!Array.isArray(encrypted.iv)||encrypted.iv.length!==12||!Array.isArray(encrypted.ciphertext)||encrypted.ciphertext.length<16)throw Error("Invalid encrypted token envelope");
 if(!Number.isSafeInteger(now)||now<0)throw Error("Invalid timestamp");
 const ciphertext=JSON.stringify(encrypted);
 if(ciphertext.length>20000)throw Error("Encrypted token too large");
 await db.prepare("INSERT INTO oauth_tokens(mailbox,encrypted_refresh_token,token_key_version,scope,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(mailbox) DO UPDATE SET encrypted_refresh_token=excluded.encrypted_refresh_token,token_key_version=excluded.token_key_version,scope=excluded.scope,updated_at=excluded.updated_at")
 .bind(MAILBOX,ciphertext,1,SCOPE,now).run();
}
export async function loadEncryptedGoogleToken(db){
 const row=await db.prepare("SELECT encrypted_refresh_token,token_key_version FROM oauth_tokens WHERE mailbox=? AND scope=?").bind(MAILBOX,SCOPE).first();
 if(!row)return null;
 if(row.token_key_version!==1)throw Error("Unsupported token key version");
 const envelope=JSON.parse(row.encrypted_refresh_token);
 if(envelope?.version!==1||!Array.isArray(envelope.iv)||!Array.isArray(envelope.ciphertext))throw Error("Invalid encrypted token");
 return envelope;
}

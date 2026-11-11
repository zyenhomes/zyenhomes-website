// Dedicated Gmail OAuth D1 administrator session adapter (not deployed).
// Session IDs and CSRF tokens must be cryptographically random and stored only as SHA-256 hashes.
export async function hashSessionValue(value){
 if(typeof value!=="string"||!/^[0-9a-f]{64}$/.test(value))throw Error("Invalid session value");
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function createAdminSession(db,{sessionId,csrfToken,subject,nowSeconds}){
 if(typeof subject!=="string"||!subject||subject.length>256||!Number.isSafeInteger(nowSeconds)||nowSeconds<0)throw Error("Invalid session input");
 const [sessionHash,csrfHash]=await Promise.all([hashSessionValue(sessionId),hashSessionValue(csrfToken)]);
 await db.prepare("INSERT INTO admin_sessions(session_hash,admin_subject,admin_email,csrf_hash,created_at,expires_at) VALUES(?,?,?,?,?,?)")
  .bind(sessionHash,subject,"admin@zyenhomes.com",csrfHash,nowSeconds,nowSeconds+900).run();
}
export async function getAdminSession(db,{sessionId,nowSeconds}){
 if(!Number.isSafeInteger(nowSeconds)||nowSeconds<0)throw Error("Invalid timestamp");
 const hash=await hashSessionValue(sessionId);
 const row=await db.prepare("SELECT admin_subject,admin_email,csrf_hash,created_at,expires_at FROM admin_sessions WHERE session_hash=? AND revoked_at IS NULL AND expires_at>?")
  .bind(hash,nowSeconds).first();
 if(!row||row.admin_email!=="admin@zyenhomes.com"||!row.admin_subject||row.created_at>nowSeconds||row.expires_at-row.created_at>900)throw Error("Administrator session unavailable");
 return row;
}
export async function revokeAdminSession(db,{sessionId,nowSeconds}){
 if(!Number.isSafeInteger(nowSeconds)||nowSeconds<0)throw Error("Invalid timestamp");
 const hash=await hashSessionValue(sessionId);
 const result=await db.prepare("UPDATE admin_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL")
  .bind(nowSeconds,hash).run();
 return (result?.meta?.changes??0)===1;
}
export async function requireAdminCsrf(row,csrfToken){
 const hash=await hashSessionValue(csrfToken);
 if(!row?.csrf_hash||row.csrf_hash.length!==hash.length)throw Error("Invalid CSRF token");
 let difference=0;
 for(let i=0;i<hash.length;i++)difference|=hash.charCodeAt(i)^row.csrf_hash.charCodeAt(i);
 if(difference!==0)throw Error("Invalid CSRF token");
 return true;
}

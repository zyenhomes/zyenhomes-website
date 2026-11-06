// Read-only script download capability probe. Never logs or persists script bytes.
// Cloudflare script content endpoint is script-scoped, not version-scoped.
import {createHash} from "node:crypto";
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN,expected=process.env.EXPECTED_ACTIVE_VERSION_ID;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if(!/^[0-9a-f]{32}$/i.test(account||"")||!token||!uuid.test(expected||""))throw Error("Invalid inputs");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/zyenhomes-booking-api`;
async function json(path){const r=await fetch(base+path,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("Metadata GET failed HTTP "+r.status);const j=await r.json();if(j?.success!==true||!j.result)throw Error("Unexpected metadata");return j.result;}
const [deployments,versions,active]=await Promise.all([json("/deployments"),json("/versions"),json("/versions/"+encodeURIComponent(expected))]);
const rows=Array.isArray(deployments)?deployments:deployments.deployments;
const items=Array.isArray(versions)?versions:versions.items;
if(!Array.isArray(rows)||!rows.length||!Array.isArray(items)||!items.length)throw Error("Baseline unavailable");
const d=[...rows].sort((a,b)=>Date.parse(b.created_on||0)-Date.parse(a.created_on||0))[0];
if(d?.versions?.length!==1||d.versions[0].version_id!==expected||Number(d.versions[0].percentage)!==100||items[0].id!==expected)throw Error("Active and latest uploaded versions must match");
const bindings=active?.resources?.bindings;
if(!Array.isArray(bindings)||!bindings.some(b=>b.name==="GUESTY_WEBHOOK_SECRET"&&b.type==="secret_text"))throw Error("Secret binding missing");
for(const name of ["BOOKING_REQUESTS_ENABLED","GUESTY_WEBHOOKS_ENABLED"])if(!bindings.some(b=>b.name===name&&b.type==="plain_text"&&b.text==="false"))throw Error("Safety gate changed");
const r=await fetch(base+"/content/v2",{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(30000)});
if(!r.ok)throw Error("Script content GET unavailable HTTP "+r.status);
const bytes=new Uint8Array(await r.arrayBuffer());
if(bytes.length===0||bytes.length>10_000_000)throw Error("Unexpected script content size");
const digest=createHash("sha256").update(bytes).digest("hex");
const etag=active?.resources?.script?.etag;
console.log("PASS: exact active/latest production version at 100%, safety gates disabled, signing-secret binding present.");
console.log("PASS: script content endpoint returned nonempty bytes; bytes were hashed only in memory.");
console.log("Content media type:",(r.headers.get("content-type")||"unavailable").split(";")[0]);
console.log("Downloaded SHA-256 matches Cloudflare version script etag:",typeof etag==="string"&&etag.length>0?digest===etag:"INCONCLUSIVE");
console.log("LIMITATION: script-scoped content endpoint is not an immutable version-specific download; byte hash may differ from Cloudflare etag semantics.");
console.log("READ ONLY: script bytes and hashes not logged or saved; no upload, deployment, or replay.");

// Fail closed before any production D1 write. Wrangler JSON output only.
import {execFileSync} from "node:child_process";
const args=["d1","execute","zyenhomes-booking-requests","--remote","--config","wrangler.reconcile-0001.toml","--json"];
function query(sql){
 const out=execFileSync("../node_modules/.bin/wrangler",[...args,"--command",sql],{encoding:"utf8",timeout:30000,maxBuffer:2e6});
 const data=JSON.parse(out);
 if(!Array.isArray(data)||data[0]?.success!==true||!Array.isArray(data[0]?.results))throw Error("Unexpected D1 result");
 return data[0].results;
}
const names=query("SELECT type,name FROM sqlite_master WHERE name IN ('booking_requests','marketing_opt_ins','idx_requests_created','idx_requests_email','idx_requests_guesty_sync') ORDER BY name");
const expected={booking_requests:"table",marketing_opt_ins:"view",idx_requests_created:"index",idx_requests_email:"index",idx_requests_guesty_sync:"index"};
for(const [name,type] of Object.entries(expected))if(!names.some(x=>x.name===name&&x.type===type))throw Error("Missing or mismatched object: "+name);
const migrations=query("SELECT name FROM d1_migrations ORDER BY id");
if(migrations.length!==0)throw Error("Migration history changed; stop for review");
const cols=query("PRAGMA table_info('booking_requests')");
const required=["request_id","created_at","property_id","guest_name","guest_email","guest_phone","check_in","check_out","guests","message","quote_total_cents","quote_currency","request_status","guesty_sync_status","guesty_reference","marketing_consent","marketing_consent_at","consent_text_version"];
if(cols.length!==required.length||required.some((name,i)=>cols[i].name!==name))throw Error("Booking columns differ from reviewed schema");
const count=query("SELECT COUNT(*) AS n FROM booking_requests")[0]?.n;
if(!Number.isSafeInteger(count))throw Error("Cannot determine booking count");
console.log("Preflight passed: schema objects, column names and empty migration history; booking request count:",count);

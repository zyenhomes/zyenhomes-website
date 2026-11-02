// Read-only D1 schema verification. The Cloudflare D1 query endpoint uses HTTP POST,
// but all SQL statements below are fixed SELECT/PRAGMA metadata reads.
// No guest rows, secrets, raw responses, or database contents are logged.
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const config=await import("node:fs").then(m=>m.readFileSync("cloudflare/wrangler.toml","utf8"));
const id=config.match(/\[\[d1_databases\]\][\s\S]*?binding\s*=\s*"BOOKING_DB"[\s\S]*?database_id\s*=\s*"([0-9a-f-]{36})"/)?.[1];
if(!id)throw Error("Expected BOOKING_DB database ID not found in configuration");
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${id}/query`;
async function query(sql){
 const response=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({sql}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("Read-only D1 metadata request failed: HTTP "+response.status);
 const payload=await response.json();
 if(payload?.success!==true||!Array.isArray(payload.result)||!Array.isArray(payload.result[0]?.results))throw Error("Unexpected D1 metadata response");
 return payload.result[0].results;
}
const tables=await query("SELECT name, type FROM sqlite_master WHERE type IN ('table','index') AND name IN ('guesty_message_events','idx_guesty_message_event_id','idx_guesty_message_reservation')");
const names=new Set(tables.map(x=>x.name));
const columns=await query("PRAGMA table_info(guesty_message_events)");
const colNames=new Set(columns.map(x=>x.name));
const required=["svix_id","guesty_event_id","event_type","reservation_id","conversation_id","occurred_at","received_at","payload_json","archive_status"];
const expectedObjects=["guesty_message_events","idx_guesty_message_event_id","idx_guesty_message_reservation"];
console.log("Expected D1 schema objects present:",expectedObjects.filter(x=>names.has(x)).length,"of",expectedObjects.length);
console.log("Expected D1 columns present:",required.filter(x=>colNames.has(x)).length,"of",required.length);
if(expectedObjects.some(x=>!names.has(x))||required.some(x=>!colNames.has(x)))throw Error("Production D1 message archive schema incomplete; do not activate");
console.log("PASS: expected production D1 archive schema exists (metadata only).");

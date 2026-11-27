// Offline planning only. No network, subprocess, credentials or upload.
export const TARGET="zyenhomes-guesty-auth-test-isolated2";
export const DB="ca5a1af6-6ad5-4c6c-a4aa-ee75ecd0158e";
export const FLAGS=Object.freeze({GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"false",GUESTY_TEST_MODE:"disabled",GUESTY_QUOTE_CREATE_TEST_ENABLED:"false",GUESTY_QUOTE_READONLY_DIAGNOSTIC_ENABLED:"false",GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED:"false",BOOKING_REQUESTS_ENABLED:"false",GUESTY_WEBHOOKS_ENABLED:"false"});
const secrets=["GUESTY_OPEN_API_CLIENT_ID","GUESTY_OPEN_API_CLIENT_SECRET","GUESTY_BOOKING_ENGINE_CLIENT_ID","GUESTY_BOOKING_ENGINE_CLIENT_SECRET","GUESTY_QUOTE_DIAGNOSTIC_ACCESS_TOKEN"];
export function planUpload({worker,bindings,activeVersion,latestVersion,approvedLatestVersion=activeVersion}={}){
 if(worker!==TARGET||!activeVersion||latestVersion!==approvedLatestVersion||!Array.isArray(bindings))throw Error("baseline_unverified");
  if(bindings.some(b=>!["secret_text","plain_text","d1"].includes(b.type)))throw Error("unexpected_resource");
 if(new Set(bindings.map(b=>b.name)).size!==bindings.length)throw Error("duplicate_binding");
 const databases=bindings.filter(b=>b.type==="d1");
 if(databases.length>1||databases.some(b=>b.name!=="ISOLATED_BOOKING_DB"||b.id!==DB))throw Error("wrong_database");
 if(bindings.some(b=>b.name==="ISOLATED_BOOKING_DB"&&b.type!=="d1"))throw Error("wrong_database");
 if(!secrets.every(name=>bindings.some(b=>b.name===name&&b.type==="secret_text")))throw Error("missing_secret");
 return {worker:TARGET,command:["versions","upload","--config","cloudflare/wrangler.nonblocking-isolated-review.toml"],activeVersion,authorized:false};
}
export function verifyCandidate(before,after){
 if(!Array.isArray(before)||!Array.isArray(after))throw Error("missing_bindings");
 const map=new Map(after.map(b=>[b.name,b]));
 if(map.size!==after.length)throw Error("duplicate_binding");
 for(const b of before){const next=map.get(b.name);if(!next||next.type!==b.type)throw Error("binding_lost");if(b.type==="plain_text"&&next.text!==(FLAGS[b.name]??b.text))throw Error("variable_changed");}
 for(const b of after)if(!before.some(x=>x.name===b.name)&&b.name!=="ISOLATED_BOOKING_DB"&&!Object.hasOwn(FLAGS,b.name))throw Error("unexpected_binding");
 const d=after.filter(b=>b.type==="d1");
 if(d.length!==1||d[0].name!=="ISOLATED_BOOKING_DB"||d[0].id!==DB)throw Error("wrong_database");
 for(const [name,value] of Object.entries(FLAGS))if(map.get(name)?.type!=="plain_text"||map.get(name)?.text!==value)throw Error("unsafe_flag");
 return true;
}

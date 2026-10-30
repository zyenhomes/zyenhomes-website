// ISOLATED test Worker only. Never targets production booking API.
import {spawnSync} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const name="zyenhomes-webhook-test";
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(process.env.TEST_CONFIRMATION!=="TEST_ISOLATED_WORKER_ONLY")throw Error("Explicit isolated-test confirmation required");
if(!token||!/^[0-9a-fA-F]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials or account ID");
const url=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}/settings`;
async function inspect(){
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
 console.log("Test Worker settings HTTP status:",response.status);
 if(!response.ok)throw Error("Cannot inspect isolated Worker");
 const body=await response.json();
 if(body?.success!==true||!Array.isArray(body.result?.bindings))throw Error("Unexpected isolated Worker settings");
 return body.result.bindings;
}
function assertBaseline(bindings){
 const variable=bindings.find(b=>b.name==="TEST_PRESERVE_VARIABLE");
 const dummy=bindings.find(b=>b.name==="TEST_DUMMY_SECRET");
 if(variable?.text!=="keep-this-value"||!dummy||dummy.type!=="secret_text")throw Error("Isolated Worker baseline missing or changed");
}
const before=await inspect();
assertBaseline(before);
const dir=mkdtempSync(join(tmpdir(),"zyenhomes-isolated-"));
try{
 const config=join(dir,"wrangler.toml");
 writeFileSync(config,'name = "zyenhomes-webhook-test"\nkeep_vars = true\n');
 const cli=join(process.cwd(),"node_modules",".bin","wrangler");
 const child=spawnSync(cli,["secret","put","TEST_WRANGLER_SECRET","--name",name,"--config",config],{
  input:"synthetic-test-value-only-2026\n",encoding:"utf8",
  env:{...process.env,CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account},
  timeout:60000,maxBuffer:100000
 });
 // Never echo stdout/stderr; output can contain deployment metadata.
 if(child.status!==0)throw Error("Isolated Wrangler secret put failed; status "+String(child.status));
}finally{rmSync(dir,{recursive:true,force:true});}
const after=await inspect();
assertBaseline(after);
if(!after.some(b=>b.name==="TEST_WRANGLER_SECRET"&&b.type==="secret_text"))throw Error("New isolated test secret not found");
console.log("PASS: Wrangler secret put preserved the dummy variable and existing dummy secret on isolated Worker.");
console.log("Production Worker was not targeted. D1/KV/rate-limit bindings were not tested.");

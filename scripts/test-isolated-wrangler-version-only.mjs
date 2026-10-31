// Explicitly approved isolated Worker test. Creates an UNDEPLOYED version only.
// Never target zyenhomes-booking-api. Never log secrets, tokens, or response bodies.
import {spawnSync} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const name="zyenhomes-webhook-test";
const secretName="TEST_VERSION_ONLY_SECRET_2026";
if(process.env.TEST_CONFIRMATION!=="TEST_ISOLATED_VERSION_ONLY")throw Error("Explicit isolated version-only confirmation required");
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!token||!/^[a-fA-F0-9]{32}$/.test(account||""))throw Error("Missing Cloudflare credentials");
const url=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}/settings`;
async function inspect(){
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error("Isolated Worker settings unavailable: HTTP "+response.status);
 const payload=await response.json();
 if(payload?.success!==true||!Array.isArray(payload.result?.bindings))throw Error("Unexpected isolated Worker settings");
 return payload.result.bindings;
}
function baseline(bindings){
 const variable=bindings.find(b=>b.name==="TEST_PRESERVE_VARIABLE");
 const dummy=bindings.find(b=>b.name==="TEST_DUMMY_SECRET");
 if(variable?.text!=="keep-this-value"||dummy?.type!=="secret_text")throw Error("Isolated baseline invalid");
 if(bindings.some(b=>b.name===secretName))throw Error("Version-only test secret already deployed; stop");
}
const before=await inspect();
baseline(before);
const dir=mkdtempSync(join(tmpdir(),"zyenhomes-version-only-"));
try{
 const config=join(dir,"wrangler.toml");
 writeFileSync(config,'name = "zyenhomes-webhook-test"\nkeep_vars = true\n');
 const cli=join(process.cwd(),"node_modules",".bin","wrangler");
 const child=spawnSync(cli,["versions","secret","put",secretName,"--name",name,"--config",config],{
  input:"fictional-version-only-secret-not-for-production\n",encoding:"utf8",
  env:{...process.env,CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account},
  timeout:60000,maxBuffer:100000
 });
 // Intentionally never print CLI output.
 if(child.status!==0)throw Error("Isolated version-only secret command failed");
}finally{rmSync(dir,{recursive:true,force:true});}
const after=await inspect();
baseline(after);
const beforeNames=before.map(x=>x.name+":"+x.type).sort();
const afterNames=after.map(x=>x.name+":"+x.type).sort();
if(JSON.stringify(beforeNames)!==JSON.stringify(afterNames))throw Error("Deployed binding names/types changed");
console.log("PASS: isolated version-only command completed; deployed settings retain baseline bindings.");
console.log("LIMITATION: undeployed version bindings and deployed version ID were not independently inspected.");

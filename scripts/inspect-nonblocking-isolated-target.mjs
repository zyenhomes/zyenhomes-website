// GET only; never print response bodies, binding values or credentials.
import {pathToFileURL} from "node:url";
const worker="/workers/scripts/zyenhomes-guesty-auth-test-isolated2";
const db="ca5a1af6-6ad5-4c6c-a4aa-ee75ecd0158e";
const active="6315c368-e952-474c-a67f-c9de71ca19b6",saved="cc3a7f0d-bf88-44cc-a084-63db65392793";
export async function diagnose({account,token,transport=fetch,report=console.log}){
 if(!/^[a-f0-9]{32}$/i.test(account??"")||!token)throw Error("missing_configuration");
 let failed=false;
 for(const [label,path] of [["D1 metadata","/d1/database/"+db],["Worker deployments",worker+"/deployments"],["Worker versions",worker+"/versions"],["Active version",worker+"/versions/"+active],["Saved version",worker+"/versions/"+saved]]){
 try{
 const r=await transport("https://api.cloudflare.com/client/v4/accounts/"+account+path,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
 let j;try{j=await r.json()}catch{}
 const codes=Array.isArray(j?.errors)?j.errors.map(e=>e.code).filter(Number.isSafeInteger):[];
 const ok=r.ok&&j?.success===true&&!!j.result;
 report(label+": HTTP "+r.status+"; API codes "+(codes.join(",")||"none")+"; "+(ok?"OK":"FAILED"));
 if(!ok){failed=true;continue;}
 if(label==="D1 metadata"&&(j.result.uuid!==db||j.result.name!=="zyenhomes-booking-test")){report("D1 identity mismatch");failed=true;}
 }catch{report(label+": transport failure");failed=true;}
 }
 return !failed;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!await diagnose({account:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN}))process.exitCode=1;
}

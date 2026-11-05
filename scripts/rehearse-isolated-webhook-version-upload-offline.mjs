// Offline rehearsal of isolated Worker upload command construction.
// No credentials and no Cloudflare API requests. Never deploys.
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const dir=mkdtempSync(join(tmpdir(),"zyenhomes-isolated-upload-"));
try{
 const config=join(dir,"wrangler.toml");
 writeFileSync(join(dir,"worker.mjs"),'export default {fetch(){return new Response("isolated test")}};\n');
 writeFileSync(config,'name = "zyenhomes-webhook-test"\nmain = "worker.mjs"\ncompatibility_date = "2026-10-24"\nkeep_vars = true\n[vars]\nTEST_WEBHOOKS_ENABLED = "true"\n');
 const cli=join(process.cwd(),"node_modules",".bin","wrangler");
 const help=spawnSync(cli,["versions","upload","--help"],{encoding:"utf8",timeout:20000});
 if(help.status!==0)throw Error("Wrangler version upload help unavailable");
 if(!/versions upload/i.test(help.stdout))throw Error("Version-only upload command not recognized");
 console.log("PASS: isolated-only version upload CLI command available.");
 console.log("CHECK REQUIRED: help output must be manually reviewed for dry-run and binding preservation semantics.");
 console.log("READ ONLY: no upload executed; no Cloudflare credentials used.");
}finally{rmSync(dir,{recursive:true,force:true});}

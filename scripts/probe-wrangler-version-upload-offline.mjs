import {spawnSync} from "node:child_process";
const result=spawnSync("node_modules/.bin/wrangler",["versions","upload","--help"],{encoding:"utf8",timeout:15000,maxBuffer:100000});
if(result.status!==0)throw Error("Wrangler version-upload help unavailable");
const supported=(result.stdout||"").includes("versions upload");
console.log("Version-only upload command available:",supported?"YES":"NO");
console.log("READ ONLY: no Cloudflare credentials or writes.");
if(!supported)process.exitCode=1;

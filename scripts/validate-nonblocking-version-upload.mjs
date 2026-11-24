import assert from "node:assert/strict";
import {uploadOne} from "./nonblocking-version-upload.mjs";
import {DB,FLAGS} from "./nonblocking-upload-preflight.mjs";
function fixture(){
 const before=["GUESTY_OPEN_API_CLIENT_ID","GUESTY_OPEN_API_CLIENT_SECRET","GUESTY_BOOKING_ENGINE_CLIENT_ID","GUESTY_BOOKING_ENGINE_CLIENT_SECRET","GUESTY_QUOTE_DIAGNOSTIC_ACCESS_TOKEN"].map(name=>({name,type:"secret_text"}));
 const after=[...before,...Object.entries(FLAGS).map(([name,text])=>({name,text,type:"plain_text"})),{name:"ISOLATED_BOOKING_DB",type:"d1",id:DB}];
 let calls=0;
 const input={approvedVersion:"a",read:async path=>{
 if(path==="/deployments")return [{id:"deployment",created_on:"2026-01-01",versions:[{version_id:"a",percentage:100}]}];
 if(path==="/versions")return [{id:"a",created_on:"2026-01-01"},...(calls?[{id:"b",created_on:"2026-01-02"}]:[])];
 if(path==="/versions/a")return {resources:{bindings:before}};
 if(path==="/versions/b")return {resources:{bindings:after}};
 throw Error("unexpected path");
 },upload:async args=>{calls++;assert.deepEqual(args,["versions","upload","--config","cloudflare/wrangler.nonblocking-isolated-review.toml"]) }};
 return {input,after,calls:()=>calls};
}
let f=fixture();assert.deepEqual(await uploadOne(f.input),{versionId:"b",deployed:false});assert.equal(f.calls(),1);
f=fixture();f.input.approvedVersion="wrong";await assert.rejects(()=>uploadOne(f.input),/approved_baseline_changed/);assert.equal(f.calls(),0);
f=fixture();f.after.at(-1).id="wrong";await assert.rejects(()=>uploadOne(f.input),/wrong_database/);assert.equal(f.calls(),1);
f=fixture();let attempts=0;f.input.upload=async()=>{attempts++;throw Error("uncertain")};await assert.rejects(()=>uploadOne(f.input),/uncertain/);assert.equal(attempts,1);
f=fixture();const original=f.input.read;f.input.approvedLatestVersion="saved";f.input.read=async p=>p==="/versions"?[...(await original(p)),{id:"saved",created_on:"2026-01-01T12:00:00Z"}]:p==="/versions/saved"?original("/versions/a"):original(p);assert.deepEqual(await uploadOne(f.input),{versionId:"b",deployed:false});
console.log("PASS: simulated version-only upload");

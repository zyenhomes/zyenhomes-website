import assert from "node:assert/strict";
import {TARGET,DB,FLAGS,planUpload,verifyCandidate} from "./nonblocking-upload-preflight.mjs";
const before=["GUESTY_OPEN_API_CLIENT_ID","GUESTY_OPEN_API_CLIENT_SECRET","GUESTY_BOOKING_ENGINE_CLIENT_ID","GUESTY_BOOKING_ENGINE_CLIENT_SECRET","GUESTY_QUOTE_DIAGNOSTIC_ACCESS_TOKEN","EXTRA_SECRET"].map(name=>({name,type:"secret_text"}));
before.push({name:"OTHER_VAR",type:"plain_text",text:"preserve"});
const input={worker:TARGET,bindings:before,activeVersion:"version-a",latestVersion:"version-a"};
assert.equal(planUpload(input).authorized,false);
assert.equal(planUpload({...input,latestVersion:"version-b",approvedLatestVersion:"version-b"}).authorized,false);
for(const extra of [{worker:"zyenhomes-booking-api"},{latestVersion:"version-b"},{bindings:before.slice(1)}])assert.throws(()=>planUpload({...input,...extra}));
const after=[...before,...Object.entries(FLAGS).map(([name,text])=>({name,text,type:"plain_text"})),{name:"ISOLATED_BOOKING_DB",type:"d1",id:DB}];
assert.equal(verifyCandidate(before,after),true);
for(const mutate of [a=>a.shift(),a=>a.at(-1).id="wrong",a=>a.push({name:"EXTRA_DB",type:"d1",id:DB}),a=>a.find(b=>b.name==="OTHER_VAR").text="changed",a=>a.find(b=>b.name==="GUESTY_TEST_MODE").text="live"]){const a=structuredClone(after);mutate(a);assert.throws(()=>verifyCandidate(before,a));}
const isolatedDb={name:"ISOLATED_BOOKING_DB",type:"d1",id:DB};
const existing=[...before,isolatedDb];

assert.equal(planUpload({...input,bindings:existing}).authorized,false);
assert.equal(verifyCandidate(existing,after),true);

for(const invalid of [
 [...before,{...isolatedDb,id:"wrong"}],
 [...before,{...isolatedDb,name:"WRONG_DB"}],
 [...existing,{name:"EXTRA_DB",type:"d1",id:DB}],
 [...existing,isolatedDb],
 [...before,{name:"ISOLATED_BOOKING_DB",type:"plain_text",text:DB}]
]){
 assert.throws(()=>planUpload({...input,bindings:invalid}));
}

console.log("PASS: existing isolated D1 binding safety tests");

console.log("PASS: offline upload preflight and binding verification");

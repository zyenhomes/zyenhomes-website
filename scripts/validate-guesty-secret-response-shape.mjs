// Offline synthetic tests only. No Guesty requests, no secret output.
import assert from "node:assert/strict";
const fake="whsec_"+Buffer.alloc(32,42).toString("base64");
function classify(value){
 if(typeof value==="string")return /^whsec_[A-Za-z0-9+/=]{20,}$/.test(value)?"signing_secret_format":"string_other";
 if(value===null)return "null";
 if(Array.isArray(value))return "array";
 if(typeof value==="object")return "object";
 return typeof value;
}
function shape(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return {kind:classify(payload)};
 const keys=Object.keys(payload);
 // No raw keys or values are printed. Report only recognized, fixed labels.
 const candidates=["secret","signingSecret","webhookSecret","data"];
 return {kind:"object",fieldCount:keys.length,recognized:candidates.filter(k=>Object.hasOwn(payload,k)).map(k=>[k,classify(payload[k])])};
}
assert.deepEqual(shape({secret:fake}),{kind:"object",fieldCount:1,recognized:[["secret","signing_secret_format"]]});
assert.deepEqual(shape({data:{secret:fake}}),{kind:"object",fieldCount:1,recognized:[["data","object"]]});
assert.deepEqual(shape({}),{kind:"object",fieldCount:0,recognized:[]});
console.log("PASS: Synthetic response-shape classifier. Actual Guesty response remains unknown.");

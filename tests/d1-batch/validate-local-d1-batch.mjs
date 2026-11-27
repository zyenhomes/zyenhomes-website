import assert from "node:assert/strict";

const base = "http://127.0.0.1:8796/local-batch-test";
async function claim(requestId, claimToken, attemptId) {
  const response = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, claimToken, attemptId })
  });
  assert.equal(response.status, 200, "local D1 batch must execute successfully");
  return response.json();
}
const first = await claim("request-local-a","token-local-a","attempt-local-a");
assert.equal(first.results.length,2);
assert.equal(first.results[0].success,true);
assert.equal(first.results[1].success,true);
assert.equal(first.results[0].rowCount,1);
assert.equal(first.results[0].returnedClaimToken,"token-local-a");
assert.equal(first.results[1].metaChanges,1);

const duplicate = await claim("request-local-a","token-local-b","attempt-local-b");
assert.equal(duplicate.results[0].rowCount,0);
assert.equal(duplicate.results[1].metaChanges,0);

const absentQuote = await claim("request-local-noquote","token-local-c","attempt-local-c");
assert.equal(absentQuote.results[0].rowCount,0);
assert.equal(absentQuote.results[1].metaChanges,0);

console.log("PASS: local Cloudflare D1 batch returns expected claim and audit result sets.");
console.log("LIMITATION: this does not establish remote D1 behavior or external Guesty exactly-once delivery.");

const e2e=()=>fetch("http://127.0.0.1:8796/local-e2e",{method:"POST"}).then(r=>r.json());
const outcomes=await Promise.all([e2e(),e2e()]);
assert.equal(outcomes.filter(x=>x.result.state==="manual_review"&&x.result.auditRecorded).length,1);
assert.equal(outcomes.filter(x=>x.result.state==="blocked").length,1);
assert.equal((await e2e()).audit.outcome,"manual_review");
console.log("PASS: local D1 consolidated mock workflow");


for (const [group, expected] of [["quote",1],["identity",1],["independent",2]]) {
  const ids = ["a","b"].map(s => "race-"+group+"-"+s);
  const results = await Promise.all(ids.map(id => claim(id,"token-"+id,"attempt-"+id)));
  assert.equal(results.reduce((n,r)=>n+r.results[0].rowCount,0),expected,group+" claim count");
  assert.equal(results.reduce((n,r)=>n+r.results[1].metaChanges,0),expected,group+" audit count");
  for (let i=0;i<ids.length;i++) {
    assert.equal(results[i].results[0].rowCount,results[i].results[1].metaChanges);
    const retry=await claim(ids[i],"retry-token-"+ids[i],"retry-attempt-"+ids[i]);
    assert.equal(retry.results[0].rowCount,0);
    assert.equal(retry.results[1].metaChanges,0);
  }
}
console.log("PASS: concurrent cross-request quote and normalized identity duplicates blocked; independent bookings permitted.");


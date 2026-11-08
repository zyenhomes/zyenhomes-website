import assert from "node:assert/strict";
import { claimInquiryWithAudit } from "./guesty-d1-claim-adapter-offline.mjs";

const ids = { requestId: "request-123", claimToken: "claim-token-123", attemptId: "attempt-123" };
function mock(results) {
  const prepared = [];
  return {
    prepared,
    prepare(sql) {
      return { bind(...binds) { prepared.push({ sql, binds }); return { sql, binds }; } };
    },
    async batch(statements) {
      assert.equal(statements.length,2);
      return results;
    }
  };
}
const success = [
  { success:true, results:[{ request_id:ids.requestId, guesty_sync_claim_token:ids.claimToken }], meta:{ changes:1 } },
  { success:true, results:[], meta:{ changes:1 } }
];
const won = await claimInquiryWithAudit(mock(success),ids);
assert.equal(won.claimed,true);
assert.equal(won.guestyWriteAuthorized,false);
assert.equal(won.requestId,ids.requestId);
const lost = await claimInquiryWithAudit(mock([
  {success:true,results:[],meta:{changes:0}},
  {success:true,results:[],meta:{changes:0}}
]),ids);
assert.equal(lost.claimed,false);
for (const results of [
  [],
  [success[0]],
  [{...success[0],success:false},success[1]],
  [success[0],{...success[1],meta:{changes:0}}],
  [{...success[0],results:[{request_id:"wrong",guesty_sync_claim_token:ids.claimToken}]},success[1]],
  [{...success[0],results:[]},success[1]],
  [{...success[0],results:[success[0].results[0],success[0].results[0]]},success[1]]
]) await assert.rejects(claimInquiryWithAudit(mock(results),ids));
await assert.rejects(claimInquiryWithAudit(null,ids));
await assert.rejects(claimInquiryWithAudit(mock(success),{...ids,claimToken:"bad"}));

// A failed or indeterminate D1 transaction must never be treated as a claim win.
const batchFailure = {
  prepare(sql) { return { bind(...binds) { return { sql, binds }; } }; },
  async batch() { throw Error("D1 transaction failed"); }
};
await assert.rejects(claimInquiryWithAudit(batchFailure, ids), /D1 transaction failed/);
for (const results of [
  null,
  undefined,
  "unexpected",
  [{ success:true, results:[], meta:{changes:0} }, { success:true, results:[], meta:{} }],
  [{ success:true, results:[], meta:{changes:0} }, { success:true, results:[], meta:{changes:1} }],
  [{ success:true, results:[{request_id:ids.requestId, guesty_sync_claim_token:ids.claimToken}], meta:{changes:1} },
   { success:true, results:[], meta:{changes:2} }]
]) await assert.rejects(claimInquiryWithAudit(mock(results), ids));
assert.equal(Object.hasOwn(won, "token"), false);
assert.equal(Object.hasOwn(won, "guestyReference"), false);

console.log("PASS: standalone D1 claim adapter validates batch result sets and never authorizes Guesty writes.");

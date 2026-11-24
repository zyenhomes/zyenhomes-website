import {createLocalMockHarness} from "../../cloudflare/guesty-nonblocking-isolated-worker-candidate.js";
// Isolated local test Worker. No Guesty API, no production credentials or deployment.
import { buildAtomicClaimBatchPlan } from "../../scripts/guesty-d1-atomic-claim-batch-offline.mjs";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/local-e2e" && request.method === "POST") {
      const requestId="request-local-e2e",attemptId="attempt-local-e2e",claimToken="token-local-e2e",id="6adb5d7320cb330ec34a3507";
      const result=await createLocalMockHarness({approval:{requestId,attemptId,claimToken,quoteId:id,expiresAt:"2027-01-01T00:00:00Z"},db:env.BOOKING_DB,now:0,readQuote:async()=>({_id:id,unitTypeId:"6abf9b85caf2480012c82479",checkInDateLocalized:"2027-01-14",checkOutDateLocalized:"2027-01-18",guestsCount:6,expiresAt:"2027-01-01T00:00:00Z",rates:{ratePlans:[{ratePlan:{_id:"default-rateplan-id",money:{currency:"CAD",invoiceItems:[{amount:1053}]}}}]}}),transport:async()=>({status:200,json:async()=>({_id:id})})})();
      const audit=await env.BOOKING_DB.prepare("SELECT outcome FROM guesty_inquiry_sync_attempts WHERE attempt_id=?").bind(attemptId).first();
      return Response.json({result,audit});
    }
    if (new URL(request.url).pathname !== "/local-batch-test" || request.method !== "POST")
      return new Response("Not found", { status: 404 });
    try {
      const { requestId, claimToken, attemptId } = await request.json();
      const plan = buildAtomicClaimBatchPlan({ requestId, claimToken, attemptId });
      const statements = plan.statements.map(s => env.BOOKING_DB.prepare(s.sql).bind(...s.binds));
      const results = await env.BOOKING_DB.batch(statements);
      return Response.json({
        results: results.map(r => ({
          success: r.success,
          metaChanges: r.meta?.changes ?? null,
          rowCount: r.results?.length ?? 0,
          returnedClaimToken: r.results?.[0]?.guesty_sync_claim_token ?? null
        }))
      });
    } catch (e) {
      return Response.json({ error: "Local batch rejected", kind: e?.name || "Error" }, { status: 409 });
    }
  }
};

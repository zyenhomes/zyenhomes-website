// Isolated local test Worker. No Guesty API, no production credentials or deployment.
import { buildAtomicClaimBatchPlan } from "../../scripts/guesty-d1-atomic-claim-batch-offline.mjs";

export default {
  async fetch(request, env) {
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

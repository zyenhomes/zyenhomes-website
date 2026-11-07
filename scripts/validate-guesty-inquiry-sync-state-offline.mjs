import assert from "node:assert/strict";
import { STATES, planTransition, classifyAttemptOutcome } from "./guesty-inquiry-sync-state-offline.mjs";

for (const [current, next] of [
  ["pending", "processing"], ["processing", "succeeded"],
  ["processing", "failed"], ["processing", "uncertain"],
  ["failed", "manual_review"], ["uncertain", "manual_review"],
  ["manual_review", "pending"], ["manual_review", "succeeded"],
  ["succeeded", "processing"], ["unknown", "pending"]
]) {
  assert.equal(planTransition(current, next, {
    guestyReference: "6adb5d7320cb330ec34a3507"
  }).allowed, false);
}
assert.equal(planTransition("pending", "processing").reason, "atomic_claim_not_implemented");
assert.equal(planTransition("uncertain", "pending").reason, "transition_not_allowed");
assert.equal(planTransition("processing", "succeeded").reason, "verified_guesty_reference_required");
for (const input of [
  { transport: "timeout" }, { transport: "connection_lost" },
  { transport: "unknown" }, { httpStatus: 502 },
  { httpStatus: 201 }, { httpStatus: 409 }, { httpStatus: 400 },
  { httpStatus: 201, verifiedReference: "6adb5d7320cb330ec34a3507" }
]) assert.equal(classifyAttemptOutcome(input).retryAutomatically, false);
assert.equal(classifyAttemptOutcome({ transport: "timeout" }).state, STATES.UNCERTAIN);
assert.equal(classifyAttemptOutcome({ httpStatus: 201 }).state, STATES.UNCERTAIN);
assert.equal(classifyAttemptOutcome({ httpStatus: 201, verifiedReference: "6adb5d7320cb330ec34a3507" }).verificationRequired, true);
console.log("PASS: offline state model blocks automatic retries, transitions and ambiguous outcomes.");

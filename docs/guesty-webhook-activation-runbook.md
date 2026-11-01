# Guesty messaging webhook — controlled activation and rollback

Status: **DRAFT / NOT AUTHORIZED TO RUN**. This runbook does not grant permission to deploy, merge, create subscriptions, install secrets, or enable webhook processing.

## Preconditions (all required)

1. Confirm the exact webhook destination and verify that the deployed Worker route exists and fails closed. Preserve existing booking routes and database bindings.
2. Confirm the `guesty-webhook-activation` GitHub environment, reviewer policy, credentials, and current Cloudflare account. No new paid products or upgrades.
3. Validate Guesty's GET /v1/webhooks response schema and the POST subscription payload/status expectations. Verify supported event names and URL uniqueness.
4. Independently verify the Svix signature algorithm, expected headers, timestamp tolerance, and real signing-secret format. The `whsec_` prefix and top-level `secret` JSON field are **unverified**.
5. Test the signing-secret handoff against an isolated disposable Worker to ensure it does not alter existing bindings or flags. Do not use the booking Worker for experimentation.
6. Verify privacy/retention, D1 schema and idempotency, monitoring, and synthetic signed event handling. Ensure no Gmail sends or Guesty message writes are enabled.
7. Obtain explicit operator approval for the coordinated activation window and confirm a rollback owner.

## Coordinated activation (only after approval)

1. Record a redacted baseline of production Worker binding names, disabled flags, and current subscription count. Never print secret values, guest data, tokens, or raw responses.
2. Recheck for existing subscriptions. Create **one** subscription only if the verified API response confirms none exists. A timeout or non-201 response is ambiguous; list subscriptions again before any retry.
3. Retrieve the signing secret for the **exact subscribed endpoint URL**. If the response schema is unknown, use only the redacted classifier, stop, and update/test the parser separately. Never print the raw secret.
4. Install the verified endpoint-specific secret using a separately validated method that preserves existing Worker bindings. Confirm binding names and disabled flags after installation.
5. Test a valid signed event and invalid/tampered/replayed events in an isolated environment. Confirm duplicate suppression and D1 behavior.
6. Only after review, enable the receiver in a separate explicitly approved change. Keep Gmail delivery and booking mutations disabled until independently authorized.
7. Observe HTTP acknowledgements, retries, storage errors, and event counts. Do not treat a disabled receiver's 503 as a successful delivery.

## Stop and rollback

- If the subscription POST result is uncertain, **do not repeat POST**. Inspect the subscription list first.
- If the signing secret cannot be retrieved or verified, keep processing disabled. Review Guesty retry behavior and disable/delete the subscription using a separately verified, approved API operation if necessary.
- If bindings change unexpectedly, halt activation; restore known-good Worker configuration using the existing deployment/rollback process, not speculative writes.
- If signature verification or storage fails, keep the receiver disabled, preserve logs without secrets, and investigate before any retry.
- If an endpoint is recreated, assume its signing key may change; reverify the secret and never reuse an old key without confirmation.

## Current blockers

- Guesty has confirmed no existing subscription and no retrievable signing secret yet.
- Secret retrieval response schema and `whsec_` prefix are unverified.
- Production binding preservation during secret installation is unverified.
- End-to-end signed delivery and retry/rollback operations are not yet verified.

No live action is authorized by this document.


## Existing booking Worker risk — configuration review

The target Worker is `zyenhomes-booking-api`, not a disposable test Worker. Its `cloudflare/wrangler.toml` declares `BOOKING_DB` (booking-request D1), `GUESTY_TOKEN_KV`, `BOOKING_RATE_LIMITER`, and disabled `BOOKING_REQUESTS_ENABLED` / `GUESTY_WEBHOOKS_ENABLED` flags. `keep_vars = true` appears in repository configuration but does **not** by itself prove live secret-put preserves all existing bindings.

**Do not run `wrangler secret put` against `zyenhomes-booking-api` as an experiment.** First validate installation and binding preservation on an isolated, already-approved disposable Worker, or obtain independently verified Cloudflare guidance. Compare before/after binding names and disabled flags without printing values. Do not create a paid Cloudflare resource merely to satisfy this test.

The current handoff script requires `ISOLATED_WORKER_SECRET_PUT_VERIFIED=true` but that variable is only an operator assertion, not independent proof. Do not set it until actual evidence has been reviewed.


## Read-only Cloudflare inspection option

An existing workflow, `.github/workflows/inspect-guesty-worker-settings.yml`, can request current binding names and confirm the webhook flag is disabled without modifying the Worker. It is a manually dispatched workflow in the protected `guesty-webhook-activation` environment; **it has not been run as part of this review**. Its output is not proof of `wrangler secret put` binding preservation, and it cannot identify whether an isolated disposable Worker exists.

Do not dispatch the workflow or change environment approval settings without explicit operator authorization. Any future read-only run should confirm the Cloudflare token is active and narrowly scoped, then report only binding presence and disabled state.


## Production read-only inspection evidence — 2026-10-31

The operator ran `Inspect Guesty Worker Production Bindings (Read Only)` workflow #3. The shared GitHub Actions log reports HTTP 200 from the Cloudflare settings endpoint, and confirms these binding names: `BOOKING_DB`, `GUESTY_TOKEN_KV`, `BOOKING_RATE_LIMITER`, `GUESTY_CLIENT_ID`, `GUESTY_CLIENT_SECRET`, `GUESTY_WEBHOOKS_ENABLED`. The inspection script verified `GUESTY_WEBHOOKS_ENABLED` equals `false`, then reported `PASS: Production bindings present and webhook receiver disabled.`

This was read-only and does **not** prove that `wrangler secret put` preserves live bindings, nor that a Guesty subscription exists. Do not mark the installation compatibility gate as verified on this basis.


## Cloudflare official command semantics — 2026-10-31

Cloudflare's official Workers documentation confirms that `wrangler secret put` **creates and immediately deploys a new Worker version**. In contrast, `wrangler versions secret put` creates a new version **without deploying it**. See https://developers.cloudflare.com/workers/configuration/secrets/ and https://developers.cloudflare.com/workers/wrangler/commands/workers/.

**Do not execute the current PR #74 handoff script:** it still invokes `wrangler secret put` against the production booking Worker, and thus can cause an immediate deployment. A future reviewed change should prefer the version-only command, explicitly verify version behavior and binding preservation, and keep actual deployment as a separate approval-gated action. No command has been run against Cloudflare during this documentation update.


## Wrangler version-only CLI check — 2026-10-31

GitHub Actions `Validate Wrangler Version-Only Secret Command (Offline)` completed successfully on PR #74 commit `d9bb191`. The workflow installed Wrangler 4 locally, verified the executable existed, and successfully invoked `wrangler versions secret put --help` without Cloudflare authentication. This confirms command recognition only.

It does **not** establish behavior against a real Worker, binding preservation, secret response compatibility, or permission to create/deploy a version. Keep the isolated-Worker verification gate closed.


## Offline review checkpoint — 2026-10-31

PR #74 commit `625f576` passed all seven GitHub Actions checks. These checks establish only repository-level safeguards and Wrangler CLI command recognition. They do not establish production readiness.

**Next evidence needed (not more static checks):**
1. Verified read-only Guesty subscription listing with its response structure; do not create a subscription as part of this check.
2. Verified isolated Worker behavior for `wrangler versions secret put`, including whether existing bindings are preserved; do not test on the booking Worker.
3. After separately approved creation of the first subscription, classify the signing-secret response without logging values; only then update the strict parser and test a signed delivery.

Until these are resolved, keep the installation workflow blocked and PR #74 in Draft.


## Guesty Open API read-only verification — 2026-10-31

The operator ran `Verify Guesty Open API Webhook Access (Read Only)` workflow #5. The shared successful GitHub Actions log reports:
- Open API token request: successful
- GET `/v1/webhooks` HTTP status: 200
- Subscription count: **0**
- No subscriptions created

This verifies authentication and the top-level array response for the current subscription-list request. It is a point-in-time observation, **not** authorization to create a subscription. Recheck immediately before any future approved creation, and never blindly retry an ambiguous POST.


## Isolated Worker baseline inspection — 2026-10-31

Operator shared successful GitHub Actions run #1 of `Inspect Isolated Guesty Test Worker (Read Only)`. Log reports `Isolated Worker settings HTTP status: 200` and `PASS: isolated Worker exists with expected baseline binding names.` The script checks for `TEST_PRESERVE_VARIABLE` and `TEST_DUMMY_SECRET` in `zyenhomes-webhook-test` using GET only.

This confirms the isolated Worker baseline exists. It does **not** prove that `wrangler versions secret put` preserves bindings or creates a safely undeployed version. No secret installation was attempted.


## Isolated Worker version history inspection — 2026-10-31

Operator shared successful run #1 of `Inspect Isolated Worker Version History (Read Only)`. The logs report HTTP 200 for both versions and deployments, **6 version entries** and **4 deployment entries**. This was GET-only and did not create versions, install secrets, or deploy anything. Counts alone cannot establish which version is deployed, whether version-only secret installation preserves bindings, or when the two fictional test secrets appeared. Next diagnostic should compare deployed-version identity and relevant version metadata without exposing secrets or modifying Cloudflare.


## Isolated deployment reference inspection — 2026-10-31

The operator shared successful run #1 of `Inspect Isolated Worker Deployment References (Read Only)`: HTTP 200 for versions and deployments, 6 version entries, 4 deployment entries, 4 deployment-version references, and **0 references absent from the returned version listing**. This confirms that the four returned deployment references match entries in the returned version page. It does not establish active traffic allocations, explain existing fictional test-secret bindings, or verify preservation of bindings in a new undeployed version. The workflow made no changes.


## Correction to isolated version-test interpretation — 2026-10-31

Review of the pre-PR #88 test code found that `baseline(after)` repeated the **same secret-absence assertion** used by `baseline(before)`. Thus the error `Selected test secret already exists in Worker settings; stop` could occur **after** a successful `wrangler versions secret put` invocation. Earlier conclusions that this error necessarily occurred before Wrangler ran were not supported by the error message alone.

PR #88 separated the preflight collision check from post-test baseline validation. Until the failed run's step logs and isolated Worker version/deployment metadata are correlated, do **not** claim no version was created or that the command preserved bindings. Do not rerun the write test merely to resolve this ambiguity. No production booking Worker write is authorized.


## Verified GitHub Actions run #41247324968 — execution order

The original workflow run was checked directly using its GitHub Actions job logs and the script at the run's exact head SHA `7c4a8491361992ac688fae7079451cd069a586f7`.

- The first `baseline(before)` call (line 27) returned successfully.
- The `wrangler versions secret put` subprocess ran (lines 33–39) and exited with status zero; otherwise the script would have thrown on line 39.
- The script then successfully fetched the Worker settings again (line 41).
- The second `baseline(after)` call (line 42) threw because the fictional secret was now present. That assertion was inappropriate after secret creation and has since been corrected in PR #88.

**Supported conclusion:** the isolated Wrangler version-only command completed successfully and the secret binding appeared in the subsequent settings response. **Not yet supported:** that a version was definitely undeployed, that every binding was preserved, or that the live production booking Worker would behave identically. No further write test is required to establish command execution. Compare timestamped version and deployment metadata, preferably from an existing audit trail, before any activation decision.

Evidence: https://github.com/zyenhomes/zyenhomes-website/actions/runs/41247324968


## Cloudflare dashboard version history evidence — 2026-11-01

Operator shared Cloudflare dashboard screenshot of isolated `zyenhomes-webhook-test` version/deployment history. Three Wrangler-origin entries show `Updated secret` and status `Ready`, with abbreviated version identifiers `8482caf6` (~15h prior), `d5c1f361` (~14h prior), and `42b76d47` (~13h prior). Earlier entries include a manually deployed version, `TEST_DUMMY_SECRET` creation, and `TEST_PRESERVE_VARIABLE` creation.

This is strong evidence that the three isolated Wrangler test attempts created Worker versions despite their GitHub Actions failures. **Ready does not establish active traffic allocation**; the dashboard section label and relative timestamps alone do not prove that these versions were deployed to traffic. Do not repeat secret writes solely to prove version creation. Before concluding no deployment occurred, inspect the active deployment/traffic allocation separately. This screenshot does not establish undeployed-version binding preservation or production Worker safety.


## Isolated Worker active deployment dashboard — 2026-11-01

The operator supplied a Cloudflare `zyenhomes-webhook-test` Deployments screenshot showing **Active deployment version `0514e419`** (deployed about one day prior), with the three newer Wrangler-created secret-update versions `8482caf6`, `d5c1f361`, and `42b76d47` listed separately as `Ready`. This is strong direct evidence that the version-only secret operations did **not** replace the active deployment. The dashboard also displays **0% traffic** for `0514e419`; do not infer a 100% traffic allocation or identify other traffic-serving versions from this screenshot alone.

The evidence validates isolated version creation without changing the displayed active deployment, **not** full preservation of bindings in the newly created versions or behavior against the production booking Worker. Keep production secret installation gated.


## Isolated version binding preservation verified — 2026-11-01

Operator provided the successful GitHub Actions `Inspect Isolated Worker Version Bindings (Read Only)` output:
- Latest listed version differs from the latest deployment's single referenced version.
- Deployed version: 3 bindings; latest version: 6 bindings.
- Missing or type-changed deployed binding names/types: **0**.
- Additional bindings: **3**.
- Script reported `PASS: latest version preserves deployed binding names and types.`

This is evidence of binding name/type preservation in the **isolated test Worker** across the version-only secret updates. The earlier Cloudflare dashboard also showed the original active deployment remained selected. It does **not** prove preservation of production D1/KV/rate-limit bindings, unchanged secret values, or compatibility with Guesty's unverified signing-secret response schema. Keep the production installation workflow gated and PR #74 in Draft.


## Subscription-before-secret delivery hazard — 2026-11-01

Current `main` code confirms `cloudflare/worker.js` routes `/api/webhooks/guesty/messages` to `receiveGuestyMessageWebhook`. That receiver returns HTTP **503** whenever `GUESTY_WEBHOOKS_ENABLED` is not `"true"`; it also returns 503 if the signing secret or D1 binding is unavailable. The existing manual subscription workflow targets this endpoint and immediately creates a subscription after a zero-count check, without a separate receiver-readiness check.

**Do not run the subscription-creation workflow yet.** A new subscription could receive Guesty deliveries while the receiver returns 503, triggering retries. Before creation, define a short coordinated activation window with a confirmed signing-secret retrieval/installation method, verified receiver compatibility, operational monitoring, and an approved rollback for the subscription. This is a workflow sequencing blocker, not an invitation to bypass signature verification or enable unverified processing.


## Critical two-stage activation requirement — 2026-11-01

The current signing-secret handoff script uses `wrangler versions secret put`, which creates an **undeployed** version. Successful completion does not make `GUESTY_WEBHOOK_SECRET` available to the **currently active** booking Worker. The receiver must not be enabled on the assumption that the secret is active merely because the version-only command succeeded.

A separate, explicitly authorized deployment/rollout of the reviewed version is required. Before any such rollout, independently verify the new version preserves production `BOOKING_DB`, `GUESTY_TOKEN_KV`, `BOOKING_RATE_LIMITER`, existing secrets and flags, and that `GUESTY_WEBHOOKS_ENABLED` remains disabled. After rollout, re-inspect production bindings read-only. Enabling the webhook receiver is a **different** later change, requiring a real signed-event validation plan and monitoring.

**Current unresolved coordination issue:** Guesty requires a subscription before its signing secret can be retrieved, but creating that subscription may cause deliveries while the receiver still returns 503. Do not attempt a blind subscription-then-install sequence without an explicitly approved short activation window, known retry behavior, and a verified rollback/cancellation procedure. No subscription, secret installation, or deployment is authorized by this runbook.


## Guesty support follow-up — 2026-11-01

Guesty support reports that:
- A paused/inactive subscription creation mode is **not documented or confirmed**.
- The webhook dashboard is read-only for monitoring, but clicking a subscribed endpoint URL may display its signing secret. This offers a potential manual alternative to the undocumented GET secret JSON schema. Never paste or log the signing secret into chat or GitHub.
- Non-2xx responses, including 503, are failures. The receiver should return 2xx promptly (about 15 seconds). Retry guarantees remain unclear, and prolonged failures may lead to endpoint disablement after approximately five days.
- The dashboard may permit replay of individual deliveries; do not assume this guarantees full recovery or ordering.
- Duplicate and out-of-order events must be handled safely using Svix identifiers and Guesty event metadata, and source data should be re-fetched before reconciling state.

**Security decision:** Do not change the receiver to acknowledge unauthenticated webhook payloads with 2xx merely to avoid retries. Continue fail-closed signature verification; consider only a separately reviewed secure buffering mechanism with strict bounds and no processing of unverified content.

**Activation gate remains closed:** No first subscription until a coordinated plan addresses secret retrieval, version rollout, potential failed deliveries, rollback, and explicit operator approval. The dashboard's ability to display a secret does not make it safe to transmit that secret through chat or logs.


## Guesty API support escalation — 2026-11-01

Guesty support confirmed the questions about paused/inactive subscriptions and the exact HTTP 503 retry/replay guarantees have been forwarded to the **human API support team**. No definitive answers have been supplied yet.

Confirmed documentation guidance: subscriptions are managed through Open API; the dashboard provides read-only status/delivery logs and may expose the endpoint-specific signing secret; non-2xx responses (including 503 and redirects) are failed deliveries; individual events may be replayed from the dashboard. Guesty recommends prompt 2xx acknowledgements, deduplication using `svix-id` / `meta.eventId`, and handling out-of-order updates.

Do not equate replay capability with guaranteed retention or delivery. Do not accept unauthenticated webhook payloads into trusted processing simply to return 2xx. **Activation remains blocked pending human support clarification and a reviewed receiver/secret rollout plan.**

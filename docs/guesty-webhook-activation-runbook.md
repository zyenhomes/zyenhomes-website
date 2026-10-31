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

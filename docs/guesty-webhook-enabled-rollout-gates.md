# Guesty webhook receiver activation — protected rollout gates

**PREPARATION ONLY. No production writes are implemented by this PR.**

## Current state
- Live Worker: `zyenhomes-booking-api`; last independently confirmed signing-secret version prefix `f7f21644`.
- `GUESTY_WEBHOOKS_ENABLED=false`; `BOOKING_REQUESTS_ENABLED=false`.
- Guesty messaging subscription is live, but receiver responds 503; failed deliveries require later review/replay.
- Production D1 `guesty_message_events` table exists; synthetic signature/idempotency tests passed.
- Preserve the current exact active version UUID as rollback baseline.

## Pre-activation gates (all mandatory)
1. Independently re-read the current active version UUID and its 100% traffic allocation.
2. Verify current script hash, runtime settings, binding names, exposed targets, signing-secret presence, and disabled booking flag.
3. Verify Cloudflare supports creating a **new undeployed version** by changing only the webhook flag while preserving existing secret bindings. A regular `wrangler deploy` is **not acceptable**; do not accidentally replace or remove the signing secret. Confirm CLI/API syntax and permissions against documentation and a disposable Worker before writing production.
4. Prepare a candidate with `GUESTY_WEBHOOKS_ENABLED=true`, `BOOKING_REQUESTS_ENABLED=false`; compare exact script hash and all available bindings to baseline, permitting only the intended flag change. Verify signing-secret binding remains present without reading its value.
5. Before creating any candidate, request **separate explicit user approval** for the production version-creation write.
6. Candidate creation must **not deploy** or route traffic. Identify the exact immutable candidate UUID. Never select latest implicitly.
7. Before promotion, independently verify candidate identity, disabled booking submissions, D1/KV/rate-limiter bindings, and expected active baseline. Request **another explicit user approval** to promote this candidate. Use existing protected `deploy-reviewed-guesty-version.yml` only after its preflight assumptions are updated for a deliberately enabled webhook flag.
8. Post-promotion: verify exact traffic allocation, 503 booking-submission gate, pricing regression, signature rejection for unsigned synthetic requests, and successful *authorized* signed event archival with deduplication. Do not send live test messages without separate approval.
9. If any check fails, stop. A rollback to the known-good version is a separate production write requiring explicit approval.
10. After receiver verified, review failed Guesty delivery logs and request separate approval before manual replay. Do not assume retries will recover expired events.

## Safety caveats
- Changing repository `wrangler.toml` alone does not create or activate a Worker version.
- `wrangler versions upload` or Cloudflare version APIs require independent verification of binding preservation; do not use unverified flags or mutate live settings.
- Existing production deployment workflow currently expects a previously reviewed candidate; its generic preflight was designed for a disabled receiver. Do not reuse a disabled-only preflight as evidence that an enabled candidate is safe.
- The presence of a binding is not proof its secret value is correct.

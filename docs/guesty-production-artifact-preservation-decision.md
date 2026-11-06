# Guesty webhook-enabled candidate: production artifact preservation decision

Status: **BLOCKED — no production version creation or activation authorized.**

## Established evidence
- The active production Worker version is `f7f21644-8fae-43ea-afef-38efaf3cd6ba` (recheck immediately before any future action).
- The active version had 100% traffic, required binding names, `BOOKING_REQUESTS_ENABLED=false`, and `GUESTY_WEBHOOKS_ENABLED=false` at the last read-only inspection.
- The active version's `resources.script.etag` is available through the Cloudflare version metadata API.
- The isolated test created an **undeployed** version and retained baseline binding names/types; it used **synthetic test code**, not the production executable.
- Secret values and full production build parity were **not** established.

## The blocking question
A version-only upload from the repository might rebuild the script, changing its script ETag even when the intended difference is only a plain-text flag. `keep_vars=true` and matching binding names/types are not proof that the signing secret **value** or binding **targets** are preserved. Do not rely on the isolated synthetic upload to claim production safety.

## Candidate construction requirements
1. Establish a supported, documented way to produce an **undeployed** candidate using the **exact active executable artifact**, or independently demonstrate a reproducible build that yields the same Cloudflare script ETag as the active version. If neither can be demonstrated, **stop**.
2. Before any write, re-read active deployment and version metadata and require the expected exact UUID at 100% traffic with both gates disabled.
3. Specify the full set of expected bindings and their **types and targets** (D1, KV, rate limiter, routes, and any additional bindings). Preserve the `GUESTY_WEBHOOK_SECRET` secret binding without exposing its value. Verify preservation with a supported method; **do not print secret values**.
4. Prepare an explicit candidate diff: only `GUESTY_WEBHOOKS_ENABLED: false → true`; `BOOKING_REQUESTS_ENABLED` stays `false`. Preserve runtime compatibility date and flags, or block if metadata is insufficient to verify.
5. Use a version-only upload with a protected environment and a one-time explicit approval scoped to **one undeployed production version**. The upload operation must never invoke `wrangler deploy`, `wrangler versions deploy`, or traffic promotion.
6. Immediately after any separately approved upload, verify: new version distinct from active, active remains at 100% traffic, candidate script ETag equals active, runtime metadata matches, required binding names/types/targets match, and the two flags have the intended values. Any mismatch blocks promotion.
7. Even with these checks, secret **values** may remain opaque; identify and document an independent supported preservation assurance before production upload, rather than claiming ETag/binding checks prove secret values.
8. Deployment/promotion, webhook enablement, Guesty replay, and rollback each require separate explicit approval. Booking submissions remain disabled.

## Current decision
**Do not create the candidate yet.** Resolve the exact executable-artifact and secret-preservation methods first. Do not create additional test Workers, enable paid observability, or upgrade the Cloudflare plan for this assessment.

## Existing non-mutating evidence tools
- `scripts/inspect-active-guesty-artifact-metadata-readonly.mjs`
- `scripts/compare-guesty-worker-script-etags-readonly.mjs` (requires two existing version UUIDs; not a build-parity test)
- `scripts/preflight-guesty-activation-baseline-readonly.mjs`
- `scripts/preflight-guesty-production-upload-offline.mjs`

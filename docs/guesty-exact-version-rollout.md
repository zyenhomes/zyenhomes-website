# Guesty webhook: exact-version rollout and recovery

**Status: PREPARATION ONLY — no production execution authorized.**

## Preconditions
- Guesty subscription created under separate approval, exact endpoint confirmed, signing-secret response shape validated privately.
- Secret installed into an **undeployed** version of `zyenhomes-booking-api` by separately approved handoff.
- Record exact full candidate version UUID and current active deployment UUID and traffic allocations through read-only Cloudflare inspection.
- Run `Preflight Exact Guesty Worker Version (Read Only)` against the candidate and confirm expected D1, KV, rate limiter, Guesty credentials, signing-secret binding, and both disabled flags.
- Compare **binding targets**, not merely names/types, with the current production version. Do not log secret values.
- Confirm the candidate has expected code and no booking route regression; validate health, CORS, and quotes using safe non-writing checks.
- Confirm the Cloudflare token is valid and narrowly scoped, with a rollback target and human monitoring Guesty and Cloudflare.
- Check current deployment has not changed since baseline; stop if it has.

## Proposed rollout — not implemented
A future, separately reviewed workflow should accept an exact immutable version ID and a separate approval phrase. It must **never** select latest automatically, never use `wrangler deploy` to rebuild current repository code, and never set `GUESTY_WEBHOOKS_ENABLED=true` implicitly. Confirm the documented Cloudflare CLI syntax and token permissions before implementing. Serialize with the existing `zyenhomes-booking-api-production` deployment concurrency group and use a protected production environment.

Show the operator the exact candidate and previous active version IDs, binding comparison, and rollout plan before requesting explicit authorization. After approved rollout, inspect live version/traffic allocation and bindings; test booking health, CORS, and quote behavior. Keep the webhook receiver disabled until separately authorized authenticated-delivery activation.

## Failure and recovery
If the candidate is missing any required binding, flags differ, secret format is unknown, or current active version changed unexpectedly, **stop** without deploying.

If deployment causes a regression, pause further actions, identify the exact previous known-good version and its current availability, and request explicit approval before rollback. Rollback is a separate production write, not an automatic side effect of a failed health check. Record any failed Guesty deliveries for possible individual replay; Guesty does not guarantee complete replay retention.

**Do not create the first subscription merely because this runbook exists.** The secret format, live rollout workflow, and event recovery process remain activation gates.

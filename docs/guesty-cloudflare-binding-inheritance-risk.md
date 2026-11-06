# Cloudflare Worker version inheritance: production Guesty risk assessment

Status: **RESEARCH ONLY / BLOCKED.** No version upload or production change is authorized.

## Verified official API behavior
Source: https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/

- `POST /accounts/{account_id}/workers/scripts/{script_name}/versions` uploads a Worker version **without deploying it**.
- A version upload requires Worker script module content; this endpoint is **not** a documented configuration-only clone of an existing deployed executable.
- `bindings_inherit=strict` causes unresolved inherited bindings to fail rather than silently disappear (error 10057).
- Critically, for this **script-version endpoint**, inherited bindings resolve from the **latest uploaded** version. An explicit version UUID is **not supported** for inheritance on this endpoint. The latest uploaded version may differ from the active deployed version.
- The separate `/workers/workers/{worker_id}/versions` endpoint family supports explicit inheritance version IDs, but its applicability to this Worker and preservation of exact script bytes must be independently established before use.

## Consequences for Zyen Homes
- Before any production upload, inspect both the active deployment version **and the latest uploaded version**. If they differ, **stop** until an explicit, safe inheritance strategy is verified.
- `keep_vars=true` alone is insufficient evidence of preservation of the Guesty signing-secret **value** or every binding target.
- The earlier isolated test with synthetic code does not demonstrate production code parity.
- The active production version exposes `resources.script.etag`, but this is only a fingerprint for comparing two **existing** versions. It does not clone script bytes or prove that a rebuild will be identical.
- The production script-version upload must not be attempted solely on the basis of matching binding names/types.

## Required read-only next investigation
1. GET deployments and versions, identify active and latest uploaded version IDs, and compare them without logging secrets.
2. Check which read-only metadata is exposed for secret bindings and binding target IDs; never print sensitive values.
3. Determine whether the currently deployed script can be safely obtained or reproduced **without changing production**; if not, block candidate creation.
4. Only after resolving the code and secret questions, propose a separately approved version-only upload. Keep `BOOKING_REQUESTS_ENABLED=false`.
5. Any upload, promotion, replay, or rollback requires its own explicit approval.

## Explicit non-goals
No API POST, PUT, PATCH, or DELETE; no Wrangler upload/deploy; no observability or plan upgrade; no Guesty replay.

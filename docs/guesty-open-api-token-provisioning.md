# Guesty Open API OAuth token provisioning — security design (NO LIVE ACTION)

Status: DRAFT. This document neither requests a token nor writes GitHub secrets or Cloudflare versions.

## Verified constraints

- Guesty support reports **5 POST /oauth2/token requests per client_id in a 24-hour window**, including unsuccessful requests; access tokens live approximately 24 hours.
- The Booking Engine OAuth token cached by `cloudflare/worker.js` uses a different endpoint/scope and MUST NOT be reused for the Open API.
- The installation workflow on `main` accepts an optional protected `GUESTY_OPEN_API_ACCESS_TOKEN` and `GUESTY_OPEN_API_TOKEN_EXPIRES_AT` (Unix milliseconds) pair, but it **does not mint or persist** a token. Without the pair it still performs OAuth.
- The Guesty subscription already exists and the receiver is disabled; some events have failed with 503. Preserve dashboard records for later replay.

## Secure provisioning design, before implementation

1. Establish the reset window with Guesty support or rate-limit response metadata; never infer that midnight or the general Open API quota equals OAuth quota. Stop all redundant OAuth diagnostics.
2. Choose a single approved operator workflow that performs **at most one** tokenization request after reset, not one per diagnostic. Do not automatically retry tokenization on 429; record only status and non-sensitive rate-limit counts. If 429, stop.
3. Reuse the token **within the same protected job** to confirm the exact subscription and retrieve the `key`-field Svix secret. Prefer a one-shot, approved, memory-only handoff to `wrangler versions secret put` rather than printing or exporting the token to artifacts. This avoids needing a long-lived token stored in GitHub at all for the activation.
4. If cross-workflow reuse is genuinely required, design a protected encrypted-at-rest token store and rotation flow separately. Never place tokens in workflow inputs, plaintext GitHub variables, PRs, artifacts, job summaries, or chat. GitHub encrypted secret updates require an explicitly reviewed, authorized write mechanism; merely declaring a secret in a workflow does not provision it.
5. Validate expiry from the actual token response (`expires_in` or verified JWT claims) and use a safety margin. Do not assume the response always uses a particular expiry format.
6. Protect token creation, secret handoff, and Cloudflare version creation with **distinct human approvals**. A combined workflow cannot interpret approval for token minting as approval for installing the signing secret. Use separate protected jobs or stop between actions.
7. Do not deploy or enable the receiver during token provisioning. After an approved secret-version installation, inspect exact version ID and all bindings, then request separate rollout approval.
8. Check Guesty dashboard failed delivery history periodically; manual replay only after authenticated receiver is enabled and verified. Automatic retries are limited.

## Open issues / no-go

- No OAuth reset timestamp confirmed.
- No secure cross-workflow token store implemented.
- No approved one-shot token-and-secret handoff workflow implemented.
- Current installer can still request OAuth if protected cached-token values are absent. **Do not dispatch it until the quota and approval conditions are verified.**
- No production secret installation or deployment authorized by this design document.

## Proposed implementation acceptance criteria

- Offline tests prove no OAuth call when a valid token is supplied; invalid/expired tokens fail closed without fallback; a fresh-token path never loops on 429.
- No token, signing secret, response body, or sensitive header appears in stdout, stderr, artifacts, or workflow inputs.
- Distinct authorization is enforced for Guesty token creation, Cloudflare version creation, and deployment.
- Version-only installation must leave the active Worker unchanged and all booking bindings preserved.

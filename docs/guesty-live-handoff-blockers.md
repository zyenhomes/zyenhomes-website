# Guesty webhook activation: unresolved live dependencies

Status: NOT AUTHORIZED FOR EXECUTION.

1. The Guesty GET /v1/webhooks-v2/secret documentation shows an empty example (`{}`). The response field name has **not** been established. The draft handoff script currently accepts only a single top-level `secret` field and will stop without writing to Cloudflare if Guesty returns another shape.
2. The endpoint secret may only be available after the webhook subscription exists. Therefore creating the subscription and installing the secret must be a single coordinated activation window. Guesty may retry deliveries while the receiver is disabled. Never blindly retry subscription POST; inspect GET /v1/webhooks first.
3. The current draft uses `wrangler secret put`. The repository has `keep_vars = true` and expected binding declarations, but offline checks and GET inspection do **not** establish that the command will preserve the actual live Worker bindings. Verify the CLI behavior in an isolated Worker before authorizing production use. After any installation, compare production bindings and disabled flags using the read-only inspection workflow.
4. The GitHub workflow's `npm install --no-save wrangler@4` and relative executable path must be checked together; a successful static check alone is insufficient.
5. A successful handoff must never log the signing secret, access token, guest data, raw response body, or Cloudflare Worker configuration values. A generic error category is enough.
6. Keep `GUESTY_WEBHOOKS_ENABLED=false` until the exact signing secret is installed, bindings are verified, and a signed test event is accepted.
7. GitHub environment `guesty-webhook-activation` has a five-minute timer but no independent reviewer. Treat the confirmation phrase as the final operator authorization, not a substitute for separate approval.
8. The temporary Cloudflare token expires after seven days; verify it is active at execution time and revoke it when activation is complete.

Do not merge or execute the draft installation workflow based solely on passing offline checks. Next engineering step: validate Wrangler secret-put behavior in a disposable Worker and establish a safe, private way to recognize the actual Guesty response structure during the coordinated activation window.


## Guesty Support clarification — 2026-10-31

Guesty support confirmed that this integration has **no webhook subscriptions yet**, so there is **no signing secret to retrieve**. The first subscription must be created before attempting GET /v1/webhooks-v2/secret. Guesty confirmed a unique signing key per subscribed endpoint, but **did not confirm** the JSON response schema or a `whsec_` prefix.

Consequences:
- The handoff script's single-field `secret` and `whsec_` assumptions are unverified. Do **not** loosen the parser to accept arbitrary data, and do **not** execute the installation workflow yet.
- First verify the isolated receiver, endpoint URL, event allowlist, webhook signature algorithm, and safe secret installation procedure. Preserve disabled processing.
- During an explicitly approved activation window, create exactly one subscription using the existing guarded workflow, check subscription existence before any retry, and use the redacted shape diagnostic to determine the returned secret schema without exposing the value.
- Only after independent confirmation of the schema and signature format should the handoff parser be updated, tested with synthetic fixtures, and used to install the endpoint-specific secret.
- Verify existing Worker bindings and flags after secret installation, then test a signed delivery before considering live processing.

No subscription, secret retrieval, or production Worker write is authorized by this documentation update.


## PR #71 subscription workflow preflight review

The merged subscription workflow is **manual-only** and checks that GET /v1/webhooks returns an empty array before making a single POST. Its implementation currently assumes:
- GET /v1/webhooks responds as a top-level array.
- POST /v1/webhooks accepts the chosen `url` and `events` payload and returns exactly HTTP 201.
- `reservation.messageReceived` and `reservation.messageSent` are valid subscription event identifiers.
- The subscription target is the existing booking Worker, whose webhook receiver remains disabled.

These assumptions must be confirmed against Guesty's actual API documentation or a safe read-only preflight. A non-201 result is **not** proof that creation failed; check the subscription list before any retry.

**Activation gate:** Do not dispatch PR #71's manual workflow until the secret-response discovery procedure, secure installation method, receiver signature compatibility, production binding preservation, and rollback plan have been reviewed and explicitly approved. The new support reply does not by itself authorize the POST.

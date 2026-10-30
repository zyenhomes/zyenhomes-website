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

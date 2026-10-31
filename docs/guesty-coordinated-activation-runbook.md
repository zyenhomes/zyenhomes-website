# Guesty message webhook — coordinated activation runbook (NOT YET AUTHORIZED)

## Verified baseline
- Guesty Open API OAuth: HTTP 200; webhook list initially zero.
- Guesty GET /v1/webhooks-v2/secret for exact receiver URL: HTTP 404 before subscription exists. This is consistent with no endpoint secret, but does not establish the precise reason.
- Cloudflare production Worker: `zyenhomes-booking-api`, `GUESTY_WEBHOOKS_ENABLED=false`, `BOOKING_REQUESTS_ENABLED=false`.
- Required production bindings: `BOOKING_DB`, `GUESTY_TOKEN_KV`, `BOOKING_RATE_LIMITER`; existing `GUESTY_CLIENT_ID` and `GUESTY_CLIENT_SECRET`.
- Isolated Worker test: `wrangler secret put` preserved one dummy variable and existing dummy secret. D1/KV/rate-limiter preservation not tested.
- PR #74 signing-secret handoff remains a draft. Its parser assumes a single top-level `secret` key; the actual Guesty response schema is **unknown**.

## Before activation
1. Have a tested and approved signing-secret handoff capable of recognizing the actual Guesty response **without logging values**. Current PR #74 is NOT ready for execution until that is resolved.
2. Verify the Cloudflare temporary API token is active and its seven-day expiry has not elapsed.
3. Confirm the production Worker settings remain disabled and required bindings are present using the read-only inspection.
4. Confirm webhook subscription count is zero immediately before creation. If not zero, stop and inspect existing subscriptions without logging URLs or private data.
5. Arrange a short supervised activation window. Guesty may attempt deliveries as soon as a subscription is created; the disabled receiver returns 503.
6. Explicitly approve the write operation. Do not infer authorization from merging a PR or passing a read-only check.

## Coordinated sequence (operator supervised)
1. Execute a **single** approved Guesty subscription creation attempt for the exact URL and events `reservation.messageReceived` and `reservation.messageSent`.
2. Immediately inspect GET /v1/webhooks to confirm one subscription. If POST times out or result is uncertain, **do not blindly retry**.
3. Call GET /v1/webhooks-v2/secret for the exact URL. Parse the response in memory, do not log secret values or raw body. If response shape is unrecognized, stop; keep receiver disabled and resolve safely.
4. Install the retrieved secret as `GUESTY_WEBHOOK_SECRET` with a verified scoped Cloudflare method. Preserve existing bindings and variables. Never commit the secret to source code or expose it in Actions logs.
5. Read back production Worker settings metadata (not secret values) and confirm existing D1, KV, rate limiter, credentials, and disabled flags remain intact.
6. Enable `GUESTY_WEBHOOKS_ENABLED=true` **only** after signing secret installation and verification, under a separate explicit approval.
7. Send controlled inbound and outbound Guesty messages. Confirm valid Svix signatures, one D1 record per event, duplicate handling, and no unexpected guest-data logging.
8. Disable the receiver immediately if signature verification or D1 writes fail; inspect logs without dumping message payloads.
9. Revoke the temporary Cloudflare API token when activation is finished. Configure Gmail delivery separately with explicit authorization.

## Failure states
- Guesty 404 before subscription: do not assume response schema; do not retry token issuance needlessly.
- Subscription created but signing-secret retrieval fails: leave receiver disabled; keep subscription ID for investigation, no duplicate POST.
- Cloudflare secret installation uncertain: leave receiver disabled; inspect binding metadata before any retry.
- Unexpected binding changes: stop and restore production configuration using the approved rollback procedure.
- A successful GitHub workflow alone does not prove message delivery or archiving.

**Do not run PR #71 or merge/execute PR #74 until the actual response schema and secure handoff are established.**

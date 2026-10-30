# Guesty messaging subscription activation plan

## Target
- Endpoint: `https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev/api/webhooks/guesty/messages`
- Events: `reservation.messageReceived`, `reservation.messageSent`
- Existing subscriptions verified: 0 (read-only Open API test).
- Existing receiver: requires a Svix signing secret (`whsec_`), D1 binding and `GUESTY_WEBHOOKS_ENABLED=true`.

## Pre-activation gates
1. Confirm the production D1 archive migration is applied, the table exists, and booking submissions remain disabled.
2. Confirm production receiver remains disabled and its signature verification tests pass.
3. Verify Guesty subscription creation and secret retrieval use the same exact destination URL.
4. Prepare a secure method to transfer the per-endpoint Guesty signing secret into the Cloudflare Worker as `GUESTY_WEBHOOK_SECRET` without exposing it in GitHub logs, issues, or chat. Do not put it in a repository file.
5. Arrange a short activation window. Guesty may send events immediately after subscription creation; disabled receiver returns 503 and Guesty retries. Avoid creating the subscription before the signing-secret transfer path is ready.
6. Use an explicitly approved workflow to create the subscription once, guard against duplicates using GET /v1/webhooks, retrieve the signing secret, and configure Cloudflare. Treat a partial failure as requiring manual recovery; never blindly retry POST.
7. After enabling the receiver, send one controlled Guesty test message, verify signature validation and exactly one archived D1 row; confirm incoming and outgoing event handling.
8. Add Gmail archiving separately with authorization and privacy controls; D1 archiving alone does not send email.

## Restrictions
- No subscription creation, secret retrieval, Cloudflare writes, Worker deployments, or booking API changes in this PR.
- Never print OAuth access tokens, client secrets, Svix secrets, guest message bodies or guest identifiers.
- No automatic activation on merge.

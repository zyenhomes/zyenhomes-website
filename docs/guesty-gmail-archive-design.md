# Zyen Homes — Guesty-first messaging with Gmail archive

## Approved operating model
- Guesty Inbox is the **only guest-facing reply interface**, including direct bookings after Guesty conversation integration is verified.
- `info@zyenhomes.com` receives **archival copies** of every incoming guest message and outgoing Guesty team reply.
- Gmail copies are organized in threads by Guesty conversation/reservation, with clear `ARCHIVE — REPLY IN GUESTY` subject labeling.
- No daily or checkout summaries.
- D1 retains every deduplicated Guesty event as the primary message archive.

## Current reality
- D1 `guesty_message_events` exists; webhook receiver is deployed but disabled.
- Live Guesty subscription and signing secret are not configured.
- No Gmail sending integration has been configured or authorized.
- Direct website inquiries are not yet verified to create a Guesty Inbox conversation.

## Implementation sequence (no live writes in this PR)
1. Select an authorized outbound email delivery method (Google Workspace/Gmail API or an approved transactional provider). Verify sender identity, permissions and mailbox policy. **Do not use a personal password or app password in source code.**
2. Store delivery configuration in encrypted Cloudflare secrets, separate from Booking Engine credentials.
3. Build an asynchronous archive-delivery worker/queue. Webhook processing should acknowledge successfully persisted D1 events promptly; Gmail delivery must not block webhook responses.
4. Add a separate delivery ledger keyed by `svix_id` or stable `guesty_event_id`, with state `pending`, `sending`, `sent`, `retry`, `failed`, attempt count, provider message ID, and timestamps. D1 `archive_status` alone is insufficient for robust retries and idempotency.
5. Render safe email copies: property and reservation references, message direction, timestamp, sender role, and message body where appropriate. Escape HTML and sanitize potentially sensitive content. Preserve originals in D1.
6. Use consistent subject and RFC message threading headers if the provider supports them. Do not assume Gmail will thread separate emails solely because subjects match.
7. Add rate limiting, bounded retries with backoff, error visibility without guest content in logs, and duplicate-send recovery.
8. Test with synthetic conversations only, then authorize one real guest conversation end-to-end. Ensure the archive email is never routed back into Guesty to avoid loops.
9. For direct website inquiries, separately validate Guesty-supported inquiry/conversation creation before claiming all direct-booking messages appear in Guesty.

## Data protection and operational safeguards
- Restrict Gmail archive access to authorized team members and establish retention/access policies.
- Avoid placing unnecessary guest personal information in email subjects or operational logs.
- Gmail archive is a record copy, **not** a guest reply channel.
- Never mark an email delivered before the provider confirms acceptance. Email acceptance is not proof of recipient inbox placement.
- Keep `GUESTY_WEBHOOKS_ENABLED=false` until signing-secret compatibility is confirmed and controlled activation is approved.

This is a design-only PR. No new migrations, Gmail OAuth authorization, email sends, Guesty subscriptions, or production Worker changes.

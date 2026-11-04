# PR #80 — Production integration blockers

Status: **NOT READY TO MERGE OR DEPLOY**. This is a factual review of the current draft implementation.

## Confirmed in code
- `gmail-archive-oauth/worker.js` currently returns 503 for the Gmail OAuth routes and 404 for all other routes.
- `gmail-archive-oauth/wrangler.toml` contains `GMAIL_ARCHIVE_ENABLED = "false"`; no D1 binding or distributed rate limiter binding is configured.
- OAuth state/PKCE, Google token exchange, JWT/JWKS checks, admin login, CSRF, encrypted token storage and D1 adapters exist as **separate testable helpers**, not as a functioning Worker.
- The tested administrator start handler uses `/admin/google/start` and callback `/admin/google/callback`, but neither is routed by the Worker.
- The Gmail archive callback is `/oauth/google/callback`, and no live Google redirect URI has been registered.

## Must resolve before live testing
1. Implement the trusted Worker route dispatcher and explicitly enable only reviewed endpoints. Keep the current fail-closed behavior until then.
2. Design and test a CSRF bootstrap that allows the browser to submit a token while keeping session credentials HttpOnly. The current `__Host-zyen_login_csrf` cookie is HttpOnly, so a normal browser script cannot read its value to populate the `X-Zyen-CSRF` header. A safe separate issuance/transport mechanism is needed.
3. Implement atomic and expiring login-state storage in the **dedicated** Gmail D1 database, including nonce and encrypted PKCE verifier, with hashed state keys and replay protection.
4. Add dedicated D1 and distributed rate-limiter bindings in the standalone Worker configuration; test real binding semantics in isolation. Do not reuse the booking Worker bindings.
5. Ensure administrator identity verification uses a distinct Google OAuth client audience where appropriate; verify issuer, audience, nonce, expiry, signature and allowed email. Ensure consent for the archive mailbox remains a separate flow.
6. Implement the actual administrator session creation, cookie issuance, revocation, CSRF validation and login callback using the tested D1 adapter.
7. Implement mailbox OAuth callback with encrypted refresh-token persistence and Google JWKS verification; reject mismatched mailbox identity.
8. Configure exact Google redirect URIs **only after** a working, secured callback is deployed and its hostname is known. Never place Google OAuth client secrets or refresh tokens in GitHub source or logs.
9. Verify `gmail.insert` restricted-scope requirements for the internal Workspace app, and confirm the account has authority to authorize `info@zyenhomes.com`.
10. Add synthetic end-to-end integration tests and independent security review. The isolated Worker should remain disabled until explicitly approved.
11. Separately implement Gmail message insertion, threading/deduplication, delivery retry ledger and Guesty webhook activation; none is live yet.

## Safety
- No Google OAuth credentials or Cloudflare tokens should be entered into PR #80.
- Do not merge or deploy PR #80 based solely on the current green offline tests.
- Avoid Cloudflare Zero Trust activation or any new billing authorization.
- Keep Guesty webhook processing disabled pending Guesty API clarification.

# Gmail archive administrator authentication without Cloudflare Zero Trust

Status: DESIGN ONLY — no live authentication, billing authorization, or deployment.

## Separation of privileges
1. **Administrator sign-in**: Google OpenID Connect with only `openid email`. Verify Google ID token cryptographically against trusted Google keys, the exact admin-login OAuth client audience, issuer, expiry, one-time nonce, and `email_verified=true`. Allow only `admin@zyenhomes.com` (subject to owner confirmation). Do not use an email query parameter or unverified request header as proof of identity.
2. **Protected archive authorization**: After administrator sign-in, issue a short-lived, HttpOnly, Secure, SameSite=Lax server session. Bind a separate one-time OAuth state/nonce/PKCE session to the authenticated administrator. Use CSRF protection on state-changing routes. Only then start consent for `info@zyenhomes.com` with `openid email https://www.googleapis.com/auth/gmail.insert`.
3. **Mailbox verification**: Independently verify the mailbox authorization ID token's signature, audience, nonce, expiry, verified email, and subject. Require `info@zyenhomes.com`. Never treat the administrator identity as the archive mailbox identity.
4. **Token storage**: Encrypt the refresh token before saving to a dedicated D1 database. Encryption key and OAuth client secret must be Cloudflare encrypted secrets. Do not log authorization codes, access tokens, refresh tokens, message bodies, or raw identity tokens.
5. **Disable by default**: The standalone Worker continues returning HTTP 503 for all OAuth paths until the complete session, administrator gate, callback and encrypted storage adapters have passed integration tests and are explicitly approved.

## Important design constraints
- A Google login does not itself protect the start route: the route must validate a previously established authenticated server session and CSRF token.
- The callback is reached from Google, so validate its one-time state/nonce/session binding rather than requiring the browser to repeat a fresh admin login.
- Do not expose an unauthenticated endpoint that initiates Gmail consent, even if the target mailbox is fixed.
- `gmail.insert` is a restricted Gmail scope. Internal Google Workspace app status can affect verification requirements, but must be confirmed for this account before production use.
- Cloudflare Workers and D1 may have usage limits under the existing plan. This design avoids **new billing authorization**, not necessarily all usage charges.
- No need to activate Cloudflare Zero Trust or provide billing details.
- Google OAuth callback and Gmail delivery remain **not implemented** in the current Worker. The existing OAuth helpers are offline-tested pieces, not a complete secure login system.

## Next engineering milestones
1. Implement separate admin-login OAuth session with minimal identity scopes and atomic state consumption.
2. Add server-side session cookie, expiration, CSRF and admin identity checks.
3. Bind archive OAuth initiation to authenticated admin session; verify callback linkage.
4. Integrate live D1 adapters, trusted Google ID-token verification, and encryption-key management.
5. Test all routes offline and in an isolated Worker with synthetic credentials before entering real Google OAuth secrets.

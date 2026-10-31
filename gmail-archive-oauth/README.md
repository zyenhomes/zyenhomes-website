# Zyen Homes Gmail Archive OAuth — draft only

This is a **separate, undeployed** Cloudflare Worker scaffold. It does not affect `zyenhomes-booking-api`.

- Intended callback path: `/oauth/google/callback`.
- Do not register a redirect URI until the final Worker URL is known and the OAuth callback has been implemented and tested.
- The current endpoint returns HTTP 503 and **does not** exchange authorization codes, request tokens, or access Gmail.
- Future implementation must use authorization-code flow, exact redirect URI matching, PKCE where applicable, cryptographically random state tied to a short-lived server-side session, one-time state consumption, encrypted token storage, and strict account allowlisting for `info@zyenhomes.com`.
- Only `https://www.googleapis.com/auth/gmail.insert` is requested; do not add read/delete scopes. This scope is restricted and may require further organizational review or verification.
- No OAuth client secret, refresh token, service account key, or guest content belongs in the repository or GitHub logs.
- Do not confuse Google Workspace's admin account with the mailbox that must authorize Gmail access.
- Do not deploy, enable, or authorize until the design is reviewed. The production Gmail archive and Guesty webhook remain inactive.

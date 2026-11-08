// Single-file authentication-only test Worker for Cloudflare dashboard installation.
// Only install on zyenhomes-guesty-auth-test-isolated2, never zyenhomes-booking-api.
// Both gates must remain false until separate approval for a single live token check.
const TOKEN_URL = "https://open-api.guesty.com/oauth2/token";
const respond = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});
async function sameSecret(expected, supplied) {
  if (typeof expected !== "string" || expected.length < 32 ||
      typeof supplied !== "string" || supplied.length !== expected.length) return false;
  const enc = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
    crypto.subtle.digest("SHA-256", enc.encode(supplied))
  ]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/internal/auth-check" || request.method !== "POST")
      return respond({ success: false, reason: "not_found" }, 404);
    if (env?.GUESTY_OPEN_API_AUTH_ENABLED !== "true" ||
        env?.GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED !== "true")
      return respond({ success: false, reason: "disabled" }, 503);
    if (!(await sameSecret(env?.GUESTY_AUTH_TEST_ADMIN_TOKEN,
      request.headers.get("X-Zyen-Auth-Test-Key"))))
      return respond({ success: false, reason: "unauthorized" }, 401);
    const id = env?.GUESTY_OPEN_API_CLIENT_ID;
    const secret = env?.GUESTY_OPEN_API_CLIENT_SECRET;
    if (typeof id !== "string" || !id || typeof secret !== "string" || !secret)
      return respond({ success: false, reason: "missing_open_api_credentials" }, 502);
    let response;
    try {
      response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "client_credentials", client_id: id, client_secret: secret
        }).toString()
      });
    } catch {
      return respond({ success: false, reason: "transport_error" }, 502);
    }
    if (!response.ok)
      return respond({ success: false, reason: "authentication_rejected", httpStatus: response.status }, 502);
    let token;
    try { token = await response.json(); } catch {
      return respond({ success: false, reason: "invalid_token_response" }, 502);
    }
    if (typeof token?.access_token !== "string" || !token.access_token.trim() ||
        !Number.isFinite(token.expires_in) || token.expires_in <= 300)
      return respond({ success: false, reason: "invalid_token_response" }, 502);
    return respond({
      success: true, api: "guesty_open_api",
      message: "Authentication succeeded; inquiry write permission not verified"
    });
  }
};

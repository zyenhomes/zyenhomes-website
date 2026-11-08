// Dedicated, undeployed Guesty authentication-only test Worker.
// No import of production booking routes or Guesty inquiry submission.
// A successful token exchange does NOT establish permission to create inquiries.
import { diagnoseGuestyOpenApiAuth } from "../../cloudflare/guesty-open-api-auth-diagnostic.js";

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== "/internal/auth-check" || request.method !== "POST")
      return json({ success: false, reason: "not_found" }, 404);

    // Two independently controlled gates, both disabled by default.
    if (env?.GUESTY_OPEN_API_AUTH_ENABLED !== "true" ||
        env?.GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED !== "true")
      return json({ success: false, reason: "disabled" }, 503);

    // A strong separate admin token must be provisioned as a secret before any deployment.
    // Compare hashes in constant-time style using WebCrypto, not direct token string equality.
    const expected = env?.GUESTY_AUTH_TEST_ADMIN_TOKEN;
    const supplied = request.headers.get("X-Zyen-Auth-Test-Key");
    if (typeof expected !== "string" || expected.length < 32 ||
        typeof supplied !== "string" || supplied.length !== expected.length)
      return json({ success: false, reason: "unauthorized" }, 401);
    const encoder = new TextEncoder();
    const [a,b] = await Promise.all([
      crypto.subtle.digest("SHA-256", encoder.encode(expected)),
      crypto.subtle.digest("SHA-256", encoder.encode(supplied))
    ]);
    const aa = new Uint8Array(a), bb = new Uint8Array(b);
    let diff = 0;
    for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
    if (diff !== 0) return json({ success: false, reason: "unauthorized" }, 401);

    // The only external request is an OAuth token exchange; token is never returned.
    const result = await diagnoseGuestyOpenApiAuth({ env, transport: fetch });
    return json(result, result.success ? 200 : 502);
  }
};

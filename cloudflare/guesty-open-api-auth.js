// Separate Guesty Open API OAuth helper. NOT imported by production worker.js.
// The transport is injected; no token is fetched unless a future caller explicitly invokes it.
// Open API credentials are distinct from Booking Engine credentials and token cache.
export const OPEN_API_TOKEN_ENDPOINT = "https://open-api.guesty.com/oauth2/token";

export async function requestGuestyOpenApiToken({ env, transport, now = Date.now() } = {}) {
  if (env?.GUESTY_OPEN_API_AUTH_ENABLED !== "true")
    return Object.freeze({ ok: false, reason: "disabled" });
  const clientId = env?.GUESTY_OPEN_API_CLIENT_ID;
  const clientSecret = env?.GUESTY_OPEN_API_CLIENT_SECRET;
  if (typeof clientId !== "string" || !clientId.trim() ||
      typeof clientSecret !== "string" || !clientSecret.trim())
    return Object.freeze({ ok: false, reason: "missing_open_api_credentials" });
  if (typeof transport !== "function")
    return Object.freeze({ ok: false, reason: "missing_transport" });
  let response;
  try {
    response = await transport(OPEN_API_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials", scope: "open-api", client_id: clientId, client_secret: clientSecret
      }).toString()
    });
  } catch {
    return Object.freeze({ ok: false, reason: "transport_error" });
  }
  if (!response?.ok)
    return Object.freeze({ ok: false, reason: "authentication_rejected", status: response?.status ?? null });
  let body;
  try { body = await response.json(); } catch {
    return Object.freeze({ ok: false, reason: "invalid_token_response" });
  }
  if (typeof body?.access_token !== "string" || !body.access_token.trim())
    return Object.freeze({ ok: false, reason: "missing_access_token" });
  if (!Number.isFinite(body.expires_in) || body.expires_in <= 300)
    return Object.freeze({ ok: false, reason: "invalid_token_lifetime" });
  // Keep Open API token separate from the existing booking_engine token.
  return Object.freeze({
    ok: true, accessToken: body.access_token,
    expiresAt: now + (body.expires_in - 300) * 1000,
    api: "guesty_open_api"
  });
}

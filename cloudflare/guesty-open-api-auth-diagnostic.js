// Read-only Guesty Open API authentication diagnostic.
// NOT imported by the production Worker. No inquiry/reservation writes.
// Does not return credentials, tokens, client IDs or response bodies.
import { requestGuestyOpenApiToken } from "./guesty-open-api-auth.js";

export async function diagnoseGuestyOpenApiAuth({ env, transport } = {}) {
  if (env?.GUESTY_OPEN_API_AUTH_DIAGNOSTIC_ENABLED !== "true") {
    return Object.freeze({ success: false, reason: "diagnostic_disabled" });
  }
  // The auth helper requires its own opt-in gate; neither gate authorizes inquiry writes.
  const result = await requestGuestyOpenApiToken({ env, transport });
  if (!result.ok) {
    return Object.freeze({
      success: false,
      reason: result.reason,
      ...(Number.isInteger(result.status) ? { httpStatus: result.status } : {})
    });
  }
  return Object.freeze({
    success: true,
    api: "guesty_open_api",
    message: "Authentication succeeded; inquiry write permission not verified"
  });
}

// A future deployment must separately approve a secure admin-only invocation
// and ensure this diagnostic is not exposed as an unauthenticated public endpoint.

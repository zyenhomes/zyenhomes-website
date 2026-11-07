// Production-capable transport adapter, intentionally NOT imported by worker.js.
// No route, schedule, or production invocation exists. Default is fail-closed.
// Must not be activated without separately approved Guesty permissions and end-to-end test.
import { buildGuestyInquiryRequest, GUESTY_INQUIRY_ENDPOINT } from "../scripts/build-guesty-inquiry-request-offline.mjs";
import { classifyGuestyInquiryResponse } from "../scripts/guesty-inquiry-submission-adapter-offline.mjs";

export async function submitGuestyInquiry({ input, token, env, transport } = {}) {
  // Never rely on user-provided body flags to enable external writes.
  if (env?.GUESTY_INQUIRY_WRITES_ENABLED !== "true")
    return Object.freeze({ state: "disabled", retryAutomatically: false });
  if (env?.GUESTY_INQUIRY_WRITE_PERMISSION_VERIFIED !== "true")
    return Object.freeze({ state: "permission_unverified", retryAutomatically: false });
  if (env?.GUESTY_INQUIRY_RECONCILIATION_READY !== "true")
    return Object.freeze({ state: "reconciliation_unverified", retryAutomatically: false });
  if (typeof token !== "string" || !token.trim() || typeof transport !== "function")
    return Object.freeze({ state: "configuration_error", retryAutomatically: false });

  // The calling orchestration must independently verify quote provenance,
  // atomic claim ownership, and that no prior write has an uncertain outcome.
  const body = buildGuestyInquiryRequest(input);
  let response;
  try {
    response = await transport(GUESTY_INQUIRY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch {
    return Object.freeze({ state: "uncertain", retryAutomatically: false });
  }
  let payload = null;
  try { payload = await response.json(); } catch { /* unknown response body */ }
  return classifyGuestyInquiryResponse({ status: response?.status, body: payload });
}

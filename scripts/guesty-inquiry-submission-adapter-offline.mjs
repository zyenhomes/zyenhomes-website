// Isolated Guesty inquiry submission contract. NOT imported by production Worker.
// This module accepts an injected transport for offline simulation ONLY.
// It deliberately never calls fetch, never receives a credential, and never authorizes a live write.
import { buildGuestyInquiryRequest, GUESTY_INQUIRY_ENDPOINT } from "./build-guesty-inquiry-request-offline.mjs";

export function prepareGuestyInquiry(input) {
  const payload = buildGuestyInquiryRequest(input);
  return Object.freeze({
    endpoint: GUESTY_INQUIRY_ENDPOINT,
    method: "POST",
    payload: Object.freeze(payload),
    productionEnabled: false
  });
}

export function classifyGuestyInquiryResponse({ status, body, transportError } = {}) {
  // A timeout, network disconnect, or 5xx could mean Guesty accepted the write.
  if (transportError || !Number.isInteger(status) || status >= 500)
    return Object.freeze({ state: "uncertain", retryAutomatically: false, reference: null });
  if (status >= 200 && status < 300) {
    const id = body?._id ?? body?.reservation?._id ?? body?.reservationId;
    if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id))
      return Object.freeze({ state: "needs_verification", retryAutomatically: false, reference: id });
    return Object.freeze({ state: "uncertain", retryAutomatically: false, reference: null });
  }
  // No response code alone proves a request was not accepted. Never retry automatically.
  return Object.freeze({ state: "manual_review", retryAutomatically: false, reference: null });
}

export async function simulateGuestyInquirySubmission(input, simulatedTransport) {
  if (typeof simulatedTransport !== "function") throw Error("Offline simulated transport required");
  const prepared = prepareGuestyInquiry(input);
  let response;
  try {
    response = await simulatedTransport({
      endpoint: prepared.endpoint,
      method: prepared.method,
      body: structuredClone(prepared.payload)
    });
  } catch {
    return classifyGuestyInquiryResponse({ transportError: true });
  }
  return classifyGuestyInquiryResponse(response);
}

// No exported function performs real HTTP. Production integration requires separate approval,
// API permission checks, quote provenance, claim reconciliation and a production-specific adapter.

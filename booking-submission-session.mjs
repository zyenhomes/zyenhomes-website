// Browser-only request key lifecycle. This file makes no network requests.
export function createBookingSubmissionKey(cryptoApi = globalThis.crypto) {
  if (!cryptoApi || typeof cryptoApi.randomUUID !== "function")
    throw new Error("Secure random UUID is unavailable");
  return cryptoApi.randomUUID();
}
export function createBookingSubmissionSession(cryptoApi = globalThis.crypto) {
  let key = null;
  let fingerprint = null;
  return {
    keyFor(fingerprintValue) {
      if (typeof fingerprintValue !== "string" || !/^[a-f0-9]{64}$/i.test(fingerprintValue))
        throw new Error("Invalid submission fingerprint");
      const normalized = fingerprintValue.toLowerCase();
      if (fingerprint !== normalized) {
        key = createBookingSubmissionKey(cryptoApi);
        fingerprint = normalized;
      }
      return key;
    },
    reset() { key = null; fingerprint = null; }
  };
}

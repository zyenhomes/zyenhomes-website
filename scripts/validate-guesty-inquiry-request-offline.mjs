import assert from "node:assert/strict";
import { buildGuestyInquiryRequest, GUESTY_INQUIRY_ENDPOINT } from "./build-guesty-inquiry-request-offline.mjs";

assert.equal(GUESTY_INQUIRY_ENDPOINT, "https://open-api.guesty.com/v1/reservations-v3/quote");
const valid = {
  quoteId: "6adb5d7320cb330ec34a3507",
  firstName: "Test",
  lastName: "Guest",
  email: "test@example.com",
  phones: ["+14165550123"]
};
const result = buildGuestyInquiryRequest({
  ...valid, status: "confirmed", ignoreCalendar: true, ratePlanId: "unverified"
});
assert.deepEqual(result, {
  quoteId: valid.quoteId,
  status: "inquiry",
  reservedUntil: -1,
  guest: {
    firstName: "Test", lastName: "Guest",
    phones: ["+14165550123"], email: "test@example.com"
  }
});
assert.equal("ignoreCalendar" in result, false);
assert.equal("ratePlanId" in result, false);
for (const change of [
  { quoteId: "" }, { quoteId: "bad" },
  { firstName: "" }, { lastName: "" },
  { email: "invalid" }, { phones: [] },
  { phones: ["4165550123"] }, { phones: ["+01234567890"] },
  { phones: ["+14165550123", "bad"] }
]) assert.throws(() => buildGuestyInquiryRequest({ ...valid, ...change }));
assert.throws(() => buildGuestyInquiryRequest(null));
console.log("PASS: offline inquiry-only payload, required guest fields, E.164 validation and unsafe-field exclusion.");

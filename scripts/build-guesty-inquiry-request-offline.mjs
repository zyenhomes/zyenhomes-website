// Offline-only request builder. No network calls, credentials or writes.
// A valid payload does not establish API permissions or guarantee an inquiry is created.
export const GUESTY_INQUIRY_ENDPOINT = "https://open-api.guesty.com/v1/reservations-v3/quote";

export function buildGuestyInquiryRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid input");
  const { quoteId, firstName, lastName, email, phones } = input;
  if (typeof quoteId !== "string" || !/^[a-f0-9]{24}$/i.test(quoteId)) throw Error("Invalid quote ID");
  for (const [label, value] of [["first name", firstName], ["last name", lastName]]) {
    if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 100) {
      throw Error("Invalid " + label);
    }
  }
  if (typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("Invalid email");
  if (!Array.isArray(phones) || phones.length < 1 || phones.length > 3 ||
      !phones.every(phone => typeof phone === "string" && /^\+[1-9]\d{7,14}$/.test(phone))) {
    throw Error("Phone numbers must be in E.164 format");
  }
  // Only allow the documented safe subset, regardless of extra input properties.
  return {
    quoteId,
    status: "inquiry",
    reservedUntil: -1,
    guest: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phones: [...phones],
      email: email.trim()
    }
  };
}

import { createBookingSubmissionSession } from "./booking-submission-session.mjs";

// Preparation-only adapter: constructs validated API request bodies.
// No network calls; existing guest email workflow stays unchanged.
export function createBookingRequestDraftSession({fingerprint, cryptoApi} = {}) {
  if (typeof fingerprint !== "function") throw Error("Fingerprint function required");
  const keys = createBookingSubmissionSession(cryptoApi);
  return {
    async prepare(input) {
      if (!input || typeof input !== "object") throw Error("Missing booking details");
      const propertyId=String(input.propertyId||"").trim();
      const name=String(input.name||"").trim();
      const email=String(input.email||"").trim().toLowerCase();
      const phone=String(input.phone||"").trim();
      const checkIn=String(input.checkIn||"").trim();
      const checkOut=String(input.checkOut||"").trim();
      const message=String(input.message||"").trim();
      const guests=input.guests;
      const marketingConsent=input.marketingConsent;
      if(!/^[a-z0-9-]{3,40}$/.test(propertyId)||name.length<2||name.length>100||
        !/^\S+@\S+\.\S+$/.test(email)||email.length>150||
        phone.length<6||phone.length>40||message.length>1000||
        !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)||!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)||
        checkOut<=checkIn||!Number.isSafeInteger(guests)||guests<1||guests>20||
        typeof marketingConsent!=="boolean") throw Error("Invalid booking details");
      const fields={propertyId,name,email,phone,checkIn,checkOut,guests,message,marketingConsent};
      const digest=await fingerprint(fields);
      return Object.freeze({...fields,requestKey:keys.keyFor(digest)});
    },
    reset:()=>keys.reset()
  };
}

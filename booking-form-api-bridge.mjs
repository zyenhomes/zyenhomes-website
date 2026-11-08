import {createBookingRequestDraftSession} from "./booking-request-draft.mjs";
import {fingerprintBookingRequest} from "./scripts/guesty-booking-request-idempotency-offline.mjs";

// Explicitly disabled: must be separately reviewed before production activation.
export const BOOKING_FORM_API_SUBMISSION_ENABLED = false;
export function createBookingFormApiBridge({transport,cryptoApi}={}) {
  const draft=createBookingRequestDraftSession({fingerprint:fingerprintBookingRequest,cryptoApi});
  return {
    async submit(input) {
      if (BOOKING_FORM_API_SUBMISSION_ENABLED !== true)
        return Object.freeze({submitted:false,reason:"booking_form_api_disabled"});
      if(typeof transport!=="function") throw Error("Transport required");
      const body=await draft.prepare(input);
      return transport(body);
    },
    reset:()=>draft.reset()
  };
}

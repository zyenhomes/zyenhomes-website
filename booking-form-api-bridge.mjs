import {createBookingRequestDraftSession} from "./booking-request-draft.mjs";
import {fingerprintBookingRequest} from "./scripts/guesty-booking-request-idempotency-offline.mjs";
import {createBookingRequestTransport} from "./booking-request-transport.mjs";

// Explicitly disabled: must be separately reviewed before production activation.
export const BOOKING_FORM_API_SUBMISSION_ENABLED = false;
export function createBookingFormApiBridge({transport,fetchImpl,cryptoApi}={}) {
  const draft=createBookingRequestDraftSession({fingerprint:fingerprintBookingRequest,cryptoApi});
  return {
    async submit(input) {
      if (BOOKING_FORM_API_SUBMISSION_ENABLED !== true)
        return Object.freeze({submitted:false,reason:"booking_form_api_disabled"});
      const send=typeof transport==="function" ? transport :
        createBookingRequestTransport({fetchImpl});
      const body=await draft.prepare(input);
      return send(body);
    },
    reset:()=>draft.reset()
  };
}

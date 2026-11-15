// Existing property IDs mapped to Guesty Booking Engine listing IDs.
// This configuration does not prove Guesty account ownership.
export const BOOKING_REQUEST_LISTINGS={
          "100-pilsen":"6914041f5fbb6800444aca89",
          "105-pilsen":"69140406129e4200436cc529",
          "106-birch-view":"699b704dda533d00151fd63b",
          "109-plater":"69140412df75040043bc8c0d",
          "116-tyrolean":"6914041adf75040043bc8ed8",
          "147-campbell":"691403f14ae1bb0013bf4d92",
          "149-tyrolean":"6abf9b85caf2480012c82479",
          "197-arlberg":"6abf956cb58bb9004973e443",
          "37-snowbridge":"691403d937f0ea0013f72152"
        };

export function lookupBookingRequestListing(propertyId) {
 return typeof propertyId==="string" && Object.hasOwn(BOOKING_REQUEST_LISTINGS,propertyId)
   ? BOOKING_REQUEST_LISTINGS[propertyId] : null;
}

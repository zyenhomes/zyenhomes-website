import assert from "node:assert/strict";
import {normalizeBookingRequestForInquiry as normalize} from "../cloudflare/guesty-request-identity-mapping.js";
const record={property_id:"116-tyrolean",guest_name:"Test Guest",guest_email:"test@example.com",
 guesty_quote_id:"a".repeat(24),request_id:"11111111-2222-4333-8444-555555555555"};
const verifiedMapping={propertyId:"116-tyrolean",listingId:"b".repeat(24),accountVerified:true};
const good=normalize({record,verifiedMapping});
assert.equal(good.verified,true);assert.equal(good.normalized.listing_id,verifiedMapping.listingId);
assert.equal(good.requiresSeparateGuestNames,true);assert.equal(good.canWrite,false);
for(const mapping of [undefined,{...verifiedMapping,propertyId:"other"},
 {...verifiedMapping,listingId:"bad"},{...verifiedMapping,accountVerified:false}]){
 const result=normalize({record,verifiedMapping:mapping});
 assert.equal(result.verified,false);assert.equal(result.canWrite,false);
}
assert.equal(normalize({record:{...record,guesty_quote_id:"bad"},verifiedMapping}).verified,false);
console.log("PASS: persisted property_id needs trusted Guesty listing mapping and separately verified guest names.");

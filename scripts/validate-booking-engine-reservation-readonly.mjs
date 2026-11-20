import assert from "node:assert/strict";
import {verifyBookingEngineReservationReadOnly as verify} from "../cloudflare/guesty-booking-engine-reservation-readonly.js";
const id=x=>x.repeat(24);
const args={reservationId:id("a"),accountId:id("b"),unitTypeId:id("c"),ratePlanId:id("d"),
 guestsCount:6,checkIn:"2027-01-18",checkOut:"2027-01-20",token:"mock_booking_token"};
const reservation={_id:args.reservationId,accountId:args.accountId,unitTypeId:args.unitTypeId,
 ratePlanId:args.ratePlanId,guestsCount:args.guestsCount,
 checkInDateLocalized:args.checkIn,checkOutDateLocalized:args.checkOut,
 status:"reserved",conversationId:id("e")};
let gets=0;
const transport=async(url,options)=>{gets++;assert.equal(url,
 "https://booking.guesty.com/api/reservations/"+args.reservationId+"/details");
 assert.equal(options.method,"GET");assert.equal(options.body,undefined);
 return {ok:true,json:async()=>reservation}};
const result=await verify({...args,transport});
assert.equal(result.verified,true);assert.equal(result.status,"reserved");
assert.equal(result.canConfirmInquiry,false);assert.equal(result.canMarkSucceeded,false);
assert.equal(result.retryAutomatically,false);assert.equal(gets,1);
for(const field of ["_id","accountId","unitTypeId","ratePlanId","guestsCount",
 "checkInDateLocalized","checkOutDateLocalized"]){
 const changed={...reservation,[field]:field==="guestsCount"?7:"wrong"};
 const r=await verify({...args,transport:async()=>({ok:true,json:async()=>changed})});
 assert.equal(r.verified,false,field);assert.equal(r.canMarkSucceeded,false);
}
const missing=await verify({...args,transport:async()=>({ok:true,json:async()=>({...reservation,status:null})})});
assert.equal(missing.verified,false);
const timeout=await verify({...args,transport:async()=>{throw Error("timeout")}});
assert.equal(timeout.verified,false);assert.equal(timeout.retryAutomatically,false);
console.log("PASS: Booking Engine reservation GET verifies documented account/listing/stay fields; status remains unconfirmed.");

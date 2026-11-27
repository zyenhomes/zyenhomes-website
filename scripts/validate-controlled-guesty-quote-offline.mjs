import assert from "node:assert/strict";
import {
  TEST_BOOKING,
  validateControlledQuote,
  createControlledQuote
} from "./controlled-guesty-quote.mjs";

const now=Date.parse("2026-11-27T12:00:00Z");

function fixture(){
  return {
    _id:"1234567890abcdef12345678",
    accountId:TEST_BOOKING.accountId,
    unitTypeId:TEST_BOOKING.listingId,
    checkInDateLocalized:TEST_BOOKING.checkIn,
    checkOutDateLocalized:TEST_BOOKING.checkOut,
    guestsCount:TEST_BOOKING.guests,
    status:"valid",
    expiresAt:new Date(now+300000).toISOString(),
    rates:{
      ratePlans:[{
        ratePlan:{
          _id:"test-rate-plan",
          money:{
            currency:"CAD",
            invoiceItems:[
              {amount:1100},
              {amount:250},
              {amount:229.50}
            ]
          }
        }
      }]
    }
  };
}

const result=validateControlledQuote(fixture(),now);

assert.equal(result.currency,"CAD");
assert.equal(result.totalCents,157950);
assert.equal(result.ratePlanId,"test-rate-plan");
assert.equal(result.quoteId,fixture()._id);

assert.deepEqual(
  validateControlledQuote({results:fixture()},now),
  result
);

for(const [field,value] of [
  ["_id","invalid"],
  ["accountId","wrong-account"],
  ["unitTypeId","wrong-property"],
  ["checkInDateLocalized","2027-01-19"],
  ["checkOutDateLocalized","2027-01-21"],
  ["guestsCount",8],
  ["status","invalid"],
  ["expiresAt",new Date(now).toISOString()]
]){
  const quote=fixture();
  quote[field]=value;
  assert.throws(()=>validateControlledQuote(quote,now));
}

const money=q=>q.rates.ratePlans[0].ratePlan.money;

for(const mutate of [
  q=>money(q).currency="USD",
  q=>money(q).invoiceItems=[],
  q=>money(q).invoiceItems[0].amount="1100",
  q=>money(q).invoiceItems[0].amount=NaN,
  q=>money(q).invoiceItems[0].amount=1.001,
  q=>money(q).invoiceItems[0].currency="USD",
  q=>money(q).invoiceItems=[{amount:0}],
  q=>q.rates.ratePlans=[],
  q=>q.rates.ratePlans.push(
    structuredClone(q.rates.ratePlans[0])
  )
]){
  const quote=fixture();
  mutate(quote);
  assert.throws(()=>validateControlledQuote(quote,now));
}

let calls=0;

const created=await createControlledQuote({
  token:"mock-token",
  now:()=>now,
  transport:async(url,options)=>{
    calls++;

    const endpoint=new URL(url);
    assert.equal(endpoint.origin,"https://open-api.guesty.com");
    assert.equal(endpoint.pathname,"/v1/quotes");
    assert.equal(endpoint.searchParams.get("includePaymentsTemplate"),"false");
    assert.equal(endpoint.searchParams.get("mergeAccommodationFarePriceComponents"),"false");
    assert.equal(endpoint.searchParams.get("applyGuestFacingMerges"),"false");

    assert.equal(options.method,"POST");
    assert.equal(options.redirect,"error");
    assert.equal(options.headers.Authorization,"Bearer mock-token");
    assert.ok(options.signal instanceof AbortSignal);

    assert.deepEqual(JSON.parse(options.body),{
      listingId:TEST_BOOKING.listingId,
      checkInDateLocalized:TEST_BOOKING.checkIn,
      checkOutDateLocalized:TEST_BOOKING.checkOut,
      guestsCount:TEST_BOOKING.guests,
      source:"manual",
      ignoreCalendar:false,
      ignoreTerms:false,
      ignoreBlocks:false
    });

    return {
      ok:true,
      json:async()=>fixture()
    };
  }
});

assert.equal(calls,1);
assert.deepEqual(created,result);

calls=0;

await assert.rejects(()=>createControlledQuote({
  token:"",
  transport:async()=>{calls++;}
}),/missing_quote_transport/);

assert.equal(calls,0);

for(const status of [400,401,403,429,500]){
  calls=0;

  await assert.rejects(()=>createControlledQuote({
    token:"mock-token",
    transport:async()=>{
      calls++;
      return {ok:false,status};
    }
  }),/quote_request_failed/);

  assert.equal(calls,1);
}

calls=0;

await assert.rejects(()=>createControlledQuote({
  token:"mock-token",
  transport:async()=>{
    calls++;
    throw Error("simulated_timeout");
  }
}),/simulated_timeout/);

assert.equal(calls,1);

console.log("PASS: controlled Guesty quote identity and pricing tests");
console.log("PASS: exact HTTP request and booking restrictions");
console.log("PASS: HTTP failure and timeout no-retry tests");

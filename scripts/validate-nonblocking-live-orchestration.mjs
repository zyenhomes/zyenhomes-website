import assert from "node:assert/strict";
import {runOrchestration as run} from "../cloudflare/guesty-nonblocking-live-orchestration.js";
import {executeWithInjectedTransport as send} from "../cloudflare/guesty-nonblocking-execution-candidate.js";
import {parseV3Reservation,retrieveV3Reservation} from "../cloudflare/guesty-nonblocking-runtime-candidate.js";
function fixture(){
 const requestId="request-001",attemptId="attempt-001",claimToken="claim-001",id="1234567890abcdef12345678";
 let now=0,claimed=false,sends=0,audits=[];
 const record={request_id:requestId,property_id:"116-tyrolean",guesty_quote_id:id,guest_name:"Test Guest",guest_email:"test@example.invalid",guest_phone:"+14165550100",check_in:"2027-01-18",check_out:"2027-01-20",guests:6,quote_currency:"CAD",quote_total_cents:10000};
 const quote={status:"valid",_id:id,unitTypeId:"6914041adf75040043bc8ed8",checkInDateLocalized:record.check_in,checkOutDateLocalized:record.check_out,guestsCount:6,expiresAt:new Date(20000).toISOString(),rates:{ratePlans:[{ratePlan:{_id:"default-rateplan-id",money:{currency:"CAD",invoiceItems:[{amount:100}]}}}]}};
 const db={prepare(sql){return {bind(...args){return {first:async()=>record,run:async()=>{audits.push(args[0]);return {success:true,meta:{changes:1}}}}}}},async batch(){if(claimed)return [{success:true,results:[]},{success:true,meta:{changes:0}}];claimed=true;return [{success:true,results:[{request_id:requestId,guesty_sync_claim_token:claimToken}]},{success:true,meta:{changes:1}}]}};
 const input={env:{GUESTY_ISOLATED_APPROVAL_JSON:JSON.stringify({requestId,attemptId,claimToken,quoteId:id,expiresAt:new Date(30000).toISOString()})},db,readQuote:async()=>quote,getToken:async()=>"mock-token",clock:()=>now,send,transport:async(url,opts)=>{sends++;assert.equal(JSON.parse(opts.body).status,"inquiry");return {status:200,json:async()=>({_id:id})}}};
 return {input,quote,counts:()=>({sends,audits}),advance:n=>{now=n}};
}
let f=fixture();assert.equal((await run(f.input)).state,"manual_review");assert.equal((await run(f.input)).state,"blocked");assert.deepEqual(f.counts(),{sends:1,audits:["manual_review"]});
for(const expiry of [20000,30000]){
 f=fixture();if(expiry===30000)f.quote.expiresAt=new Date(40000).toISOString();
 const batch=f.input.db.batch;f.input.db.batch=async()=>{const result=await batch();f.advance(expiry);return result};
 assert.equal((await run(f.input)).state,"manual_review");assert.deepEqual(f.counts(),{sends:0,audits:["manual_review"]});
}
f=fixture();f.input.send=async()=>{throw Error("unexpected")};assert.equal((await run(f.input)).state,"uncertain");assert.deepEqual(f.counts(),{sends:0,audits:["uncertain"]});
f=fixture();
const reservationId="abcdef1234567890abcdef12";
f.input.env.GUESTY_EXPECTED_ACCOUNT_ID="mock-account";
f.input.transport=async()=>({status:200,json:async()=>({reservationId,status:"inquiry",quoteId:f.quote._id,unitTypeId:f.quote.unitTypeId})});
f.input.readReservation=async id=>({
  _id:id,
  status:"inquiry",
  quoteId:f.quote._id,
  accountId:"mock-account",
  stay:[{
    unitTypeId:f.quote.unitTypeId,
    checkInDateLocalized:f.quote.checkInDateLocalized,
    checkOutDateLocalized:f.quote.checkOutDateLocalized,
    guestsCount:6
  }]
});
assert.equal((await run(f.input)).reconciled,true);
f=fixture();f.input.transport=async()=>({status:200,json:async()=>({reservationId,status:"confirmed",quoteId:f.quote._id,unitTypeId:f.quote.unitTypeId})});
f.input.readReservation=async()=>{throw Error("must not reconcile confirmed response")};
assert.equal((await run(f.input)).reconciled,false);
for (const mismatch of [
  "reservationId",
  "status",
  "quoteId",
  "accountId",
  "unitTypeId",
  "checkIn",
  "checkOut",
  "guestsCount",
  "multipleStays",
  "missingStay"
]) {
  f = fixture();
  f.input.env.GUESTY_EXPECTED_ACCOUNT_ID = "mock-account";

  f.input.transport = async () => ({
    status: 200,
    json: async () => ({
      reservationId,
      status: "inquiry",
      quoteId: f.quote._id,
      unitTypeId: f.quote.unitTypeId
    })
  });

  f.input.readReservation = async id => {
    const r = {
      _id: id,
      status: "inquiry",
      quoteId: f.quote._id,
      accountId: "mock-account",
      stay: [{
        unitTypeId: f.quote.unitTypeId,
        checkInDateLocalized: f.quote.checkInDateLocalized,
        checkOutDateLocalized: f.quote.checkOutDateLocalized,
        guestsCount: 6
      }]
    };

    if (mismatch === "reservationId") r._id = "wrong";
    if (mismatch === "status") r.status = "confirmed";
    if (mismatch === "quoteId") r.quoteId = "wrong";
    if (mismatch === "accountId") r.accountId = "wrong";
    if (mismatch === "unitTypeId") r.stay[0].unitTypeId = "wrong";
    if (mismatch === "checkIn") r.stay[0].checkInDateLocalized = "2027-01-19";
    if (mismatch === "checkOut") r.stay[0].checkOutDateLocalized = "2027-01-21";
    if (mismatch === "guestsCount") r.stay[0].guestsCount = 8;
    if (mismatch === "multipleStays") r.stay.push({...r.stay[0]});
    if (mismatch === "missingStay") delete r.stay;

    return r;
  };

  const result = await run(f.input);
  assert.equal(result.reconciled, false, mismatch);
  assert.equal(result.state, "manual_review", mismatch);
  assert.equal(result.retryAutomatically, false, mismatch);
}

console.log("PASS: V3 reservation mismatch safety tests");
console.log("PASS: shared live orchestration offline");
const parserId = "1234567890abcdef12345678";
const parserRecord = {
  _id: parserId,
  status: "inquiry",
  stay: [{
    unitTypeId: "6914041adf75040043bc8ed8",
    checkInDateLocalized: "2027-01-18",
    checkOutDateLocalized: "2027-01-20",
    guestsCount: 6
  }]
};

assert.deepEqual(
  parseV3Reservation([parserRecord], parserId),
  parserRecord
);

for (const invalid of [
  [],
  [parserRecord, parserRecord],
  null,
  undefined,
  {},
  {results: [parserRecord]},
  "invalid response"
]) {
  assert.throws(
    () => parseV3Reservation(invalid, parserId),
    /reservation_response_invalid/
  );
}

for (const invalid of [
  [null],
  [{}],
  [{_id: "abcdef1234567890abcdef12"}]
]) {
  assert.throws(
    () => parseV3Reservation(invalid, parserId),
    /reservation_identity_mismatch/
  );
}

assert.throws(
  () => parseV3Reservation([parserRecord], "invalid"),
  /invalid_reservation_id/
);

console.log("PASS: independent Guesty V3 reservation parser tests");
const httpInput = {
  id: parserId,
  getToken: async () => "mock-token",
  transport: async (url, options) => {
    assert.equal(
      url,
      "https://open-api.guesty.com/v1/reservations-v3?reservationIds=" +
      parserId +
      "&includePaymentsTemplate=false&mergeAccommodationFarePriceComponents=false&applyGuestFacingMerges=false"
    );

    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, "Bearer mock-token");
    assert.equal(options.headers.Accept, "application/json");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.signal.aborted, false);
    assert.equal(options.body, undefined);

    return {
      ok: true,
      json: async () => [parserRecord]
    };
  }
};

assert.deepEqual(
  await retrieveV3Reservation(httpInput),
  parserRecord
);

const forbiddenCall = async () => {
  assert.fail("Unexpected external call");
};

await assert.rejects(
  () => retrieveV3Reservation({
    ...httpInput,
    id: "invalid",
    getToken: forbiddenCall,
    transport: forbiddenCall
  }),
  /invalid_reservation_id/
);

for (const token of ["", " ", null, undefined, 123]) {
  await assert.rejects(
    () => retrieveV3Reservation({
      ...httpInput,
      getToken: async () => token,
      transport: forbiddenCall
    }),
    /invalid_access_token/
  );
}

for (const status of [401, 403, 404, 429, 500]) {
  await assert.rejects(
    () => retrieveV3Reservation({
      ...httpInput,
      transport: async () => ({
        ok: false,
        status,
        json: forbiddenCall
      })
    }),
    /reservation_read_failed/
  );
}

await assert.rejects(
  () => retrieveV3Reservation({
    ...httpInput,
    transport: async () => {
      throw Error("network_failure");
    }
  }),
  /network_failure/
);

await assert.rejects(
  () => retrieveV3Reservation({
    ...httpInput,
    transport: async () => ({
      ok: true,
      json: async () => {
        throw SyntaxError("invalid_json");
      }
    })
  }),
  /invalid_json/
);

console.log("PASS: Guesty V3 HTTP retrieval safety tests");

import {selectedRatePlan} from "../cloudflare/guesty-nonblocking-contract.js";

export const TEST_BOOKING=Object.freeze({
  listingId:"6abf9b85caf2480012c82479",
  accountId:"6912ab06cb495d4f11a10127",
  checkIn:"2027-01-18",
  checkOut:"2027-01-20",
  guests:6
});

export function validateControlledQuote(raw,now=Date.now()){
  const quote=raw?.results??raw;
  const expected=TEST_BOOKING;

  if(!quote||
     !/^[a-f0-9]{24}$/i.test(quote._id??"")||
     quote.accountId!==expected.accountId||
     quote.unitTypeId!==expected.listingId||
     quote.checkInDateLocalized!==expected.checkIn||
     quote.checkOutDateLocalized!==expected.checkOut||
     quote.guestsCount!==expected.guests||
     quote.status!=="valid"||
     !(Date.parse(quote.expiresAt)>now))
    throw Error("quote_identity_mismatch");

  const {plan,id:ratePlanId}=selectedRatePlan(quote);
  const money=plan.ratePlan?.money??plan.money?.money??plan.money;

  if(money?.currency!=="CAD"||
     !Array.isArray(money.invoiceItems)||
     !money.invoiceItems.length)
    throw Error("invalid_invoice");

  let totalCents=0;

  for(const item of money.invoiceItems){
    if(!Number.isFinite(item.amount)||
       (item.currency!=null&&item.currency!=="CAD"))
      throw Error("invalid_invoice_item");

    const cents=Math.round(item.amount*100);

    if(!Number.isSafeInteger(cents)||
       Math.abs(item.amount*100-cents)>=0.00001)
      throw Error("invalid_invoice_amount");

    totalCents+=cents;
  }

  if(!Number.isSafeInteger(totalCents)||totalCents<=0)
    throw Error("invalid_quote_total");

  return Object.freeze({
    quoteId:quote._id,
    expiresAt:quote.expiresAt,
    ratePlanId,
    currency:"CAD",
    totalCents
  });
}

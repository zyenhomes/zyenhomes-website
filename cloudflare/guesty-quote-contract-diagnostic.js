// Safe, read-only field diagnostics. Never include raw values or guest PII.
// This helper does not make requests or authorize Guesty writes.
export function diagnoseQuoteContract(raw, expected, now=Date.now()) {
 const quote=raw?.results??raw;
 const validObject=quote&&typeof quote==="object"&&!Array.isArray(quote);
 const fields=["_id","unitTypeId","unitId","listingId","checkInDateLocalized",
   "checkOutDateLocalized","guestsCount","numberOfGuests","status","createdAt","expiresAt"];
 const present=Object.fromEntries(fields.map(k=>[k,validObject&&Object.hasOwn(quote,k)]));
 const match={
  quoteId:validObject&&quote._id===expected?.quoteId,
  listingId:validObject&&[quote.unitTypeId,quote.unitId,quote.listingId].includes(expected?.listingId),
  checkIn:validObject&&quote.checkInDateLocalized===expected?.checkIn,
  checkOut:validObject&&quote.checkOutDateLocalized===expected?.checkOut,
  guests:validObject&&(quote.guestsCount===expected?.guests||quote.numberOfGuests===expected?.guests),
  status:validObject&&(!Object.hasOwn(quote,"status")||quote.status==="valid"),
  createdAt:validObject&&Number.isFinite(Date.parse(quote.createdAt))&&Date.parse(quote.createdAt)<=now,
  expiresAt:validObject&&Number.isFinite(Date.parse(quote.expiresAt))&&Date.parse(quote.expiresAt)>now&&Date.parse(quote.expiresAt)>Date.parse(quote.createdAt)
 };
 return Object.freeze({contractDiagnostic:true,shape:!validObject?"invalid":Array.isArray(raw?.results)?"array":"object",
  fieldsPresent:present,fieldsMatch:Object.fromEntries(Object.entries(match).map(([k,v])=>[k,v===true])),
  verified:Object.values(match).every(v=>v===true),writeAuthorized:false});
}

// Read-only Guesty quote smoke test. Does not create reservations or payments.
// Run against the deployed Cloudflare Worker, sequentially to respect rate limits.
import { readFileSync } from "node:fs";

const mapping = JSON.parse(readFileSync(new URL("../data/guesty-listing-map.json", import.meta.url), "utf8")).listings;
const ids = Object.keys(mapping);
const base = "https://zyenhomes-booking-api.brendan-nguyen-90f.workers.dev";
// Dates must be explicitly supplied and confirmed available by the operator.
// Never silently select arbitrary future dates that may be unavailable.
const checkIn=process.env.QUOTE_CHECK_IN;
const checkOut=process.env.QUOTE_CHECK_OUT;
const guests=Number(process.env.QUOTE_GUESTS||"2");
const requestedProperty=process.env.QUOTE_PROPERTY_ID||"all";
function parseDate(value){
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value||""))throw Error("Check-in and check-out must be YYYY-MM-DD");
 const parsed=new Date(value+"T00:00:00Z");
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw Error("Invalid calendar date");
 return parsed;
}
const arrival=parseDate(checkIn),departure=parseDate(checkOut);
const today=new Date().toISOString().slice(0,10);
if(checkIn<today||departure<=arrival||departure-arrival>30*86400000)throw Error("Dates must be future, checkout after check-in, and stay at most 30 nights");
if(!Number.isInteger(guests)||guests<1||guests>20)throw Error("Guest count must be 1–20");
if(requestedProperty!=="all"&&!ids.includes(requestedProperty))throw Error("Unknown property ID");
const targets=requestedProperty==="all"?ids:[requestedProperty];
const body=JSON.stringify({checkIn,checkOut,guests});
console.log("Quote test dates:",checkIn,"to",checkOut,"Guests:",guests,"Properties:",targets.length);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
for (const id of targets) {
  let status = "ERROR";
  let detail = "";
  try {
    const response = await fetch(`${base}/api/public/quote/property/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "https://zyenhomes.com" },
      body,
      signal: AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (response.ok && result.success && Number.isFinite(result.pricing?.total) &&
        result.pricing.total >= 0 && result.pricing.currency === "CAD" &&
        result.propertyId === id && Array.isArray(result.pricing.invoiceItems)) {
      status = "PASS";
      detail = "Complete quote structure returned";
    } else if (response.status === 429) {
      status = "RATE_LIMIT";
      detail = "Worker rate limiter active; run again later";
    } else {
      status = "REVIEW";
      detail = `HTTP ${response.status} | Guesty status: ${Number.isInteger(result.guestyStatus) ? result.guestyStatus : "not provided"} | Error: ${typeof result.errorCode === "string" ? result.errorCode.slice(0,50) : "not provided"} | ${String(result.message ?? "No message").slice(0,80)}`;
    }
  } catch (error) {
    detail = String(error.message || error).slice(0,120);
  }
  results.push({ id, status, detail });
  console.log(`${id.padEnd(20)} ${status.padEnd(12)} ${detail}`);
  await delay(1600);
}
const passed = results.filter(r => r.status === "PASS").length;
const needsReview = results.filter(r => r.status !== "PASS");
console.log(`Summary: ${passed}/${targets.length} complete quotes. No reservations created.`);
if (needsReview.length) {
  console.log("Some properties require review. A quote failure can mean unavailable dates, a listing configuration issue, or an API error.");
  process.exitCode = 1;
}

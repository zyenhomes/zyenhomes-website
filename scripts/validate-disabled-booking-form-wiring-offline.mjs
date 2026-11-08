import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const file of ["zyen-116-calendar-pilot.js","zyen-connected-calendar.js"]){
 const s=readFileSync(file,"utf8");
 new Function(s);
 assert.match(s,/import\("\.\/booking-form-api-bridge\.mjs"\)/);
 assert.match(s,/createBookingFormApiBridge\(\)\.submit\(apiDraft\)/);
 assert.match(s,/marketingConsent:false/);
 assert.match(s,/window\.location\.href=href/);
 assert.match(s,/mailto:info@zyenhomes\.com/);
 assert.doesNotMatch(s,/fetch\([^\n]*\/api\/public\/booking-request/);
}
const bridge=readFileSync("booking-form-api-bridge.mjs","utf8");
assert.match(bridge,/BOOKING_FORM_API_SUBMISSION_ENABLED = false/);
console.log("PASS: both forms invoke hard-disabled bridge while preserving email workflow.");

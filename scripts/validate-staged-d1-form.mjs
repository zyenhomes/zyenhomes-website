import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const file of ["zyen-connected-calendar.js","zyen-116-calendar-pilot.js"]){
 const s=readFileSync(file,"utf8");
 new Function(s);
 assert.match(s,/const directSubmissionEnabled=false/);
 assert.match(s,/marketingConsent:consentBox.checked/);
 assert.match(s,/consentBox.checked=false/);
 assert.match(s,/if\(directSubmissionEnabled\)/);
 assert.match(s,/api\/public\/booking-request/);
 assert.match(s,/mailto:info@zyenhomes.com/);
 assert.match(s,/calendar\.hidden=true/);
}
console.log("Staged D1 form syntax and disabled gate verified");

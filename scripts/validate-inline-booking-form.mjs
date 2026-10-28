import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const file of ["zyen-connected-calendar.js","zyen-116-calendar-pilot.js"]){
 const s=readFileSync(file,"utf8");
 new Function(s);
 for(const term of ["Booking request details","fullName","email","phone","form.onsubmit","form.reportValidity()","quotedTotal=resolvedQuote.formatted","mailto:info@zyenhomes.com"])assert.ok(s.includes(term),file+" missing "+term);
 assert.match(s,/calendar\.hidden=true/);
}
console.log("Inline booking form syntax checks passed");

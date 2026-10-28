import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const path of ["zyen-connected-calendar.js","zyen-116-calendar-pilot.js"]){
 const s=readFileSync(path,"utf8");
 new Function(s);
 assert.match(s,/responsiveCalendar\.style\.maxWidth="100%"/);
 assert.match(s,/min-height:40px/);
 assert.match(s,/Request to book/);
 assert.match(s,/mailto:info@zyenhomes\.com/);
 assert.match(s,/let resolvedQuote=null/);
 assert.match(s,/clearQuote\(\)/);
 assert.match(s,/calendar\.hidden=true/);
}
console.log("Mobile calendar and quote inquiry syntax checks passed");

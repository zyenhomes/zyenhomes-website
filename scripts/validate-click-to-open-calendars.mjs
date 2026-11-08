import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const path of ["zyen-116-calendar-pilot.js","zyen-connected-calendar.js"]){
 const s=readFileSync(path,"utf8");
 new Function(s);
 assert.match(s,/input\.placeholder="Click"/);
 assert.match(s,/calendar\.hidden=false/);
 assert.match(s,/setCalendarOpen\(true\)/);
 assert.match(s,/const setCalendarOpen = open => \{calendar\.hidden=false/);
 assert.match(s,/day\.status!=="available"/);
}
console.log("Click-to-open calendar checks passed");

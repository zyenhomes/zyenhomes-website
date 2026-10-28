import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const js=readFileSync("zyen-connected-calendar.js","utf8");
const html=readFileSync("property.html","utf8");
new Function(js);
for(const id of ["100-pilsen","105-pilsen","106-birch-view","109-plater","147-campbell","149-tyrolean","197-arlberg","37-snowbridge"]){
 assert.ok(js.includes('"'+id+'"'),"missing "+id);
}
assert.match(js,/encodeURIComponent\(propertyId\)/);
assert.match(js,/day\.status!=="available"/);
assert.match(js,/day\.cta===false/);
assert.match(js,/day\.ctd===false/);
assert.match(js,/nights>=arrival\.minNights/);
assert.match(html,/zyen-connected-calendar\.js/);
assert.match(html,/zy-connected-booking-slot/);
console.log("Eight property calendars syntax and integration validated");

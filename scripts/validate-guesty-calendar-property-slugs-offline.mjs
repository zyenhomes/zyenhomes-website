import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const file of ["zyen-116-calendar-pilot.js","zyen-connected-calendar.js"]) {
 const s=readFileSync(file,"utf8");
 new Function(s);
 assert.match(s,/params\.get\("property"\)/);
 assert.match(s,/window\.ZYEN_PROPERTIES/);
 assert.match(s,/propertyIdFromSlug/);
 assert.match(s,/params\.get\("id"\) \|\| propertyIdFromSlug/);
 assert.match(s,/\.replace\(\/\[\^a-z0-9\]\+\/g,"-"\)/);
 assert.match(s,/\.zy-116-booking/);
}
const page=readFileSync("property.html","utf8");
assert.match(page,/history\.replaceState/);
assert.match(page,/clean\.set\('property'/);
console.log("PASS: both Guesty calendar scripts support clean property-name URLs and legacy IDs.");

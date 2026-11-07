import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync("cloudflare/worker.js", "utf8");
const migration = readFileSync("cloudflare/migrations/0003_booking_request_guesty_quote_id.sql", "utf8");
const original = readFileSync("cloudflare/migrations/0001_booking_requests.sql", "utf8");

assert.match(original, /CREATE TABLE IF NOT EXISTS booking_requests/);
assert.match(migration, /ALTER TABLE booking_requests ADD COLUMN guesty_quote_id TEXT;/);
assert.match(migration, /idx_booking_requests_guesty_quote_id/);
assert.match(worker, /const guestyQuoteId=quote\?\._id;/);
assert.match(worker, /typeof guestyQuoteId!=="string"/);
assert.match(worker, /INSERT INTO booking_requests \([^\n]*guesty_quote_id\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)/);
assert.match(worker, /consent\?"v1":null,guestyQuoteId\)\.run\(\)/);
assert.match(worker, /env\.BOOKING_REQUESTS_ENABLED !== "true"/);
assert.match(worker, /guestySyncStatus:"pending"/);
assert.doesNotMatch(worker, /status:\s*"confirmed"/);
console.log("PASS: offline checks confirm server quote ID validation, SQL parameter count and disabled booking gate.");
console.log("LIMITATION: production migration state and live Guesty behavior not tested.");

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const base="gmail-archive-oauth/";
const config=readFileSync(base+"wrangler.toml","utf8");
const migration1=readFileSync(base+"migrations/0001_oauth_storage.sql","utf8");
const migration2=readFileSync(base+"migrations/0002_admin_sessions.sql","utf8");
assert.match(config,/name = "zyenhomes-gmail-archive-oauth"/);
assert.match(config,/binding = "GMAIL_OAUTH_DB"/);
assert.match(config,/database_name = "zyenhomes-gmail-oauth"/);
assert.match(config,/database_id = "8768f450-512a-4150-b165-1d750db4cdac"/);
assert.match(config,/GMAIL_ARCHIVE_ENABLED = "false"/);
assert.ok(!config.includes("zyenhomes-booking-requests"));

for (const sql of [migration1, migration2]) {
  const statements = sql
    .replace(/--[^\r\n]*/g, "")
    .split(";")
    .map(statement => statement.trim())
    .filter(Boolean);

  assert.ok(statements.length > 0);

  for (const statement of statements) {
    assert.match(
      statement,
      /^CREATE\s+(?:TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\b/i
    );
    assert.ok(!statement.includes("zyenhomes-booking-requests"));
  }
}


assert.match(migration1,/CREATE TABLE IF NOT EXISTS oauth_sessions/);
assert.match(migration1,/CREATE TABLE IF NOT EXISTS oauth_tokens/);
assert.match(migration2,/CREATE TABLE IF NOT EXISTS admin_sessions/);
console.log("PASS: dedicated D1 binding and migration order validated without production database access.");

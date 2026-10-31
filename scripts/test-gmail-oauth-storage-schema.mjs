import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("gmail-archive-oauth/migrations/0001_oauth_storage.sql","utf8");
for(const token of ["CREATE TABLE IF NOT EXISTS oauth_sessions","state_hash TEXT PRIMARY KEY","consumed_at INTEGER","CREATE TABLE IF NOT EXISTS oauth_tokens","encrypted_refresh_token TEXT NOT NULL","mailbox = 'info@zyenhomes.com'","https://www.googleapis.com/auth/gmail.insert"])assert.ok(sql.includes(token),"Missing required schema element");
assert.ok(!/\b(INSERT|UPDATE|DELETE|DROP)\s+(?:INTO|FROM|TABLE)\b/i.test(sql),"Unexpected data mutation");
console.log("PASS: OAuth storage schema static checks. No database created or modified.");

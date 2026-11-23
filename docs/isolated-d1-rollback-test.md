# Isolated D1 rollback test — NOT DEPLOYED
The test Worker targets only `test-request-003` and the previously verified
`test-attempt-batch002` audit ID in `zyenhomes-booking-test`.
It requires Cloudflare Access, the separate `TEST_ADMIN_TOKEN` secret,
`TEST_MODE_ENABLED=true`, `TEST_DB_NAME=zyenhomes-booking-test`,
and the separately verified `TEST_DB` binding. These environment variables
alone cannot verify the actual binding ID; check Cloudflare before deployment.

The Worker deliberately causes a UNIQUE violation in the second statement
of a D1 batch. A 409 error does NOT establish rollback. Verify afterward
with read-only SQL:
```sql
SELECT request_id,guesty_sync_status,guesty_sync_claim_token,
       guesty_sync_attempt_count
FROM booking_requests WHERE request_id='test-request-003';
SELECT COUNT(*) AS audit_count
FROM guesty_inquiry_sync_attempts WHERE request_id='test-request-003';
```
Expected: pending, NULL, 0, and audit_count 0. Unexpected results require
manual investigation, never automatic retry.

This is a separate single-file replacement for the already deployed test
Worker. It does not modify production Worker code or contact Guesty.
**Obtain explicit user approval before deployment or sending the test POST.**

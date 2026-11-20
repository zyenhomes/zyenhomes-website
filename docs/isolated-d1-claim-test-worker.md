# Isolated D1 batch claim test (NOT DEPLOYED)
This test-only Worker is not imported by production Worker, and no deployment
configuration or CI deployment step is included. Do not bind production D1.

Before any deployment, separately obtain user approval, verify that the
`TEST_DB` binding points exclusively to **zyenhomes-booking-test** by its
actual Cloudflare database ID, set `TEST_MODE_ENABLED=true`,
`TEST_DB_NAME=zyenhomes-booking-test` and a strong `TEST_ADMIN_TOKEN` secret.
The binding name environment variable is not independent proof of the database ID.
Do not deploy this Worker to a public route without separate security review.

The existing test record `test-request-001` is already in `processing`
state and cannot be claimed again. A real batch test needs a new isolated
test row and separate approved deployment. To test rollback, arrange an
audit constraint failure on a fresh isolated record and confirm the claim
also rolled back. The mock test here proves only handler wiring, not D1
atomicity. No Guesty calls, reservation, payment or production D1 changes.

# Zyen Homes — D1 booking request storage setup

**Status: staged; not live.** Do not enable public form submission until the database is created, migrated, tested and an admin notification path is chosen.

1. In Cloudflare Dashboard → Workers & Pages → D1, create database `zyenhomes-booking-requests` in the correct account. Copy its real database ID.
2. In `cloudflare/wrangler.toml`, add the binding below with the real ID. Do not invent an ID:

   ```toml
   [[d1_databases]]
   binding = "BOOKING_DB"
   database_name = "zyenhomes-booking-requests"
   database_id = "<actual Cloudflare D1 database UUID>"
   migrations_dir = "migrations"
   ```

3. From the `cloudflare` directory, run `npx wrangler d1 migrations apply zyenhomes-booking-requests --remote` after reviewing the migration. Use a limited Cloudflare API token.
4. Before enabling the website form, verify the D1 binding and table, implement monitoring and a staff notification, and perform a consent/no-consent test with non-real guest data.
5. Guesty inquiry synchronization is **not implemented**. The old Guesty inquiry test route is disabled. Verify Guesty Booking Engine API inquiry creation, its status effects and safe deduplication with Guesty support before adding a separate private sync job. Never claim that a request appears in Guesty until confirmed.
6. Configure retention, restricted admin access, encrypted backups, opt-out/unsubscribe workflow and Canadian marketing consent compliance before using the marketing view. Do not export non-consenting contacts for promotions.

The public endpoint is intentionally fail-closed with HTTP 503 until BOOKING_DB is configured. It independently re-quotes through Guesty; it does not create reservations, accept payments or hold inventory.

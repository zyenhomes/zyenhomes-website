# D1 migration 0001 reconciliation — review before any production write

Production D1 already contains booking_requests, its three indexes and marketing_opt_ins,
but d1_migrations has no rows. Both 0001 and 0002 appear pending.

## Guardrails

- Do not insert rows into d1_migrations manually.
- Do not run the existing Apply Guesty Message Archive Migration workflow yet:
  it would attempt all pending migrations.
- Do not drop or rebuild booking_requests.
- Keep GUESTY_WEBHOOKS_ENABLED and BOOKING_REQUESTS_ENABLED false.
- Preserve the recovery bookmark separately; D1 Time Travel retention is limited.

## Proposed safe procedure (requires separate approval)

1. Export a durable backup of the production D1 database; do not rely solely
   on a Time Travel bookmark.
2. Compare all columns, defaults, constraints, three indexes, and marketing
   view against 0001_booking_requests.sql. Verify the current request count.
3. Prepare a Wrangler configuration whose migrations directory contains ONLY
   an unchanged copy of 0001_booking_requests.sql, with the same remote D1
   database binding. Validate this procedure on a disposable database first.
4. Run Wrangler migration listing for that isolated directory and confirm
   ONLY 0001 is pending.
5. With explicit approval, apply that isolated 0001 through Wrangler. Because
   its statements use IF NOT EXISTS, existing matching objects should remain
   intact. Confirm Wrangler records 0001 in d1_migrations and that schema
   and record counts are unchanged.
6. Restore the normal migrations directory; confirm ONLY 0002 is pending.
7. Separately approve and apply 0002 after reviewing the D1 archive schema.

This file documents the plan; merging it does not run a workflow or change D1.

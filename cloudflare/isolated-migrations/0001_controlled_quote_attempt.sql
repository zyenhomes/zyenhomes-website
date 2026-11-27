-- ISOLATED TEST DATABASE ONLY. Never apply to production.
-- Deliberately outside the production migration directory.
-- A claim is consumed before any Guesty authentication or quote request.
CREATE TABLE controlled_quote_attempts (
  test_key TEXT PRIMARY KEY NOT NULL,
  run_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'claimed'
    CHECK (state IN ('claimed','verified','uncertain')),
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  quote_id TEXT,
  quote_expires_at TEXT,
  rate_plan_id TEXT,
  currency TEXT,
  total_cents INTEGER,
  CHECK (state <> 'verified' OR
    (quote_id IS NOT NULL AND quote_expires_at IS NOT NULL AND
     rate_plan_id IS NOT NULL AND currency = 'CAD' AND
     total_cents IS NOT NULL AND total_cents > 0))
);

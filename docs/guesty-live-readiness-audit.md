# Guesty inquiry integration — pre-live readiness review

**Status: NOT READY FOR LIVE WRITE.** This document is a review of the current source; no Guesty reservation response has been verified against a real inquiry.

## Implemented (isolated and mock-tested)
- Booking Engine inquiry POST path and guest payload (PR #184)
- Quote and rate-plan provenance checks (PRs #185–186, #192–194)
- D1 atomic claim and audit adapter (PRs #187, #196–197)
- Scoped write transport and end-to-end mock tests (PRs #198–199)
- Read-only Open API reconciliation helper (PR #200)
- Authenticated but compile-time disabled Worker inquiry route (PRs #189–195)

## Critical blockers before a controlled live test
1. **Reservation schema**: verify actual response from Guesty inquiry POST and actual GET reservation fields; current reconciliation assumes `status === "inquiry"`, top-level `quoteId` and `listingId`. The documentation's example `status: "reserved"` cannot establish an inquiry.
2. **Account ownership**: independently verify the reservation belongs to the correct Guesty account and Booking Engine integration; current read-only reconciliation does not prove account ownership.
3. **Write permission**: confirm Booking Engine integration's request-to-book configuration and endpoint authorization at test time.
4. **Database schema and bindings**: verify production D1 columns and attempt table match the SQL and that claims/audits are transactional. The isolated executor has not been exercised against live D1.
5. **Durable outcome**: implement and test a reconciliation-verified D1 transition, with manual review after network timeouts; never blindly retry a Guesty POST.
6. **Token isolation**: Booking Engine and Open API tokens are distinct; use the correct token for each read/write endpoint.
7. **Operational approval**: obtain separate explicit approval for a single identified test inquiry and separate approval for any Cloudflare deployment or enabling of write flags.
8. **Website path**: public booking request flow remains disabled; it must not be represented as fully integrated.

## Non-negotiable launch gates
- No automatic reservation confirmation or payment.
- No guest-facing write enabled by this review.
- No live inquiry POST without explicit per-test approval.
- No D1 success state without independently verified inquiry status, quote, listing and account.
- No automatic retries on uncertain Guesty responses.

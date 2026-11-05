# Isolated Worker version-only flag-change experiment

Status: **offline preparation only**. This PR does not upload, deploy, or modify any Worker.

## Target and invariant
- Only target `zyenhomes-webhook-test`, NEVER `zyenhomes-booking-api`.
- Record the test Worker's exact active version UUID, 100% traffic allocation, and exposed bindings before the experiment.
- Require a separate explicit user approval before creating any undeployed test version.
- Preserve existing `TEST_DUMMY_SECRET` and `TEST_PRESERVE_VARIABLE` and all other existing bindings.
- Create a new *undeployed* version with a single fictional flag `TEST_WEBHOOKS_ENABLED=true`; do not use the real `GUESTY_WEBHOOKS_ENABLED` on the isolated Worker.
- Never upload from the production `cloudflare/wrangler.toml` or copy production secrets.

## Before any isolated write
1. Confirm the installed Wrangler version and exact `wrangler versions upload` syntax, including its flag/variable handling.
2. Validate in a disposable local config that `versions upload` does not imply `deploy`, and that all existing bindings will be carried into the new version. Do not assume `keep_vars=true` preserves secrets across version uploads without checking.
3. Read the test Worker's deployed version, deployment history, and binding metadata. Fail closed on missing metadata, changed traffic, missing baseline bindings, or unexpected active version.
4. Use a protected, explicitly approved GitHub Actions job with a hard-coded isolated Worker name and a unique version message. No arbitrary Worker name inputs.

## After an approved isolated write
1. Confirm a distinct new version UUID exists and the original version still receives 100% of traffic.
2. Compare the new version's binding names, types, exposed targets, and safe plain-text values against baseline, allowing only the intended fictional flag.
3. Confirm the existing dummy secret binding remains present (its value cannot be independently read).
4. Stop and report if any binding disappears or changes unexpectedly; never promote the candidate.
5. Do not delete test versions or change production without further approval.

## Production is out of scope
An isolated test passing does **not** authorize production webhook activation. The production enabled version must be created under a separate approval, independently reviewed, then promoted under another approval. Booking submissions must remain disabled. Manual Guesty event replay requires separate authorization.

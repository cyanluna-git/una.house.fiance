# UF-TAX-002 Rollout Gate

This change is prepared locally only. Do not run a production command until the parent/operator reviews the private staging artifacts and approves transition.

## Scope

- Immutable `uf-tax-001.sql` SHA256 remains `76c0281eff26752d992cf6aef80699e7a42cee3b3d9f8758fff85f3d7bf210e9`.
- 002 admits 19 distinct financial field codes. National pension and the single included mortgage-interest component reuse `pension_deduction` and `housing_deduction`; their precise source labels remain in private coverage evidence. No aggregate/component sum is performed.
- Personal deduction components remain separate financial observations, not identity or family claims. The later printed personal total uses `basic_deduction` (basic plus additional in this source). No arithmetic personal total is invented for other sources.
- Agricultural special tax is out of this registration scope. No `rural_special` cells are registered or relabeled as local tax. Penalties in this national return remain `national`, with their subtype in `field_code`; historical `penalty` jurisdiction remains backward compatible.
- Empty/unassignable values remain NULL. Ancillary family expenditure, unused form boxes, eligible expense bases and carryforward schedules are explicitly excluded, not silently converted into deductions or credits.

## Application And Migration

1. Review code/SQL/checksums and private deterministic dataset. Deploy taxonomy-compatible application before registering new codes. Startup never runs migrations.
2. Use a dedicated idle SQLite connection. 002 runner disables foreign keys BEFORE BEGIN, rebuilds by CREATE/COPY/DROP/RENAME (never rename-old-first), preserves explicit IDs, self/inbound FKs, UNIQUE, discovered indexes and triggers, validates row equality/integrity/FKs, and inserts its checksum ledger in the same transaction. Do not execute standalone SQL using a tool that silently commits an open transaction.
3. Python production runner retains the exact resolved server DB allowlist. Its prepare/migrate/verify procedure now takes `--version uf-tax-002` and an independent `uf-tax-002-*` private backup/evidence directory. Prepare performs backup plus restore rehearsal. Existing 001 ledger must remain identical. No registration is implicit in migration.
4. Registration is a separate transaction. `scripts/tax-register.py` CLI deliberately accepts existing isolated scratch DBs only; do NOT weaken this guard for rollout. A parent-approved server operator wrapper may import `register` after server-side backup/legacy baseline and exact path checks. Its allowlisted INSERT-only authorizer rejects legacy writes, schema writes and settlement links. Stable IDs derive from manifest keys; duplicate key/hash collision and existing-content conflicts fail atomically. Identical replay inserts nothing and leaves bytes unchanged.
5. Verify legacy row/schema digests, migration checksums, FK/integrity, registration counts, all annual/version facts, unknown identity/family and zero settlement links. Verify the protected `/tax` DOM after deployment.

## Comparison And Rollback

Annual comparison selects exactly one explicit source version for each year. 2020 text-duplicate source has its own document but no independent version/income. 2024 image, reissued source, later return and receipt have separate provenance; receipt is comparison-only, never a payment. No cross-version income or total/component summation is permitted.

No automatic final-filing, payment, refund, identity or family confirmation. User's past housing-refund statement has unknown year. A five-won source difference is preserved, not rounded away.

After new codes exist, rollback must retain 002 schema/ledger and registered observations; use the prior application's raw-code fallback if necessary, or deploy a compatible fix. Never delete 002 ledger, rerun 001 to shrink its CHECK, or restore an old backup over intervening user writes. An actual restoration requires a separate maintenance-window review and backup reconciliation.

## Verification Environment

The existing shared dependency native addon is compiled for Node 22 ABI 127. Node 26 ABI 147 cannot load it. Local verification uses `/opt/homebrew/bin/node` v22.23.4 without rebuilding or altering the original repository's shared `node_modules`. Deployment must install dependencies under its own runtime as usual.

Private real data, originals, full text and identity identifiers are not fixtures and must not be committed. Private staging contains only allowlisted financial metadata, page links, hashes, source-cell evidence and unresolved-value reasons.

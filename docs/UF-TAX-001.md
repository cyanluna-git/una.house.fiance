# UF-TAX-001 manual annual review MVP

## Scope and safety

`/tax` and `/api/tax` retain existing shared household middleware authentication. No auth/public-route changes. All values are manual observations, not OCR results or tax advice. No Drive API, download, upload, sharing, payment creation, transaction creation or salary creation. Only safe Drive file links are built; page provenance is retained. Existing dashboard/income calculations do not read tax tables.

Use aliases and safe labels, never personal names, resident registration numbers, account identifiers, passwords or source full text. Input is a strict allowlist, bounded, and obvious sensitive patterns are rejected. This is not a general PII classifier: operators must still inspect labels and review notes. Errors are generic and request bodies are not logged. GET returns explicit column projections with no-store caching.

Identity starts unconfirmed. No most-recent-equals-final rule. Select comparison basis through an append-only `selection` review event, independent of filing status. No automatic paid/unpaid determination. Confirmation links mean reviewed allocation evidence only. A receipt cannot confirm payment. Mortgage eligibility statements with unknown repayment year are separate from document findings; the latter require page proof. Child/donation exclusion reasons remain unknown until reviewed.

## Schema / migration

Six standalone tables in `src/lib/tax/schema.ts`; `migrations/uf-tax-001.sql` is authoritative for SQL checks, compound foreign keys and indexes (column parity test included). Shared legacy schema/startup DDL is untouched. Tax connection is lazy and never creates files or runs migrations. Missing tables return 503 with migration guidance.

The migration runner intentionally permits ONLY explicit synthetic scratch paths, never default finance.db/test.db/development/production paths. Both ordinary and dangling symlinks and symlink parents are rejected. Dry-run is default:

```
./node_modules/.bin/tsx scripts/tax-migrate.ts /Users/cyanluna-mini6/.hermes/cache/scratch/<isolated-dir>/synthetic.sqlite
./node_modules/.bin/tsx scripts/tax-migrate.ts /Users/cyanluna-mini6/.hermes/cache/scratch/<isolated-dir>/synthetic.sqlite --apply
```

The script does not make an operational production rollout possible by accident. A future separately approved production rollout must first stop writers or use SQLite's online backup API (WAL-safe), verify backup integrity and restore into an isolated disposable location, inspect additive SQL and foreign keys, then apply through a separately reviewed operator procedure. Do NOT run the legacy startup migrations to install this feature. No real database was accessed in this task.

Rollback is disabling/removing the tax page/API/sidebar feature in code while leaving additive tax tables untouched. Do not restore a whole old database and do not run restore-db scripts. No destructive rollback SQL is provided.

## Review model

- Same Drive ID/revision/binary fingerprint is idempotent, cross-subject reuse rejected. Changed binary produces a new row. Same extracted text/different binary is only a duplicate candidate.
- Filename/content years are stored separately and mismatches flagged; a real following-year document needs its own version. Version context uses content year, never filename year.
- Facts require document/page provenance and integer amount or null; zero, signed refund/adjustment and original rounding are preserved. National/local/penalty and source/calculated are independent. Revisions append and point to prior observation, with no branching overwrite. Multiple observations stay visible; ambiguous competing settlement observations yield unknown reconciliation, never a summed guess.
- Reviews distinguish statements, document findings, explicit comparison selection and review events. Unknown year remains nullable.
- Settlement links reference exactly one existing transaction or payslip. Candidates preserve evidence uncertainty. Confirming a candidate appends a new row with `confirms_id`, never updates the candidate. Evidence must be payment (transaction), or payment/withholding (payslip), same subject/content year, with page.
- Allocation capacity is checked in an immediate SQLite transaction across all versions and subjects against absolute existing amount/net pay. Partial allocations are allowed; duplicate same-version/reference/status/jurisdiction is prevented. Net pay is only an upper bound, not proof of a tax component. Direction is human reviewed: existing card/manual transaction signs do not establish bank debit/credit semantics. A five-unit mismatch remains five, not normalized away.
- Candidate API: `GET /api/tax?view=candidates&from=2024-01-01&to=2024-12-31&page=1&pageSize=20`. All parameters required; real ISO calendar dates, ordered inclusive bounds, positive integer page and pageSize 1..100. Unknown/duplicate parameters rejected. Both sources return rows, total, page, pageSize, hasMore, sorted date DESC/id DESC; snapshots do not fetch candidates. UI date range and previous/next controls expose only ID/date/amount. Existing transactions and salary are never modified by tax operations.
- Explicit identity form reviews safe alias, optional existing family ID (no family names fetched) and confirmed/unconfirmed. Only tax_subjects changes; each action atomically appends timestamped immutable application history in tax_reviews. Masking cannot establish identity; no propagation to facts/filing/payment. No update/delete API exists for reviews.

## Parent Review Corrections

- Fact taxonomy now distinguishes salary, bonus, gross total, earned-income deduction/amount, taxable base, computed tax, named major deduction/credit components, and three named penalty components. Assessed/withheld/settlement remain independently scoped to national/local/penalty; generic legacy codes are compatibility-only, not substitutes. The manual picker, annual selected observations, and version cards use explicit Korean labels and retain source amounts.
- `report_class` explicitly supports `regular`, `late`, and `amended`; filename document kind and version kind never infer body classification. Legacy `annual` means subtype unknown. The fixture includes a correction-kind document whose body is late filing.
- Fact `review_status` is `observed` (default) or `verified`, append-only through fact supersession. This is independent of document extraction, subject identity and version filing status. No automatic status propagation.
- SHA256 fingerprints, Drive IDs and revision tokens are validated as opaque identifiers rather than scanned as free text. Alias/label/note still reject obvious sensitive patterns.
- Initial standalone SQL is retained unchanged in this review. `src/lib/tax/migrations.ts` adds a separate technical tax_migrations ledger (version/applied_at/SHA256 checksum). Runner strips only known standalone transaction markers and owns one immediate transaction containing DDL and ledger insert. Identical reruns return unchanged without timestamp/data changes; checksum drift rejects; failure rolls back DDL and ledger. Only the guarded synthetic runner invokes it; no production rollout is enabled.
- Prior tax-review logs are historical, not final-code validation. Current final manifest and timestamped verification artifacts record source mtimes, per-file SHA256, aggregate before/after hash and check start/end/exit. Source includes scripts/tests/config/migrations; generated .next, artifacts, node_modules and docs are excluded.

## Verification

```
./node_modules/.bin/vitest run -c vitest.tax.config.ts
./node_modules/.bin/tsc --noEmit
UNAHOUSE_DB_PATH=<guarded synthetic scratch DB> UNAHOUSE_ACCESS_KEY_BASE64=<synthetic key> ./node_modules/.bin/next build
```

Tax tests use :memory: or guarded mkdtemp scratch databases and a separate Vitest config, never the existing test.db fixture setup. Dashboard regression checks the actual dashboard handler before/after tax migration and fact registration with synthetic existing transactions/salary. Its legacy DB import is dynamically deferred until the explicit scratch path has been guarded. A synthetic category seed avoids the legacy CommonJS TypeScript seed-loader issue; no shared code was changed.

Browser check: run local isolated Next server on 127.0.0.1:3197 with synthetic auth key `synthetic-tax-local-only`, then `./node_modules/.bin/tsx scripts/tax-browser-check.mts`. The script verifies unauthenticated API 401, four sections, six years of synthetic source/version/fact/review entries, real form POST, desktop/mobile no horizontal page overflow and no JS page errors. Artifacts are in `artifacts/`; screenshots contain only synthetic records. No real Drive navigation is performed. Browser screenshot is evidence of layout, not a tax correctness claim.

Artifacts and the node_modules symlink are local-only execution aids, not intended for commit. The dependency symlink points to the existing repo's installed modules read-only; no dependency install or modifications were made there. No commits/push/deployment.

## Final frozen-source validation (2026-10-25)

- Final source last modification: 2026-10-25T01:28:03.257847+00:00 (10:28:03.257847+09:00). All source/test/script/config changes preceded checks.
- Check window: 2026-10-25T10:28:03.333998+09:00 through 10:29:50.058809+09:00. Exact per-command start/end/exit are in artifacts/verification-20261025T012803Z.json; artifacts/verification.json is the current pointer.
- Source manifest before/after SHA256: c9d783e844c5e1387a4161349f3793eda8e23a97feb847c201a538cb9ecc7e86. Per-file hashes and mtimes unchanged across every check. artifacts/uf-tax-final-manifest.json contains full before/after manifests. This documentation-only result update is excluded from source manifest scope.
- TypeScript and production build exit 0. Tax+auth/dashboard DB regressions: 24/24 tests, 11 files, no skips. Existing API: 120/120 tests, 12 files, no skips, through guarded synthetic DB and unique local port 3199; unsafe original fixture/global setup was not invoked.
- Tax browser exit 0: nine checks; no console/page/network errors; four sections, six-year annual values, real fact/subject/identity forms, 2024 range and next page for both sources, historical transaction candidate+confirmation with exact document/page, desktop/mobile screenshots and 390px no overflow. Screenshot visual inspection is not claimed.
- Existing layout: 73 passed / 4 failed, zero skipped, exit 1. All four failures are tests/layout/mobile-layout.spec.ts:181 custom contexts hardcoding baseURL 127.0.0.1:3106, ignoring isolated config port 3200; ECONNREFUSED before UI assertions. This is a harness port constraint, not an asserted tax/UI regression. No unrelated code was changed. Legacy e2e journey was not run because original global setup targets 3104 and tests hardcode 3105; unsafe original config never ran. No tests/db directory exists in this base.
- Earlier attempts are not final evidence: synthetic-init top-level-await CJS issue, duplicate synthetic merchant uniqueness, Playwright config import.meta/CJS interop, and missing normal category seed were corrected in isolated test scripts only; an unseeded parallel build hit SQLITE_BUSY. Final fresh synthetic seed/build pass. Initial existing API category assertion failed only with deliberately minimal seed; standard code-owned category rule seeds restored expected fixture semantics and final 120 pass. No production/development/real-user/Drive access, deploy, commit or push. All three final local servers were stopped in finally.

## Approved production rollout (2026-10-25)

The historical validation notes above describe pre-approval work. Gerald subsequently approved backup, additive migration and feature-only production deployment; tax data input remains unapproved.

- `scripts/tax-production-migrate.py` is the separate explicit operator entry point. It accepts only the resolved `/opt/demos/unahouse-finance/shared/finance.db`, verifies a private online backup and isolated restore rehearsal, checks all legacy schema/row digests, and applies the unchanged SQL plus the matching checksum ledger in one immediate transaction. No application startup import is used for migration. Re-running preserves the ledger timestamp.
- Backup/evidence remains server-only under `shared/backups/uf-tax-001-20261025Trollout/` (directory 0700, SQLite/evidence files 0600). Existing database/directory permissions and authentication remain unchanged. The deploy backup now uses umask 077; existing backup retention behavior is otherwise untouched.
- The previous release was started on a private disposable backup with additive tax schema at loopback 3119. Authenticated dashboard/income GETs passed; all legacy schema and row digests remained unchanged. That process was terminated by its exact PID.
- Migration applied at 2026-10-25T04:54:08.889Z (13:54:08.889 KST); SQL SHA256 `76c0281eff26752d992cf6aef80699e7a42cee3b3d9f8758fff85f3d7bf210e9`. Immediate rerun returned unchanged. All six tax data tables remain empty, ledger exactly one, integrity ok, legacy 14 tables/6190 rows unchanged.
- Latest local frozen validation: `artifacts/verification-20261025T045431Z.json`, 13:54:31-13:56:24 KST; manifest `a70e617c9e4675d52bb3d1534b5e23e9d4d247a7cf77e6b545148b46d2c3dbb8` unchanged throughout. TypeScript, build, 24 tax tests, 120 existing API tests, 77 layout checks, 11 journey checks plus one existing placeholder, nine tax browser checks pass. Separate Python production-runner atomicity/idempotency/checksum/rollback test passes. Own local test processes stopped.
- No production POST/data entry, source row edits, ACL/auth/key changes or database restore is part of rollout. Rollback switches the application symlink to the prior release and reloads only this PM2 application; additive tables and all real data remain intact.

Remaining limits: tax data snapshot is manual MVP, not OCR or tax advice; identity history is immutable through application APIs rather than database tamper-proof storage. Production authenticated verification uses read-only GETs; no production form submission or synthetic fixtures are permitted.

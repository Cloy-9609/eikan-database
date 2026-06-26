# Core regression tests

Core regression tests use Node.js built-in `node:test` with temporary SQLite databases created by `tests/helpers/testContext.js`.

## Player registration and snapshot coverage

- `tests/core/player-registration.test.js` verifies `POST /api/players`, first snapshot creation, `player_series` creation, relation persistence, detail retrieval, series retrieval, and the minimal `snapshot_label` list filter.
- `tests/core/player-snapshot-regression.test.js` fixes the current player snapshot behavior as regression tests: official timeline seed selection, missing-middle snapshot fallback to the nearest previous official snapshot, relation cloning, note/evidence non-copying, user payload precedence, no future fallback, duplicate rejection, timeline ordering/current snapshot behavior, legacy `post_tournament` read compatibility, and seed API validation errors.
- `tests/helpers/playerFixtures.js` builds valid school/player payloads and relation fixtures without copying production data or writing to the normal application database.

## Players list search, filter, sort, and validation coverage

- `tests/core/players-list-validation.test.js` fixes production query validation for admission-year range direction and ability `min > max` handling.
- `tests/core/players-search-filter.test.js` verifies `GET /api/players` search and filter behavior with an isolated temporary DB: one row per `player_series`, latest official snapshot selection, legacy-only snapshot read compatibility, player-name and school-name partial search, trailing `高校` search normalization, `school_id`, admission-year ranges and legacy `admission_year`, player type, series grade, roster status, exact and aggregate positions, legacy `position_type`, `snapshot_label`, ten ability range filters, snapshot-specific ability/position filtering, and multi-condition AND searches.
- `tests/core/players-sort.test.js` verifies `GET /api/players` ordering with a separate isolated temporary DB: normal sort keys, roster-status CASE ordering, official snapshot timeline ordering, explicit `updated_at` timestamps, default sort equivalence, ten ability sorts, null ability values at the end in both directions, and snapshot-specific ability sorting.
- `tests/helpers/playersListFixtures.js` provides list-test-only fixture helpers that create data through the HTTP API and only adjust regression-control fields in the temporary SQLite database.

## School year progression and undo coverage

- `tests/core/school-year-progression.test.js` fixes the current production behavior for `POST /api/schools/:id/progress-year`, `POST /api/schools/:id/progress-year/undo`, and `GET /api/schools/:id/player-series`.
- The test creates schools and player snapshots through the HTTP API, then directly adjusts `player_series.school_grade` and `roster_status` only inside the temporary test database to build exact progression states.
- Covered cases include empty-school rejection, 1年→2年, 2年→3年, active 3年→graduated, already graduated preservation, no automatic snapshot or relation mutation, progress log rows, undo availability, complete undo restoration, double-undo rejection, latest-only undo after multiple progressions, re-progression after undo, year upper-limit rejection, and ID/not-found validation.

## Safety rules

- Set `EIKAN_DB_PATH` before requiring backend modules; use `createTestContext()` for that setup.
- Keep one test context per test file because the DB module resolves the SQLite path at require time.
- Do not use the normal `database/eikan-app.sqlite` for fixtures.
- Start servers with port `0`; never depend on port `3000`.
- Close the HTTP server, hot reload resources, DB connection, and temporary directory in cleanup.

## Recommended commands

```text
node --check tests/helpers/playerFixtures.js
node --check tests/helpers/playersListFixtures.js
node --check tests/core/player-registration.test.js
node --check tests/core/player-snapshot-regression.test.js
node --check tests/core/school-year-progression.test.js
node --check tests/core/players-list-validation.test.js
node --check tests/core/players-search-filter.test.js
node --check tests/core/players-sort.test.js
npm run test:core
npm run db:check:test
npm run verify:all
```

# Core regression tests

Core regression tests use Node.js built-in `node:test` with temporary SQLite databases created by `tests/helpers/testContext.js`.

## Player registration and snapshot coverage

- `tests/core/player-registration.test.js` verifies `POST /api/players`, first snapshot creation, `player_series` creation, relation persistence, detail retrieval, series retrieval, and the minimal `snapshot_label` list filter.
- `tests/core/player-snapshot-regression.test.js` fixes the current player snapshot behavior as regression tests: official timeline seed selection, missing-middle snapshot fallback to the nearest previous official snapshot, relation cloning, note/evidence non-copying, user payload precedence, no future fallback, duplicate rejection, timeline ordering/current snapshot behavior, legacy `post_tournament` read compatibility, and seed API validation errors.
- `tests/helpers/playerFixtures.js` builds valid school/player payloads and relation fixtures without copying production data or writing to the normal application database.

## Safety rules

- Set `EIKAN_DB_PATH` before requiring backend modules; use `createTestContext()` for that setup.
- Keep one test context per test file because the DB module resolves the SQLite path at require time.
- Do not use the normal `database/eikan-app.sqlite` for fixtures.
- Start servers with port `0`; never depend on port `3000`.
- Close the HTTP server, hot reload resources, DB connection, and temporary directory in cleanup.

## Recommended commands

```text
node --check tests/helpers/playerFixtures.js
node --check tests/core/player-registration.test.js
node --check tests/core/player-snapshot-regression.test.js
npm run test:core
npm run db:check:test
npm run verify:all
```

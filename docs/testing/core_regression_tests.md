# Core regression test foundation

## Purpose

The core regression test foundation uses Node.js standard `node:test` and `node:assert/strict` only. It is intended to let later tasks add regression tests for player snapshots, school year progression, and `players` search/sort behavior without touching the normal development database.

## Commands

- `npm run test:core`
  - Recursively finds `.test.js` files under `tests/core/` with a Node.js runner script.
  - Runs the Node test runner with `--test` and `--test-concurrency=1`.
- `npm run db:check:test`
  - Creates a fresh SQLite database under the OS temp directory.
  - Initializes schema through the existing backend `initializeDatabase()` flow.
  - Runs the DB integrity diagnostic against that temporary database only.
- `npm run verify:all`
  - Runs `npm run check:all`, `npm run test:core`, `npm run db:check:test`, and `npm run diff:check` in order.

## Safety rules

- Do not add Jest, Vitest, Mocha, Playwright, Supertest, or other test dependencies for core regression tests.
- Tests must use temporary SQLite files under `os.tmpdir()`.
- Tests must not copy or seed from `database/eikan-app.sqlite`.
- Tests must not write fixtures into the normal database.
- `EIKAN_DB_PATH` must be set before requiring `backend/app.js`, `backend/db/database.js`, or any backend module that can indirectly load the DB module.
- Test servers must use `startServer(0)` so the OS picks an available port.
- Tests must read the actual port from `server.address()`.
- A development server on `localhost:3000` can remain running because core tests do not bind to fixed port 3000.
- Cleanup must close the HTTP server, call `cleanupHotReload()`, close the SQLite connection, and remove the temporary directory including journal files.
- Cleanup must be registered with `t.after()`, `after()`, or `finally` so failures do not leave servers, DB handles, watchers, or temp files behind.
- Test files are initially run serially for reproducibility. Parallelization should only be enabled after DB and server isolation have been reviewed.

## Current scope

Task 6.3-1 adds only the reusable foundation and a minimal smoke test. Full domain regression tests for player snapshot creation, snapshot seed behavior, school year progression/undo, and `players` search/sort should be added in follow-up tasks 6.3-2 through 6.3-4.

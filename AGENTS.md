# AGENTS.md

## 1. Project Overview

This repository is the development workspace for the 栄冠データベース作成プロジェクト.

The goal of this project is to build a local web application for managing, viewing, editing, and later analyzing 栄冠ナイン-style school and player data.

The current focus is:

- Managing schools.
- Registering and editing players.
- Viewing player lists and player details.
- Managing player snapshots over time.
- Improving UI and development workflow.
- Preparing for future OCR support, but OCR itself is not the current priority.

This project is primarily a local development tool. It is currently focused on PC/browser usage, with responsive support for narrower widths where practical.

When working on this repository, prioritize preserving existing behavior and making small, well-scoped changes.

---

## 2. Tech Stack and Architecture

The project uses:

- Node.js
- Express
- SQLite
- Static frontend pages
- Plain JavaScript, HTML, and CSS

Current package scripts include:

- `npm run dev`
  - Starts the development server with backend watch and frontend reload support.
- `npm run dev:watch`
  - Alias for the same development server watch flow.
- `npm start`
  - Starts the backend without watch.
- `npm run db:reset`
  - Recreates the local database from schema.
- `npm run db:migrate`
  - Runs migration script.

The frontend is served statically from Express.

Important directories:

- `backend/`
  - Express app, routes, controllers, services, models, DB setup, constants.
- `frontend/pages/`
  - HTML pages.
- `frontend/js/api/`
  - API wrappers.
- `frontend/js/pages/`
  - Page-specific JavaScript.
- `frontend/js/components/`
  - Reusable frontend components.
- `frontend/js/constants/`
  - Frontend constants.
- `frontend/js/utils/`
  - Shared frontend helpers.
- `frontend/css/`
  - CSS files for pages and shared layout.
- `database/`
  - Local SQLite files.
- `docs/`
  - Requirements, design notes, decisions, debug memos, future ideas.

The default SQLite database is currently:

- `database/eikan-app.sqlite`

The environment variable `EIKAN_DB_PATH` may be used to point to another DB file.

---

## 3. Development Commands

Use the existing scripts unless explicitly asked to add or change scripts.

Common commands:

- Install dependencies:
  - `npm install`

- Start development server:
  - `npm run dev`

- Explicit watch start:
  - `npm run dev:watch`

- Start without watch:
  - `npm start`

- Reset DB:
  - `npm run db:reset`

- Run migrations:
  - `npm run db:migrate`

- Backend syntax check examples:
  - `node --check backend/app.js`
  - `node --check backend/services/playerService.js`
  - `node --check backend/services/schoolService.js`
  - `node --check backend/models/playerModel.js`
  - `node --check backend/models/schoolModel.js`

- Frontend ES module syntax check examples:
  - PowerShell:
    - `Get-Content -Raw -Encoding UTF8 frontend\js\pages\player_edit.js | node --input-type=module --check`
    - `Get-Content -Raw -Encoding UTF8 frontend\js\pages\player_detail.js | node --input-type=module --check`
    - `Get-Content -Raw -Encoding UTF8 frontend\js\pages\players.js | node --input-type=module --check`
    - `Get-Content -Raw -Encoding UTF8 frontend\js\pages\school_detail.js | node --input-type=module --check`
  - Bash:
    - `node --input-type=module --check < frontend/js/pages/player_edit.js`
    - `node --input-type=module --check < frontend/js/pages/player_detail.js`
    - `node --input-type=module --check < frontend/js/pages/players.js`
    - `node --input-type=module --check < frontend/js/pages/school_detail.js`

- Whitespace check:
  - `git diff --check`

Do not start the local server or perform HTTP 200 checks unless the user explicitly asks.
The user usually performs final browser verification.

---

## 4. Core Development Rules

Always inspect the current code before changing it.

Prefer small, focused changes.

Use one task = one purpose.

Avoid broad refactors unless explicitly requested.

Preserve existing behavior unless the user clearly asks to change it.

Do not silently change data semantics.

Do not add dependencies unless there is a strong reason.

Do not change schema, migrations, backend update APIs, or management code rules unless explicitly requested.

If a change might affect existing data, explain the risk.

If something is ambiguous, choose the safest minimal implementation and report the assumption.

When implementing UI changes, do not redesign the whole page unless requested.

When editing prompts or documents for the user, keep the output easy to copy.
When asked to output a Codex prompt, use one continuous code block unless the user requests otherwise.

---

## 5. UI and Design Rules

The UI direction is:

- Use a baseball-game-like UI concept.
- Do not recreate パワプロ UI exactly.
- Do not trace screenshots.
- Do not use official assets.
- Do not imitate exact colors, borders, shadows, fonts, button shapes, or layout proportions.
- Abstract the information hierarchy and interaction flow, then redesign it as an original UI.

Safe wording:

- OK: 野球ゲーム風UI
- OK: スポーツゲーム風UI
- Avoid: パワプロ完全再現
- Avoid: パワプロ再現

Follow `UI_design_guidelines.md` when making UI changes.

General UI rules:

- Prefer readable spacing and clear grouping.
- Use existing page tone and component style.
- Keep cards, chips, buttons, and badges visually consistent.
- Avoid overusing strong colors.
- Keep mobile and narrow-width layouts from breaking.
- For important values, use compact but clear visual treatment.
- Do not expose internal keys directly to users.

Internal or implementation-like words should generally be hidden or replaced.

Examples:

- `snapshot` -> 登録時点, 時点
- `snapshot_label` -> 登録時点
- `series` -> do not display unless necessary
- `player_edit` -> 編集画面
- `target_position` -> 対象ポジション
- `scope` -> do not display
- `query` -> do not display
- internal IDs -> do not display unless explicitly needed

Internal wording cleanup is useful, but should usually be done after feature implementation unless it is directly related to the current task.

---

## 6. Data Model and Domain Rules

### Schools

School data includes:

- name
- start year
- current year
- rule mode
- popularity
- archived state
- created_at / updated_at

School-related pages include school list, school detail, year progression, undo, and player membership display.

Do not break school year progression or undo unless explicitly working on those features.

### Players and Player Series

The project uses a series + snapshot model.

- `player_series`
  - Represents a logical player across time.
- `players`
  - Represents a snapshot of that player at a specific registered point.

A single logical player may have multiple snapshots.

Lists should generally avoid duplicating one player unless the page is explicitly about snapshots.

### Snapshot Timeline

The current official snapshot timeline is:

- `entrance` -> 入学時
- `y1_summer` -> 1年夏大会後
- `y1_autumn` -> 1年秋大会後
- `y1_spring` -> 1年春大会後
- `y2_summer` -> 2年夏大会後
- `y2_autumn` -> 2年秋大会後
- `y2_spring` -> 2年春大会後
- `y3_summer` -> 3年夏大会後
- `graduation` -> 卒業時

Known legacy or compatibility values include:

- `admission` -> 入学時
- `post_tournament` -> 大会後
- `y3_autumn` -> 3年秋大会後, if present in legacy display code

Do not show raw keys such as `y2_spring` to users.
Use snapshot label helpers where available.

Frontend helper file:

- `frontend/js/utils/playerSnapshots.js`

Backend constant file:

- `backend/constants/playerSnapshots.js`

Keep frontend and backend snapshot definitions consistent.

### Player Common Fields

Common player information includes:

- name
- school
- player type
- school grade
- roster status
- admission year
- prefecture or foreign country
- throwing / batting hand
- main position
- total stars

### Total Stars

`total_stars` represents overall star rating.

Current intended behavior:

- User-facing range: 1 to 999.
- Empty input is treated as unset.
- Database may use 0 as unset sentinel.
- Display pages should generally show unset as `—`.
- Do not show 0 as a meaningful star value.

Pages that may display total stars:

- `players.html`
- `school_detail.html`
- `player_detail.html`
- `player_edit.html`

### Pitcher Data

Pitcher data includes:

- velocity
- control
- stamina
- pitch types
- pitch movement chart

Do not modify pitch movement logic unless the task is specifically about pitch UI or pitch data.

### Batter Data

Batter data includes:

- trajectory
- contact / meat
- power
- run speed
- arm strength
- fielding
- catching

### Sub Positions

Sub positions are edited in `player_edit`.

When arriving from `player_detail` defense map with `target_position`, the form may create an unsaved row in the editor if the target sub position is not already registered.

Important rules:

- Do not save automatically.
- Do not auto-fill rank or numeric values.
- Do not duplicate an existing sub position row.
- Existing validation should handle incomplete rows.

### Special Abilities

Special abilities are edited via relation editors.

Avoid broad changes to special ability structures unless explicitly requested.

---

## 7. Page Responsibilities

### `index.html`

Project entry page.

Should link to major areas such as players and schools.

### `schools.html`

School list and school management entry.

Includes school creation, search, sort, and navigation to school detail.

### `school_detail.html`

School detail and membership page.

Responsibilities include:

- Showing school information.
- Showing player list for the school.
- Year progression.
- Undo.
- Editing school-related details.
- Showing player name and main position in a user-friendly way.
- Showing total stars where appropriate.

Do not break year progression, undo, or editing accordion unless directly working on those features.

### `players.html`

Player list and quick-detail page.

Current direction:

- Player list is based on player series, not every snapshot row.
- It includes search, sort, filters, and URL query sync.
- It includes a row accordion for quick details.
- It includes total stars column.
- The player name cell has the accordion toggle.
- It should remain a list + quick confirmation page, not a full detail/edit page.

The accordion may show:

- basic quick information
- pitcher / batter abilities
- special abilities
- sub positions
- compact pitch movement chart for pitchers
- links to detail and edit pages

### `player_detail.html`

Read-only detail and history page.

Current direction:

- Detailed viewing.
- Snapshot history confirmation.
- No direct editing inside `player_detail`.
- Editing should go to `player_edit`.
- Defense position map may be used as a navigation aid to `player_edit`, but it must not save data directly.
- Snapshot timeline buttons should remain usable.
- Current snapshot should be clear.

Do not restore direct edit modals or save calls inside `player_detail`.

### `player_edit.html`

Editing page.

Responsibilities include:

- Editing basic player information.
- Editing total stars.
- Editing pitcher abilities.
- Editing batter abilities.
- Editing pitch types.
- Editing sub positions.
- Editing special abilities.
- Handling targeted navigation from `player_detail`.

When receiving query parameters such as `scope`, `target_position`, or `position_role`, use them as UI guidance only.
Do not automatically save or change data unless the user edits and saves.

---

## 8. Current Feature State Notes

The latest backup contains these notable current behaviors:

- Development server watch is implemented via `scripts/dev-server.js`.
- `npm run dev` and `npm run dev:watch` both use the development server.
- `players.html` has a row accordion for quick detail.
- `players.html` has a total stars column.
- `player_detail.html` is oriented toward viewing and snapshot history.
- `player_detail.html` shows school name in the page kicker area.
- `player_detail.html` has a total stars summary card.
- `player_detail.html` defense map does not edit directly; it navigates to `player_edit`.
- Defense map selection uses a confirmation flow before navigating.
- `player_edit.html` supports total stars input.
- `player_edit.html` supports `target_position` handling from defense map navigation.
- `player_edit.html` may create an unsaved sub-position row for a target sub position.
- `frontend/js/utils/playerSnapshots.js` exists and should be preferred for frontend snapshot label helpers.
- `backend/constants/playerSnapshots.js` exists and should stay consistent with frontend snapshot definitions.

---

## 9. Implementation Priorities

General priority order:

1. Fix blocking bugs.
2. Preserve data correctness.
3. Improve edit and save flows.
4. Improve navigation clarity.
5. Improve display consistency.
6. Clean up internal wording.
7. Add larger future features.
8. OCR MVP.

Current near-term priorities:

- Keep existing screens stable.
- Improve snapshot selection consistency between `player_detail` and `player_edit`.
- Continue aligning display names with user-friendly baseball terms.
- Avoid broad UI or schema refactors.

OCR is intentionally lower priority unless the user explicitly asks for it.

---

## 10. Do Not Touch Without Explicit Request

Do not modify these areas unless the user explicitly requests it:

- OCR implementation.
- DB schema or migrations.
- Management code specification.
- Major backend update API behavior.
- School year progression logic.
- School undo logic.
- Major redesign of defense position map.
- Major redesign of pitch type editor.
- Major redesign of sub position editor.
- Major redesign of special ability editor.
- Full-page redesigns.
- Database reset behavior.
- Authentication, deployment, or hosting assumptions.

If a requested task appears to require one of these, explain why and keep the change minimal.

---

## 11. Verification Policy

Always run the smallest meaningful checks for the files changed.

For backend CommonJS files, use `node --check`.

Examples:

- `node --check backend/app.js`
- `node --check backend/services/playerService.js`
- `node --check backend/models/playerModel.js`

For frontend ES module files, use stdin with `node --input-type=module --check`.

PowerShell examples:

- `Get-Content -Raw -Encoding UTF8 frontend\js\pages\player_edit.js | node --input-type=module --check`
- `Get-Content -Raw -Encoding UTF8 frontend\js\pages\player_detail.js | node --input-type=module --check`
- `Get-Content -Raw -Encoding UTF8 frontend\js\pages\players.js | node --input-type=module --check`

Bash examples:

- `node --input-type=module --check < frontend/js/pages/player_edit.js`
- `node --input-type=module --check < frontend/js/pages/player_detail.js`
- `node --input-type=module --check < frontend/js/pages/players.js`

Always run:

- `git diff --check`

If only CSS changed, JS syntax checks may be unnecessary.
If backend files changed, check the changed backend files.
If frontend JS files changed, check the changed frontend JS files.

Do not run local server or HTTP 200 checks unless explicitly requested.
Do not claim browser verification was done unless actually done.
The user normally performs final browser checks.

---

## 12. Required Response Format

When reporting completed work, use this format:

1. 変更の概略

2. 変更ファイル一覧

3. 差分の意図
   - Explain why the change was needed.
   - Explain how the implementation addresses the issue.
   - Explain how existing behavior was preserved.

4. 具体的な変更コード
   - Include concise excerpts.
   - Match code excerpts to the intentions described in section 3.
   - Do not paste entire files unless explicitly requested.

5. 確認結果
   - Include syntax check results.
   - Include `git diff --check` result.
   - State clearly if browser/server verification was not performed.

6. 見た目・操作感の変化
   - For UI changes, explain what changed visually or operationally.

7. 既存機能への影響
   - Explain effects on related pages and APIs.
   - State if backend/API/DB schema were unchanged.

8. 次に触ると自然な候補
   - Suggest the next small, natural follow-up task.

If the user requests additional sections, follow the user’s requested format.

Important user preference:

- Always include `差分の意図`.
- Always include `具体的な変更コード`.
- `具体的な変更コード` should correspond to `差分の意図`.
- Avoid vague reports such as “adjusted styling” without explaining the actual implementation.
- Do not claim checks were run unless they were actually run.

---

## 13. Prompt Writing Rules

When asked to create a prompt for Codex:

- Output one continuous code block.
- Do not split the prompt into many fragmented code blocks.
- Avoid nested fenced code blocks inside the prompt.
- If examples are needed inside the prompt, use inline code or indented text instead of triple backticks.
- Make the prompt easy to copy in one action.
- Include:
  - purpose
  - current problem
  - desired behavior
  - allowed files
  - files not to touch
  - existing behavior to preserve
  - verification method
  - required output format

Keep Codex prompts specific and scoped.
Avoid asking Codex to perform multiple unrelated tasks in one prompt.

---

## 14. Codex Cloud Workflow

For Codex Cloud Agent work:

- Use the GitHub repository as the source of truth.
- Use `codex/staging` as the integration branch for Codex outputs and the branch for real browser verification.
- Create task branches from `codex/staging` using the `codex/<task-name>` naming pattern.
- Use one PR per purpose, targeting `codex/staging` unless the user explicitly instructs otherwise.
- Read current code before changing it, and keep changes small and reviewable.
- Run `npm run check:all` and `npm run diff:check` before committing when the task expects the standard Codex verification flow.
- For low-risk small to medium tasks, Codex may push the task branch, create a normal PR to `codex/staging`, and squash merge it with the GitHub API only when the PR is `mergeable clean` and all required verification commands succeeded. Delete the task branch after a successful squash merge.
- For high-risk tasks, or medium-risk but large tasks, stop after creating the PR. Do not merge automatically.
- Never push directly to `main` or `develop`.
- Do not rely on local zip backup once repository workflow is established.
- If the repository state differs from a zip backup, prefer the repository unless the user says otherwise.

Risk judgment examples for Codex work:

- Low-risk examples: `README.md` / `AGENTS.md`, wording fixes, minor CSS, display-only small fixes, and UI adjustments that do not touch existing logic.
- High-risk examples: DB schema / migration, save/update/delete logic, snapshot creation or overwrite logic, `player_edit` / `player_detail` navigation, API contract changes, import/export, and changes spanning multiple screens.

Recommended Cloud Environment setup:

- Install dependencies with `npm install`.
- Use Node.js compatible with the current project.
- Do not require browser-based verification in the cloud environment.
- Use syntax checks and `git diff --check` as baseline checks.

---

## 15. Documentation Rules

Update documentation only when it helps future development.

Good documentation targets:

- `README.md`
- `docs/design/`
- `docs/requirements/`
- `docs/debug/`
- `docs/decisions/`

Do not over-document small CSS-only changes unless the change affects workflow, API, data model, or long-term design.

If adding or changing behavior that affects project rules, consider updating this `AGENTS.md`.

---

## 16. Future Cleanup Notes

Later cleanup candidates:

- Internal wording cleanup across screens.
- Snapshot terminology unification.
- Shared snapshot helper consolidation.
- UI token organization.
- Component commonization.
- Better check scripts in `package.json`.
- Possible `npm run check:frontend`.
- Possible `npm run check:backend`.
- Possible `npm run check:all`.
- OCR MVP planning.

Internal wording cleanup should generally be done after major feature implementation stabilizes.

Suggested replacements:

- `snapshot` -> 登録時点 or 時点
- `snapshot_label` -> 登録時点
- `series` -> normally hide from UI
- `scope` -> do not display
- `target_position` -> 対象ポジション
- `player_edit` -> 編集画面
- raw IDs -> do not display unless needed for debugging

---

## 17. Safety and Quality Notes

Be honest about uncertainty.

If a requirement conflicts with current code, report it.

If a change risks data loss, stop and explain before proceeding.

If a task can be completed without schema changes, avoid schema changes.

If a task requires schema changes, explain why and keep them minimal.

If a task requires changing validation, consider both frontend and backend behavior.

If a task affects user-visible text, avoid internal implementation terms.

If a UI task references パワプロ-like design, follow the safety rule:
Use the idea and interaction pattern only, then redesign as an original baseball-game-like UI.

Do not use official assets, copied screenshots, or exact UI reproduction.
---

## 18. Core Regression Test Foundation

- Core regression tests use Node.js standard `node:test` and `node:assert/strict`.
- Do not add Jest, Vitest, Mocha, Playwright, Supertest, or other external test frameworks for core tests.
- Run core tests with `npm run test:core`.
- Run temporary DB diagnostics with `npm run db:check:test`.
- Run the standard all-in-one verification with `npm run verify:all`.
- Core tests must use only temporary SQLite databases under the OS temp directory.
- Set `EIKAN_DB_PATH` before requiring `backend/app.js`, `backend/db/database.js`, or backend modules that may load the DB module.
- Start test servers with `startServer(0)` and read the actual port from `server.address()`.
- Do not use fixed test ports such as 3000 or 3001; core tests must coexist with a development server on port 3000.
- Cleanup must close the HTTP server, call `cleanupHotReload()`, close the DB connection, and remove the temporary directory.
- Do not write test fixtures to `database/eikan-app.sqlite`.
- Core test files are initially run serially with `--test-concurrency=1`.
- Task 6.3-1 provides only the foundation and a smoke test; player snapshot, school progression, and players search/sort regression tests should be added in later tasks.

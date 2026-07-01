# eikan-database

栄冠ナインの学校・選手データを管理するためのローカル Web アプリです。
`Express + SQLite + 静的フロントエンド` で構成されています。

## 現在の状態

2026年7月時点では、Phase 1 は完了済みで、現在地は Phase 2後半〜終盤入口です。

### 実装済みの主要機能

- 学校管理
  - 学校作成、一覧、詳細、編集、論理削除
  - 学校一覧の basic 検索・sort
  - 学校年度進行と直前 1 回 undo
- schools / players の URL検索状態同期
  - URL共有・reload・back / forward復元
  - legacy query互換
  - schools stale response protection
- 選手管理
  - 選手登録、詳細、編集
  - `player_series` / `players` snapshot 管理
  - snapshot 作成・切替・編集
  - snapshot表示時点選択
- 独立した `players.html` 全体選手一覧
  - 基本検索・絞り込み
  - 通常能力範囲検索
  - 通常能力 sort
  - 一覧内 accordion 簡易詳細
- relation 系編集
  - 変化球
  - 特殊能力
  - サブポジション
- `player_detail` の守備位置図
- 管理コード基盤
  - `school_code`
  - `series_no`
  - `snapshot_key`
  - 生成 helper、migration、backfill
- テスト・CI 基盤
  - Node.js 標準の `node:test` による core regression test
  - OS 一時ディレクトリ上の SQLite DB を使う安全なテスト
  - frontend 構文確認と frontend ESLint
  - URL state pure tests、latest request runner tests、History URL helper tests
  - `npm run verify:all` による構文確認・frontend lint・core 回帰テスト・一時DB診断・空白確認の一括実行
  - GitHub Actions の `verify-all` による PR merge 前の自動検証

### 未実装または本格整備前

- OCR本体MVP
- DB backup / restore
- export / import
- 公開用の認証・権限管理・ユーザー所有権
- 管理コードの画面表示・検索・export連携への本格展開

### 基本構成

- バックエンドは起動時に SQLite に接続し、空の DB であれば `backend/db/schema.sql` を自動適用します。
- 既定の DB ファイルは `database/eikan-app.sqlite` です。
- フロントエンドは `frontend/` 配下を `Express` から静的配信しています。

## 起動方法

### 開発サーバー起動

- 開発用: `npm run dev`
- 明示的な watch 起動: `npm run dev:watch`
- PowerShell の実行ポリシーで `npm.ps1` が止まる場合: `cmd /c npm run dev`

起動後は以下を開きます。

- トップ: `http://localhost:3000/`
- 学校一覧: `http://localhost:3000/pages/schools.html`
- 選手一覧: `http://localhost:3000/pages/players.html`

開発サーバーでは以下が自動で行われます。

- `backend/` 配下の変更: Node サーバーを停止し、`require.cache` をクリアして再起動します。
- `frontend/` 配下の HTML / CSS / JS 変更: 開いているページへ reload イベントを送り、ブラウザを再読込します。
- 追加の開発依存は使わず、Node.js 標準の `fs.watch` ベースで動作します。

### 通常サーバー起動

- 通常: `npm start`
- PowerShell の実行ポリシーで `npm.ps1` が止まる場合: `cmd /c npm start`

`npm start` は watch なしの単純起動です。backend 変更を反映するには手動再起動が必要です。

## 開発時の確認コマンド

`package.json` があるディレクトリで実行します。

- backend 構文確認: `npm run check:backend`
- frontend 構文確認: `npm run check:frontend`
- frontend ESLint: `npm run lint:frontend`
- 一括確認: `npm run check:all`
- core回帰テスト: `npm run test:core`
- DB 診断: `npm run db:check`
- 一時DB診断: `npm run db:check:test`
- 総合確認: `npm run verify:all`
- 差分の空白確認: `npm run diff:check`

GitHub Actions でも `npm run verify:all` を実行します。workflow status 名は `verify-all` です。詳細は `docs/testing/github_actions.md` を参照してください。

`npm run db:check` は以下を実行します。

```text
node scripts/diagnostics/check-data-integrity.js
```

この診断 script は、`EIKAN_DB_PATH` が指定されている場合はそのDBを、未指定の場合は既定の `database/eikan-app.sqlite` を確認します。必須table/column、`school_code`、`(school_id, series_no)`、`players(player_series_id, snapshot_label)` の重複を重大な異常として扱い、異常時は非0終了します。sample 表示は確認補助であり、それ自体は失敗条件ではありません。

`npm run db:check:test` は OS 一時ディレクトリに fresh なSQLite DBを作成し、既存の `initializeDatabase()` で schema を初期化してから診断します。通常DBを参照しないため、`verify:all` では通常DB向けの `db:check` ではなく `db:check:test` を使います。

`npm run lint:frontend` は ESLint で frontend JS / MJS を静的解析し、`no-undef` / `no-redeclare` / `no-unreachable` などを error として扱います。`npm run verify:all` には `npm run lint:frontend` が含まれます。

`npm run test:core` は Node.js 標準の `node:test` / `node:assert/strict` を使います。外部テストframeworkやHTTP client dependencyは使いません。DBを必要とする選手登録、snapshot 作成・seed・重複防止、players 一覧 validation・検索・sort、学校年度進行・undo などの backend / API 結合 test は、`EIKAN_DB_PATH` を backend require 前に OS 一時ディレクトリのSQLiteへ向けて実行します。一方、school / player URL state pure tests、latest request runner tests、History URL helper tests は DB を使わず Node.js 標準機能だけで動作します。テストサーバーは `startServer(0)` で空きポートを使用するため、開発サーバーが `localhost:3000` で起動中でも競合しません。テスト終了時は HTTP server、hot reload watcher、DB接続、一時fileをcleanupし、通常DBを保護します。詳細は `docs/testing/core_regression_tests.md` を参照してください。

実ブラウザ確認は必要に応じて別途行います。

## Branch 運用

- `develop`: ユーザーが安定版を保管・統合する branch
- `codex/staging`: Codex成果物の統合・実ブラウザ確認用 branch
- `codex/<task>`: Codex作業 branch
- Codex task PR の base は原則 `codex/staging`
- `codex/staging` で実ブラウザ確認後、ユーザー判断で `develop` へ取り込みます
- Codex は `develop` や `main` へ直接 push しません

## Codex Cloud / GitHub連携での開発フロー

- GitHub repository `Cloy-9609/eikan-database` を作業の基準にします。
- Codex は `codex/staging` から `codex/<task-name>` 形式の作業ブランチを作成します。
- 変更後は `npm run check:all`、必要に応じて `npm run lint:frontend` / `npm run test:core`、および `npm run diff:check` を実行してから commit します。
- 作業ブランチを GitHub へ push し、`codex/staging` 向けの通常 Pull Request を作成します。
- 低リスク、または中リスクでも小〜中規模のタスクは、確認コマンドが成功し、Pull Request が競合なく merge 可能な場合に限り、Codex が `codex/staging` へ merge できます。
- 高リスク、または中リスクでも大規模なタスクは Pull Request 作成までで停止し、ユーザーが確認・merge します。
- Codex は `develop` や `main` へ自動 merge しません。

### Codex作業のリスク判断例

低リスクとして扱いやすい例:

- `README.md` / `AGENTS.md` の更新
- 文言修正
- 軽微な CSS
- 表示だけの小修正
- 既存ロジックに触れない UI 調整

高リスクとして扱う例:

- DB schema / migration
- 保存・更新・削除処理
- snapshot 作成・上書き処理
- `player_edit` / `player_detail` の画面遷移
- API 仕様変更
- import/export
- 複数画面にまたがる変更

## Database

### 使用中の DB

- 既定値: `database/eikan-app.sqlite`
- 環境変数 `EIKAN_DB_PATH` を指定すると別パスへ切り替えできます。
- 起動時には `Using SQLite database at ...` がログ出力されます。

### DB リセット

- コマンド: `cmd /c npm run db:reset`
- 実体: `scripts/setup_db.js`
- `backend/db/schema.sql` を再適用します。
- `schema.sql` には `DROP TABLE IF EXISTS ...` が含まれるため、既存データは削除されます。
- 開発用の再作成コマンドとして扱ってください。

### DB 診断

- コマンド: `npm run db:check`
- 実体: `scripts/diagnostics/check-data-integrity.js`
- 管理コード基盤に関わるカラム・重複・sample を確認します。
- DB全体を完全保証するものではありません。

### 補足

- `database/eikan.sqlite` は過去に参照されていた旧ファイルで、現在の既定参照先ではありません。
- SQLite DB は Git 管理外です。source archive とは別に backup が必要です。

## Source archive

source archive は Windows Git Bash などで `git archive` から作成できます。

```bash
git archive --format=zip --output=eikan-database-source.zip HEAD
```

この archive には `node_modules` や `.git` は含まれません。SQLite DB は Git 管理外のため、必要に応じて別途 backup してください。

## ディレクトリ構成

```text
backend/
  app.js                    Express エントリポイント
  controllers/              リクエスト受け口
  services/                 入力検証・業務ロジック
  models/                   SQLite クエリ
  routes/                   API ルーティング
  db/
    database.js             DB 接続・初期化
    schema.sql              テーブル定義
    seed.sql                旧 seed データ

frontend/
  pages/                    画面 HTML
    index.html
    schools.html
    school_detail.html
    players.html
    player_register.html
    player_detail.html
    player_edit.html
  js/
    api/                    API 呼び出し
    pages/                  画面ごとの JS
      players.js
    components/             UI 部品
    constants/              定数
    utils/                  補助関数
  css/                      画面スタイル

scripts/
  setup_db.js               現在の DB 再作成スクリプト
  init_db.js                旧初期化スクリプト
  migrate.js                旧 migration プレースホルダ
  diagnostics/
    check-data-integrity.js DB 診断スクリプト
    check-test-database.js 一時DB診断スクリプト
  run-core-tests.js       core test runner
  run-verify-all.js       総合確認 runner

tests/
  core/                    node:test smoke / core regression tests
  helpers/                 test context / HTTP helper

database/                   ローカル SQLite ファイル置き場
docs/                       設計・要件・レビュー記録
```

## 現在の主要ルート

### API

- `GET /api/schools`
- `GET /api/schools/:id`
- `POST /api/schools`
- `PATCH /api/schools/:id`
- `DELETE /api/schools/:id`
- `POST /api/schools/:id/progress-year`
- `POST /api/schools/:id/progress-year/undo`
- `GET /api/players`
- `GET /api/players/:id`
- `GET /api/players/:id/detail`
- `POST /api/players`
- `PUT /api/players/:id`
- `GET /api/player-series/:id`
- `POST /api/player-series/:id/snapshots`

### フロント画面

- `frontend/pages/index.html`
- `frontend/pages/schools.html`
- `frontend/pages/school_detail.html`
- `frontend/pages/players.html`
- `frontend/pages/player_register.html`
- `frontend/pages/player_detail.html`
- `frontend/pages/player_edit.html`

## メモ

- OCR本体MVP、DB backup / restore、export / importは今後の作業です。
- 現在の Phase と機能一覧は `docs/phases/phase2.md` と `docs/requirements/feature_list.md` を参照してください。

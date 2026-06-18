# eikan-database

栄冠ナインの学校・選手データを管理するためのローカル Web アプリです。  
`Express + SQLite + 静的フロントエンド` で構成されています。

## 現在の状態

- バックエンドは起動時に SQLite に接続し、空の DB であれば `backend/db/schema.sql` を自動適用します。
- 既定の DB ファイルは `database/eikan-app.sqlite` です。
- 学校一覧 API は `GET /api/schools`、選手一覧 API は `GET /api/players` です。
- フロントエンドは `frontend/pages/` 配下の HTML を `Express` から静的配信しています。

## 起動方法

### 開発サーバー起動

- 開発用: `npm run dev`
- 明示的な watch 起動: `npm run dev:watch`
- PowerShell の実行ポリシーで `npm.ps1` が止まる場合: `cmd /c npm run dev`

起動後は以下を開きます。

- トップ: `http://localhost:3000/`
- 学校一覧: `http://localhost:3000/pages/schools.html`

開発サーバーでは以下が自動で行われます。

- `backend/` 配下の変更: Node サーバーを停止し、`require.cache` をクリアして再起動します。
- `frontend/` 配下の HTML / CSS / JS 変更: 開いているページへ reload イベントを送り、ブラウザを再読込します。
- 追加の開発依存は使わず、Node.js 標準の `fs.watch` ベースで動作します。

### 通常サーバー起動

- 通常: `npm start`
- PowerShell の実行ポリシーで `npm.ps1` が止まる場合: `cmd /c npm start`

`npm start` は watch なしの単純起動です。backend 変更を反映するには手動再起動が必要です。

## 開発時の確認コマンド

通常開発は `develop` を base に、1目的1PRで行います。

`package.json` があるディレクトリで実行します。

- backend 構文確認: `npm run check:backend`
- frontend 構文確認: `npm run check:frontend`
- 一括確認: `npm run check:all`
- 差分の空白確認: `npm run diff:check`

実ブラウザ確認は必要に応じて別途行います。

## Codex Cloud / GitHub連携での開発フロー

- GitHub repository `Cloy-9609/eikan-database` を作業の基準にします。
- Codex成果物の統合先と実ブラウザ確認用の branch は `codex/staging` です。
- Codex は `codex/staging` から `codex/<task-name>` 形式の作業ブランチを作成します。
- 変更後は `npm run check:all` と `npm run diff:check` を実行してから commit します。
- 作業ブランチを GitHub へ push し、`codex/staging` 向けの通常 Pull Request を作成します。
- 低リスク・小〜中規模タスクで、Pull Request が `mergeable clean` かつ確認コマンドが成功している場合のみ、Codex は GitHub API で `codex/staging` へ squash merge し、作業ブランチを削除できます。
- 高リスク、または中リスクでも大規模なタスクは、Pull Request 作成までで止め、Codex は merge しません。
- `codex/staging` で実ブラウザ確認を行い、問題なければユーザー判断で `develop` 以降へ取り込みます。
- Codex は `main` と `develop` へ直接 push しません。

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

### 補足

- `database/eikan.sqlite` は今回の不具合調査以前に参照されていた旧ファイルで、現在の既定参照先ではありません。

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
  js/
    api/                    API 呼び出し
    pages/                  画面ごとの JS
    components/             UI 部品
    constants/              定数
    utils/                  補助関数
  css/                      画面スタイル

scripts/
  setup_db.js               現在の DB 再作成スクリプト
  init_db.js                旧初期化スクリプト
  migrate.js                旧 migration プレースホルダ

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
- `GET /api/players`
- `GET /api/players/:id`
- `POST /api/players`
- `PUT /api/players/:id`

### フロント画面

- `frontend/pages/index.html`
- `frontend/pages/schools.html`
- `frontend/pages/school_detail.html`
- `frontend/pages/player_register.html`
- `frontend/pages/player_detail.html`
- `frontend/pages/player_edit.html`

## メモ

- 一部の既存ファイルには文字化けした文字列が残っています。
- 今回の修正対象は主に SQLite 参照先の整理、起動時自動初期化、DB リセット導線の明確化です。

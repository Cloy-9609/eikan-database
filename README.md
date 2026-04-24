# eikan-database

栄冠ナインの学校・選手データを管理するためのローカル Web アプリです。  
`Express + SQLite + 静的フロントエンド` で構成されています。

## 現在の状態

- バックエンドは起動時に SQLite に接続し、空の DB であれば `backend/db/schema.sql` を自動適用します。
- 既定の DB ファイルは `database/eikan-app.sqlite` です。
- 学校一覧 API は `GET /api/schools`、選手一覧 API は `GET /api/players` です。
- フロントエンドは `frontend/pages/` 配下の HTML を `Express` から静的配信しています。

## 起動方法

### サーバー起動

- 通常: `npm start`
- PowerShell の実行ポリシーで `npm.ps1` が止まる場合: `cmd /c npm start`

起動後は以下を開きます。

- トップ: `http://localhost:3000/`
- 学校一覧: `http://localhost:3000/pages/schools.html`

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

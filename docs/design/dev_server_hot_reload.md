# 開発サーバーとホットリロード

## 使い方

1. ルートディレクトリ `C:\栄冠データベース\eikan-database` で開発サーバーを起動します。

```powershell
npm run dev
```

2. ブラウザで以下にアクセスします。

- トップページ: `http://localhost:3000/`
- 学校一覧ページ: `http://localhost:3000/pages/schools.html`

3. 開発中の挙動は以下のとおりです。

- `backend/` 配下のファイルを変更すると、Node サーバーが自動で再起動します。
- `frontend/` 配下の HTML / CSS / JS を変更すると、開いているページが自動で再読込されます。
- 追加の開発依存パッケージは不要です。

4. 停止するときは `Ctrl + C` を使います。

補足:
PowerShell の実行ポリシーで `npm.ps1` がブロックされる環境では、次の形式でも起動できます。

```powershell
cmd /c npm run dev
```

## 変更の概略

今回の変更では、既存の Express + 静的フロントエンド構成を維持したまま、ローカル開発用のホットリロード機能を追加しました。

- `package.json` に `npm run dev` を追加しました。
- 開発専用の起動スクリプトを追加し、`backend/` の監視と自動再起動を実装しました。
- HTML 配信時に開発用クライアントスクリプトを差し込み、`frontend/` の更新をブラウザへ通知する仕組みを追加しました。
- 本番用の `npm start` には影響しないよう、ホットリロードは `HOT_RELOAD=1` のときだけ有効になる構成にしました。

## 変更履歴

### 2026-04-16

1. ルート `package.json` に `dev` script を追加しました。
2. `scripts/dev-server.js` を追加し、バックエンド監視と自動再起動を実装しました。
3. `backend/dev/hotReload.js` を追加し、SSE を使ったブラウザ再読込と HTML への開発用スクリプト差し込みを実装しました。
4. `backend/app.js` を更新し、開発用 HTML ミドルウェアとホットリロード登録を組み込みました。
5. 実ブラウザで `npm run dev` が動作し、開発サーバーとして利用できることを確認しました。

## 変更ファイル内容

### `package.json`

- `scripts.dev` に `node scripts/dev-server.js` を追加しました。
- 既存の `start` と `db:reset` はそのまま維持しています。

### `scripts/dev-server.js`

- 起動時に `HOT_RELOAD=1` を設定します。
- `backend/` 配下を監視し、変更があれば現在のサーバーを停止して再起動します。
- `require.cache` をクリアしてから `backend/app.js` を再読込することで、コード変更を次回起動へ反映します。
- 終了時には watcher とサーバーを安全に停止します。

### `backend/dev/hotReload.js`

- HTML レスポンスへ開発用クライアントスクリプトを差し込むミドルウェアを提供します。
- `/__dev/events` で Server-Sent Events を提供し、フロントエンド更新時にブラウザへ再読込イベントを送信します。
- `/__dev/health` で開発サーバー再起動中の復帰確認を行います。
- `frontend/` 配下を監視し、変更発生時に接続中クライアントへ reload イベントを配信します。

### `backend/app.js`

- 開発用ホットリロードモジュールを読み込むようにしました。
- ルート専用の `app.get("/")` をやめ、HTML ミドルウェア経由で `/` と `/pages/*.html` を処理する構成に変更しました。
- `cleanupHotReload` を export し、開発サーバー終了時に watcher を閉じられるようにしました。

## 備考

- この対応は開発体験の改善が目的であり、本番起動の責務は引き続き `npm start` に残しています。
- ホットリロードは依存追加なしで実装しているため、セットアップコストを増やさずに運用できます。

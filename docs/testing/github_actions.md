# GitHub Actions core verification

## 目的

- ローカルの `npm run verify:all` を GitHub Actions でも実行する。
- PR を merge する前に core regression の回帰を検出する。

## Workflow file

- `.github/workflows/core-verification.yml`

## Trigger

- PR to `codex/staging`
- PR to `develop`
- push to `codex/staging`
- push to `develop`
- manual `workflow_dispatch`

## Environment

- `ubuntu-latest`
- Node.js 22
- `npm ci`

## Command

```text
npm run verify:all
```

`verify:all` は、構文確認、core regression tests、一時 SQLite DB 診断、作業ツリー差分の空白確認をまとめて実行します。

## 正常条件

現時点の正常な集計例は次の通りです。

```text
tests 44
pass 44
fail 0
skipped 0
todo 0
DB integrity check passed.
```

将来テスト件数が増えた場合、`tests 44` と `pass 44` の数値は固定条件ではありません。優先して確認する条件は、最終集計で `fail 0`、`skipped 0`、`todo 0` であり、DB 診断で `DB integrity check passed.` が表示されることです。

## Error stack について

異常系回帰テストでは、期待される 400・404・409 レスポンスの error stack が log に表示される場合があります。これは異常系を検証するための期待された出力です。

最終集計が次なら正常です。

```text
fail 0
skipped 0
todo 0
```

## Commit 済み差分の空白確認

`npm run verify:all` 内の `git diff --check` は、作業ツリーの未 commit 差分を確認します。GitHub Actions の clean checkout では PR や push の commit 済み差分を十分に確認できないため、workflow では event ごとの commit 範囲に対して追加で `git diff --check` を実行します。

- Pull Request: PR base SHA から head SHA までの差分を確認する。
- Push: `github.event.before` が全ゼロ SHA でない場合、before から `github.sha` までの差分を確認する。全ゼロ SHA の initial push では安全に skip する。
- `workflow_dispatch`: 親 commit がある場合は `HEAD^...HEAD` を確認し、親 commit がない場合は通常の `git diff --check` に fallback する。

## セキュリティ

- `pull_request_target` は使わない。
- secret、PAT、API key は使わない。
- workflow 権限は `contents: read` だけにする。
- 通常 DB 用の `database/eikan-app.sqlite` を使わない。
- workflow 内では `npm run db:reset`、`npm run db:migrate`、`npm run db:check`、`npm start`、`npm run dev`、`npm run dev:watch` を実行しない。
- DB 関連では、`verify:all` 内の一時 SQLite DB 診断である `npm run db:check:test` だけを使う。

## Branch protection

workflow 導入後に GitHub Actions の実行結果を確認したら、GitHub Settings で `verify-all` を required status check に設定できます。このドキュメント作成タスクでは branch protection 設定自体は変更しません。

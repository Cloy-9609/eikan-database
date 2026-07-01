# URL 状態管理テスト計画

## 1. 目的

Phase 6.4 の後続実装で、`schools.html` と `players.html` の URL state、legacy query、History API、非同期競合を安全に整理するためのテスト計画と実装済み自動テストを定義する。Phase 6.4-5 では schools 一覧の stale response protection と latest request runner の core test を追加した。

## 2. テストレベル

| レベル | 対象 | 自動化方針 |
| --- | --- | --- |
| pure function test | default state、normalization、URLSearchParams -> state、state -> canonical params、state -> API query。 | Node.js 標準 `node:test`。DB 不要。 |
| URL contract test | canonical query 出力、legacy key を出力しない、unrelated query / hash 保持方針。 | pure function + 最小 URL helper test。 |
| legacy compatibility test | `sort`, `admission_year`, `position_type` の precedence。 | pure function test。 |
| History API behavior test | initial replace、submit / reset / sort push、popstate 復元。 | まず helper の pure / fake history test。最終は manual browser verification。 |
| form adapter test | form 値 -> state、state -> form。 | DOM dependency 追加なしでは範囲限定。最小 fake object で可能な部分だけ。 |
| async request race test | stale response の無視、stale failure / stale finally の無視。schools の latest failure は既存 error policy として一覧を消す。 | `latestRequestRunner.mjs` を `node:test` で検証済み。rapid popstate は runner 自動 test と browser smoke で確認する。 |
| manual browser verification | 実ブラウザでの戻る / 進む、sort 即時反映、flash message、loading 操作感。 | dependency 追加なし。人間が確認。 |

## 3. schools test matrix

| ケース | 入力例 / 操作 | 期待する検証 |
| --- | --- | --- |
| query なし | `schools.html` | default state。canonical URL は `sort_by=updated_at&sort_order=desc`。 |
| canonical query | `?name=青葉&prefecture=東京&play_style=continuous&sort_by=name&sort_order=asc` | state / API query / canonical URL が一致。 |
| legacy `sort` | `?sort=name:asc` | `sortBy=name`, `sortOrder=asc`。canonical URL は `sort_by=name&sort_order=asc`。 |
| canonical と legacy 混在 | `?sort_by=updated_at&sort_order=desc&sort=name:asc` | 現在挙動として legacy `sort` 優先。 |
| invalid sort | `?sort_by=unknown&sort_order=sideways` または `?sort=unknown:asc` | default sort へ戻る。 |
| invalid prefecture | `?prefecture=不正値` | 現在は URL / state / API に残るが form select に復元できず不一致になる。後続実装後は空へ正規化し、canonical URL / API query から削除する。 |
| invalid play_style | `?play_style=unknown` | 現在は URL / state / API に残るが form select に復元できず不一致になる。後続実装後は空へ正規化し、canonical URL / API query から削除する。 |
| unknown query | `?debug=1&name=青葉` | `debug=1` を保持する方針を検証。 |
| hash あり | `?name=青葉#list` | `#list` を保持する。 |
| filter apply | form submit | `pushState` され、API query と form が一致。 |
| reset | reset click | default state、default sort URL、`pushState`。 |
| back | browser back / fake popstate | URL から form と API query を復元。 |
| forward | browser forward / fake popstate | URL から form と API query を復元。 |
| school deletion flash message との共存 | `?message=school-deleted&name=青葉` | message 表示後に `message` だけ `replaceState` で削除し、検索条件は維持。 |

## 4. players test matrix

| ケース | 入力例 / 操作 | 期待する検証 |
| --- | --- | --- |
| query なし | `players.html` | default state。canonical URL は default sort を明示。 |
| canonical query | `?name=山田&school_name=青葉&admission_year_from=2024&admission_year_to=2026&player_type=normal&main_position=投手&school_grade=2&roster_status=active&snapshot_label=entrance&sort_by=name&sort_order=asc` | state / API query / canonical URL が一致。 |
| legacy `sort` | `?sort=admission_year:asc` | `sort_by=admission_year&sort_order=asc` へ canonicalize。 |
| legacy `admission_year` | `?admission_year=2025` | from/to の両方に `2025`。canonical URL は from/to。 |
| legacy `position_type` | `?position_type=pitcher` / `?position_type=fielder` | `main_position=投手` / `全野手`。 |
| canonical と legacy 混在 | `?sort_by=updated_at&sort_order=desc&sort=name:asc&admission_year=2025&admission_year_from=&position_type=pitcher&main_position=` | 現在 precedence を characterization。 |
| invalid snapshot | `?snapshot_label=bad` | snapshot は空になり URL から消える。 |
| invalid player_type | `?player_type=unknown` | 後続実装後は空へ正規化し、form は未指定、canonical URL / API query から削除する。現在は URL / state / API と form が不一致になり得る。 |
| invalid main_position | `?main_position=unknown` | 後続実装後は空へ正規化し、form は未指定、canonical URL / API query から削除する。現在は URL / state / API と form が不一致になり得る。 |
| invalid school_grade | `?school_grade=9` | 後続実装後は空へ正規化し、form は未指定、canonical URL / API query から削除する。現在は URL / state / API と form が不一致になり得る。 |
| invalid roster_status | `?roster_status=bench` | 後続実装後は空へ正規化し、form は未指定、canonical URL / API query から削除する。現在は URL / state / API と form が不一致になり得る。 |
| invalid ability key | `?ability_key=bad&ability_min=50&ability_max=80` | ability 条件全体が空。 |
| ability min のみ | `?ability_key=power&ability_min=50` | min だけ保持。 |
| ability max のみ | `?ability_key=power&ability_max=80` | max だけ保持。 |
| ability range | `?ability_key=power&ability_min=50&ability_max=80` | range を保持。 |
| reversed range | `?ability_key=power&ability_min=80&ability_max=50` | 決定済み target behavior として ability_key は維持し、ability_min / ability_max は空へ正規化する。canonical URL / API query から min/max を削除する。 |
| invalid admission year | `?admission_year_from=abc&admission_year_to=20x0` | 現在挙動として trim のみで残る。将来変更は Decision required。 |
| reset | reset click | default state、default sort URL、`pushState`。 |
| sort key 変更 | sort select change | 即時 `pushState`、loadPlayers。 |
| sort direction 変更 | direction button click | hidden `sort_order` 反転、即時 `pushState`、loadPlayers。 |
| back | browser back / fake popstate | URL から form と API query を復元。 |
| forward | browser forward / fake popstate | URL から form と API query を復元。 |
| stale response | request A 後に request B、A が後から resolve | B の結果が維持され、A は render / message / busy 解除しない。 |

## 5. schools stale response test matrix

| ケース | 手順 | 期待する検証 |
| --- | --- | --- |
| latest request runner | `frontend/js/utils/latestRequestRunner.mjs` で request ID を increment し、最後に開始された request だけ success / error / finally callback を実行する。 | DOM / fetch / timer に依存しない pure utility として `tests/core/latest-request-runner.test.js` で検証済み。 |
| stale success ignored | request A 開始後に request B を開始し、B 成功後に A 成功。 | B の結果を維持し、A は描画しない。自動テストで A status `stale`、B status `success` を確認する。 |
| stale failure ignored while latest busy | request A 開始後に request B を開始し、B 処理中に A 失敗。 | A は error message を表示せず、A は B の busy 状態を解除しない。自動テストで stale failure と latest finally のみ実行を確認する。 |
| latest finally only | request A / B / C を開始し、C 以外を先に完了。 | C の callback と finally だけが反映され、A / B の finally は実行されない。 |
| latest failure policy | 最新 request が失敗。 | schools の既存 policy として `listRoot.innerHTML = ""` と error message 表示を維持する。players の既存結果維持 policy へは変更しない。 |
| rapid popstate | back / forward 相当の URL 変更を短時間に連続実行。 | 最後の URL 条件に対応する結果だけが描画される。runner の自動 test と browser smoke で確認する。 |

## 6. テストデータの安全性

- URL state の pure test では DB は不要。
- API との結合確認が必要な場合も一時 SQLite DB を使う。
- `database/eikan-app.sqlite` は使用しない。
- 外部 browser test dependency は追加しない。
- core test は Node.js 標準の `node:test` と `node:assert/strict` を優先する。
- `EIKAN_DB_PATH` は backend / DB module require 前に設定する。
- 既存の `npm run test:core` / `npm run verify:all` に統合する。

## 7. 現在環境での実装可能性

### CommonJS package と browser ES module の両立

package 全体は CommonJS 設定で、frontend は browser ES module として `.js` を使っている。Node.js の `.test.js` から browser `.js` module を直接静的 import するのは安全ではない。後続で pure state module を作る場合は `.mjs` にして、CommonJS の `.test.js` から `await import()` する方式が最も安全である。ただし pure `.mjs` は既存 frontend `.js` を直接または推移的に import しない。必要な許可値は依存注入し、Node test では fixture を渡す。

推奨例:

```js
const { normalizePlayerSearchState } = await import("../../frontend/js/state/playerSearchState.mjs");
```

### DOM なしで検証可能な範囲

- default state 生成。
- query parse / normalize。
- legacy precedence。
- canonical params 生成。
- API query 生成。
- unrelated query / recognized key 削除の pure helper。
- ability range の normalization。
- snapshot label の許可値 check。

### DOM または browser が必要な範囲

- 実 form control への反映。
- `popstate` の実 browser stack 挙動。
- `history.pushState` / `replaceState` 後の address bar 表示。
- loading 中の button disabled 操作感。
- accordion 開閉と簡易詳細 cache。

DOM dependency を追加しないため、これらは最小 fake object で確認できる部分だけ自動化し、最終確認は manual browser verification に残す。

### 最小 fake の価値

`window.history` の fake は、helper を `({ location, history })` のように依存注入できる形へ切り出した後なら価値がある。ただし browser の履歴 stack そのものを完全再現しない。test では「replace / push のどちらを呼んだか」「next URL が何か」を検証し、戻る / 進むの体感は manual verification で確認する。

### jsdom 等を追加しない方針

Phase 6.4 では dependency 追加は禁止。jsdom、Playwright、Vitest などは追加しない。Node.js 標準 `node:test`、pure function、最小 fake、手動 browser 確認の組み合わせで進める。

## 8. 推奨方式

1. 後続実装で `.mjs` の pure state module を作る。
2. `.test.js` から dynamic `import()` する。
3. URL contract と legacy precedence は DB なしで test する。
4. API 結合が必要な regression は既存 core test foundation に従い、一時 SQLite DB を使う。
5. DOM / History stack の完全再現は目指さず、helper の呼び分けを自動 test、実操作感を manual browser verification で確認する。
6. 新規 `.mjs` は `scripts/check-js.js` の `frontendFiles` へ明示的に追加し、`npm run check:frontend` と `npm run verify:all` の構文確認対象にする。
7. dependency は追加しない。

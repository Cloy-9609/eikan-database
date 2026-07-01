# URL 状態管理テスト計画と実装記録

## 1. 目的

この文書は Phase 6.4 完了時点の `schools.html` と `players.html` の URL state、legacy query、canonical URL、History API、stale response protection のテスト計画と実装済み自動テストを整理する。最終コードを source of truth とし、将来計画だけでなく現在の保証範囲を明記する。

## 2. 実装済み test file と保証内容

| test file | 保証内容 |
| --- | --- |
| `tests/core/school-search-state.test.js` | default state、normalization、legacy sort precedence、canonical params、API query、invalid fixed select、unrelated query 保持、recognized key 削除。 |
| `tests/core/player-search-state.test.js` | default state、normalization、legacy sort / admission_year / position_type precedence、canonical params、API query、invalid fixed select、snapshot label 許可値注入、ability key / min / max 正規化、reversed ability range。 |
| `tests/core/latest-request-runner.test.js` | latest request runner、stale success / failure / finally 無視、latest failure、callback error 処理。 |
| `tests/core/url-history.test.js` | `buildRelativeUrl`、`writeHistoryUrl`、History push / replace、pathname / search / hash、duplicate push 非抑止、state と空 title の受け渡し。 |

総 test 数は将来増減するため恒久仕様として固定しない。最新件数は `npm run test:core` の出力を確認する。

## 3. schools test matrix

| ケース | 入力例 / 操作 | 期待する検証 |
| --- | --- | --- |
| query なし | `schools.html` | default state。canonical URL は default sort を明示。 |
| canonical query | `?name=青葉&prefecture=東京&play_style=continuous&sort_by=name&sort_order=asc` | state / API query / canonical URL が一致。 |
| legacy `sort` | `?sort=name:asc` | `sort_by=name&sort_order=asc` へ canonicalize。 |
| canonical と legacy 混在 | `?sort_by=updated_at&sort_order=desc&sort=name:asc` | legacy sort precedence を維持。 |
| name suffix | `?name=青葉高校` | API query / canonical URL では `青葉`。 |
| invalid prefecture | `?prefecture=不正値` | 空へ正規化し、form は未指定、canonical URL / API query から削除する。 |
| invalid play_style | `?play_style=unknown` | 空へ正規化し、form は未指定、canonical URL / API query から削除する。 |
| unknown query | `?debug=1&name=青葉` | `debug=1` を保持する。 |
| hash あり | `?name=青葉#list` | `#list` を保持する。 |
| filter apply | form submit | `pushState` され、API query と form が一致。 |
| reset | reset click | default state、default sort URL、`pushState`。 |
| back / forward | browser back / forward | URL から form と API 条件を復元し、popstate 中は History 書き込みを行わない。実 browser 動作は browser smoke で確認する。 |
| school deletion flash message | `?message=school-deleted&name=青葉` | message 表示後に `message` だけ `replaceState` で削除し、検索条件と hash は維持。 |

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
| invalid player_type | `?player_type=unknown` | 空へ正規化し、form は未指定、canonical URL / API query から削除する。 |
| invalid main_position | `?main_position=unknown` | 空へ正規化し、form は未指定、canonical URL / API query から削除する。 |
| invalid school_grade | `?school_grade=9` | 空へ正規化し、form は未指定、canonical URL / API query から削除する。 |
| invalid roster_status | `?roster_status=bench` | 空へ正規化し、form は未指定、canonical URL / API query から削除する。 |
| invalid ability key | `?ability_key=bad&ability_min=50&ability_max=80` | ability 条件全体が空。 |
| ability min のみ | `?ability_key=power&ability_min=50` | min だけ保持。 |
| ability max のみ | `?ability_key=power&ability_max=80` | max だけ保持。 |
| ability range | `?ability_key=power&ability_min=50&ability_max=80` | range を保持。 |
| reversed range | `?ability_key=power&ability_min=80&ability_max=50` | `ability_key` は維持し、`ability_min` / `ability_max` は空へ正規化する。canonical URL / API query から min/max を削除する。 |
| invalid admission year | `?admission_year_from=abc&admission_year_to=20x0` | 現在挙動として trim のみで残る。将来変更は独立判断。 |
| reset | reset click | default state、default sort URL、`pushState`。 |
| sort key 変更 | sort select change | 即時 `pushState`、loadPlayers。 |
| sort direction 変更 | direction button click | hidden `sort_order` 反転、即時 `pushState`、loadPlayers。 |
| back / forward | browser back / forward | URL から form、sort、ability 条件、API 条件を復元し、popstate 中は History 書き込みを行わない。実 browser 動作は browser smoke で確認する。 |
| stale response | request A 後に request B、A が後から resolve | `latestPlayersRequestId` により B の結果が維持され、A は render / message / busy 解除しない。 |

## 5. History API operation matrix

`writeSearchStateToUrl()` は page adapter として残し、検索 state の正規化、canonical query 生成、legacy query 対応、許可値の依存注入、form 処理、API 取得、popstate 後の復元は各 page 側に残す。共通化したのは `frontend/js/utils/urlHistory.mjs` の `buildRelativeUrl()` と `writeHistoryUrl()` による pathname / search / hash からの relative URL 組立、push / replace 選択、History API 書き込みだけである。

| page | operation | History method | load | 備考 |
| --- | --- | --- | --- | --- |
| schools | initial canonicalization | replace | yes | default sort 明示。 |
| schools | submit | push | yes | form state。 |
| schools | reset | push | yes | default state。 |
| schools | popstate | none | yes | URL から復元。History 書き込みなし。 |
| schools | flash message clear | replace | no | `message` だけ削除し、その他 query と hash を維持。 |
| players | initial canonicalization | replace | yes | default sort 明示。 |
| players | submit | push | yes | filter 反映。 |
| players | reset | push | yes | default state。 |
| players | sort key | push | yes | 即時反映。 |
| players | sort direction | push | yes | 即時反映。 |
| players | popstate | none | yes | URL から復元。History 書き込みなし。 |

`urlHistory.mjs` は同一 URL かどうかを判定しない。duplicate push 抑止は導入していないため、同じ条件を連続 submit した場合も指定された `pushState` が呼ばれる。unrelated query は canonical params builder が保持し、hash は page が `url.hash` を `writeHistoryUrl()` に渡すことで保持する。

## 6. schools stale response test matrix

| ケース | 手順 | 期待する検証 |
| --- | --- | --- |
| latest request runner | `frontend/js/utils/latestRequestRunner.mjs` で request ID を increment し、最後に開始された request だけ success / error / finally callback を実行する。 | DOM / fetch / timer に依存しない pure utility として検証済み。 |
| stale success ignored | request A 開始後に request B を開始し、B 成功後に A 成功。 | B の結果を維持し、A は描画しない。 |
| stale failure ignored while latest busy | request A 開始後に request B を開始し、B 処理中に A 失敗。 | A は error message を表示せず、B の busy 状態を解除しない。 |
| latest finally only | request A / B / C を開始し、C 以外を先に完了。 | C の callback と finally だけが反映され、A / B の finally は実行されない。 |
| latest failure policy | 最新 request が失敗。 | schools の既存 policy として `listRoot.innerHTML = ""` と error message 表示を維持する。 |
| callback error | success / error callback が throw。 | latest request の finally は実行され、error は呼び出し元へ伝播する。 |

## 7. manual browser verification / browser smoke

Phase 6.4 の core test は pure module と fake history による自動化範囲を担う。一方、以下は実 browser 依存が強いため自動テスト対象外であり、PR ごとの browser smoke 対象として扱う。

- 実 browser history stack。
- address bar の見え方。
- form DOM 反映。
- 一覧描画。
- sort 表示。
- loading 中の操作感。
- back / forward の体感。
- flash message 表示。

Phase 6.4 の各 PR では、必要に応じて人間が browser smoke で操作感を確認する。Phase 6.4-7 は Markdown 同期のみで URL / History 動作を変更しないため、追加 browser smoke は不要である。

## 8. テストデータの安全性

- URL state の pure test では DB は不要。
- API との結合確認が必要な場合も一時 SQLite DB を使う。
- `database/eikan-app.sqlite` は使用しない。
- 外部 browser test dependency は追加しない。
- core test は Node.js 標準の `node:test` と `node:assert/strict` を優先する。
- `EIKAN_DB_PATH` は backend / DB module require 前に設定する。
- 既存の `npm run test:core` / `npm run verify:all` に統合する。

## 9. 現在環境での実装方式

package 全体は CommonJS 設定で、frontend は browser ES module として `.js` を使っている。Node.js の `.test.js` から browser `.js` module を直接静的 import するのは避け、pure state / utility module は `.mjs` として作成し、CommonJS の `.test.js` から `await import()` する。pure `.mjs` は既存 frontend `.js` を直接または推移的に import せず、必要な許可値は依存注入する。

DOM なしで検証する範囲は default state、query parse / normalize、legacy precedence、canonical params、API query、unrelated query / recognized key 削除、ability range normalization、snapshot label 許可値 check、History API helper の push / replace 呼び分けである。

## 10. 将来候補

以下は Phase 6.4 外の将来候補として扱う。

- Playwright 等の browser E2E test。
- jsdom による DOM integration test。
- fake DOM / fake popstate による page-level integration test。
- duplicate push 抑止。
- admission year 厳格化。
- error policy 統一。
- players / schools の request runner 統一。

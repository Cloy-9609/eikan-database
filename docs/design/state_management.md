# 状態管理方針

## 1. 文書の目的

この文書は Phase 6.4 完了時点の設計・実装記録として、`schools.html` と `players.html` の検索状態管理を対象にする。最終コードを source of truth とし、URL 共有、再読込、back / forward、legacy query 互換、canonical URL、stale response protection、History API 書き込み helper、frontend lint の現在仕様を固定する。

重要な前提は次のとおり。

- URL 同期は維持する。
- legacy query 読込互換と現在の History API 動作を維持する。
- 検索 state の正規化は `.mjs` の pure module に分離済みで、DOM / `window` 非依存の core test で検証する。
- page 固有の form、DOM、API 取得、render、canonicalization の組み立ては `schools.js` / `players.js` に残す。
- Phase 6.4 では dependency を追加せず、browser stack や address bar の体感は browser smoke で確認する。

## 2. 用語と状態分類

| 用語 | 意味 | URL へ保存するか |
| --- | --- | --- |
| URL state | `window.location.search` と hash を含む、共有・再読込の入力。検索・表示条件を再構築するための入力であり、API 取得結果そのものではない。 | 検索条件のみ保存する。 |
| normalized search state | URL または form から読んだ値を trim、default 補完、許可値 check、range 正規化した内部 state。 | canonical query へ変換する。 |
| form state | input / select / hidden input の現在値。ユーザーが submit 前に編集中の値も含む。 | submit または即時適用操作後に反映する。 |
| API query | `fetchSchools` / `fetchPlayers` へ渡す query object。空値は API wrapper で送信されない。 | URL state とは別表現だが、検索条件として一致させる。 |
| render state | 一覧 DOM、件数、空表示、検索サマリーなど描画結果。 | 保存しない。 |
| transient UI state | accordion 開閉、loading 表示、`aria-busy`、button disabled など一時的な UI 状態。 | 原則として検索 URL へ保存しない。 |
| async request state | latest request 判定、loading 中かどうか、既存結果を保持するかどうか。 | 保存しない。 |
| flash message | `message=school-deleted` のような一回限りの通知。検索状態とは別管理。 | 読み取り後に `replaceState` で削除する。 |
| legacy query | 旧 URL を読むための key。例: `sort`, `admission_year`, `position_type`。 | canonical URL へは書き戻さない。 |

## 3. 現在の状態フロー

### schools.js 初期表示

```text
URL
↓
readSchoolSearchStateFromParams
↓
normalizeSchoolSearchState
↓
renderShell(searchState) で form 初期値を描画
↓
flash message 読込・削除
↓
buildCanonicalSchoolSearchParams
↓
writeHistoryUrl(..., { replace: true })
↓
loadSchools
↓
requestSearchState snapshot 作成
↓
buildSchoolListParams / hasActiveSearchFilters
↓
createLatestRequestRunner 経由で fetchSchools
↓
latest success のみ renderSchoolList
```

`schools.js` は `searchState` を `init` 内に持ち、submit / reset / popstate で normalized state に差し替える。canonical URL は init / page handler が現在の normalized `searchState` から生成し、`loadSchools` 内では request 開始時に `normalizeSchoolSearchState` で `requestSearchState` snapshot を作る。この snapshot は `buildSchoolListParams` による API query 生成と `hasActiveSearchFilters` 判定に使用し、canonical URL 生成には使用しない。

### schools.js 操作時

```text
form submit / reset
↓
readSearchStateFromForm または createDefaultSchoolSearchState
↓
normalizeSchoolSearchState
↓
writeHistoryUrl(..., { replace: false }) = pushState
↓
loadSchools
↓
requestSearchState snapshot 作成
↓
buildSchoolListParams / hasActiveSearchFilters
↓
createLatestRequestRunner 経由で fetchSchools
↓
latest success / latest failure / latest finally のみ反映
```

submit / reset / initial / popstate / create refresh は共通の busy callback を使う。latest failure は従来どおり一覧を消して error を表示する。

### schools.js back / forward

```text
popstate
↓
readSchoolSearchStateFromParams
↓
applySearchStateToForm
↓
loadSchools（History 書き込みなし）
```

### players.js 初期表示

```text
URL
↓
readPlayerSearchStateFromParams
↓
normalizePlayerSearchState
↓
renderShell(searchState)
↓
setupOptionalYearPickers / setupAbilityFilterControls / accordion setup
↓
applySearchStateToForm
↓
buildCanonicalPlayerSearchParams
↓
writeHistoryUrl(..., { replace: true })
↓
buildPlayerListParams
↓
fetchPlayers
↓
renderPlayerList
```

`players.js` は `searchState` を初期値として作り、submit / sort / reset / popstate では操作ごとに `nextState` を作る。stale response protection は既存の `latestPlayersRequestId` 方式を維持しており、`createLatestRequestRunner` へは未共通化である。

### players.js 操作時

```text
form submit / sort key change / sort direction click / reset
↓
readSearchStateFromForm または createDefaultPlayerSearchState
↓
normalizePlayerSearchState
↓
applySearchStateToForm
↓
writeHistoryUrl(..., { replace: false }) = pushState
↓
buildPlayerListParams
↓
fetchPlayers
↓
latestPlayersRequestId が latest の場合だけ renderPlayerList
```

sort key 変更と sort direction click は submit を待たずに即時検索する。ability 条件は URL 読込、submit、sort 操作で同じ `normalizePlayerSearchState` / `normalizePlayerAbilitySearchState` を通る。

### players.js back / forward

```text
popstate
↓
readPlayerSearchStateFromParams
↓
applySearchStateToForm
↓
loadPlayers（History 書き込みなし）
```

## 4. schools query contract

| key | 分類 | 内部 state | default | 正規化方法 | API 送信 | canonical URL 書戻し | 不正値時の現在挙動 | 維持する互換性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `name` | canonical | `name` | `""` | `String(...).trim()`。API / URL 出力時は末尾の `高校` を除去する。 | はい。ただし空は wrapper で省略。 | はい。ただし空は省略。 | 文字列として trim される。 | `青葉高校` query は canonical URL / API では `青葉` になる。 |
| `prefecture` | canonical | `prefecture` | `""` | `PREFECTURE_GROUPS` 由来の許可値だけ保持。 | はい。ただし空は wrapper で省略。 | はい。ただし空は省略。 | invalid は空へ正規化し、canonical URL / API query から削除する。 | 許可値は `schools.js` から `schoolSearchState.mjs` へ依存注入する。 |
| `play_style` | canonical | `playStyle` | `""` | `continuous` / `three_year` だけ保持。 | はい。ただし空は wrapper で省略。 | はい。ただし空は省略。 | invalid は空へ正規化し、canonical URL / API query から削除する。 | 許可値は `schools.js` から依存注入する。 |
| `sort_by` | canonical | `sortBy` | `updated_at` | `sort_by:sort_order` を許可 sort と完全一致で検証。 | はい。 | はい。default でも書戻す。 | invalid 組み合わせは `updated_at` に戻る。 | default sort 明示を維持する。 |
| `sort_order` | canonical | `sortOrder` | `desc` | `sort_by:sort_order` を許可 sort と完全一致で検証。 | はい。 | はい。default でも書戻す。 | invalid 組み合わせは `desc` に戻る。 | default sort 明示を維持する。 |
| `sort` | legacy | `sortBy` / `sortOrder` | なし | `SORT_OPTIONS.value` と完全一致。存在すれば canonical sort より優先。 | いいえ。 | いいえ。`sort_by` / `sort_order` へ置換。 | invalid legacy sort は default sort。 | 旧 URL `?sort=name:asc` を読める。 |

### flash message

| key | 分類 | 用途 | 現在挙動 | canonical URL 書戻し |
| --- | --- | --- | --- | --- |
| `message` | transient / flash message | `school-deleted` の削除完了通知。検索条件ではない。 | 初期表示で読込後、`clearFlashMessage` が直接 `replaceState` で削除する。検索 query と hash は維持する。 | いいえ。 |

## 5. players query contract

| key | 分類 | 内部 state | default | 正規化方法 | API 送信 | canonical URL 書戻し | 不正値時の現在挙動 | 維持する互換性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `name` | canonical | `name` | `""` | trim。 | はい。 | はい。空は省略。 | 文字列として trim。 | 部分一致検索 URL を維持。 |
| `school_name` | canonical | `schoolName` | `""` | trim。 | はい。 | はい。空は省略。 | 文字列として trim。 | 学校名検索 URL を維持。 |
| `admission_year_from` | canonical | `admissionYearFrom` | `""` | trim のみ。整数 check はない。 | はい。 | はい。空は省略。 | 不正文字列も送信・書戻し。 | 現在の緩い挙動を維持する。 |
| `admission_year_to` | canonical | `admissionYearTo` | `""` | trim のみ。整数 check はない。 | はい。 | はい。空は省略。 | 不正文字列も送信・書戻し。 | 将来厳格化する場合は独立判断。 |
| `admission_year` | legacy | `admissionYearFrom` / `admissionYearTo` | なし | canonical from/to が `null` の場合だけ補完。trim のみ。 | いいえ。 | いいえ。from/to へ置換。 | 不正文字列も from/to へ入る。 | 旧単一年 URL を range URL として読める。 |
| `player_type` | canonical | `playerType` | `""` | `normal` / `genius` / `reincarnated` だけ保持。 | はい。 | はい。空は省略。 | invalid は空へ正規化し、canonical URL / API query から削除する。 | 許可値は `players.js` から依存注入する。 |
| `main_position` | canonical | `mainPosition` | `""` | production UI の固定候補だけ保持。 | はい。 | はい。空は省略。 | invalid は空へ正規化し、canonical URL / API query から削除する。 | legacy `position_type` の `pitcher -> 投手`, `fielder -> 全野手` は維持する。 |
| `position_type` | legacy | `mainPosition` | なし | canonical `main_position` が truthy なら canonical 優先。legacy `pitcher` は `投手`、`fielder` は `全野手`。 | いいえ。 | いいえ。`main_position` へ置換。 | `pitcher` / `fielder` 以外は空。 | 旧分類 URL を読める。 |
| `school_grade` | canonical | `schoolGrade` | `""` | `1` / `2` / `3` だけ保持。 | はい。 | はい。空は省略。 | invalid は空へ正規化し、canonical URL / API query から削除する。 | 管理学年 filter URL を維持。 |
| `roster_status` | canonical | `rosterStatus` | `""` | `active` / `graduated` だけ保持。 | はい。 | はい。空は省略。 | invalid は空へ正規化し、canonical URL / API query から削除する。 | 在籍状態 filter URL を維持。 |
| `snapshot_label` | canonical | `snapshotLabel` | `""` | `SNAPSHOT_LABEL_OPTIONS` 由来の許可値だけ保持。 | はい。 | はい。空は省略。 | invalid は空へ正規化し、URL から消える。 | snapshot helper の許可値に合わせる。 |
| `sort_by` | canonical | `sortBy` | `updated_at` | `SORT_OPTIONS.value` に存在する sort key だけ許可。 | はい。 | はい。default でも書戻す。 | invalid は default。 | 能力値 sort key も許可。 |
| `sort_order` | canonical | `sortOrder` | `desc` | `asc` のみ asc、それ以外は desc。legacy `sort` がある場合は legacy 内 order 優先。 | はい。 | はい。default でも書戻す。 | invalid は desc。 | 大文字や不正値は desc に寄せる。 |
| `sort` | legacy | `sortBy` / `sortOrder` | なし | `key:order` を parse。存在すれば canonical sort より優先。 | いいえ。 | いいえ。sort_by / sort_order へ置換。 | invalid key は default。 | 旧 URL `?sort=name:asc` を読める。 |
| `ability_key` | canonical | `abilityKey` | `""` | `ABILITY_FILTER_OPTIONS` に存在する key のみ許可。 | はい。ただし key が空なら min/max も空。 | はい。 | invalid key は ability 条件全体が空。 | 不正 key で壊れない。 |
| `ability_min` | canonical | `abilityMin` | `""` | 整数文字列かつ ability option の min/max 範囲内だけ許可。 | はい。 | はい。 | invalid は空。 | 範囲外値を URL へ残さない。 |
| `ability_max` | canonical | `abilityMax` | `""` | 整数文字列かつ ability option の min/max 範囲内だけ許可。 | はい。 | はい。 | invalid は空。 | 範囲外値を URL へ残さない。 |

`ability_min > ability_max` は実装済みの統一正規化として、`abilityKey` を保持し、`abilityMin` / `abilityMax` だけ空へ正規化する。これにより URL 読込、submit、sort 操作で reversed range の扱いが一致し、canonical URL / API query から min/max が削除される。削除済みの `validateAbilitySearchState` は現在処理として使わない。

## 6. legacy query precedence

| ケース | schools | players |
| --- | --- | --- |
| `sort` と `sort_by` / `sort_order` が同時存在 | `sort` が truthy なら legacy `sort` が優先。`sort` が空文字なら canonical が使われる。 | 同左。 |
| `admission_year` と `admission_year_from` / `admission_year_to` が同時存在 | 対象外。 | canonical key が存在していれば空文字でも canonical が優先。存在しない側だけ legacy で補完。 |
| `position_type` と `main_position` が同時存在 | 対象外。 | canonical `main_position` が非空なら canonical 優先。canonical が空文字なら legacy が優先。 |
| 空文字 query と legacy query が同時存在 | `sort=` は falsy なので canonical sort が優先。`sort_by=&sort_order=` は invalid 組み合わせとして default。 | `sort=` は canonical 優先。`main_position=` は legacy `position_type` が優先。`admission_year_from=` は legacy より空 canonical が優先。 |
| invalid canonical query と valid legacy query が同時存在 | `sort` が valid なら legacy 優先。legacy がない場合は invalid canonical sort が default に戻る。 | `sort` は legacy 優先。`position_type` は canonical `main_position` が非空なら invalid でも canonical 優先だが、その後許可値 check で空になる。admission year は canonical key が存在すれば invalid でも legacy より優先。 |

## 7. canonical URL 方針

| 観点 | schools | players |
| --- | --- | --- |
| 初期表示の `replaceState` | あり。flash message 削除後、正規化済み検索 state を `replaceState` する。 | あり。正規化済み検索 state を `replaceState` する。 |
| 認識済み query key の削除 | `SCHOOL_SEARCH_QUERY_KEYS` を削除してから `buildSchoolListParams` を set。 | `PLAYER_SEARCH_QUERY_KEYS` を削除してから `buildPlayerListParams` を set。 |
| unrelated query | 認識済み key 以外は保持する。 | 同左。 |
| hash | `url.hash` を含めて保持する。 | 同左。 |
| legacy query の置換 | `sort` は削除され、`sort_by` / `sort_order` へ置換。 | `sort`, `admission_year`, `position_type` は削除され、canonical key へ置換。 |
| default sort | filter なしでも `sort_by=updated_at&sort_order=desc` を明示。 | 同左。 |
| filter なしの query string | sort が残るため query string は残る。unrelated query があればそれも残る。 | 同左。 |
| reset 後の URL | `?sort_by=updated_at&sort_order=desc` が残る。 | 同左。 |
| invalid query 読込後 | fixed select invalid は空 / default になり、認識済み key は削除または default に置換される。 | fixed select / snapshot / ability / sort invalid は削除または default 化。admission year は trim のみで残る。 |

Phase 6.4 では default sort を URL へ明示する方針を採用した。default を省略すると過去 URL の再現性と browser 操作感が変わるため、将来変更する場合は独立タスクで判断する。

## 8. History API 方針

`frontend/js/utils/urlHistory.mjs` は実装済みで、`buildRelativeUrl` と `writeHistoryUrl` を提供する。utility は pathname / search / hash から relative URL を組み立て、`replace` に応じて `pushState` / `replaceState` を選ぶだけで、`window` / DOM / URL state normalization には依存しない。page 固有の canonicalization、legacy query 対応、許可値依存注入、form 処理、API 取得、popstate 復元は `schools.js` / `players.js` に残る。

| 操作 | schools | players |
| --- | --- | --- |
| 初期表示 | `writeHistoryUrl(..., replace: true)`。flash message があれば直前にも `clearFlashMessage` の直接 `replaceState`。 | `writeHistoryUrl(..., replace: true)`。 |
| 検索 submit | `pushState`。 | `pushState`。 |
| reset | `pushState`。 | `pushState`。 |
| sort key 変更 | submit まで URL 更新なし。 | 即時 `pushState`。 |
| sort direction 変更 | sort direction 専用 UI なし。 | 即時 `pushState`。 |
| ability 条件変更 | 対象外。 | 値変更だけでは URL 更新なし。submit 時に `pushState`。sort 変更時は現在 form の ability 条件も一緒に適用される。 |
| popstate | URL 再読込、form 復元、一覧再取得。History 書き込みなし。 | 同左。 |
| flash message 削除 | `clearFlashMessage` が直接 `replaceState`。 | 対象外。 |

unrelated query と hash は保持する。duplicate push 抑止は導入していないため、同一 URL への submit / sort 操作でも指定された `pushState` が呼ばれる。`player_detail` の History 処理は Phase 6.4 対象外である。

## 9. 非同期競合方針

### schools

- `createLatestRequestRunner` を使用する。
- stale success / stale failure / stale finally は無視する。
- request 開始時の normalized search state snapshot を使う。
- latest failure 時は従来どおり一覧を消して error 表示する。
- submit / reset / initial / popstate / create refresh で共通 busy callback を使う。
- runner は DOM / `window` 非依存で、`tests/core/latest-request-runner.test.js` が stale success / failure / finally と callback error 処理を検証する。

### players

- 既存の `latestPlayersRequestId` 方式を維持する。
- Phase 6.4 では `createLatestRequestRunner` へ共通化していない。
- players の request runner 共通化は将来候補として残す。

## 10. frontend lint / 削除安全

Phase 6.4-4 で frontend ESLint を導入済みである。`npm run lint:frontend` は `eslint "frontend/js/**/*.{js,mjs}" --max-warnings=0` を実行し、`no-undef` / `no-redeclare` / `no-unreachable` を error として扱う。`scripts/run-verify-all.js` は `npm run lint:frontend` を含むため、`npm run verify:all` と GitHub Actions `verify-all` で frontend lint も検証される。

削除前参照調査や browser smoke checklist は `.github/pull_request_template.md` と `docs/testing/frontend_static_analysis.md` に反映済みである。

## 11. 実装済み pure module / utility

| module | 主な責務 |
| --- | --- |
| `frontend/js/state/schoolSearchState.mjs` | `createDefaultSchoolSearchState`, `readSchoolSearchStateFromParams`, `normalizeSchoolSearchState`, `buildSchoolListParams`, `buildCanonicalSchoolSearchParams`, `SCHOOL_SEARCH_QUERY_KEYS`。 |
| `frontend/js/state/playerSearchState.mjs` | `createDefaultPlayerSearchState`, `readPlayerSearchStateFromParams`, `normalizePlayerSearchState`, `normalizePlayerAbilitySearchState`, `buildPlayerListParams`, `buildCanonicalPlayerSearchParams`, `PLAYER_SEARCH_QUERY_KEYS`。 |
| `frontend/js/utils/latestRequestRunner.mjs` | latest request の success / error / finally callback だけを通す pure utility。 |
| `frontend/js/utils/urlHistory.mjs` | `buildRelativeUrl`, `writeHistoryUrl` による relative URL 組立と push / replace 呼び分け。 |

`urlState.mjs` は作成していない。6.4-1 時点の調査メモで出ていた `normalizeSearchState` / `createDefaultSearchState` のような汎用名は、最終実装では page 別の `normalizeSchoolSearchState` / `createDefaultSchoolSearchState` / `normalizePlayerSearchState` / `createDefaultPlayerSearchState` に分けた。

## 12. 決定済み事項と将来候補

### 決定済み / 実装済み

- schools stale response protection は実装済み。
- History API 書き込み utility は `urlHistory.mjs` として実装済み。
- fixed select invalid value は空へ正規化し、canonical URL / API query から削除する。
- reversed ability range は ability key を保持し、min/max を削除する。
- default sort は URL へ明示する。
- duplicate push 抑止は導入しない現仕様として固定する。
- frontend lint は `verify:all` / GitHub Actions `verify-all` に統合済み。

### 将来候補

| 項目 | 現在採用中の仕様 | 将来検討 |
| --- | --- | --- |
| schools latest request failure 時の既存一覧 | latest failure は一覧を消して error 表示。 | 既存一覧を残す error policy に変更するか。 |
| admission year 不正文字列 | trim のみで残す。 | 数値形式へ厳格化するか。 |
| duplicate push | 抑止しない。 | 同一 URL では push しない方針へ変えるか。 |
| players latest request runner 共通化 | `latestPlayersRequestId` を維持。 | `createLatestRequestRunner` へ統一するか。 |
| browser 自動テスト | dependency 追加なし、browser smoke 運用。 | Playwright / jsdom 等を導入するか。 |
| sort の History 方針 | players sort は即時 push、schools sort は submit 後 push。 | table header sort 等に合わせて再整理するか。 |

## 13. Phase 6.4 実装順序

| 作業 | 状態 | 成果 |
| --- | --- | --- |
| 6.4-1 URL・状態管理の設計調査 | 完了 | 既存 URL / legacy query / History API / stale response risk を調査し、分離方針を定義。 |
| 6.4-2 schools pure state 分離 | 完了 | `schoolSearchState.mjs` と core test を追加し、schools の URL state 正規化を pure module 化。 |
| 6.4-3 players pure state 分離 | 完了 | `playerSearchState.mjs` と core test を追加し、players の fixed select / ability range / legacy query を pure module 化。 |
| 6.4-4 frontend静的解析・削除安全基盤 | 完了 | frontend ESLint、`lint:frontend`、`verify:all` 統合、削除前参照調査、browser smoke checklist を整備。 |
| 6.4-5 schools非同期競合対策 | 完了 | `createLatestRequestRunner` と schools stale response protection を追加。 |
| 6.4-6 History API検証・最小整理 | 完了 | `urlHistory.mjs` と fake history core test を追加し、push / replace と relative URL 生成を検証。 |
| 6.4-7 最終確認・docs同期 | 完了 | final code と照合し、stale 記述、Phase 資料、feature list、README、未決事項を同期。 |

Phase 6.4 全体は完了。次の作業は Phase 6.5 DB backup・export へ移る。

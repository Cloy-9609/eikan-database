# 状態管理方針

## 1. 文書の目的

この文書は Phase 6.4 の設計基準として、`schools.html` と `players.html` の検索状態管理を対象にする。既存方針である「画面単位で状態を閉じる」「API 取得結果はページスクリプトで保持する」を発展させ、URL 共有、再読込、back / forward の動作を維持しながら責務を整理する。

重要な前提は次のとおり。

- URL 同期を廃止することが目的ではない。
- 現在の URL 互換性、legacy query 読込、History API 動作を壊さない。
- production コードを一度に共通化せず、まず現状の contract を固定する。
- 後続で Node.js 標準機能だけで pure function を自動テストできる構造へ移行する。
- 大規模な汎用 framework 化ではなく、`schools` と `players` のページ固有差分を残せる責務分離を目標にする。

## 2. 用語と状態分類

| 用語 | 意味 | URL へ保存するか |
| --- | --- | --- |
| URL state | `window.location.search` と hash を含む、共有・再読込の入力。検索・表示条件を再構築するための入力であり、API 取得結果そのものではない。 | 検索条件のみ保存する。 |
| normalized search state | URL または form から読んだ値を trim、default 補完、許可値チェックした内部 state。 | canonical query へ変換する。 |
| form state | input / select / hidden input の現在値。ユーザーが submit 前に編集中の値も含む。 | submit または即時適用操作後に反映する。 |
| API query | `fetchSchools` / `fetchPlayers` へ渡す query object。空値は API wrapper で送信されない。 | URL state とは別表現だが、検索条件として一致させる。 |
| render state | 一覧 DOM、件数、空表示、検索サマリーなど描画結果。 | 保存しない。 |
| transient UI state | accordion 開閉、loading 表示、`aria-busy`、button disabled など一時的な UI 状態。 | 原則として検索 URL へ保存しない。 |
| async request state | request ID、loading 中かどうか、既存結果を保持するかどうか。 | 保存しない。 |
| flash message | `message=school-deleted` のような一回限りの通知。検索状態とは別管理。 | 読み取り後に `replaceState` で削除する。 |
| legacy query | 旧 URL を読むための key。例: `sort`, `admission_year`, `position_type`。 | canonical URL へは書き戻さない。 |

API 取得結果は URL state ではない。URL は「同じ検索・表示条件を再構築するための入力」であり、accordion の開閉、簡易詳細 cache、loading 表示、error message の一時表示は検索 URL へ保存しない。

## 3. 現在の状態フロー

### schools.js 初期表示

```text
URL
↓
readSearchStateFromUrl
↓
normalizeSearchState
↓
renderShell(searchState) で form 初期値を描画
↓
flash message 読込・削除
↓
writeSearchStateToUrl(searchState, { replace: true })
↓
buildSchoolListParams
↓
fetchSchools
↓
renderSchoolList
```

`schools.js` は mutable な `searchState` object を `init` 内に持ち、submit / reset / popstate で `Object.assign` する。

### schools.js 操作時

```text
form submit / reset
↓
readSearchStateFromForm または createDefaultSearchState
↓
normalizeSearchState
↓
mutable searchState へ反映
↓
writeSearchStateToUrl(searchState) = pushState
↓
buildSchoolListParams
↓
fetchSchools
↓
renderSchoolList
```

submit と reset は処理中に submit / reset button を disabled にする。sort は検索 form 内の select であり、変更だけでは検索しない。

### schools.js back / forward

```text
popstate
↓
readSearchStateFromUrl
↓
mutable searchState へ反映
↓
applySearchStateToForm
↓
loadSchools
```

### players.js 初期表示

```text
URL
↓
readSearchStateFromUrl
↓
normalizeSearchState
↓
renderShell(searchState)
↓
setupOptionalYearPickers / setupAbilityFilterControls / accordion setup
↓
applySearchStateToForm
↓
writeSearchStateToUrl(searchState, { replace: true })
↓
buildPlayerListParams
↓
fetchPlayers
↓
renderPlayerList
```

`players.js` は `searchState` を初期値として作るが、submit / sort / reset / popstate では操作ごとに `nextState` を作る。後続処理は closure で渡した `nextState` を使う。

### players.js 操作時

```text
form submit / sort key change / sort direction click / reset
↓
readSearchStateFromForm または createDefaultSearchState
↓
normalizeSearchState
↓
validateAbilitySearchState
↓
applySearchStateToForm
↓
writeSearchStateToUrl(nextState) = pushState
↓
buildPlayerListParams
↓
fetchPlayers
↓
renderPlayerList
```

sort key 変更と sort direction click は submit を待たずに即時検索する。ability 条件は submit で適用されるが、値変更時に select option と validation 表示を更新する。

### players.js back / forward

```text
popstate
↓
readSearchStateFromUrl
↓
applySearchStateToForm
↓
loadPlayers
```

## 4. schools query contract

### canonical / legacy query

| key | 分類 | 内部 state | default | 正規化方法 | API 送信 | canonical URL 書戻し | 不正値時の現在挙動 | 維持すべき互換性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `name` | canonical | `name` | `""` | `String(...).trim()`。API / URL 出力時は末尾の `高校` を除去する。 | はい。ただし空は wrapper で省略。 | はい。ただし空は省略。 | 文字列として trim される。 | `青葉高校` query は canonical URL / API では `青葉` になる。 |
| `prefecture` | canonical | `prefecture` | `""` | trim のみ。現在は許可値 check はない。 | はい。 | はい。 | 不正値も URL / normalized state / API query に残るが、select に一致する option がないため form には同じ値を復元できず、URL・state・API と form が不一致になる。 | 後続実装では `PREFECTURE_GROUPS` 内の候補以外を空へ正規化し、canonical URL / API query から削除する。 |
| `play_style` | canonical | `playStyle` | `""` | trim のみ。現在は許可値 check はない。 | はい。 | はい。 | 不正値も URL / normalized state / API query に残るが、select に一致する option がないため form には同じ値を復元できず、URL・state・API と form が不一致になる。 | 後続実装では `continuous` / `three_year` 以外を空へ正規化し、canonical URL / API query から削除する。 |
| `sort_by` | canonical | `sortBy` | `updated_at` | `sort_by:sort_order` を `SORT_OPTIONS` 完全一致で検証。 | はい。 | はい。default でも書戻す。 | invalid 組み合わせは `updated_at` に戻る。 | default sort 明示を維持する場合は常に出力。 |
| `sort_order` | canonical | `sortOrder` | `desc` | `sort_by:sort_order` を `SORT_OPTIONS` 完全一致で検証。 | はい。 | はい。default でも書戻す。 | invalid 組み合わせは `desc` に戻る。 | default sort 明示を維持する場合は常に出力。 |
| `sort` | legacy | `sortBy` / `sortOrder` | なし | `SORT_OPTIONS.value` と完全一致。存在すれば canonical sort より優先。 | いいえ。 | いいえ。`sort_by` / `sort_order` へ置換。 | invalid legacy sort は default sort。 | 旧 URL `?sort=name:asc` を読める。 |

### flash message

| key | 分類 | 用途 | 現在挙動 | canonical URL 書戻し |
| --- | --- | --- | --- | --- |
| `message` | transient / flash message | `school-deleted` の削除完了通知。検索条件ではない。 | 初期表示で読込後、`clearFlashMessage` が `replaceState` で削除する。 | いいえ。 |

## 5. players query contract

| key | 分類 | 内部 state | default | 正規化方法 | API 送信 | canonical URL 書戻し | 不正値時の現在挙動 | 維持すべき互換性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `name` | canonical | `name` | `""` | trim。 | はい。 | はい。空は省略。 | 文字列として trim。 | 部分一致検索 URL を維持。 |
| `school_name` | canonical | `schoolName` | `""` | trim。 | はい。 | はい。空は省略。 | 文字列として trim。 | 学校名検索 URL を維持。 |
| `admission_year_from` | canonical | `admissionYearFrom` | `""` | trim のみ。整数 check はない。 | はい。 | はい。空は省略。 | 不正文字列も送信・書戻し。 | 現在の緩い挙動を変える場合は Decision required。 |
| `admission_year_to` | canonical | `admissionYearTo` | `""` | trim のみ。整数 check はない。 | はい。 | はい。空は省略。 | 不正文字列も送信・書戻し。 | 現在の緩い挙動を変える場合は Decision required。 |
| `admission_year` | legacy | `admissionYearFrom` / `admissionYearTo` | なし | canonical from/to が `null` の場合だけ両方へ補完。trim のみ。 | いいえ。 | いいえ。from/to へ置換。 | 不正文字列も from/to へ入る。 | 旧単一年 URL を range URL として読める。 |
| `player_type` | canonical | `playerType` | `""` | trim のみ。現在は許可値 check はない。 | はい。 | はい。 | 不正値も URL / normalized state / API query に残るが、select に一致する option がないため form には同じ値を復元できず、URL・state・API と form が不一致になる。 | 後続実装では `normal` / `genius` / `reincarnated` 以外を空へ正規化し、canonical URL / API query から削除する。 |
| `main_position` | canonical | `mainPosition` | `""` | trim のみ。現在は許可値 check はない。 | はい。 | はい。 | 不正値も URL / normalized state / API query に残るが、select に一致する option がないため form には同じ値を復元できず、URL・state・API と form が不一致になる。 | 後続実装では production code の固定候補以外を空へ正規化し、canonical URL / API query から削除する。legacy `position_type` の `pitcher -> 投手`, `fielder -> 全野手` は維持する。 |
| `position_type` | legacy | `mainPosition` | なし | canonical `main_position` が truthy なら canonical 優先。legacy `pitcher` は `投手`、`fielder` は `全野手`。 | いいえ。 | いいえ。`main_position` へ置換。 | `pitcher` / `fielder` 以外は空。 | 旧分類 URL を読める。 |
| `school_grade` | canonical | `schoolGrade` | `""` | trim のみ。現在は許可値 check はない。 | はい。 | はい。 | 不正値も URL / normalized state / API query に残るが、select に一致する option がないため form には同じ値を復元できず、URL・state・API と form が不一致になる。 | 後続実装では `1` / `2` / `3` 以外を空へ正規化し、canonical URL / API query から削除する。 |
| `roster_status` | canonical | `rosterStatus` | `""` | trim のみ。現在は許可値 check はない。 | はい。 | はい。 | 不正値も URL / normalized state / API query に残るが、select に一致する option がないため form には同じ値を復元できず、URL・state・API と form が不一致になる。 | 後続実装では `active` / `graduated` 以外を空へ正規化し、canonical URL / API query から削除する。 |
| `snapshot_label` | canonical | `snapshotLabel` | `""` | `SNAPSHOT_LABEL_OPTIONS` に存在する値だけ許可。 | はい。 | はい。 | invalid は空になり URL から消える。 | snapshot helper の許可値に合わせる。 |
| `sort_by` | canonical | `sortBy` | `updated_at` | `SORT_OPTIONS.value` に存在する sort key だけ許可。 | はい。 | はい。default でも書戻す。 | invalid は default。 | 能力値 sort key も許可。 |
| `sort_order` | canonical | `sortOrder` | `desc` | `asc` のみ asc、それ以外は desc。legacy `sort` がある場合は legacy 内 order 優先。 | はい。 | はい。default でも書戻す。 | invalid は desc。 | 大文字や不正値は desc に寄せる。 |
| `sort` | legacy | `sortBy` / `sortOrder` | なし | `key:order` を parse。存在すれば canonical sort より優先。 | いいえ。 | いいえ。sort_by / sort_order へ置換。 | invalid key は default。 | 旧 URL `?sort=name:asc` を読める。 |
| `ability_key` | canonical | `abilityKey` | `""` | `ABILITY_FILTER_OPTIONS` に存在する key のみ許可。 | はい。ただし key が空なら min/max も空。 | はい。 | invalid key は ability 条件全体が空。 | 不正 key で壊れない。 |
| `ability_min` | canonical | `abilityMin` | `""` | 整数文字列かつ ability option の min/max 範囲内だけ許可。 | はい。 | はい。 | invalid は空。 | 範囲外値を URL へ残さない。 |
| `ability_max` | canonical | `abilityMax` | `""` | 整数文字列かつ ability option の min/max 範囲内だけ許可。 | はい。 | はい。 | invalid は空。 | 範囲外値を URL へ残さない。 |

注: `ability_min > ability_max` の現在挙動は、初期 URL 読込時には reversed range が canonical URL と API query に残り得る一方、submit 時には `validateAbilitySearchState` により validation error になる。後続実装では初期 URL 読込・submit・sort 操作のすべてで同じ正規化を行い、`min > max` の場合は `abilityKey` を残して `abilityMin` / `abilityMax` だけ空にする。これは target behavior test の対象にする。

## 6. legacy query precedence

### 現在の挙動

| ケース | schools | players |
| --- | --- | --- |
| `sort` と `sort_by` / `sort_order` が同時存在 | `sort` が truthy なら legacy `sort` が優先。`sort` が空文字なら canonical が使われる。 | 同左。 |
| `admission_year` と `admission_year_from` / `admission_year_to` が同時存在 | 対象外。 | `params.get("admission_year_from") ?? legacyAdmissionYear` なので、canonical key が存在していれば空文字でも canonical が優先。存在しない側だけ legacy で補完。 |
| `position_type` と `main_position` が同時存在 | 対象外。 | `params.get("main_position") || legacyMapping` なので canonical が非空なら canonical 優先。canonical が空文字なら legacy が優先。 |
| 空文字 query と legacy query が同時存在 | `sort=` は falsy なので canonical sort が優先。`sort_by=&sort_order=` は invalid 組み合わせとして default。 | `sort=` は canonical 優先。`main_position=` は legacy `position_type` が優先。`admission_year_from=` は legacy より空 canonical が優先。 |
| invalid canonical query と valid legacy query が同時存在 | `sort` が valid なら legacy 優先。legacy がない場合は invalid canonical sort がそのまま `normalizeSearchState` へ渡り default に戻る。 | `sort` は legacy 優先。`position_type` は canonical `main_position` が非空なら invalid でも canonical 優先。admission year は canonical key が存在すれば invalid でも legacy より優先。 |

### 推奨 precedence

- `sort`: 現在互換のため、legacy `sort` が非空なら優先し、canonical URL へ置換する案を推奨。ただし canonical と legacy の両方がある URL で canonical を優先したい場合は Decision required。
- `admission_year`: canonical from/to が存在する場合は空文字も含めて canonical 優先を維持する案を推奨。legacy を後から補完すると「片側だけ意図的に空」が表現しづらくなる。
- `position_type`: canonical `main_position` が非空なら canonical 優先、空なら legacy 補完を維持する案を推奨。
- invalid canonical と valid legacy の扱いは key ごとに異なるため、後続 pure function 化時に characterization test で固定する。変更する場合は Decision required。

## 7. canonical URL 方針

### 現在の調査結果

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
| invalid query 読込後 | 正規化で空 / default になった認識済み key は削除または default に置換。ただし許可値 check のない key は残る。 | snapshot / ability / sort は削除または default 化。admission year や player type など trim のみの key は残る。 |

### default sort を URL へ明示するか

| 比較観点 | A. default も URL へ明示 | B. default は URL から省略 |
| --- | --- | --- |
| URL の読みやすさ | 冗長。 | 短く読みやすい。 |
| 共有性 | 並び順が明示され、受け手に分かりやすい。 | default を知っている必要がある。 |
| default 変更時の再現性 | 過去 URL の再現性が高い。 | default 変更後に同じ URL の結果順が変わる。 |
| 互換性 | 現在挙動と一致。 | 現在挙動から変わる。 |
| 実装複雑性 | 現在のまま単純。 | default 判定と省略 logic が必要。 |
| 現在挙動との差 | なし。 | あり。Decision required。 |

推奨: Phase 6.4 の安全性を優先し、A を維持する。B へ変更する場合は URL 互換性と browser 操作感が変わるため Decision required。

## 8. History API 方針

### 現在の操作別挙動

| 操作 | schools | players |
| --- | --- | --- |
| 初期表示 | `writeSearchStateToUrl(..., { replace: true })`。flash message があれば直前にも `clearFlashMessage` の `replaceState`。 | `writeSearchStateToUrl(..., { replace: true })`。 |
| 検索 submit | `pushState`。 | `pushState`。 |
| reset | `pushState`。 | `pushState`。 |
| sort key 変更 | submit まで URL 更新なし。 | 即時 `pushState`。 |
| sort direction 変更 | sort direction 専用 UI なし。 | 即時 `pushState`。 |
| ability 条件変更 | 対象外。 | 値変更だけでは URL 更新なし。submit 時に `pushState`。ただし sort 変更時に現在 form の ability 条件も一緒に適用される。 |
| back | browser が history を戻し、`popstate` で URL 再読込、form 復元、一覧再取得。追加 push / replace はしない。 | 同左。 |
| forward | 同上。 | 同上。 |
| flash message 削除 | `replaceState`。 | 対象外。 |

### 推奨方針

- canonicalization だけの場合は `replaceState` を使う。
- user action による検索条件変更は、現在互換として `pushState` を維持する。
- sort 変更ごとに history を積むかは操作感への影響が大きいため、players の現在挙動を変更する場合は Decision required。
- reset を history へ積む現在挙動は、「戻る」で reset 前へ戻れる利点があるため維持を推奨。変更は Decision required。
- 同一 URL への重複 push 防止は現在未実装。導入すると history stack が変わるため Decision required。

## 9. schools と players の差分

| 観点 | schools | players | 分類 |
| --- | --- | --- | --- |
| mutable 永続 `searchState` | あり。`Object.assign` で更新。 | 初期 state はあるが操作ごとに `nextState`。 | 共通化時に page-specific 方針を選ぶ。pure function は共通化可。 |
| 操作ごとの `nextState` | reset 以外は mutable state を直接更新。 | submit / sort / reset / popstate で生成。 | 共通化候補。副作用削減のため players 型を推奨。 |
| sort 変更時の即時検索 | なし。submit 必須。 | あり。 | ページ固有仕様として残す。 |
| submit 必要性 | 検索条件は submit 必須。 | 基本 filter は submit、sort は即時。 | ページ固有仕様。 |
| request race 対策 | `latestRequestRunner.mjs` で stale success / failure / finally を無視。request 開始時の state snapshot を API query と結果表示判定に使う。 | `latestPlayersRequestId` で stale response を無視。 | 共通化は schools に pure runner を導入済み。players 側の既存実装は維持。 |
| loading 中の操作制御 | submit / reset button を disabled。 | sort controls disabled。submit / reset は disabled しない。 | ページ固有 UI だが busy adapter は整理候補。 |
| error 時の既存一覧 | `listRoot.innerHTML = ""` で消す。 | 既存結果があれば保持し message 表示。初回失敗は空。 | 仕様差。統一は Decision required。 |
| popstate 復元 | mutable state 更新後 form 反映。 | form 反映のみ。 | pure state 化で整理候補。 |
| initial canonicalization | あり。 | あり。 | 共通化候補。 |
| reset 処理 | default state を form / URL / API へ反映。 | 同左。 | 共通化候補。 |

共通化すべき差は、URL read/write、normalization、API query 生成、canonicalization、legacy compatibility test である。ページ固有として残す差は、sort 即時適用、loading 中の disabled 対象、error 時の既存一覧保持、flash message の有無である。

## 10. 非同期取得と競合

`players.js` は `latestPlayersRequestId` を increment し、`fetchPlayers` 成功後・失敗後・finally で現在 request かを確認する。古い response は render / error 表示 / busy 解除を行わない。これにより sort 連続操作や back / forward 連打で stale response が新しい検索結果を上書きするリスクを下げている。

`schools.js` には同等の request ID 仕組みがない。検索 submit、reset、popstate が短時間に重なると、後から返った古い request が一覧を上書きする可能性がある。submit / reset 中は button disabled になるが、back / forward や別の非同期 source までは防げない。

現在あり得る一時的不一致:

- URL は `writeSearchStateToUrl` 後すぐ変わるが、一覧は request 完了まで前の結果を表示する。
- players は既存結果を保持する設定が多く、loading 中に URL / form と一覧が一時的に異なる。
- schools は loading 表示に置き換えず前結果のまま fetch し、失敗時は一覧を消す。
- players は stale response を無視するが、schools は無視しない。

必要な後続テスト:

- players: request A より request B が先に完了した場合、A が B の描画を上書きしない。
- schools: 現在挙動の characterization test を書くか、stale protection 導入時に B を維持する test を追加する。
- back / forward 連打時に form、URL、API query が最後の URL と一致する。
- request failure 時に既存結果を保持するか消すかをページ別に固定する。

## 11. 目標責務分離

大規模 framework 化は避け、次の境界で小さく分ける。

| 責務 | 内容 | 候補ファイル |
| --- | --- | --- |
| page-specific state definition | default、許可 sort、query key、legacy key、ability 定義など。 | `frontend/js/state/schoolSearchState.mjs`, `frontend/js/state/playerSearchState.mjs` |
| pure normalization | trim、default、許可値 check、legacy precedence。 | 同上 |
| `URLSearchParams -> state` | URL 読込。`window` に依存しない pure function。 | 同上 + `frontend/js/utils/urlState.mjs` |
| `state -> URLSearchParams` | canonical query 生成。unrelated query / hash の扱いは orchestration 側。 | 同上 |
| `state -> API query` | API wrapper へ渡す object。 | 同上 |
| form adapter | DOM form から state、state から form。 | 既存 page script 内または `frontend/js/pages/*` に残す。 |
| History API orchestration | pathname / search / hash からの relative URL 組立、replace / push 選択、History API 書き込み。popstate orchestration、duplicate push の扱い、検索 state 正規化は page script 側。 | `frontend/js/utils/urlHistory.mjs` + page script。 |
| async list loading | request ID、loading、error、既存結果保持。 | page script。共通化は必要最小限。 |
| rendering | DOM HTML 生成。 | page script。 |

### module 形式の比較

| 方式 | 利点 | 欠点 | 評価 |
| --- | --- | --- | --- |
| `.mjs` ES module | package が CommonJS でも Node.js から `import()` しやすい。browser ES module と同じ export を使える。 | 既存 frontend は `.js` なので拡張子が混在する。 | pure function test 優先なら最も安全。 |
| `.js` browser ES module | 既存 frontend と統一。 | package が CommonJS なので Node.js の `.test.js` から静的 import できず、dynamic import でも CommonJS 扱いになりやすい。 | 追加設定なしでは test が難しい。 |
| CommonJS wrapper | Node test は容易。 | browser 側との二重管理、wrapper の drift risk。 | 非推奨。 |
| 動的 import + `.mjs` | `.test.js` は CommonJS のまま、必要な pure module だけ `await import()`。 | test helper が少し冗長。 | 推奨。 |

推奨: 後続で pure function を作る場合は `.mjs` を採用し、CommonJS の `.test.js` から dynamic `import()` する。ただし pure `.mjs` は既存 frontend `.js` ES module を直接 import しない。Node.js test で `.mjs -> .js` の transitive import を発生させると、package 全体が CommonJS であるため既存 `.js` が CommonJS として解釈され失敗する可能性がある。

production 定数を無意味に複製せず、state module へ必要な許可値を依存注入する。players の snapshot label は、`players.js` が既存 `playerSnapshots.js` から `SNAPSHOT_LABEL_OPTIONS` を取得し、許可 snapshot key 集合を `playerSearchState.mjs` へ渡す。`playerSearchState.mjs` は渡された `allowedSnapshotLabels` で pure normalization を行い、Node test は test fixture として `allowedSnapshotLabels` を渡す。候補 API は `normalizePlayerSearchState(input, { allowedSnapshotLabels })` のような小さな関数を基本とし、大規模な factory abstraction は避ける。

後続で新しい `.mjs` を作成する際は、存在するファイルだけを `scripts/check-js.js` の `frontendFiles` へ明示的に追加する。候補は `frontend/js/state/schoolSearchState.mjs`, `frontend/js/state/playerSearchState.mjs`, `frontend/js/utils/urlHistory.mjs`。各後続タスクの acceptance criteria では、`npm run check:frontend` が新規 `.mjs` を検査し、`npm run verify:all` が新規 `.mjs` の構文エラーを検出できることを確認する。

## 12. 目標仕様

後続実装後に成立すべき invariant:

- URL から同じ検索条件を復元できる。
- 再読込しても条件が維持される。
- back / forward で form と一覧が復元される。
- legacy URL を読める。
- canonical URL は legacy key を出力しない。
- unrelated query と hash を意図せず削除しない。
- invalid query で画面が破損しない。
- reset で default state へ戻る。
- API query と表示条件が一致する。
- stale response で新しい検索結果を上書きしない。
- 通常 DB をテストで使用しない。
- dependency を追加しない。
- flash message は検索状態と分離し、読み取り後に削除できる。
- accordion 開閉や loading 表示は検索 URL へ保存しない。

## 13. 決定済み事項

### ユーザー判断済みの正式方針

1. 不正な固定 select 値は空へ正規化する。対象は schools の `prefecture` / `play_style` と、players の `player_type` / `main_position` / `school_grade` / `roster_status`。後続実装では normalized state は空、form は未指定、canonical URL から key を削除、API query へ送信しない。
2. reversed ability range は min/max を自動で入れ替えず、ability key は残し、min/max だけ削除する。初期 URL 読込時、submit 時、sort 操作時で同じ正規化結果にする。
3. schools へ players と同等の stale response protection を導入する。古い request は success 時に描画せず、error message を表示せず、最新 request の busy 状態を解除しない。

### Phase 6.4 の互換性優先方針

- default sort は URL へ明示する現在方針を維持する。
- unrelated query と hash は保持する。
- legacy precedence は原則として現在挙動を維持する。
- submit / reset / players sort の `pushState` 方針は現在挙動を維持する。
- canonicalization には `replaceState` を使う。
- History API 書き込み utility として `frontend/js/utils/urlHistory.mjs` を追加済み。
- page 固有の canonicalization、legacy query 処理、許可値注入、form / API / popstate 復元は各 page 側に維持する。
- popstate では History API 書き込みを行わない。
- duplicate push 抑止は導入しない。
- `tests/core/url-history.test.js` で pure helper の relative URL、push / replace、state 引数、unrelated query / hash 結合を検証する。
- schools stale response protection は導入決定済みだが、最新 request 失敗時に既存一覧を残すか消すかは通常 error policy の別仕様として扱う。Phase 6.4-5 ではまず stale response による上書き防止を実装し、通常 error policy の全面変更はしない。

### 固定 select の許可値

- schools `prefecture`: `PREFECTURE_GROUPS` 内の都道府県・地域候補。
- schools `play_style`: `continuous`, `three_year`。
- players `player_type`: `normal`, `genius`, `reincarnated`。
- players `main_position`: `投手`, `捕手`, `一塁手`, `二塁手`, `三塁手`, `遊撃手`, `外野手`, `全野手`, `全内野手`。
- players `school_grade`: `1`, `2`, `3`。
- players `roster_status`: `active`, `graduated`。
- legacy `position_type`: `pitcher -> 投手`, `fielder -> 全野手` を維持する。

## 14. 未決事項

| 項目 | 現在挙動 | 選択肢 | 推奨案 | 影響範囲 | 後から変更する難易度 |
| --- | --- | --- | --- | --- | --- |
| default sort を URL へ残すか | 残す。 | A: 残す / B: 省略。 | A。互換性と再現性を優先。 | 全一覧 URL、テスト期待値。 | 中。URL contract が変わる。 |
| sort 変更を history へ積むか | schools は submit 時のみ、players は sort 変更ごとに push。 | A: 現状維持 / B: replace / C: debounce 後 push。 | A。 | browser 戻る操作感。 | 中。手動確認が必要。 |
| reset を history へ積むか | push。 | A: push / B: replace。 | A。戻るで reset 前へ戻れる。 | history stack。 | 低〜中。 |
| invalid query を URL から除去するか | sort / snapshot / ability は除去または default 化、trim のみ項目は残る。 | A: 現状維持 / B: 全 key 厳格化。 | A から characterization、厳格化は個別 Decision required。 | 既存共有 URL、API query。 | 中〜高。 |
| unrelated query を保持するか | 保持。 | A: 保持 / B: 削除。 | A。外部導線や debug query を壊さない。 | URL canonicalization。 | 低だが互換性影響あり。 |
| legacy key と canonical key の優先順位 | key ごとに異なる。`sort` は legacy 優先、admission range は canonical key 存在優先、position は canonical 非空優先。 | A: 現状維持 / B: canonical 常時優先 / C: legacy 常時優先。 | A。変更するなら Decision required。 | 旧 URL と混在 URL。 | 中。test 更新が必要。 |
| schools の最新 request 失敗時に既存一覧を残すか | 現在は失敗時に一覧を消す。stale response protection は導入決定済み。 | A: 現在の error policy を維持 / B: players と同様に既存一覧を保持。 | Phase 6.4-5 では A のまま stale response 上書き防止のみ導入し、B は別判断。 | schools 一覧の error 表示、既存結果保持。 | 中。 |
| 不正な入学年度文字列を厳格に削除するか | trim のみで残る。 | A: 現状維持 / B: 整数文字列以外を削除。 | Phase 6.4 では A。厳格化は別判断。 | players URL、API query、backend validation。 | 中。 |

## 15. 実装順序

| タスク | 目的 | 主な変更ファイル | acceptance criteria | リスク | 規模 | 前提 | 実ブラウザ確認 | 自動merge推奨 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6.4-1 URL・状態管理調査 | URL state の現状、legacy query、History API、非同期競合リスクを整理し、後続作業の contract を固定する。 | `docs/design/state_management.md`, `docs/testing/url_state_management_tests.md` | 調査結果と実装順序が明文化されている。 | 低 | 小 | なし | 不要。 | 可。 |
| 6.4-2 schools pure state | schools pure state module を作成し、invalid `prefecture` / `play_style` を空へ正規化、canonical URL / API query から削除する。characterization test と新しい target behavior test を追加し、新規 `.mjs` を `scripts/check-js.js` へ追加する。 | `frontend/js/state/schoolSearchState.mjs`, `frontend/js/pages/schools.js`, `scripts/check-js.js`, `tests/core/...` | production 動作の意図した変更以外を避け、不正固定 select 値が空へ正規化される。`npm run check:frontend` が新規 `.mjs` を検査し、`npm run verify:all` が構文エラーを検出できる。完了。 | 中 | 小〜中 | 6.4-1 | 必要。検索、reset、back。 | 不可 |
| 6.4-3 players pure state | players pure state module を作成し、invalid `player_type` / `main_position` / `school_grade` / `roster_status` を空へ正規化する。reversed ability range は ability key を残して min/max を削除し、snapshot label 許可値は依存注入する。legacy precedence は維持し、新規 `.mjs` を `scripts/check-js.js` へ追加する。 | `frontend/js/state/playerSearchState.mjs`, `frontend/js/pages/players.js`, `scripts/check-js.js`, `tests/core/...` | legacy precedence と target behavior が test 化される。`npm run check:frontend` が新規 `.mjs` を検査し、`npm run verify:all` が構文エラーを検出できる。完了。 | 中 | 中 | 6.4-2 | 必要。sort、ability、back。 | 不可 |
| 6.4-4 frontend静的解析・削除安全基盤 | frontend を対象に ESLint `no-undef` を導入し、削除前参照調査、重要定義の責務コメント、browser smoke checklist を整備する。 | `eslint.config.mjs`, `package.json`, `scripts/run-verify-all.js`, `frontend/js/pages/players.js`, `frontend/js/pages/schools.js`, `docs/testing/frontend_static_analysis.md`, `.github/pull_request_template.md` | `no-undef` / `no-redeclare` / `no-unreachable` を導入済み。`lint:frontend` を `verify:all` へ統合済み。削除安全手順、責務コメント、browser smoke checklist を整備済み。完了。 | 低〜中 | 小〜中 | 6.4-3 | 可能なら必要。 | 不可 |
| 6.4-5 schools非同期競合対策 | 完了。schools stale response protection を導入した。request A 後に request B、B が先に完了、A が後で成功しても B を上書きしない。A が後で失敗しても error message を上書きせず、A の finally で B の busy 状態を解除しない。request 開始時の state snapshot を API query と `hasFilters` 判定に使う。通常の schools latest failure policy は維持する。 | `frontend/js/pages/schools.js`, `frontend/js/utils/latestRequestRunner.mjs`, `tests/core/latest-request-runner.test.js`, docs | stale success ignored、stale failure ignored、stale finally ignored、request 開始時 state snapshot、latest failure 時の既存 error policy 維持、automated tests 追加。 | 中。schools error behavior と混同しない。 | 小〜中 | 6.4-4 | 完了。 | 不可 |
| 6.4-6 History API検証・最小整理 | 完了。現在の push / replace 方針を維持し、History API wrapper の重複と back / forward 契約を検証した。共通化は relative URL 組立、push / replace 選択、History API 書き込みだけに限定し、page 固有 canonicalization は各 page に残した。 | `frontend/js/pages/schools.js`, `frontend/js/pages/players.js`, `frontend/js/utils/urlHistory.mjs`, `tests/core/url-history.test.js`, docs | History 書き込み utility 追加。canonicalization は replace、user action は既存どおり push、popstate では History 書き込みなし。unrelated query / hash 保持、duplicate push 抑止なし。pure helper tests 追加。page 固有 canonicalization は各 page へ維持。完了。 | 中。操作感に影響。 | 小〜中 | 6.4-5 | 必須。 | 不可 |
| 6.4-7 最終確認・docs同期 | 次の作業。実装後の仕様・未決解消を docs / phase / feature list に反映。 | `docs/design/state_management.md`, `docs/testing/url_state_management_tests.md`, `docs/phases/phase2.md`, `docs/requirements/feature_list.md` | 実装済み仕様と docs が一致する。 | 低。 | 小 | 6.4-6 | 不要。 | 可。 |

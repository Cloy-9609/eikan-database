# players画面 高度検索・能力表示 要件調査メモ

## 1. このdocsの位置づけ

この文書は、`players.html` を将来的に「選手能力の閲覧・比較」に強い一覧へ拡張するための調査結果と段階的実装計画である。このタスクでは実装コード、DB schema、migration、API仕様、保存・更新・削除・snapshot作成処理は変更しない。

対象機能は以下に限定する。

- 選手一覧の能力簡易表示。
- 投手能力・野手能力による検索。
- 能力値による昇順・降順ソート。
- ランクと数値を連動させた能力範囲検索。
- メイン守備位置による検索・ソート。
- スナップショット時点を指定した表示・検索・ソート。
- PCとスマートフォンでの表示情報最適化。

特殊能力検索は今回の対象外とする。通常能力値のランクと、特殊能力のランク・金特殊能力は別概念として扱う。

## 2. 調査した主要ファイル

| 分類 | ファイル | 役割 |
| --- | --- | --- |
| players画面HTML | `frontend/pages/players.html` | ページ枠、CSS読み込み、`#players-root`、`players.js` 読み込み。 |
| players画面JS | `frontend/js/pages/players.js` | 検索フォーム、URL同期、一覧描画、アコーディオン簡易詳細、API呼び出し。 |
| players画面CSS | `frontend/css/players.css` | 検索フォーム、一覧table、アコーディオン、640px以下のカード型表示。 |
| frontend API | `frontend/js/api/playerApi.js` | `/api/players`、`/api/players/:id`、`/api/player-series/:id` のfetch wrapper。 |
| backend route | `backend/routes/playerRoutes.js`, `backend/routes/playerSeriesRoutes.js` | players APIとplayer-series APIのルーティング。 |
| backend controller | `backend/controllers/playerController.js` | service結果をJSON `{ success, data, error }` で返す。 |
| backend service | `backend/services/playerService.js` | query正規化、入力検証、snapshot選択、series/detail response構築。 |
| backend model | `backend/models/playerModel.js` | players一覧SQL、最新snapshot join、一覧select columns、並び替えSQL。 |
| snapshot定義 | `backend/constants/playerSnapshots.js`, `frontend/js/utils/playerSnapshots.js` | 公式snapshot timelineと表示ラベル。players画面は現状ローカル定義も持つ。 |
| DB設計 | `docs/design/database_design.md`, `scripts/schema.sql` | `player_series` と `players`、能力値カラム、関連テーブル。 |
| 既存要件 | `docs/requirements/player_data.md` | 能力値の想定範囲。 |

## 3. players画面の現行構造

### 3.1 HTML構造

`frontend/pages/players.html` は静的な枠のみを持つ。主要な表示は `#players-root` に `frontend/js/pages/players.js` が動的に描画する。

読み込むCSSは以下。

- `frontend/css/base.css`
- `frontend/css/layout.css`
- `frontend/css/components/admission_year_picker.css`
- `frontend/css/players.css`

### 3.2 JSの主要関数とデータの流れ

現行の大まかな流れは次の通り。

1. `init()` が `readSearchStateFromUrl()` でURLから検索状態を復元する。
2. `renderShell(root, searchState)` が検索フォームと一覧rootを描画する。
3. `applySearchStateToForm()` がフォームへ状態を反映する。
4. `writeSearchStateToUrl(searchState, { replace: true })` が初期URLを正規化する。
5. `loadPlayers()` が `fetchPlayers(buildPlayerListParams(searchState))` を実行する。
6. backendの `/api/players` が検索・ソート済み一覧を返す。
7. `renderPlayerList()` と `renderPlayerRows()` がtableを描画する。
8. 選手名左のtoggle押下時に `loadAccordionDetail()` が `/api/players/:id` を追加取得し、`renderAccordionPanel()` で簡易詳細を表示する。

主要関数は以下。

| 関数 | 役割 |
| --- | --- |
| `createDefaultSearchState()` | 検索状態の初期値。 |
| `readSearchStateFromUrl()` | URL queryから検索状態を生成。legacy `sort`、`position_type`、`admission_year` も吸収する。 |
| `buildPlayerListParams()` | frontend stateをAPI query名へ変換。 |
| `writeSearchStateToUrl()` | 検索状態をURLへ反映。対象keyを一度削除してから非空値のみ設定する。 |
| `hasActiveSearchFilters()` | 件数文言用にfilter有無を判定。sortはfilter扱いしない。 |
| `renderShell()` | 検索フォーム、検索結果panel、説明文を描画。 |
| `renderPlayerList()` | 件数、active filter summary、tableを描画。 |
| `renderPlayerRows()` | 1選手につき通常行1行とアコーディオン行1行を生成。 |
| `setupPlayerAccordion()` | 行toggleと投手/野手能力切替buttonのイベント委譲。 |
| `loadAccordionDetail()` | 一覧itemに不足する関連情報を `/api/players/:id` で取得。 |
| `readSearchStateFromForm()` | submit時にform値から検索状態を生成。 |
| `applySearchStateToForm()` | popstate/reset時にformへ状態を反映。 |
| `setupOptionalYearPickers()` | 入学年範囲pickerの未指定・クリア処理。 |

### 3.3 現在の検索条件管理

検索状態は `players.js` 内のplain objectで管理される。対象条件は以下。

- 選手名: `name`
- 学校名: `schoolName` / API query `school_name`
- 入学年範囲: `admissionYearFrom`, `admissionYearTo` / API query `admission_year_from`, `admission_year_to`
- 選手タイプ: `playerType` / API query `player_type`
- ポジション: `mainPosition` / API query `main_position`
- 管理学年: `schoolGrade` / API query `school_grade`
- 在籍状態: `rosterStatus` / API query `roster_status`
- 並び順: `sortBy`, `sortOrder` / API query `sort_by`, `sort_order`

`PLAYER_SEARCH_QUERY_KEYS` に列挙されたkeyがURL正規化時に削除対象となる。現在ここに `snapshot_label` は含まれていないため、一覧画面でsnapshot指定UIを足す場合はURL運用の方針に応じて追加が必要になる。

### 3.4 現在の並び替え処理

frontendは `SORT_OPTIONS` でselect候補を持つだけで、実際のソートはbackend SQLで行う。現行候補は以下。

- `updated_at:desc/asc`
- `name:asc/desc`
- `admission_year:desc/asc`
- `school_grade:asc/desc`
- `roster_status:asc/desc`

backend側では `ALLOWED_PLAYER_SORT_BY` に `school_name` と `snapshot` も許可され、`buildPlayerSortClause()` にSQLがある。ただし現行players画面のselectには学校名・snapshotのsort optionはない。

### 3.5 URLクエリの読み込み・書き出し・クリア

- 読み込み: `readSearchStateFromUrl()`。
- 書き出し: `writeSearchStateToUrl()`。
- submit: `pushState` でURLを書き換えた後、再取得。
- 初期化: `replaceState` でURLを正規化。
- 戻る/進む: `popstate` でURLを再読込し、form反映・再取得。
- クリア: `createDefaultSearchState()` をformとURLへ反映し、再取得。sortは更新日時降順へ戻る。

URL共有、再読み込み復元、ブラウザ戻る/進むに強い一方で、条件が増えるほどURL query key管理とフォームstateの結合度が高くなる。

### 3.6 PC表示とスマートフォン表示の分岐

CSSは主に `@media (max-width: 640px)` を境にtable表示をカード型へ変換する。

- PC/641px以上: table headerを表示し、横並びtableとして表示。
- 640px以下: `thead` を非表示、`table/tbody/tr/td` をblock化し、各tdは `data-label` を疑似見出しとして表示する。
- 640px以下では `.players-table-wrap` の `overflow-x` は `visible` で、横スクロールを避ける設計になっている。
- アコーディオンは通常行の直後に独立した `tr.players-accordion-row` として置かれ、mobileでは通常行と連結したカード下部になる。

## 4. 一覧APIと能力データ

### 4.1 API経路

- frontend: `fetchPlayers(params)` -> `GET /api/players?...`
- route: `backend/routes/playerRoutes.js` の `router.get("/", controller.getPlayers)`
- controller: `getPlayers(req, res, next)`
- service: `playerService.getPlayers(query)`
- model: `playerModel.findAllActive(normalizedQuery)`

レスポンスは `{ success: true, data: players, error: null }`。frontend wrapperは `payload.data` を返す。

### 4.2 players一覧APIのレスポンス内容

`PLAYER_SELECT_COLUMNS` により、一覧APIは関連テーブルを除いた主要snapshot能力値を既に返している。

含まれる主な項目は以下。

- `players.id`
- `player_series_id`
- `school_id`, `school_code`, `school_current_year`, `school_name`, `school_is_archived`
- `series_no`
- `school_grade`, `roster_status`
- `name`, `player_type`, `player_type_note`
- `total_stars`
- `prefecture`, `admission_year`
- `grade`
- `snapshot_label`, `snapshot_note`, `snapshot_order`
- `main_position`
- `throwing_hand`, `batting_hand`
- `is_reincarnated`, `is_genius`
- 投手能力: `velocity`, `control`, `stamina`
- 野手能力: `trajectory`, `meat`, `power`, `run_speed`, `arm_strength`, `fielding`, `catching`
- `evidence_image_path`
- `created_at`, `updated_at`, series作成・更新日時

含まれないものは以下。

- `pitch_types`
- `special_abilities`
- `sub_positions`

これらは `/api/players/:id` で `attachRelations()` された詳細取得時にのみ返る。

### 4.3 一覧表示中のsnapshot選択

現行一覧は1 player_seriesにつき1件のsnapshotを表示する。選択は `latestSnapshotJoinSql` で行われる。

優先順は以下。

1. 公式snapshot labelをlegacyより優先。
2. 公式timeline上の順序が後ろのものを優先。
3. `updated_at` が新しいものを優先。
4. `created_at` が新しいものを優先。
5. `id` が大きいものを優先。

つまり、players画面の現行「現在表示中snapshot」は「一覧SQLが各seriesから選んだ最新相当snapshot」であり、ユーザーごとの表示選択やplayer_detailの選択状態とは連動していない。

### 4.4 入学時snapshotを特定する仕組み

公式timelineでは `entrance` が入学時である。frontendのplayers画面は互換表示として `admission` も「入学時」と表示するが、backend schemaと `TRANSITIONAL_SNAPSHOT_LABELS` の現在値では公式 `entrance` とlegacy `post_tournament` が中心であり、`admission` は現行DBの正式値ではない。

入学時指定を一覧APIで安定して扱うなら、基本は `players.snapshot_label = 'entrance'` とする。過去データに `admission` が存在し得るかはmigration履歴・実DB確認が必要で、今回のコード調査だけでは確定しない。

### 4.5 player_seriesとplayersの関係

- `player_series` は論理的な選手1人を表す。
- `players` は時点ごとのsnapshotを表す。
- `players.player_series_id` が `player_series.id` を参照する。
- `idx_players_series_snapshot_unique` により、同一series内で同じ `snapshot_label` は1件に制限される。
- 一覧は `player_series` 起点で `latestSnapshotJoinSql` により1 snapshotをjoinするため、snapshot行が複数あっても一覧では重複しない。

### 4.6 frontendだけで能力検索できる範囲

一覧APIは通常能力値を返しているため、現在取得済みの表示対象snapshotに対する「小規模データのクライアント側絞り込み」は可能である。ただし次の理由で本実装としてはbackend/API検索条件追加を推奨する。

- 現行検索・ソートはbackend SQLで実施されており、能力検索だけfrontendに分離すると件数表示・URL状態・検索結果の意味が複雑になる。
- 将来選手数が増えた場合、全件取得後のfrontend filterは性能・メモリ・通信量の懸念がある。
- snapshot指定と能力検索・能力ソートを組み合わせる場合、SQLで対象snapshotを決めてからWHERE/ORDER BYする方が一貫する。
- 見出しクリックsortやページング追加を将来行う場合、backend sortが前提になりやすい。

低リスクな最初の2行表示だけはfrontend表示変更のみで可能である。

### 4.7 snapshot複数比較とN+1リスク

現行一覧APIは通常能力値を同一SQLで返すため、表示対象snapshotだけならN+1は発生しない。アコーディオンを開いた時だけ `/api/players/:id` を1件ずつ追加取得するため、複数アコーディオンを開くと詳細取得はN回になる。

snapshot指定や複数snapshot比較で以下を行う場合はN+1リスクがある。

- 各seriesごとに別queryで指定snapshotの有無を確認する。
- 入学時と最新時点を各選手ごとに別々に取得する。
- fallback表示用に詳細relationまで各選手ごとに取得する。

推奨は、一覧用SQLで「対象snapshotを1回のJOINまたはサブクエリで選ぶ」方式である。比較表示が必要な場合も、対象snapshot setをまとめて取得してseriesごとに集約する設計が望ましい。

## 5. 能力項目の整理

### 5.1 既存の能力フィールド

`player_edit.js` の定義を正とすると、通常能力は以下。

| 区分 | 表示名 | 内部フィールド名 | 現行入力UI | backend検証 | DB制約 | ランク表示 |
| --- | --- | --- | --- | --- | --- | --- |
| 投手 | 球速 | `velocity` | number | `min: 0` | `CHECK (velocity >= 0)` | なし |
| 投手 | コントロール | `control` | ranked | `min: 0` | `CHECK (control >= 0)` | G〜S |
| 投手 | スタミナ | `stamina` | ranked | `min: 0` | `CHECK (stamina >= 0)` | G〜S |
| 野手 | 弾道 | `trajectory` | trajectory | `min: 0` | `CHECK (trajectory >= 0)` | なし |
| 野手 | ミート | `meat` | ranked | `min: 0` | `CHECK (meat >= 0)` | G〜S |
| 野手 | パワー | `power` | ranked | `min: 0` | `CHECK (power >= 0)` | G〜S |
| 野手 | 走力 | `run_speed` | ranked | `min: 0` | `CHECK (run_speed >= 0)` | G〜S |
| 野手 | 肩力 | `arm_strength` | ranked | `min: 0` | `CHECK (arm_strength >= 0)` | G〜S |
| 野手 | 守備 | `fielding` | ranked | `min: 0` | `CHECK (fielding >= 0)` | G〜S |
| 野手 | 捕球 | `catching` | ranked | `min: 0` | `CHECK (catching >= 0)` | G〜S |

`docs/requirements/player_data.md` には通常能力値は0〜100、弾道は1〜4とある。一方、backend/DBの現行検証は上限を設けていない。将来の範囲検索UIでは、画面仕様として0〜100・弾道1〜4を前提にしつつ、既存データに100超などが入っている可能性をどう扱うかを別途確認する必要がある。

### 5.2 G〜Sランク境界

`frontend/js/pages/player_edit.js` の `ABILITY_RANK_GROUPS` は以下。

| ランク | 数値範囲 |
| --- | --- |
| G | 1〜19 |
| F | 20〜39 |
| E | 40〜49 |
| D | 50〜59 |
| C | 60〜69 |
| B | 70〜79 |
| A | 80〜89 |
| S | 90〜100 |

`0`、null、空文字はランクなし/未設定相当として扱うのが自然である。現行 `getAbilityRankForValue()` は数値がどのrank groupにも入らなければnullを返す。Prompt5-2の確定仕様では、通常能力値の `0` は有効値として `0` と表示し、G〜S色分けの対象外としてneutral / unranked扱いにする。

### 5.3 null / 未設定値の扱い

- DB上、通常能力はnullable。未入力ならnullになり得る。
- 入力UIでは空欄は空文字として送られ、`parseOptionalInteger()` によりnull相当になると推測される。
- `total_stars` は0を未設定sentinelとして扱うが、通常能力の0については現行要件上「0〜100」とされており、未設定とは別の値になり得る。Prompt5-2では、通常能力値の0は有効値として `0` と表示する。
- players一覧の既存 `formatStatValue()` はnull/空なら `-` を表示する。Prompt5-2ではnull/undefined/空文字/NaNや不正値は安全に `-` 等で表示し、0は `0` と表示する。

### 5.4 投手以外または野手能力未登録時の扱い

- `players.js` の `isPitcher(player)` は `main_position === '投手'` のみで判定する。
- アコーディオンでは投手なら投手能力を初期表示し、toggleで野手能力に切替可能。
- 野手なら野手能力のみ表示する。
- 投手にも野手能力カラムは存在し、保存可能であるため、投手兼野手・二刀流相当は「投手を主表示し、野手能力も確認可能」という現行思想に近い。

### 5.5 一覧表示・検索・ソートへの利用可能性

- 通常能力値は一覧APIに含まれるため、一覧2行表示にはそのまま利用可能。
- 通常能力値による検索・ソートはSQL対象カラムが既に `players` にあるためDB schema変更なしで可能。
- 変化球関連は `player_pitch_types` 関連テーブルにあるため、一覧APIには含まれない。変化球検索・ソートを含める場合はJOIN/集約/API拡張が必要で、今回の通常能力値検索よりリスクが高い。
- 特殊能力は今回対象外。

## 6. 一覧の2行表示案

### 6.1 現在のtable/grid構造での実現可能性

現行 `renderPlayerRows()` は1選手につき以下を出力する。

1. `.players-table-row` 通常行。
2. `.players-accordion-row` 詳細行。通常はhidden。

2行目の能力要約は、通常行内に入れる方法と、通常行の直後に新しい要約行を入れる方法がある。検討の結果、Prompt5-2では後述の確定仕様を採用し、能力要約用の新しい `tr` は追加しない。

確定方針は、既存の通常行内に能力要約ブロックを追加し、見た目として既存の選手情報の下に能力情報の2段目が表示される形にすることである。通常行とアコーディオン詳細行の隣接関係を維持し、`previousElementSibling` 等に依存する既存アコーディオン処理を壊さない。

### 6.2 既存アコーディオンとの競合

注意点は以下。

- `setAccordionExpanded()` は `detailRow.previousElementSibling` を通常行として扱う。通常行と詳細行の間に能力要約 `tr` を挟むとexpanded class付与対象がずれるため、Prompt5-2では新しい `tr` を追加しない。
- `PLAYERS_TABLE_COLUMN_COUNT` は6。Prompt5-2では列追加や新規colspan行の追加を避け、既存の通常行内に能力要約を収める。
- mobileでは通常行がカード、アコーディオン行がカード下部として接続されるため、640px以下では新規能力要約ブロック全体を非表示にし、既存アコーディオン詳細で能力を確認する。

### 6.3 表示項目案

この節の旧検討案は、後述の「Prompt5-2 確定仕様：players一覧の能力要約表示」を採用する。確定後の要点は以下。

PC表示では641px以上で能力要約を表示する。

- 投手の初期表示: 球速、コントロール、スタミナ。球速は `○○ km/h` 形式。
- 投手の切替後表示: 弾道、ミート、パワー、走力、肩力、守備力、捕球。
- 野手: 弾道、ミート、パワー、走力、肩力、守備力、捕球。
- 総合星は既存列にあるため、能力要約では重複させない。
- 総変化量はPrompt5-2では表示しない。backend/API対応を伴う将来タスクとして保留する。

スマートフォン表示では、640px以下で能力要約ブロック全体を非表示にする。旧案では投手3項目・野手4項目程度の抜粋表示を検討していたが、確定仕様では中途半端な抜粋表示を行わず、能力確認は既存アコーディオン詳細に集約する。

投手兼野手相当の選手については、メインポジションが投手なら初期表示を投手能力とし、能力要約内に投手能力・野手能力の切替UIを設ける。切替状態は既存アコーディオン詳細内の切替状態と同期させる。

能力未登録時と値の扱い。

- `null` / `undefined` / 空文字は `-`。
- 数値 `0` は有効値として `0`。
- NaNや不正値はそのまま表示せず、`-` 等の安全な表示にする。
- 能力ランク文字は表示しない。例: `D 50` ではなく `50`。

### 6.4 横スクロール・高さ・アクセシビリティ

- PCでは新たな横スクロールを発生させず、能力項目は必要に応じて折り返せるようにする。
- 行高が過度に大きくならないよう、能力要約はcompactなchip/listとして設計する。
- 640px以下では能力要約ブロック全体を非表示にし、非表示部分の空白や余白を残さない。
- 能力名と数値を必ず表示し、色だけに意味を依存させない。
- 投手能力・野手能力切替にはbutton要素を使用し、`aria-pressed` 等で選択状態を伝える。
- 略称を使う場合は、正式名称を `aria-label` または `title` で確認できるようにする。
- toggle buttonのクリック範囲と、選手名・学校名リンクなど既存操作を妨げない。

## 7. Prompt5-2 確定仕様：players一覧の能力要約表示

### 7.1 一覧の2段表示方法

- 能力要約用の新しい `tr` は追加しない。
- 既存の通常行内に能力要約ブロックを追加する。
- 見た目としては、既存の選手情報の下に能力情報の2段目が表示される形とする。
- 能力要約は選手名セルだけに閉じ込めず、PC表示では少なくとも選手名・学校名の下を横断する横長表示とする。
- 上段には既存列情報、下段には能力要約を配置し、学校名や他列が能力要約の縦中央に浮いて見えないようにする。
- 通常行とアコーディオン詳細行の隣接関係を維持する。
- `previousElementSibling` 等に依存する既存アコーディオン処理を壊さない。
- Prompt5-2実装時の変更候補は、原則として以下とする。
  - `frontend/js/pages/players.js`
  - `frontend/css/players.css`

### 7.2 PC表示

641px以上では能力要約を表示する。

要件:

- 既存の選手情報を1段目として維持する。
- 能力要約を見た目上の2段目として配置する。
- 新たな横スクロールを発生させない。
- 能力項目は必要に応じて折り返せるようにし、1280px前後では可能な限り横並びにする。
- 行高が過度に大きくならないようにする。
- 絶対配置、隣接cellへのはみ出し、負のmarginなどの脆弱な実装で横幅を確保しない。
- 選手名、学校名、アコーディオン開閉などの既存操作を妨げない。

### 7.3 モバイル表示

640px以下では、新たに追加する能力要約ブロック全体を非表示にする。

以下も能力要約と一緒に非表示にする。

- 能力項目。
- 能力要約内の投手能力・野手能力切替UI。
- 能力要約専用の補助文言。
- 能力要約専用の余白。

モバイルでは能力の一部だけを抜粋表示しない。モバイルで能力を確認する場合は、既存のアコーディオン詳細を利用する。

### 7.4 野手の表示能力

メインポジションが投手以外の選手は、以下の野手能力を表示する。

- 弾道。
- ミート。
- パワー。
- 走力。
- 肩力。
- 守備力。
- 捕球。

### 7.5 投手の表示能力

メインポジションが投手の選手は、初期状態で以下を表示する。

- 球速。
- コントロール。
- スタミナ。

球速は `○○ km/h` の形式で表示する。

### 7.6 総変化量の扱い

総変化量はPrompt5-2では表示しない。

理由:

- 現行players一覧APIに `pitch_types` が含まれていない。
- 総変化量を算出するには、変化球relationの取得または一覧SQLでの集約が必要になる。
- 選手ごとに詳細APIを呼び出す実装はN+1問題につながる。
- Prompt5-2をfrontendのみの低〜中リスクな表示タスクとして維持するため。

総変化量は、backend/API対応を伴う将来タスクとして保留する。将来実装する場合、球速と同様にG〜Sランク色分けの対象にはせず、固定色で表示する想定とする。

### 7.7 投手能力・野手能力の切替

メインポジションが投手の選手については、能力要約内にも以下の切替UIを設ける。

- 投手能力。
- 野手能力。

初期状態は投手能力とする。

野手能力へ切り替えた場合は、以下を表示する。

- 弾道。
- ミート。
- パワー。
- 走力。
- 肩力。
- 守備力。
- 捕球。

メインポジションが投手以外の選手には、この切替UIを表示しない。

### 7.8 アコーディオン詳細との同期

能力要約内の投手能力・野手能力切替と、既存アコーディオン詳細内の切替状態を同期させる。

期待する挙動:

- 能力要約を野手能力へ切り替えると、開いているアコーディオン詳細も野手能力へ切り替わる。
- アコーディオン詳細を投手能力へ切り替えると、能力要約も投手能力へ戻る。
- 能力要約で野手能力を選択した後にアコーディオンを初めて開いた場合、アコーディオンも野手能力を表示する。
- 切替状態は選手ごとに独立して管理する。
- アコーディオンを閉じても、一覧全体が再描画されない限り切替状態を維持する。
- 同じ目的の状態管理やイベント処理を二重に持たない。
- Prompt5-2では大規模なリファクタリングを行わず、必要な範囲で既存処理を再利用または小さく共通化する。

### 7.9 能力値の表示形式

能力ランク文字は表示しない。

例:

- `D 50` ではなく `50`。
- `B 75` ではなく `75`。

表示規則:

- `null`: `-`。
- `undefined`: `-`。
- 空文字: `-`。
- 数値 `0`: 有効値として `0`。
- NaNや不正値: そのまま表示せず `-` 等の安全な表示にする。
- 球速: `145 km/h` のように単位を付ける。
- それ以外: 数値を表示する。

### 7.10 G〜S通常能力の色分け

以下の1〜100能力は、能力ランク文字を表示せず、数値または数値周辺の表示色によってランクを補助表現する。

対象:

- コントロール。
- スタミナ。
- ミート。
- パワー。
- 走力。
- 肩力。
- 守備力。
- 捕球。

ランク境界:

- G: 1〜19。
- F: 20〜39。
- E: 40〜49。
- D: 50〜59。
- C: 60〜69。
- B: 70〜79。
- A: 80〜89。
- S: 90〜100。

補足:

- ランク文字そのものは表示しない。
- 能力名と数値は常に表示する。
- 色だけで能力値を伝えない。
- 数値 `0` はG〜Sのどのランクにも含めず、neutral / unranked表示とする。
- nullや未設定値もneutral表示とする。
- 既存の能力ランク色、CSS class、helperを安全に再利用できるかはPrompt5-2実装時に確認する。
- 安全に共通化できない場合は、Prompt5-2で大規模な共通化を行わない。
- 将来的な共通helper化候補としてdocsに残してよい。

### 7.11 球速の色

球速はG〜Sランクによる色分けを行わない。

- 数値にかかわらず同じ固定色とする。
- 栄冠データベースの既存UIに合うneutralまたはprimary系の色とする。
- 公式ゲームや攻略サイトの配色を直接再現しない。

### 7.12 弾道の色

弾道は以下の色系統で表示する。

- 弾道1: 黄色。
- 弾道2: オレンジ。
- 弾道3: 赤。
- 弾道4: マゼンタ。

例外:

- null / 空: neutral表示。
- 0: 数値を表示したうえでneutral表示。
- 1〜4以外: 数値を隠さずneutral表示。

配色は公式ゲームや攻略サイトを直接再現せず、現在の栄冠データベースUIに合う独自配色とする。

### 7.13 アクセシビリティ上の方針

- 能力名と数値を必ず表示し、色だけに意味を依存させない。
- 投手能力・野手能力切替にはbutton要素を使用する。
- `aria-pressed` 等で選択状態を伝える。
- 略称を使う場合は、正式名称を `aria-label` または `title` で確認できるようにする。
- 640px以下で能力要約を非表示にする場合、読み上げ上も重複した能力要約を残さない。

### 7.14 Prompt5-2の対象外

以下はPrompt5-2では実装しない。

- 総変化量。
- 球種一覧。
- 特殊能力。
- 能力値による検索。
- 能力値によるソート。
- 見出しクリックソート。
- snapshot時点指定。
- URL状態管理の変更。
- backend変更。
- API変更。
- DB変更。
- サブポジション検索。
- sticky aside。
- 詳細検索アコーディオン。
- player_detailの変更。
- player_editの変更。
- 学校系画面の変更。

## 8. 能力範囲検索UI

### 8.1 4select案の評価

下限ランク、下限数値、上限ランク、上限数値の4select案は、G〜S通常能力に対して実装可能である。既存 `ABILITY_RANK_GROUPS` と `buildRankValueOptions()` の考え方を再利用できる。ただし `player_edit.js` 内ローカル定義であり、players検索でも使うなら共通helper/constantsへ切り出すのが望ましい。

想定動作。

- 下限ランク選択時、下限数値をそのrankの最小値へ設定。
- 上限ランク選択時、上限数値をそのrankの最大値へ設定。
- 数値selectは選択rank範囲に応じて候補を再生成する。
- 利用者が数値だけ微調整できる。

### 8.2 能力ごとに異なる値域への対応

- G〜S対象: `control`, `stamina`, `meat`, `power`, `run_speed`, `arm_strength`, `fielding`, `catching`。
- 球速 `velocity`: ランクなし。number rangeまたはselect範囲を別設計にする。4selectではなく下限/上限数値のみが自然。
- 弾道 `trajectory`: 1〜4想定。ランクなし。下限/上限数値のみ、または単一/複数selectが自然。
- 変化球: 関連テーブル・方向・球種・levelが絡むため、通常能力値検索とは別タスクが望ましい。

### 8.3 下限が上限を上回った場合

推奨は「検索適用時にvalidation messageを出し、API呼び出しをしない」である。自動入れ替えは利用者の意図と異なる可能性がある。backend実装時にも400にするか、正規化して空結果にするかを決める必要がある。UX上はfrontendで事前検出する。

### 8.4 ランク変更後の数値保持・上書き

推奨仕様。

- rank変更時、現在の数値が新rank範囲内なら保持する。
- 範囲外なら、下限側はrank最小値、上限側はrank最大値へ更新する。
- 未指定rankへ戻した場合、数値を保持するかクリアするかはUI文言次第。検索条件として分かりやすいのは「rank未指定にしたら数値も未指定へ戻す」。
- 利用者が手動変更した数値は、同じrank内の再描画では保持する。

### 8.5 複数能力条件とAND/OR

初期実装ではAND検索推奨。理由は、既存検索条件がすべてANDでSQL `conditions.join(" AND ")` されており、ORを入れるとUI説明・URL表現・SQL groupingが大きく複雑化するためである。

OR検索は将来の高度検索として別扱いにする。

### 8.6 UI配置案

候補1: 詳細条件アコーディオン。

- 長所: 現在の縦積みpanel構造に馴染む。mobileでも自然。初期表示の圧迫を抑えられる。
- 短所: 条件全体を俯瞰しにくい。開閉状態のURL/再読み込み扱いが必要になる可能性。

候補2: sticky aside。

- 長所: PCで一覧を見ながら条件を調整しやすい。
- 短所: 現行 `.players-layout` は1カラムgridで、aside化はレイアウト変更が大きい。mobileでの扱いも別設計が必要。高さの長い詳細条件とstickyの相性に注意。

現行レイアウトでの推奨は「詳細条件アコーディオン」方式である。sticky asideは検索条件が安定してから別PRで検討するのが安全。

## 9. 能力値ソート

### 9.1 現在のソート機構

- frontend: selectで `sort_by:sort_order` を選ぶ。
- backend: `normalizePlayerListQuery()` で `sort_by`, `sort_order` を検証。
- SQL: `buildPlayerSortClause()` がORDER BYを生成。

能力値ソートを追加する場合、`ALLOWED_PLAYER_SORT_BY` と `buildPlayerSortClause()` に通常能力fieldを追加する必要がある。DB schema変更は不要。

### 9.2 見出しクリックによる昇順・降順切替

実現方法。

- table headerの対象 `th` 内にbuttonを置く。
- button押下で `sortBy` と `sortOrder` を更新し、URL反映・再取得する。
- 現行select方式を残す場合、select値との同期が必要。
- `aria-sort="ascending|descending|none"` を対象 `th` に付与する。
- 現在のsort対象を視覚的にも示す。

見出しクリックを導入する場合は、select方式との併用期間を設けるか、sort UIを統一する別タスクに分けるのが安全。

### 9.3 sort対象候補

| 対象 | 現状 | 追加要否 |
| --- | --- | --- |
| 選手名 | backendあり / frontend optionあり | 見出しclick対応候補。 |
| 学校名 | backendあり / frontend optionなし | option追加または見出しclick対応候補。 |
| メインポジション | 検索あり / sortなし | 追加候補。独自順序が必要。 |
| 総合星 | 一覧表示あり / sortなし | 追加候補。0未設定を末尾にする設計が必要。 |
| 学年 | backendあり / frontend optionあり | 見出しclick対応候補。 |
| 在籍状態 | backendあり / frontend optionあり | 見出しclick対応候補。 |
| 入学年 | backendあり / frontend optionあり | 見出しclick対応候補。 |
| 投手能力 | sortなし | `velocity`, `control`, `stamina` を追加候補。 |
| 野手能力 | sortなし | `trajectory`, `meat`, `power`, `run_speed`, `arm_strength`, `fielding`, `catching` を追加候補。 |

サブポジションは主要sort対象にしない。将来候補は「サブポジションあり/なし」程度に留める。

### 9.4 snapshot時点指定との連動

能力値sortは「現在一覧で表示しているsnapshot」の値に対して行うべきである。snapshot指定UIを導入する前に能力sortを実装すると、現行最新snapshotに対するsortとしては成立するが、後でsnapshot選択SQLを変更した際に挙動確認が必要になる。

推奨順序は、まず最新snapshot前提で能力sortを追加し、その後snapshot指定PRで対象snapshot選択SQLとsortの結合をテストする。

## 10. snapshot時点指定

### 10.1 現行定義

players画面の現行「現在表示中snapshot」は、`latestSnapshotJoinSql` が選んだ各seriesの最新相当snapshotである。player_detailの「表示中snapshot」は `/api/player-series/:id?snapshot=...` または `/api/players/:id/detail?snapshot=...` のqueryにより、series内の単一snapshotを選ぶ。players画面とplayer_detailの選択状態は共有されていない。

### 10.2 一覧全体で単一時点を選ぶ設計

可能である。backend modelの `buildPlayerListQuery()` には既に `snapshotLabel` 条件があり、`players.snapshot_label = ?` を追加できる。ただし現行SQLは `latestSnapshotJoinSql` で先に最新snapshotをjoinした上で `players.snapshot_label = ?` をWHEREに足す構造であるため、「指定時点を表示する」用途には不十分である。

理由: joinされるplayers行が常に最新相当snapshotなので、WHEREで `snapshot_label = 'entrance'` を指定すると「最新相当snapshotがentranceであるseries」だけが残り、各seriesのentrance snapshotをjoinするわけではない。

したがってsnapshot指定表示を本格実装するには、join対象snapshot選択SQLを「指定labelがある場合はそのlabelのsnapshotをjoinする」形に変更する必要がある。

### 10.3 指定時点が存在しない選手の扱い

候補A: 一覧から除外する。

- 長所: 検索・sortの意味が明確。表示値は必ず指定時点のもの。
- 短所: 件数が大きく減る場合がある。ユーザーが「なぜ消えたか」を理解しにくい。

候補B: 下部へ回し、最新時点で代替表示する。

- 長所: 選手の存在を見失いにくい。
- 短所: 検索・sort対象が指定時点なのか代替時点なのか曖昧になる。UI注記とSQLが複雑化する。

Codex推奨は初期実装では候補Aである。理由は、能力検索・能力sortと組み合わせたときに意味が明確で、SQLも単純なためである。代替表示はユーザー需要が明確になってから追加する。

### 10.4 優先順位別の推奨仕様

1. 現在表示中のsnapshot: 初期状態は現行最新相当snapshotとする。ユーザーが一覧のsnapshot selectで選んだ場合は、その時点を現在表示中snapshotとする。
2. 最新snapshot: 現行 `latestSnapshotJoinSql` と同等の定義を維持する。
3. 入学時snapshot: `entrance` を対象とする。互換 `admission` の扱いは実DB確認後に判断する。
4. その他の登録済みsnapshot: 公式timelineのlabelをselectで選べるようにする。legacy `post_tournament` は表示専用/互換候補に留める。

### 10.5 API/DB/性能上の懸念

- DB schema変更は不要。
- API queryとして `snapshot_label` または `snapshot_mode` の追加/整理が必要。
- modelのJOIN SQL変更が必要。
- 指定snapshotがないseriesの扱いによりLEFT JOIN/INNER JOINが変わる。
- snapshot指定と能力sortを同時に行う場合、ORDER BY対象がjoinされたsnapshot行であることを保証する必要がある。
- `players(player_series_id, snapshot_label)` unique indexがあるため、指定label join自体は効率化しやすい。

## 11. 守備位置検索

### 11.1 現在のポジション検索

現行検索は `main_position` queryをbackendへ渡し、`players.main_position` のみを対象にする。サブポジションは検索対象ではない。

backendの処理。

- `mainPosition === '全野手'`: `players.main_position <> '投手'`
- `mainPosition === '全内野手'`: `players.main_position IN ('一塁手','二塁手','三塁手','遊撃手')`
- その他: `players.main_position = ?`

内部値は日本語表示名そのもの。

- `投手`
- `捕手`
- `一塁手`
- `二塁手`
- `三塁手`
- `遊撃手`
- `外野手`

検索カテゴリとして以下もある。

- `全野手`
- `全内野手`

### 11.2 メイン守備位置sort

現状sortなし。追加するなら、単純な文字順ではなく野球の守備順にするのが望ましい。

例: 投手、捕手、一塁手、二塁手、三塁手、遊撃手、外野手、未設定/その他。

### 11.3 サブポジション検索を追加しない影響

サブポジションで守れる選手はメイン守備位置検索には出ない。高度検索の初期段階では、一覧の目的を「主能力・主ポジション比較」に絞るため許容可能である。サブポジションは既存アコーディオン表示を基本にする。

将来の低優先度候補。

- サブポジションあり。
- サブポジションなし。

## 12. URLクエリの現状と将来方針

### 12.1 結合度

現行players検索はURL queryとform stateが強く結合している。

- 初期表示でURLを正規化する。
- submit/reset/popstateがすべてURLと再取得に連動する。
- `PLAYER_SEARCH_QUERY_KEYS`、`readSearchStateFromUrl()`、`buildPlayerListParams()`、`writeSearchStateToUrl()`、`readSearchStateFromForm()`、`applySearchStateToForm()` のすべてに条件追加が必要。

### 12.2 URL反映を廃止した場合の影響

- ブラウザ戻る/進むで検索状態を戻せなくなる。
- 再読み込みで条件が消える。
- 検索条件をURL共有できなくなる。
- 既存リンクやdocsに影響する可能性がある。
- E2E/手動確認時に条件付きURLで再現する手段が減る。

### 12.3 新規詳細条件だけURLへ反映しない混在運用

技術的には可能。ただし、一覧件数や表示条件summaryに出ているのにURL共有されない条件が混在すると、ユーザーがURLを共有した時に結果が再現しない。短期の実験実装なら許容できるが、正式機能では避けたい。

### 12.4 推奨移行案

1. 能力要約表示はURLに関係しないため先に実装する。
2. 能力検索UI最小実装では、既存URL運用に合わせてquery keyを追加する。ただしkey命名を整理してから実装する。
3. 検索条件が増えすぎた段階で、URL運用見直し専用PRを立てる。
4. 完全廃止ではなく「基本条件はURL、詳細条件は折りたたみ状態を含めて必要最低限URL」または「全条件URL維持」のどちらかをユーザー確認で決める。

現時点の推奨は、players検索が完成するまではURL反映を維持することである。

## 13. 特殊能力の扱い

特殊能力検索は今回の対象外である。理由は以下。

- 特殊能力の分類基盤が未完成。
- ランク付き特殊能力の扱いが未確定。
- 金特殊能力と通常特殊能力の関係整理が必要。
- 2026仕様への対応が必要。
- 他ページとのデータ連携基盤が不足している。

今回の能力検索は、`players` tableの通常能力値カラムを対象にする。特殊能力検索は、players検索機能とURL方針整理の完了後に、別タスクとして基盤設計から開始する。

## 14. 規模・影響・リスク評価

### 14.1 機能全体

- 規模感: 大規模。
- リスク: 中〜高リスク。
- 理由: 一覧表示、検索UI、backend SQL、sort、snapshot選択、URL状態管理、responsive表示が密接に関係するため。

### 14.2 領域別評価

| 領域 | 規模 | リスク | 理由 |
| --- | --- | --- | --- |
| Prompt5-2 能力要約表示 | 小〜中規模 | 低〜中 | 優先度は高。通常行内の表示変更でbackend/API/DB変更は不要だが、投手/野手切替とアコーディオン同期、PC表示と640px以下の表示確認、実ブラウザ目視確認が必要。自動mergeは不可。 |
| 能力検索UI | 中規模 | 中 | form state、URL、validation、active filter summary、API query追加が必要。 |
| 能力検索backend | 中規模 | 中 | SQL WHERE追加。値域・null・0の扱いを決める必要。 |
| 能力値sort | 中規模 | 中 | ORDER BY追加とUI同期。未設定値の並び順設計が必要。 |
| 見出しclick sort | 中規模 | 中 | 既存select sortとの併用・aria-sort対応が必要。 |
| snapshot時点指定 | 中〜大規模 | 高 | 現行latest joinの構造変更が必要。能力検索/sortの意味に直結。 |
| URL状態管理見直し | 中〜大規模 | 中〜高 | 戻る/進む、共有、再読み込み、既存リンクに影響。 |
| DB schema | 変更なし想定 | 低 | 通常能力検索・sortは既存カラムで可能。index追加は性能次第で将来検討。 |
| 特殊能力検索 | 対象外 | 高 | 関連テーブル・分類・2026仕様が未整理。 |

### 14.3 高リスク部分

- snapshot指定時のJOIN SQL変更。
- 指定snapshotがない選手の扱い。
- 能力検索とsortをfrontend/backendどちらで行うかの混在。
- URL query keyの増加と後方互換。
- 640px以下のカード表示で情報を詰め込みすぎること。

### 14.4 低リスク部分

- 最新snapshot前提の能力要約表示。
- 既存一覧APIに含まれる通常能力値の表示。
- サブポジションを高度検索対象にしない判断。
- docs作成のみの今回タスク。

### 14.5 調査時点で不明な部分

- 実DBに `admission` snapshot labelが残っているか。
- 通常能力値に100超や弾道0/5以上など仕様外値が入っているか。
- 選手数が将来どの程度まで増える想定か。
- URL反映を最終的に維持するか廃止するか。
- PC/mobileでユーザーが最も比較したい能力項目。

## 15. 段階的実装計画

大きなPRにせず、同じCodex Cloud会話を継続しつつ段階ごとに作業ブランチとPRを分ける前提とする。

### Prompt5-2: players一覧の2段表示と能力要約

- 目的: 最新snapshot前提で、PC一覧の通常行内に投手/野手能力要約を追加する。
- 変更候補ファイル: `frontend/js/pages/players.js`, `frontend/css/players.css`。
- frontend変更: あり。
- backend/API変更: なし。
- DB変更: なし。
- 優先度: 高。
- リスク: 低〜中。通常行内の表示変更だが、能力要約内の投手/野手切替と既存アコーディオン詳細の切替同期がある。
- 規模感: 小〜中。
- 依存: なし。
- 実ブラウザ確認: PC幅で能力要約表示、640px以下で能力要約全体非表示、アコーディオン開閉、投手/野手切替同期、既存リンク操作。
- 自動merge可否: 不可。実ブラウザによる目視確認が必要であるため、PRで停止する。
- 完了条件: 新しい `tr` を追加せず、PCで能力要約が表示され、640px以下では余白を残さず非表示になり、投手/野手切替がアコーディオン詳細と同期し、既存検索・sort・URLが変わらない。

### Prompt5-3: 能力検索UIの最小実装

- 目的: 通常能力値の範囲検索を最小UIで追加する。
- 変更候補ファイル: `frontend/js/pages/players.js`, `frontend/css/players.css`, `backend/services/playerService.js`, `backend/models/playerModel.js`。
- frontend変更: あり。
- backend/API変更: あり。query追加とWHERE追加。
- DB変更: なし。
- リスク: 中。URL key、validation、null/0、AND条件の仕様固定が必要。
- 規模感: 中。
- 依存: Prompt5-2の表示helperを一部再利用可能。
- 実ブラウザ確認: 条件指定、クリア、URL復元、戻る/進む、範囲不正時。
- 自動merge可否: backend/APIに触るため慎重。自動mergeは避けるか、十分なcheck後に限定。
- 完了条件: 複数能力AND検索、未指定条件、クリア、URL反映が安定する。

### Prompt5-4: 能力値ソート

- 目的: 能力値・総合星・メインポジション等のsortを追加する。
- 変更候補ファイル: `frontend/js/pages/players.js`, `backend/services/playerService.js`, `backend/models/playerModel.js`, 必要に応じて `frontend/css/players.css`。
- frontend変更: あり。
- backend/API変更: あり。`ALLOWED_PLAYER_SORT_BY` とORDER BY追加。
- DB変更: なし。
- リスク: 中。未設定値の並び順、select方式と見出しclick方式の整理が必要。
- 規模感: 中。
- 依存: Prompt5-3と同じ能力field整理に依存。
- 実ブラウザ確認: 昇順/降順、URL復元、検索条件との併用、mobile表示。
- 自動merge可否: 中リスクのためPRで停止推奨。
- 完了条件: 追加sortがbackendで実行され、表示中snapshotの値に対して安定する。

### Prompt5-5: snapshot時点指定

- 目的: 一覧全体で表示対象snapshotを選び、その時点の表示・検索・sortを行う。
- 変更候補ファイル: `frontend/js/pages/players.js`, `frontend/css/players.css`, `frontend/js/utils/playerSnapshots.js`, `backend/services/playerService.js`, `backend/models/playerModel.js`, `backend/constants/playerSnapshots.js` は原則参照のみ。
- frontend変更: あり。
- backend/API変更: あり。JOIN SQL変更が必要。
- DB変更: なし想定。
- リスク: 高。現行latest snapshot selectionの意味が変わる可能性がある。
- 規模感: 中〜大。
- 依存: Prompt5-3/5-4の能力検索・sort仕様。
- 実ブラウザ確認: 最新、入学時、各公式時点、存在しない時点、件数表示、詳細/編集リンク。
- 自動merge可否: 不可推奨。高リスクのため必ずPRで停止。
- 完了条件: 指定snapshotがある選手だけを対象にする仕様が明確で、能力検索・sortがそのsnapshotに対して動作する。

### Prompt5-6: URL状態管理の見直し

- 目的: 増えた検索条件を踏まえ、URL反映方針を整理・実装する。
- 変更候補ファイル: `frontend/js/pages/players.js`, docs必要に応じて `docs/design/state_management.md` または requirements docs。
- frontend変更: あり。
- backend/API変更: 原則なし。
- DB変更: なし。
- リスク: 中〜高。戻る/進む、再読み込み、共有URLの期待値に影響。
- 規模感: 中〜大。
- 依存: Prompt5-3〜5-5で検索条件が固まっていること。
- 実ブラウザ確認: URL共有、戻る/進む、reset、詳細条件の開閉状態、既存リンク。
- 自動merge可否: 不可推奨。ユーザー体験に影響するためPRで停止。
- 完了条件: URL維持/部分反映/廃止の方針が仕様として明確になり、挙動が一貫する。

## 16. ユーザーへ確認が必要な事項

Prompt5-2について、PC一覧の能力要約に表示する能力項目、スマートフォンでの能力要約の扱い、投手の一覧能力表示方法、投手能力・野手能力の切替方針、アコーディオン詳細との同期方針、通常能力値0の扱いは回答済みとして整理した。

引き続き確認が必要な事項は以下。

1. 複数能力条件は初期実装ではAND検索のみでよいですか。将来OR検索を導入する必要がありますか。
2. snapshot指定時に、その時点が未登録の選手は一覧から除外する仕様でよいですか。それとも下部へ回して最新snapshotで代替表示したいですか。
3. 「現在表示中snapshot」は、初期状態では現行最新相当snapshot、snapshot select選択後はその選択時点、という定義でよいですか。ほかの画面からの遷移状態も含める必要がありますか。
4. 詳細検索UIは、現行レイアウトに馴染むアコーディオン方式を優先してよいですか。sticky asideを将来導入する必要がありますか。
5. URL反映は最終的に維持、部分維持、廃止のどれにしますか。
6. 実DBにlegacy `admission` snapshotが残っている可能性を考慮し、入学時検索で `entrance` 以外も対象にする必要がありますか。

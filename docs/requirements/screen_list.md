# 画面一覧

## 専用ページ一覧

- `index.html`: トップページ
- `schools.html`: 学校作成、学校検索・ソート、学校一覧
- `school_detail.html`: 学校サマリー、学校編集、学校削除、所属選手一覧、年度進行、undo
- `players.html`: 全体選手一覧、検索・絞り込み、能力範囲検索、並べ替え、snapshot表示時点選択、一覧内簡易詳細
- `player_register.html`: 選手登録
- `player_detail.html`: 選手詳細、snapshot履歴確認、守備位置図
- `player_edit.html`: 選手編集、relation系編集、snapshot編集

## 画面遷移

- `index.html` → `schools.html`
  - トップ画面から学校一覧へ

- `index.html` → `players.html`
  - トップ画面から全体選手一覧へ

- `schools.html` → `school_detail.html`
  - 学校カードクリックで遷移

- `school_detail.html` → `player_register.html`
  - 「選手登録」ボタンで遷移

- `school_detail.html` → `player_detail.html`
  - 所属選手一覧の選手クリックで遷移

- `school_detail.html` → `player_edit.html`
  - 所属選手一覧から編集

- `school_detail.html` → `players.html`
  - 現行コード上、学校詳細から全体 players 一覧へ遷移する専用導線は確認できていない
  - 学校詳細内の所属選手一覧は別途存在する

- `players.html` → `player_detail.html`
  - 一覧から詳細へ遷移
  - snapshot表示時点を指定している場合は、選択時点に対応する `players.id` を使って詳細画面へ遷移する

- `players.html` → `player_edit.html`
  - 一覧から編集へ遷移
  - snapshot表示時点を指定している場合は、選択時点に対応する `players.id` を使って編集画面へ遷移する

- `players.html` → `school_detail.html`
  - 一覧内の学校リンクから学校詳細へ遷移

- `player_register.html` → `player_register.html`
  - 登録成功後、「続けて選手登録」を選んだ場合

- `player_register.html` → `player_detail.html`
  - 登録成功後、「登録した選手の確認」を選んだ場合

- `player_register.html` → `school_detail.html`
  - 登録成功後、「高校管理画面へ」を選んだ場合

- `player_detail.html` → `player_edit.html`
  - 詳細画面の「編集」導線
  - 未登録 snapshot 作成後の編集導線
  - 守備位置図から対象ポジションを指定した編集導線

- `player_edit.html` → `player_detail.html`
  - 編集完了後、「登録した選手の確認」を選んだ場合

- `player_edit.html` → `school_detail.html`
  - 編集完了後、「高校管理画面へ」を選んだ場合

## `players.html` の概要

`players.html` は、学校詳細内の所属選手一覧とは別に存在する全体選手一覧ページである。

主な責務:

- 基本検索
- 状態・表示条件による絞り込み
- 投手・野手の通常能力範囲検索
- 並べ替え
- snapshot表示時点選択
- 一覧内 accordion 簡易詳細
- 詳細・編集・学校詳細への導線
- PC / narrow width 対応

## 補足

- 学校 CRUD は専用ページを増やさず、`schools.html` と `school_detail.html` 内の操作として扱う。
- `schools.html` は「学校作成」「検索・ソート」「学校一覧」の 3 ブロック構成とする。
- `schools.html` の学校作成フォームはアコーディオン化し、初期表示は展開状態にする。
- `schools.html` の学校作成フォームは、学校名本体 + 固定表示 `高校`、都道府県、プレイ方針、開始年度、メモで構成する。
- `schools.html` の学校検索・ソートは basic 機能として、学校名部分一致、都道府県完全一致、プレイ方針完全一致、学校名順・開始年度順・更新日時順のソートを扱う。
- `schools.html` の検索・ソートパネルには条件を初期状態へ戻す `リセット` を置き、押下後は一覧も即時更新する。
- `schools.html` の学校名検索欄は `青葉` と `青葉高校` のどちらの入力も受け付け、末尾が正確に `高校` の場合のみ吸収する。
- `schools.html` の学校一覧では、学校名、都道府県、開始年度、プレイ方針、メモを表示し、現在表示中の件数を補助情報として併記する。
- `schools.html` の学校一覧メモ列は、一覧可読性のため省略表示を用いることがある。全文確認は詳細画面または補助表示に委ねる。
- advanced 検索・ソートは `docs/future/schools_advanced_search_sort_future_design.md` に分離し、通常導線には含めない。
- 現在は、全体 `players.html` と、`school_detail.html` 内の所属選手一覧の両方が存在する。
- `school_detail.html` は上部に読み取り用 summary、下部に学校情報編集フォームを置く。
- 学校サマリーでは、学校名、都道府県、開始年度、現在年度、経過年数、作成日時、更新日時、メモを表示する。
- `school_detail.html` の編集フォームでは `current_year` を直接編集せず、`start_year` の変更時にサーバー側で同期する。
- 削除済み学校は `school_detail.html` の通常利用対象外とし、一覧へ戻す。
- 削除済み学校所属の選手は通常一覧からは遷移できないが、`player_detail.html?id=...` の直指定表示は維持する。
- 削除済み学校所属の選手は `player_edit.html` では編集不可とする。

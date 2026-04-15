# 画面一覧

## 専用ページ一覧
- `index.html`: トップページ
- `schools.html`: 学校一覧、学校作成
- `school_detail.html`: 学校サマリー、学校編集、学校削除、所属選手一覧
- `player_register.html`: 選手登録
- `player_detail.html`: 選手詳細
- `player_edit.html`: 選手編集

## 画面遷移
- `index.html` → `schools.html`
  - トップ画面から学校一覧へ

- `schools.html` → `school_detail.html`
  - 学校カードクリックで遷移

- `school_detail.html` → `player_register.html`
  - 「選手登録」ボタンで遷移

- `school_detail.html` → `player_detail.html`
  - 所属選手一覧の選手クリックで遷移

- `player_register.html` → `player_register.html`
  - 登録成功後、「続けて選手登録」を選んだ場合

- `player_register.html` → `player_detail.html`
  - 登録成功後、「登録した選手の確認」を選んだ場合

- `player_register.html` → `school_detail.html`
  - 登録成功後、「高校管理画面へ」を選んだ場合

- `school_detail.html` → `player_edit.html`
  - 所属選手一覧から編集

- `player_detail.html` → `player_edit.html`
  - 詳細画面の「編集」ボタン

- `player_edit.html` → `player_detail.html`
  - 編集完了後、「登録した選手の確認」を選んだ場合

- `player_edit.html` → `school_detail.html`
  - 編集完了後、「高校管理画面へ」を選んだ場合

## 補足
- 学校 CRUD は専用ページを増やさず、`schools.html` と `school_detail.html` 内の操作として扱う。
- `schools.html` の学校作成フォームは、学校名本体 + 固定表示 `高校`、都道府県、プレイ方針、開始年度、メモで構成する。
- `schools.html` の学校一覧では、学校名、都道府県、開始年度、プレイ方針、メモを表示する。
- 選手一覧は独立ページではなく、学校詳細画面内で所属選手一覧として表示する。
- `school_detail.html` は上部に読み取り用 summary、下部に学校情報編集フォームを置く。
- 学校サマリーでは、学校名、都道府県、開始年度、現在年度、経過年数、作成日時、更新日時、メモを表示する。
- `school_detail.html` の編集フォームでは `current_year` を直接編集せず、`start_year` の変更時にサーバー側で同期する。
- 削除済み学校は `school_detail.html` の通常利用対象外とし、一覧へ戻す。
- 削除済み学校所属の選手は通常一覧からは遷移できないが、`player_detail.html?id=...` の直指定表示は維持する。
- 削除済み学校所属の選手は `player_edit.html` では編集不可とする。

# 画面一覧

## 専用ページ一覧
- `index.html`: トップページ
- `schools.html`: 学校一覧、学校作成
- `school_detail.html`: 学校詳細、学校編集、学校削除、所属選手一覧
- `player_register.html`: 選手登録
- `player_detail.html`: 選手詳細
- `player_edit.html`: 選手編集

## 画面遷移
`index.html` → `schools.html` → `school_detail.html`

`school_detail.html` → `player_register.html` → `player_detail.html`

`school_detail.html` → `player_edit.html`

`player_detail.html` → `player_edit.html`

## 補足
- 学校 CRUD は専用ページを増やさず、`schools.html` と `school_detail.html` 内の操作として扱う。
- 選手一覧は独立ページではなく、学校詳細画面内で所属選手一覧として表示する。

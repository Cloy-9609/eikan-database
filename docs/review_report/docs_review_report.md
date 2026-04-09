# docsレビュー反映レポート（2026-04-09 12:01:10 +09:00）

## 今回反映した変更内容
- `docs/requirements/requirements_v2.md` の正式項目と旧表記を分離し、旧表記対応表を追加した。
- `docs/decisions/tech_stack.md` を現行実装に合わせて SQLite 前提へ修正した。
- `docs/design/api_design.md` を「現在公開中 API」「未公開の雛形」「今後公開予定」に整理した。
- `docs/design/data_model.md` を現行 `schema.sql` ベースのデータモデルへ更新した。
- `docs/design/database_design.md` を現行テーブル構成と外部キー方針に合わせて更新した。
- `docs/requirements/mvp_scope.md` に学校 CRUD を MVP 対象として明記した。
- `docs/requirements/feature_list.md` の重複項目を統合し、MVP 対象と MVP 外候補に整理した。
- `docs/requirements/screen_list.md` に学校 CRUD を既存画面内で扱う前提を追記した。
- `docs/requirements/player_data.md` を「選手入力項目サマリー」として位置づけ直した。

## 反映対象ファイル
- `docs/decisions/tech_stack.md`
- `docs/design/api_design.md`
- `docs/design/data_model.md`
- `docs/design/database_design.md`
- `docs/requirements/mvp_scope.md`
- `docs/requirements/feature_list.md`
- `docs/requirements/screen_list.md`
- `docs/requirements/player_data.md`
- `docs/requirements/requirements_v2.md`
- `docs/review_report/docs_review_report.md`

## 前回コードレビュー結果（全文再掲）

以下は当時の出力の再掲であり、当時のファイル名や保存先の表記をそのまま含む。

### 要修正
- `docs/decisions/deletion_policy.md`
  - `is_archived` 前提が現状は `schools` にしかないので、対象を学校に限定するか、選手側の扱いも追記したほうが良い。
  - `管理者のみ` も権限管理未導入と矛盾しないよう、運用ルールか将来仕様かを明記したほうが良い。
- `docs/decisions/ocr_policy.md`
  - 出力例が `contact` ベースで現行モデルとずれている。
  - OCR の出力を「API にそのまま送る完成 payload」ではなく「候補値 JSON」と定義し、手動確認ステップを明記したほうが良い。
- `docs/decisions/tech_stack.md`
  - `データベース: 今後選定` は現状と不一致。
  - `SQLite を採用` に修正し、理由もこの節に集約したほうが良い。
- `docs/design/api_design.md`
  - `対象 API`、`今後追加候補`、下段の API 一覧、実装状況が食い違っている。
  - `現在公開中` と `将来予定` を分け、`PATCH/PUT`、ステータスコード、エラー形式、not found 時の挙動まで書いたほうが良い。
- `docs/design/data_model.md`
  - `School.prefecture` や `Player.contact/speed/position/total_star/player_skills` など旧モデルが残っている。
  - `requirements_v2.md` と用語を揃え、関連テーブルも関係に含めるべき。
- `docs/design/database_design.md`
  - 旧テーブル案のままで、`schools` の列、関連テーブル、論理削除の適用先が不足している。
  - 実装済み `schema.sql` と同水準まで具体化したほうが良い。
- `docs/requirements/feature_list.md`
  - `学校管理/学校`、`選手管理/選手` が重複している。
  - `現行機能` と `将来機能` に整理し、OCR は MVP 外なら別枠に出したほうが良い。
- `docs/requirements/mvp_scope.md`
  - 学校の作成・編集・削除が MVP に入るのか不明。
  - `CRUD の一部` も曖昧なので、画面/API 単位で範囲を固定したほうが良い。
- `docs/requirements/non_functional.md`
  - 性能以外が抽象的。
  - `evidence_image_path` を扱う前提なら、画像保存の前提、バックアップ、パス切れ時の扱い、ローカル利用前提かどうかを追加したほうが良い。
- `docs/requirements/player_data.md`
  - 古い簡略版で、`requirements_v2.md` と二重管理になっている。
  - 残すなら「UI 入力の最小項目」に用途を限定し、そうでないなら統合か削除を検討したほうが良い。
- `docs/requirements/requirements_v2.md`
  - 現行スキーマへの追従はできているが、旧表記と正式項目が混在している。
  - `正式項目` と `旧表記対応表` を分け、`play_style` `snapshot_label` `ability_category` などの許容値も追記するとさらに明確。
- `docs/requirements/screen_list.md`
  - 学校作成/編集/削除の UI がどこにあるか分からず、遷移図にも `player_edit` が入っていない。
  - `選手一覧は学校詳細内で表示` のような補足も必要。
- `docs/phases/phase1.md`
  - `schools画面` と `API作成` がある一方で、Phase2 に学校一覧/詳細取得が再登場していて境界が曖昧。
  - 完了条件を追加して切り分けたほうが良い。
- `docs/phases/phase2.md`
  - `players CRUD` と個別機能の粒度が混在している。
  - Phase3 の編集強化とも重なるので、登録/詳細/編集/削除を明示したほうが良い。
- `docs/ideas/ideas.md`
  - `ideas_memo.md` への参照が実ファイル名と一致していない。
  - line 47 の閉じ括弧抜けなど表記ゆれも直したほうが良い。
- `docs/ideas/ideas_memo.md`
  - ファイル名が `memo` ではなく `memo`、見出しにも `delectioin_policy` など誤記がある。
  - 名称修正のうえ、空欄テンプレートの役割を 1 行入れたほうが良い。
- `docs/ideas/reference/pitch_reference.md`
  - 参考資料としては有用だが、出典、ゲーム版本、数値の単位、現行スキーマ対象外であることが未記載。
  - 将来拡張用の参考値だと明記したほうが安全。

### 今回指定された 6 findings
1. `docs/requirements/requirements_v2.md:50-145`
   - `[P2] 正式項目と旧表記が同列に並んでいる`
   - `requirements_v2` は現行項目をかなり拾えているが、`contact` / `speed` / `position` / `total_star` / `player_skills` などの旧表記が正式項目と同列に置かれている。
   - 正式仕様書として使うなら、旧表記は別の対応表に分離したほうが読み手の混乱を防げる。
2. `docs/decisions/tech_stack.md:12-23`
   - `[P1] 実装済み DB と技術スタック説明が矛盾`
   - このファイルではデータベースが『今後選定』のままだが、実装はすでに SQLite 前提の `schema.sql` を持っている。
   - 採用技術を確定事項として記載しないと、他ドキュメントの前提とずれたままになる。
3. `docs/design/api_design.md:3-37`
   - `[P1] API の現状と予定が混在している`
   - この設計書は『対象 API』『今後追加候補』『下段の API 一覧』の 3 か所で記述が食い違っている。
   - さらに実装は `schools` のみ公開中で `players` は未公開なので、現状 API と将来 API を分けて書かないと誤解を招く。
4. `docs/design/data_model.md:3-42`
   - `[P1] データモデルが現行スキーマから大きく乖離`
   - `School` / `Player` の項目が旧構成のままで、現行の `play_style`, `memo`, `total_stars`, `main_position`, `player_pitch_types` などが反映されていない。
   - このままだと要件書や DB 設計書との整合が取れず、どれが正なのか判断できなくなる。
5. `docs/design/database_design.md:6-38`
   - `[P1] DB 設計書が旧テーブル案のまま`
   - このファイルは `players` と `player_skills` の簡略案で止まっており、現行 `schema.sql` の関連テーブルや `schools` の実列定義が抜けている。
   - 設計書として参照するには情報不足で、実装との差分も大きい。
6. `docs/requirements/mvp_scope.md:6-24`
   - `[P2] MVP 範囲が学校 CRUD の扱いを明示していない`
   - この MVP 定義では学校一覧・詳細は書かれているが、学校の作成・編集・削除が MVP に含まれるのか読めない。
   - 機能一覧や API 設計と突き合わせると解釈が割れるので、画面/API 単位で明記したほうが安全。

## 問題なしと判定したファイル
- `docs/design/state_management.md`
- `docs/phases/phase3.md`

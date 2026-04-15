# 要件定義 v2

## 目的
栄冠データベースの要件定義本体を管理する。

## 背景
- 栄冠関連データを学校・選手単位で一元管理する。
- 登録、参照、更新の流れを明確にする。

## 対象範囲
- フロントエンド画面
- バックエンド API
- データベース

## 主要ユースケース
- 学校を登録する
- 学校を一覧表示する
- 学校詳細を確認する
- 学校情報を編集する
- 学校をアーカイブする
- 学校詳細内で所属選手を一覧表示する
- 選手を登録する
- 選手詳細を確認する
- 選手情報を編集する
- 削除済み学校に所属していた選手データを ID 直指定で確認する

## 選手パラメータ
schools
- id
  学校データを一意に識別する内部管理用の番号。
- name
  栄冠ナインで育成している高校名を表す基本名称。
- play_style
  3年縛りか継続プレイかといった学校運営ルールを表す区分。
- memo
  学校方針や育成メモなど、自由記述で補足情報を残す項目。
- is_archived
  現役で管理中の学校か、保管済みの学校かを判定するフラグ。
- created_at
  学校データを初めて登録した日時。
- updated_at
  学校データを最後に更新した日時。

players
- id
  選手データを一意に識別する内部管理用の番号で、フロントエンドでは通常表示しない。
- school_id
  所属している高校を示すIDで、画面上では学校名に変換して扱う。
  学校がアーカイブされた場合、通常の一覧からは非表示にするが、選手データ自体は保持する。
- name
  選手名。
- player_type
  通常選手、天才肌、転生選手など、入学時の選手区分を表す項目。`normal`、`genius`、`reincarnated` を想定する。
- player_type_note
  選手区分に補足が必要な場合に、元ネタや補記を残すための項目。
- total_stars
  栄冠ナインでの総合評価を星数として数値化した項目。
- prefecture
  その選手や学校データを管理する際の都道府県情報。
- grade
  選手の学年。
- admission_year
  その選手が入学した年度で、世代管理や進行状況の基準になる項目。
- snapshot_label
  入学直後や大会後など、どの時点の能力値を記録したデータかを表す区分。`entrance` または `post_tournament` を想定する。
- main_position
  栄冠ナイン上での主守備位置。内部地として `pitcher`、`catcher`、`first`、`second`、`third`、`short`、`outfield` フロントエンド表示値として投手、捕手、一塁手、二塁手、三塁手、遊撃手、外野手を想定する。
- throwing_hand
  右投げか左投げかを表す利き腕情報。`right` または `left` を想定する。
- batting_hand
  右打ち、左打ち、両打ちを表す打席情報。`right`、`left`、`both` を想定する。
- is_reincarnated
  転生選手として入学したかどうかを真偽値で管理する項目。
- is_genius
  天才肌として入学したかどうかを真偽値で管理する項目。
- trajectory
  打球の上がりやすさを表す弾道。
- meat
  ミート力を数値化した項目。打撃時の当てやすさの基礎になる。
- power
  打球の飛距離に関わるパワー。
- run_speed
  塁間を走る速さを表す走力。
- arm_strength
  送球の強さを表す肩力。
- fielding
  打球処理や送球動作の安定性に関わる守備力。
- catching
  捕球時の確実性を表す捕球。
- velocity
  投手の球速。
- control
  投球の狙ったコースへ投げ分ける安定性を表すコントロール。
- stamina
  投手が長いイニングを投げ切るための体力を表すスタミナ。
- evidence_image_path
  能力値の根拠となるスクリーンショット画像の保存先パス。
- created_at
  選手データを初めて登録した日時。
- updated_at
  選手データを最後に更新した日時。

player_pitch_types
- id
  変化球レコードを一意に識別する内部管理用の番号。
- player_id
  どの選手に属する変化球かを示す選手ID。
- pitch_name
  ストレート、スライダーなど、栄冠ナイン上の球種名。
- level
  その球種の変化量や習熟度を表す段階。
- is_original
  オリジナル変化球かどうかを判定するフラグ。
- original_pitch_name
  オリジナル変化球だった場合の固有名称。
- created_at
  変化球データを初めて登録した日時。
- updated_at
  変化球データを最後に更新した日時。

player_special_abilities
- id
  特殊能力レコードを一意に識別する内部管理用の番号。
- player_id
  どの選手に属する特殊能力かを示す選手ID。
- ability_name
  対ピンチやチャンスなど、栄冠ナイン上の特殊能力名。
- ability_category
  投手青特、野手青特、緑特など、特殊能力の系統区分。`pitcher_ranked`、`pitcher_unranked`、`batter_ranked`、`batter_unranked`、`green` を想定する。
- rank_value
  A〜G など、段階を持つ特殊能力のランク値。
- created_at
  特殊能力データを初めて登録した日時。
- updated_at
  特殊能力データを最後に更新した日時。

player_sub_positions
- id
  サブポジションレコードを一意に識別する内部管理用の番号。
- player_id
  どの選手に属するサブポジションかを示す選手ID。
- position_name
  一塁手や外野手など、主守備以外で守れるポジション名。
- suitability_value
  サブポジション適性を D や E などで表した値。
- created_at
  サブポジションデータを初めて登録した日時。
- updated_at
  サブポジションデータを最後に更新した日時。

player_results
- id
  成績レコードを一意に識別する内部管理用の番号。
- player_id
  どの選手に紐づく成績かを示す選手ID。
- result_label
  夏大会、秋大会、その他など、どの集計単位の成績かを表す区分。
- batting_average
  打率。
- home_runs
  本塁打数。
- runs_batted_in
  打点数。
- stolen_bases
  盗塁数。
- earned_run_average
  防御率。
- wins
  勝利数。
- losses
  敗戦数。
- holds
  ホールド数。
- saves
  セーブ数。
- created_at
  成績データを初めて登録した日時。
- updated_at
  成績データを最後に更新した日時。

## 旧表記対応表
正式仕様は上記の現行項目名を使用し、旧表記は移行時の読み替え用として扱う。

| 旧表記 | 現行項目 | 補足 |
| --- | --- | --- |
| `contact` | `meat` | ミートの旧表記。 |
| `speed` | `run_speed` | 走力の旧表記。 |
| `position` | `main_position` | 主守備位置の旧表記。 |
| `total_star` | `total_stars` | 総合星数の旧表記。 |
| `player_skills` | `player_special_abilities` | 特殊能力テーブルの旧表記。 |
| `player_skills.skill_name` | `player_special_abilities.ability_name` | 特殊能力名の対応。 |

## 制約
- 詳細仕様は別紙に分割管理する

## 学校アーカイブ時の扱い
- 学校アーカイブは `schools.is_archived = 1` による論理削除とする。
- 削除済み学校は学校一覧・学校詳細・選手登録の通常利用対象外とする。
- 削除済み学校の配下選手は通常一覧から除外する。
- 削除済み学校の配下選手は `player_detail` 相当の ID 直指定表示のみ維持する。
- 削除済み学校の配下選手は現時点では編集不可とする。

## 関連ドキュメント
- `mvp_scope.md`
- `feature_list.md`
- `screen_list.md`
- `non_functional.md`

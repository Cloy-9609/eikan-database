# データ構造定義

## School
- id
- name
- play_style
- memo
- is_archived
- created_at
- updated_at

## Player
- id
- school_id
- name
- player_type
- player_type_note
- total_stars
- prefecture
- grade
- admission_year
- snapshot_label
- main_position
- throwing_hand
- batting_hand
- is_reincarnated
- is_genius
- evidence_image_path
- created_at
- updated_at

### 野手能力
- trajectory
- meat
- power
- run_speed
- arm_strength
- fielding
- catching

### 投手能力
- velocity
- control
- stamina

## PlayerPitchType
- id
- player_id
- pitch_name
- level
- is_original
- original_pitch_name
- created_at
- updated_at

## PlayerSpecialAbility
- id
- player_id
- ability_name
- ability_category
- rank_value
- created_at
- updated_at

## PlayerSubPosition
- id
- player_id
- position_name
- suitability_value
- created_at
- updated_at

## PlayerResult
- id
- player_id
- result_label
- batting_average
- home_runs
- runs_batted_in
- stolen_bases
- earned_run_average
- wins
- losses
- holds
- saves
- created_at
- updated_at

## リレーション
Player は School に属する（N:1）  
Player は複数の Skill を持つ（1:N）
Player は複数の SubPosition を持つ（1:N）  
main_position が投手となるPlayerは複数の、最低でも１つの PicthType を持つ（1:N）
- School 1 --- N Player
- Player 1 --- N PlayerPitchType
- Player 1 --- N PlayerSpecialAbility
- Player 1 --- N PlayerSubPosition
- Player 1 --- N PlayerResult

## 補足
- `play_style` は `three_year` または `continuous` を取る。
- `player_type` は `normal`、`genius`、`reincarnated` を取る。
- `snapshot_label` は `entrance` または `post_tournament` を取る。
- `ability_category` は投手特能、野手特能、緑特などの区分を保持する。

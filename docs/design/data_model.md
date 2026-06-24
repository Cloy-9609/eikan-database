# データ構造定義

## School

- id
- school_code
- name
- prefecture
- play_style
- start_year
- current_year
- memo
- is_archived
- created_at
- updated_at

## PlayerSeries

同一選手を時系列で束ねる親レコード。

- id
- school_id
- series_no
- name
- school_grade
- roster_status
- admission_year
- prefecture
- player_type
- player_type_note
- created_at
- updated_at

## Player

`players` は `player_series` に属する各登録時点 snapshot を表す。

- id
- player_series_id
- school_id
- name
- player_type
- player_type_note
- total_stars
- prefecture
- grade
- admission_year
- snapshot_label
- snapshot_note
- main_position
- throwing_hand
- batting_hand
- is_reincarnated
- is_genius
- evidence_image_path
- created_at
- updated_at

### snapshot_label

正式 snapshot timeline は以下を基本とする。

- `entrance`
- `y1_summer`
- `y1_autumn`
- `y1_spring`
- `y2_summer`
- `y2_autumn`
- `y2_spring`
- `y3_summer`
- `graduation`

legacy / compatibility 値として、`admission`、`post_tournament`、`y3_autumn` が残る場合がある。

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
- defense_value
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

## SchoolYearProgressLog

学校年度進行と直前 1 回 undo のためのログ。

- id
- school_id
- from_year
- to_year
- affected_series_count
- graduated_count
- snapshots_created
- is_undo_available
- undone_at
- created_at

## リレーション

- School 1 --- N PlayerSeries
- PlayerSeries 1 --- N Player(snapshot)
- Player 1 --- N PlayerPitchType
- Player 1 --- N PlayerSpecialAbility
- Player 1 --- N PlayerSubPosition
- Player 1 --- N PlayerResult
- School 1 --- N SchoolYearProgressLog

## 補足

- `play_style` は `three_year` または `continuous` を取る。
- `School.name` は本体名のみ保持し、`高校` の表示付与はフロントエンド helper で行う。
- `school_code`、`series_no`、`snapshot_key` は管理コード基盤として扱う。
- school 管理上の現在学年・在籍状態は `player_series` 側で扱う。
- snapshot 時点の能力値や relation 系データは `players` とその子テーブルで扱う。
- 学校年度進行は `player_series.school_grade` / `roster_status` を更新するが、snapshot は自動生成しない。
- 旧表記の `player_skills` は、現行モデルでは `PlayerSpecialAbility` に相当する。

# DB 設計

## 方針
- 学校と選手を中心に、関連データをテーブル分割して正規化する。
- 学校は論理削除、選手関連の子テーブルは外部キーで整合を保つ。
- MVP 段階では SQLite を前提としたシンプルなスキーマを採用する。

## テーブル構成

### schools
- 学校の基本情報を保持する親テーブル。
- 主な列: `id`, `name`, `play_style`, `memo`, `is_archived`, `created_at`, `updated_at`
- `is_archived` により論理削除を管理する（schools のみ適用）。

### players
- 選手の基本情報と主要能力値を保持する主テーブル。
- 主な列:
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `school_id`: INTEGER NOT NULL (FK → `schools.id`)
- `name`: TEXT NOT NULL
- `player_type`: TEXT NOT NULL CHECK (`normal`, `genius`, `reincarnated`)
- `player_type_note`: TEXT
- `total_stars`: INTEGER NOT NULL DEFAULT 0 CHECK (`total_stars >= 0`)
- `prefecture`: TEXT NOT NULL
- `grade`: INTEGER NOT NULL CHECK (`grade BETWEEN 1 AND 3`)
- `admission_year`: INTEGER NOT NULL
- `snapshot_label`: TEXT NOT NULL CHECK (`entrance`, `post_tournament`)
- `main_position`: TEXT NOT NULL
  - enum想定（pitcher, catcher, infielder, outfielder）
- `throwing_hand`: TEXT NOT NULL CHECK (`right`, `left`)
- `batting_hand`: TEXT NOT NULL CHECK (`right`, `left`, `both`)
- `is_reincarnated`: INTEGER NOT NULL DEFAULT 0 CHECK (`0` or `1`)
- `is_genius`: INTEGER NOT NULL DEFAULT 0 CHECK (`0` or `1`)

- 能力列（投手）:
- `velocity`: INTEGER CHECK (`velocity >= 0`)
- `control`: INTEGER CHECK (`control >= 0`)
- `stamina`: INTEGER CHECK (`stamina >= 0`)

- 能力列（野手）:
- `trajectory`: INTEGER CHECK (`trajectory >= 0`)
- `meat`: INTEGER CHECK (`meat >= 0`)
- `power`: INTEGER CHECK (`power >= 0`)
- `run_speed`: INTEGER CHECK (`run_speed >= 0`)
- `arm_strength`: INTEGER CHECK (`arm_strength >= 0`)
- `fielding`: INTEGER CHECK (`fielding >= 0`)
- `catching`: INTEGER CHECK (`catching >= 0`)

- 補助列:
- players.school_id
- `evidence_image_path`: TEXT
- `created_at`: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

- `school_id` は `schools.id` を参照し、学校の物理削除は `RESTRICT` とする。

### player_pitch_types
- 選手が所持する球種を保持する。
- 主な列: `id`, `player_id`, `pitch_name`, `level`, `is_original`, `original_pitch_name`, `created_at`, `updated_at`
- `player_id` は `players.id` を参照し、親選手削除時は `CASCADE` とする。

### player_special_abilities
- 特殊能力を保持する。
- 主な列: `id`, `player_id`, `ability_name`, `ability_category`, `rank_value`, `created_at`, `updated_at`
- `ability_category` で投手青特、野手青特、緑特などの種別を管理する。

### player_sub_positions
- サブポジション適性を保持する。
- 主な列: `id`, `player_id`, `position_name`, `suitability_value`, `created_at`, `updated_at`

### player_results
- 大会単位などでの成績を保持する。
- 主な列: `id`, `player_id`, `result_label`, `batting_average`, `home_runs`, `runs_batted_in`, `stolen_bases`, `earned_run_average`, `wins`, `losses`, `holds`, `saves`, `created_at`, `updated_at`

## 外部キーと削除方針
- `players.school_id` -> `schools.id`
- `player_pitch_types.player_id` -> `players.id`
- `player_special_abilities.player_id` -> `players.id`
- `player_sub_positions.player_id` -> `players.id`
- `player_results.player_id` -> `players.id`
- 学校削除は API 上は論理削除とし、`is_archived = 1` を設定する。
- 選手が物理削除される場合、関連 4 テーブルは `CASCADE` で連動削除される。

## インデックス
- `schools.is_archived`
- `players.school_id`
- `players.player_type`
- `players.admission_year`
- 各子テーブルの `player_id`

## 補足
- 実装上の正本は `backend/db/schema.sql` とし、本書はその設計意図を説明する補助資料として扱う。

# DB 設計

## 方針
- 学校と選手を中心に、関連データをテーブル分割して正規化する。
- 学校は論理削除、選手関連の子テーブルは外部キーで整合を保つ。
- 学校を論理削除しても配下の選手データは保持し、通常一覧からのみ除外する。
- MVP 段階では SQLite を前提としたシンプルなスキーマを採用する。

## テーブル構成

### schools
- 学校の基本情報を保持する親テーブル。
- 主な列: `id`, `name`, `prefecture`, `play_style`, `start_year`, `current_year`, `memo`, `is_archived`, `created_at`, `updated_at`
- `name` は学校名の本体部分のみを保持し、`高校` の表示付与はフロントエンド helper で行う。
- `prefecture`, `start_year`, `current_year` は legacy データ移行との互換のため nullable で追加する。
- `is_archived` により論理削除を管理する（schools のみ適用）。
- Phase 1 では `current_year` は `start_year` と同じ値で保存し、将来の年度更新機能で独立更新する前提とする。

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
- 選手自体には削除フラグを持たせず、学校側の `is_archived` を可視性制御の正とする。

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
- 学校削除時も `players` および関連子テーブルは物理削除しない。
- 通常の選手一覧は `schools.is_archived = 0` を条件にして表示対象を絞る。
- 選手詳細は `players.id` 指定で取得できるため、削除済み学校所属の選手も保持データとして参照可能である。
- 選手が物理削除される場合、関連 4 テーブルは `CASCADE` で連動削除される。

## 既存データ移行方針
- 既存 DB に `prefecture`, `start_year`, `current_year` がない場合は、起動時マイグレーションで不足列のみ `ALTER TABLE` で追加する。
- 既存レコードの `prefecture`, `start_year`, `current_year` は自動補完せず `NULL` のまま残す。
- 学校名の移行は一度だけ行い、末尾が正確に `高校` の場合のみ本体名へ変換する。
  - `青葉高校` -> `青葉`
  - `青葉` -> 変更なし
  - `高等学校研究会` -> 変更なし

## インデックス
- `schools.is_archived`
- `players.school_id`
- `players.player_type`
- `players.admission_year`
- 各子テーブルの `player_id`

## 補足
- 実装上の正本は `backend/db/schema.sql` とし、本書はその設計意図を説明する補助資料として扱う。

## Phase 2: ID / 管理コード設計

Phase 2 の正式な ID / 管理コード設計は `docs/design/id_management_code_design.md` に集約する。

内部主キーは `schools.id`、`player_series.id`、`players.id` の整数 ID のまま維持する。人が扱う管理コードは、`schools.school_code` と `player_series.series_no` として別に保持する。

追加列と制約:

- `schools.school_code`: `TEXT NOT NULL UNIQUE`
- `player_series.series_no`: `INTEGER NOT NULL`
- `UNIQUE(player_series.school_id, player_series.series_no)`

表示用の複合コードは DB に保存せず helper で生成する。学校表示コードは `school_code`、選手系列表示コードは `school_code` と表示用にゼロ埋めした `series_no`、snapshot 表示コードはそれらに共通 timeline から導出した snapshot order を組み合わせる。

`snapshot_key` を docs / API / 新規説明での正式名称とする。現行の `players.snapshot_label` は当面 `snapshot_key` の互換名として扱う。`snapshot_order` は DB 列として追加しない。

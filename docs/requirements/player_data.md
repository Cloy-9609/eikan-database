# 選手入力項目サマリー

## 目的
本ファイルは「選手登録画面の入力項目（UI入力用）」を定義する。

※ データベース設計・正式仕様は `requirements_v2.md` を参照すること

## 入力項目

### 基本情報
- `school_id`（学校詳細から遷移した場合は自動設定）
- `name`（必須）
- `player_type`（必須）
- `player_type_note`（任意）
- `prefecture`（必須）
- `grade`（必須）
- `admission_year`（必須）
- `snapshot_label`（必須）
- `main_position`（必須）
- `throwing_hand`（必須）
- `batting_hand`（必須）

### 野手能力
- `trajectory`（必須）
- `meat`（必須）
- `power`（必須）
- `run_speed`（必須）
- `arm_strength`（必須）
- `fielding`（必須）
- `catching`（必須）

### 投手能力
- `velocity`（投手のみ必須）
- `control`（投手のみ必須）
- `stamina`（投手のみ必須）

### 入力制約
- 投手能力・野手能力数値: 0〜100
- 野手能力：弾道: 1～4
- 必須項目: 名前、学年

### 補足情報
- `total_stars`（必須）
- `evidence_image_path`
- `player_sub_positions`（サブポジション、複数選択）
- `player_special_abilities`（特殊能力、複数選択）
- `player_pitch_types`（投手時に入力）
- `player_results`（任意）

## 備考
- `is_reincarnated` と `is_genius` は `player_type` に基づいて内部的に管理する想定とする。
- 旧表記との対応は `requirements_v2.md` の旧表記対応表を参照する。

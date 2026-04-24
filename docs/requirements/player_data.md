# 選手入力項目サマリー

## 目的
本ファイルは「選手登録画面 / スナップショット作成画面の入力単位」を定義する。

※ スナップショット時系列の正式仕様は `player_snapshot_timeline.md` を優先参照すること
※ DB の現行実装との差分は、段階的に吸収する前提とする

## 前提
- 選手データは、親 `player_series` と子 `players`（各時点スナップショット）の2層で扱う。
- 新規選手登録は「親を作る + 最初のスナップショットを1件作る」操作として扱う。
- 既存選手への追加登録は「新しいスナップショットを作る」操作として扱う。

## 入力単位

### 親 `player_series` の共通情報
- `school_id`
- `name`
- `player_type`
- `player_type_note`
- `prefecture`
- `admission_year`
- `throwing_hand`
- `batting_hand`
- `common_memo`

### 子 `players` のスナップショット情報
- `snapshot_label`
- `main_position`
- `trajectory`
- `meat`
- `power`
- `run_speed`
- `arm_strength`
- `fielding`
- `catching`
- `velocity`
- `control`
- `stamina`
- `total_stars`
- `evidence_image_path`
- `snapshot_memo`
- `player_sub_positions`
- `player_special_abilities`
- `player_pitch_types`
- `player_results`

## 画面ごとの入力ルール

### 1. 新規選手登録
- 親 `player_series` の共通情報を入力する。
- 同時に最初のスナップショットを1件入力する。
- 初回時点は `entrance` を基本とする。

### 2. 既存選手への新規スナップショット追加
- `player_series_id` を指定して作成する。
- `snapshot_label` は作成対象時点として必須。
- 直前の登録済みスナップショットがあれば、その内容を初期値コピーする。
- 親の共通情報は原則読み取り表示とし、この画面では主にスナップショット情報を編集する。

### 3. 既存スナップショット編集
- 既存スナップショットの能力値、守備・起用、特殊能力、変化球を編集する。
- `snapshot_label` は通常運用では固定とし、既存時点の付け替えは行わない。
- 名前、投打、選手種別などの共通情報は、最終的に親 `player_series` 側の編集責務へ寄せる。

## 入力制約
- 時点キーは `player_snapshot_timeline.md` で定義した正式9値のみを許可する。
- 投手能力・野手能力数値: 0〜100
- 野手能力の弾道: 1〜4
- 特殊能力・変化球は複数件入力を許可する。

## 備考
- `is_reincarnated` と `is_genius` は `player_type` に基づく内部管理値として整理する。
- 旧表記との対応は `requirements_v2.md` の旧表記対応表を参照する。

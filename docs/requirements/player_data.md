# 選手入力項目サマリー

## 目的
本ファイルは「選手登録画面の入力項目（UI入力用）」を定義する。

※ データベース設計・正式仕様は requirements_v2.md を参照すること

## 入力項目

### 基本情報
- 学校（自動設定）
- 名前（必須）
- player_type
- player_type_note
- 出身都道府県（推奨）
- 学年（必須）
- admission_year
- snapshot_label
- main_position
- throwing_hand
- batting_hand

### 野手能力
- 弾道
- ミート
- パワー
- 走力
- 肩力
- 守備
- 捕球

### 投手能力
- 球速
- コントロール
- スタミナ

### 補足情報
- 守備位置
- コンバート位置（複数選択）
- 総合星数
- 特殊能力（複数選択）
- evidence_image_path
- player_pitch_types
- player_results

### 備考
- `is_reincarnated` と `is_genius` は `player_type` に基づいて内部的に管理する想定とする。
- 旧表記との対応は `requirements_v2.md` の旧表記対応表を参照する。

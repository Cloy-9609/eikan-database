# player_detail / player_edit 整理メモ

## 目的
- `player_detail` と `player_edit` の責務を明確にする
- どの項目が表示専用か、編集・保存対象かを整理する
- フロントエンド、API、DB の対応状況と不足を次実装前に可視化する

## 画面責務

### `player_detail`
- 役割は「選手情報の読み取り」と「編集導線の起点」。
- 上部ヘッダーは選手の識別情報を扱う。
- 各カードは `basic / pitcher / batter / relations` の読み取り単位として扱う。
- 将来的な編集導線は、画面全体編集よりも「基本情報を編集」「投手能力を編集」のようなセクション単位導線と相性が良い。
- 守備位置図 UI は Phase2 後半の別拡張とし、本画面の責務は当面「情報表示 + 編集入口」に留める。

### `player_edit`
- 現在の役割は「基本情報の一括編集」。
- 現行 UI で編集できるのは、名前、選手種別、都道府県、学年、入学年、スナップショット種別、メインポジション、投打。
- 能力値、変化球、特殊能力、サブポジションは未編集。
- 今後も `player_edit` を 1 画面で広げることは可能だが、現状の `PUT /api/players/:id` と UI 構造を踏まえると、当面は「基本情報編集画面」として責務を固定し、能力値系は別画面または別セクション編集で増やす方が安全。

## 現在の保存導線
1. `frontend/js/pages/player_edit.js`
   - `fetchPlayerById(id)` で初期値を取得
   - フォーム送信時に基本情報 payload を組み立てる
2. `frontend/js/api/playerApi.js`
   - `updatePlayer(id, payload)` が `PUT /api/players/:id` を送る
3. `backend/controllers/playerController.js`
   - `playerService.updatePlayer` を呼ぶ
4. `backend/services/playerService.js`
   - 基本情報の必須項目存在確認
   - 現在の選手データとマージ
   - バリデーション後に model へ渡す
5. `backend/models/playerModel.js`
   - `players` を更新
   - relation 系テーブルは payload に含まれる値で再投入
6. 保存後
   - `player_edit.js` が `player_detail.html?id=...` へ戻す
   - `player_detail.js` が再 fetch して表示し直す

## 項目別整理

| 項目 | detail表示 | edit編集 | 保存 | API受理 | DB保存先 | 優先度 | メモ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 名前 `name` | あり | あり | あり | あり | `players.name` | 高 | 現行の基本情報編集対象 |
| 所属学校 `school_name` / `school_id` | あり | なし | なし | `school_id` は service/model 上は扱える | `players.school_id` | 中 | detail は表示のみ。編集 UI は未提供 |
| 学年 `grade` | あり | あり | あり | あり | `players.grade` | 高 | 現行の基本情報編集対象 |
| 入学年 `admission_year` | あり | あり | あり | あり | `players.admission_year` | 高 | 現行の基本情報編集対象 |
| 出身都道府県 `prefecture` | あり | あり | あり | あり | `players.prefecture` | 高 | 現行の基本情報編集対象 |
| メインポジション `main_position` | あり | あり | あり | あり | `players.main_position` | 高 | 現行の基本情報編集対象 |
| 選手種別 `player_type` | あり | あり | あり | あり | `players.player_type` | 高 | `is_reincarnated` / `is_genius` との扱い整理は未完 |
| 投打 `throwing_hand` / `batting_hand` | あり | あり | あり | あり | `players.throwing_hand`, `players.batting_hand` | 高 | detail では合成表示、edit では別入力 |
| スナップショット種別 `snapshot_label` | あり | あり | あり | あり | `players.snapshot_label` | 高 | 将来拡張時は frontend/service/schema の同時更新が必要 |
| 球速 `velocity` | あり | なし | なし | あり | `players.velocity` | 高 | DB/API は対応済み、UI 未着手 |
| コントロール `control` | あり | なし | なし | あり | `players.control` | 高 | DB/API は対応済み、UI 未着手 |
| スタミナ `stamina` | あり | なし | なし | あり | `players.stamina` | 高 | DB/API は対応済み、UI 未着手 |
| 弾道 `trajectory` | あり | なし | なし | あり | `players.trajectory` | 高 | DB/API は対応済み、UI 未着手 |
| ミート `meat` | あり | なし | なし | あり | `players.meat` | 高 | DB/API は対応済み、UI 未着手 |
| パワー `power` | あり | なし | なし | あり | `players.power` | 高 | DB/API は対応済み、UI 未着手 |
| 走力 `run_speed` | あり | なし | なし | あり | `players.run_speed` | 高 | DB/API は対応済み、UI 未着手 |
| 肩力 `arm_strength` | あり | なし | なし | あり | `players.arm_strength` | 高 | DB/API は対応済み、UI 未着手 |
| 守備 `fielding` | あり | なし | なし | あり | `players.fielding` | 高 | DB/API は対応済み、UI 未着手 |
| 捕球 `catching` | あり | なし | なし | あり | `players.catching` | 高 | DB/API は対応済み、UI 未着手 |
| 変化球一覧 `pitch_types` | あり | なし | なし | あり | `player_pitch_types` | 中 | API 更新時は relation 全置換 |
| 特殊能力 `special_abilities` | あり | なし | なし | あり | `player_special_abilities` | 中 | API 更新時は relation 全置換 |
| サブポジション `sub_positions` | あり | なし | なし | あり | `player_sub_positions` | 中 | 守備位置図 UI の前提データでもある |
| 総合星数 `total_stars` | なし | なし | なし | あり | `players.total_stars` | 低 | DB/API にあるが UI 未露出 |
| 種別補足 `player_type_note` | なし | なし | なし | あり | `players.player_type_note` | 低 | DB/API にあるが UI 未露出 |
| 転生フラグ `is_reincarnated` | なし | なし | なし | あり | `players.is_reincarnated` | 低 | `player_type` と二重管理気味 |
| 天才フラグ `is_genius` | なし | なし | なし | あり | `players.is_genius` | 低 | `player_type` と二重管理気味 |
| 証跡画像 `evidence_image_path` | なし | なし | なし | あり | `players.evidence_image_path` | 低 | OCR 文脈で使う想定だが UI 未接続 |
| 実績 `player_results` | なし | なし | なし | なし | `player_results` | 低 | テーブルはあるが player API 未接続 |
| 守備・起用情報 | なし | なし | なし | 一部前提データのみあり | 別設計 | 中 | 守備位置図 UI は別 Phase |

## フロントエンド / API / DB のズレ

### 1. UI は基本情報だけ、API/DB は能力値と relation まで受けられる
- `player_edit` は基本情報しか送っていない。
- ただし service/model は能力値、変化球、特殊能力、サブポジションまで更新可能。
- そのため「保存できない」のではなく「UI が未提供」という状態。

### 2. 更新 API は section 編集向きではなく、実質フル payload 前提
- `PUT /api/players/:id` は基本情報の必須項目を毎回要求する。
- service 側で current player とマージするため、未送信の能力値や relation は維持される。
- ただし将来的なセクション単位編集では `PATCH` 的な責務整理の方が自然。

### 3. relation 系更新は全削除・再挿入
- `pitch_types` / `special_abilities` / `sub_positions` は更新時に一度削除して全件再投入する。
- UI 実装時は「差分更新」ではなく「一覧全体を送る」前提の方が事故が少ない。

### 4. スナップショット種別は拡張ポイントが複数箇所に分散
- `player_detail.js` の表示ラベル
- `player_edit.js` / `player_register.js` の選択肢
- `playerService.js` の許可 enum
- `schema.sql` の CHECK 制約
- 将来 `2年4月` や `夏甲子園終了後` を増やす際は上記を同時更新する必要がある。

### 5. `player_type` と内部フラグの責務が曖昧
- UI は `player_type` のみ編集。
- DB/API は `is_reincarnated` / `is_genius` も保持する。
- 今後 AI 判定や集計に使うなら、片方を導出値に寄せるか、編集責務を定義し直す必要がある。

## 今後の実装優先候補

### 優先度 高
1. `player_edit` の次段として「能力値編集 UI」を追加する
2. `player_detail` に各能力カード単位の編集導線を追加する
3. 基本情報編集と能力編集の保存対象を docs とコードで一致させる

### 優先度 中
1. `pitch_types` / `special_abilities` / `sub_positions` の編集 UI を検討する
2. section 単位編集を見据えて update API の責務を `PUT` か `PATCH` かで再整理する
3. スナップショット種別の拡張方針を先に定義する

### 優先度 低
1. `total_stars`、`player_type_note`、`evidence_image_path` の露出方針を決める
2. `player_results` を player API に含めるか別 API にするか決める

## 今回の判断
- `player_detail` は表示責務を維持し、編集の入口だけを持つ
- `player_edit` は当面「基本情報編集画面」と明示する
- 能力値編集は次段で追加する
- relation 系編集はさらにその次の段階で扱う

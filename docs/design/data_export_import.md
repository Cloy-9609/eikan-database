# data export / import 設計

この文書は Phase 6.5-1 時点の設計であり、実装はまだ行わない。SQLite file の完全保全・復旧は [database_backup_restore.md](./database_backup_restore.md)、管理コードと外部識別は [id_management_code_design.md](./id_management_code_design.md)、現行 schema は [database_design.md](./database_design.md) を参照する。

## 1. 目的

- 別 PC への完全移行を backup 以外の可搬形式でも可能にする。
- 将来の merge import と online DB 取込の基盤になる validation を設計する。
- backup とは別機能として、論理データの export / import を扱う。

## 2. 正式 export 形式

version 付き JSON を正式な可搬形式とする。候補 header:

- `format`
- `format_version`
- `exported_at`
- `application_version`
- `scope`
- `counts`
- `data`

CSV は分析用の将来機能とし、完全 restore / import 形式にはしない。

## 3. export scope

初期版:

- full database logical export

将来:

- school 単位
- player series 単位
- reincarnated bundle
- selected records

## 4. export 対象 table

full logical export では次を対象にする。

- `schools`
- `player_series`
- `players`
- `player_pitch_types`
- `player_special_abilities`
- `player_sub_positions`
- `player_results`
- `school_year_progress_logs`
- `school_year_progress_log_players`

論理削除済み学校も full export に含める。

## 5. 外部参照

内部整数 ID だけに依存しない。import 先の主識別子は次の外部参照を基本にする。

- school: `school_code`
- player series: `school_code + series_no`
- snapshot: `school_code + series_no + snapshot_key`
- child data: 親 snapshot の外部参照 + child 固有 field

現行 DB 列は `players.snapshot_label` だが、設計上の正式名称は `snapshot_key` とする。初期 export JSON に内部 ID を debug / migration 補助として含めるかは未決事項。含める場合も import 先の主識別子にはしない。

## 6. 安定した並び順

差分確認しやすい固定順序にする。

- `schools`: `school_code`
- `player_series`: `school_code`, `series_no`
- `players`: `school_code`, `series_no`, snapshot timeline order
- child records: parent external key + stable fields（例: pitch name、ability category/name、position name、result label）
- progress logs: `school_code`, `created_at`, source id 相当
- progress log players: parent log key + `school_code`, `series_no`

snapshot order は DB 列として保存せず、timeline から導出する。

## 7. import 初期版

正式対応:

- 空 DB への完全 import。
- dry-run 必須。
- transaction で実行。
- failure 時は全 rollback。
- import 前 backup 必須。
- import 後 integrity check。
- source counts と import result の比較。

初期対象外:

- 既存 DB への merge。
- conflict 自動解決。
- overwrite。
- partial update。
- realtime sync。

## 8. import dry-run

検査項目:

- JSON syntax。
- `format` 名。
- `format_version`。
- 必須 section。
- 必須 field。
- enum。
- snapshot key。
- `school_code` 重複。
- 同一 school 内 `series_no` 重複。
- 同一 series 内 snapshot 重複。
- orphan child。
- range。
- import 先が空か。
- unsupported revision。
- create / conflict / warning count。

## 9. import 順序

現行外部キー依存関係に合わせ、次の順序を基本にする。

1. `schools`
2. `player_series`
3. `players`
4. child tables: `player_pitch_types`, `player_special_abilities`, `player_sub_positions`, `player_results`
5. `school_year_progress_logs`
6. `school_year_progress_log_players`

`player_series.school_id` は `schools.id`、`players.player_series_id` / `players.school_id` は親を必要とする。各 child table は `players.id`、progress log players は log と series の両方を必要とする。

## 10. import 後検査

- `PRAGMA integrity_check`。
- `PRAGMA foreign_key_check`。
- table counts。
- management code の重複・欠損。
- snapshot uniqueness。
- representative domain data の抽出確認。
- re-export logical comparison。

## 11. merge import 将来設計

将来判断が必要な項目:

- 同じ `school_code` の扱い。
- 同じ `series_no` の扱い。
- 同じ snapshot key の扱い。
- overwrite / skip / conflict。
- year progression logs の統合。
- archived state。
- management code 再採番。
- provenance。
- user ownership。
- source package identity。

merge import は file 取込機能であり、中央 server DB を使う online DB そのものではない。

## 12. browser / CLI 境界

browser 先行:

- JSON export download。
- import file 選択。
- import dry-run。
- validation report。

CLI 先行:

- import 実行。
- destructive 操作。

import 実行は DB 書換を伴うため、認証なし HTTP API として公開しない。

## 13. オンライン DB との関係

- merge import は file 取込。
- online DB は利用者ブラウザ、公開 API、中央 server DB で構成する別機能。
- local / online 同期はさらに別機能。
- export / import validation は将来 online upload の基盤として再利用可能。

## 14. 非対象

- CSV 分析 export。
- merge import 実行。
- online DB 接続。
- 認証。
- 所有権。
- multi-user conflict。
- background sync。
- encryption / signing。

## 15. 未決事項

- export へ内部 ID を含めるか。
- import 先空 DB 判定。
- schema version 管理方法。
- `application_version` の取得元。
- manifest / header への migration version。
- merge conflict policy。
- ownership model。
- online storage provider。

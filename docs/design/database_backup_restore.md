# DB backup / restore 設計

この文書は Phase 6.5-1 時点の設計であり、実装はまだ行わない。論理データの可搬化は [data_export_import.md](./data_export_import.md)、転生選手画像 bundle は [reincarnated_player_bundle_design.md](./reincarnated_player_bundle_design.md)、現行 schema は [database_design.md](./database_design.md) を参照する。

## 1. 目的

- Git 管理外の SQLite DB を安全に保全する。
- PC 故障、誤操作、DB 破損、別 PC 移行へ備える。
- backup と export / bundle を明確に分け、後続実装で破壊的操作を安全に扱える境界を決める。

## 2. 現在の DB 運用

- default path は `database/eikan-app.sqlite`。
- `EIKAN_DB_PATH` が指定された場合はその絶対 path を使う。
- `database/` は `.gitignore` 対象であり、SQLite file は Git 管理外。
- backend 接続時は `PRAGMA foreign_keys = ON`、`PRAGMA journal_mode = MEMORY`、`PRAGMA temp_store = MEMORY` を設定する。
- `initializeDatabase()` は user table が空なら `backend/db/schema.sql` を実行し、既存 DB では schools / player snapshot / management code / school progression の migration・補完を行う。
- `npm run db:migrate` は `initializeDatabase()` を実行してから DB 接続を close する。
- `npm run db:reset` は `scripts/setup_db.js` から `schema.sql` を実行する。`schema.sql` は既存 table を `DROP TABLE IF EXISTS` するため、指定 DB の既存データを破壊する。

## 3. backup の正式定義

- backup は災害復旧用であり、DB 全体を元の環境へ戻せることを目的にする。
- backup は選手単位ではない。学校、選手系列、snapshot、能力、年度進行履歴、操作履歴相当の table をまとめて保全する。
- 論理削除済み学校など、通常画面で非表示になるデータも full backup には含める。
- 将来 media が導入された場合、その環境を復旧するために必要な関連 file も backup 対象に含める。
- 容量削減のために必要 file を意図的に落とす用途は backup ではなく export bundle 側で扱う。

## 4. backup 保存先

- local default は `<repo>/backups/` とする。
- `EIKAN_BACKUP_DIR` が指定された場合は、外付け HDD、NAS、cloud sync directory など任意の保存先へ切り替え可能にする。
- 初期版では backup の自動削除をしない。
- backup directory は Git 管理外にする。ただし `.gitignore` への `backups/` 追加は backup 実装時に行う。
- repository と同じ disk だけに置く backup は、disk 故障への完全な災害対策にならない。

## 5. SQLite backup 作成方式

| 方式 | 稼働中 DB の一貫性 | dependency / node-sqlite3 対応 | 元 DB への影響 | output 制約 | test しやすさ | Windows 対応 |
| --- | --- | --- | --- | --- | --- | --- |
| 単純 file copy | 接続中・書込中は不整合 risk がある。close 後なら安全寄り。 | `fs.copyFile` で追加 dependency 不要。 | close 運用なら低い。稼働中 copy は危険。 | 既存 file 上書き制御を自前で行う。 | 最も容易。 | 良い。 |
| `VACUUM INTO` | SQLite が一貫した DB file を出力する候補。 | node-sqlite3 で実行可能か 6.5-3 で検証が必要。SQLite version 依存に注意。 | 読み取り中心だが VACUUM 系の負荷と lock 影響を検証する。 | 出力先 file は存在しない必要があるなど制約がある。 | SQL 実行結果と file 検査で確認しやすい。 | SQLite build / path quoting を検証する。 |
| SQLite Backup API | 稼働中 backup 用として最も正統な候補。 | node-sqlite3 の公開 API / binding で利用できるか確認が必要。 | 低影響にできる可能性が高い。 | API 実装に依存。 | mock しにくいが実 DB test 可能。 | binding 対応次第。 |

後続 6.5-3 の推奨検証順は `VACUUM INTO` を第一候補として実環境検証し、node-sqlite3 / SQLite version / Windows path で問題があれば SQLite Backup API または安全な close-and-copy へ切り替える。現時点では `VACUUM INTO` を絶対確定しない。

## 6. backup manifest

候補 field:

- `backup_format`
- `backup_format_version`
- `created_at`
- `source_database_name`
- `backup_database_name`
- `application_version`
- `size_bytes`
- `sha256`
- `table_counts`
- `integrity_check`
- `foreign_key_check_count`
- optional media summary

manifest には絶対 path、OS user name、個人名など可搬性や privacy を損なう情報を保存しない。

## 7. backup 作成後検査

- backup file が存在する。
- file size が 0 より大きい。
- SQLite として open できる。
- `PRAGMA integrity_check` が `ok`。
- `PRAGMA foreign_key_check` の件数が 0。
- 必須 table が存在する。
- 主要 table count を manifest に記録し、想定外の 0 件化を検知できる。
- sha256 を計算する。
- 元 DB の size / mtime / table count が意図せず変化していないことを確認する。

## 8. restore 正式定義

- restore は DB 全体置換であり、merge import とは別機能。
- server 停止必須。稼働中の認証なし HTTP API として公開しない。
- restore 元を先に検査する。
- current DB の自動 backup を必須にする。
- temp file から atomic に近い切替を行う。
- 失敗時は旧 DB へ rollback できるようにする。
- restore 元と restore 先が同一 path の場合は拒否する。
- CLI で `--confirm` 等の明示確認を必須にする。
- browser UI は初期対象外で、CLI 先行とする。

## 9. restore 手順

1. restore file 存在確認。
2. manifest / checksum 検査。
3. SQLite として open して `integrity_check`。
4. schema / 必須 table / 必須 column 検査。
5. `foreign_key_check`。
6. current DB 自動 backup。
7. temp path 準備。
8. restore file copy または archive 展開。
9. temp DB 再検査。
10. current DB を退避。
11. temp DB を正式 path へ切替。
12. `initializeDatabase()` / migration 実行。
13. 最終検査。
14. 失敗時に旧 DB を復元し、失敗内容を表示する。

## 10. CLI / browser 境界

browser 先行可能:

- backup 作成
- backup 一覧

CLI 限定:

- restore
- backup 削除

restore と削除は破壊的であり、認証・権限・排他・rollback 設計が固まるまで browser には出さない。

## 11. オンライン拡張

将来は local filesystem storage と online object storage を切り替える storage adapter 概念を目標にする。Phase 6.5 では adapter code、cloud DB、認証、権限、所有権、同期を実装しない。オンライン環境では構造化データは online DB、画像・backup・bundle は object storage に分離する。

## 12. 非対象

- 自動 backup scheduler
- retention 自動削除
- incremental backup
- encrypted backup
- cloud upload 実装
- browser restore
- production hosting 設計

## 13. 未決事項

- backup 実装方式の最終選択。
- `application_version` の取得元。
- schema version 管理方法。
- manifest へ migration version を含めるか。
- backup retention。
- encrypted backup。
- media schema。
- online storage provider。
- ownership model。

# 転生選手 bundle・作品管理 概念設計

この文書は Phase 6.5-1 時点の概念設計であり、確定 schema ではない。table 名・column 名は仮称であり、`schema.sql`、migration、backend code は今回変更しない。backup との境界は [database_backup_restore.md](./database_backup_restore.md)、通常 export / import との境界は [data_export_import.md](./data_export_import.md) を参照する。

## 1. 目的

- 転生選手の公式初期データを作品別に管理する。
- 証拠画像を保持する。
- OCR を再実行可能にする。
- 新作品発売時に作品単位で切替可能にする。
- 通常・天才選手の軽量 export と分離する。

## 2. backup との違い

- backup は環境全体の完全保全。
- bundle は選択 data の配布・移動。
- 転生選手だけ画像を含むのは bundle の scope 設計。
- backup では復旧に必要な file を落とさない。

## 3. game release / data revision

game release 例:

- `2024-2025`
- `2026-2027`

data revision:

- 転生選手データに実変更があったときだけ追加する。
- ゲームの全 update 番号は記録しない。
- 栄冠 DB 上で区別が必要な変更だけ revision 化する。
- 例: `2026-2027 / revision 1`、`2026-2027 / revision 2`。

## 4. 概念 data model

候補:

- `reincarnated_player_master`: 転生選手そのものの共通 identity。名前、人物識別、同一人物を束ねる責務。
- `game_releases`: 作品単位。例: `2024-2025`、`2026-2027`。
- `reincarnated_player_versions`: 作品・revision ごとの初期能力、特殊能力、ポジション、出身、証拠画像参照、OCR 元画像参照。
- `media_assets`: 証拠画像、OCR 元画像などの metadata と storage key。
- player_series source relation: 各 user が育成した `player_series` が、どの公式 version を元にしたかを将来関連付ける。

これらの名称は仮称であり、schema 確定ではない。

## 5. 公式 data と育成 data の分離

公式・初期 data:

- 作品ごとの初期能力。
- 特殊能力。
- ポジション。
- 出身等。
- evidence media。
- revision。

ユーザー育成 data:

- 現在の `player_series` / `players` snapshot。
- どの公式 version を元にしたかを将来関連付ける。
- 同じ転生選手でも高校・ユーザーごとに複数育成系列が存在可能。

## 6. bundle 単位

- 転生選手 1 人。
- 選択した複数人。
- 1 作品分の転生選手全員。

## 7. bundle 構成

候補 directory:

```text
manifest.json
data.json
media/
  evidence/
  ocr-source/
```

含める:

- version 付き JSON。
- 証拠画像。
- OCR 元画像。
- manifest。
- checksums。

原則含めない:

- OCR 途中生成物。
- 二値化画像。
- debug 画像。
- 再生成可能 thumbnail。
- 不要な重複画像。

## 8. 画像必須度

運営作成公式 data:

- 証拠画像必須。

一般ユーザー育成投稿:

- 画像任意。

OCR import:

- OCR 元画像を保持可能。

## 9. media metadata

候補:

- `media_id`
- `media_type`
- `storage_key`
- `original_filename`
- `mime_type`
- `size_bytes`
- `sha256`
- `width`
- `height`
- `captured_at`
- `source_note`
- `created_at`

絶対 local path を可搬 JSON の正式参照にしない。

## 10. local / online storage

local:

- filesystem relative path。
- bundle 内 relative path。

online:

- object storage key。
- signed URL 等は runtime で生成。
- DB には permanent public URL を必須としない。

storage adapter 概念だけを記載し、Phase 6.5 では実装しない。

## 11. import validation

- manifest version。
- data version。
- checksum。
- media 存在。
- required evidence。
- game release。
- revision。
- duplicate master。
- duplicate version。
- unsupported snapshot。
- malicious path traversal 対策。

path traversal 対策として、bundle 内 path は正規化後に展開 root 配下であることを確認し、絶対 path、`..`、symlink abuse を拒否する。

## 12. 将来の公開・所有権

- 運営作成公式 data は閲覧中心。
- user 育成系列は作成者が編集。
- 他人の data は閲覧中心。
- forum / 投稿は別 Phase。
- 認証・所有権なしでは本格実装しない。

## 13. Phase 6.5 で実装しないこと

- schema 追加。
- migration。
- image upload。
- OCR。
- bundle 生成。
- bundle import。
- online storage。
- 認証。
- forum。

## 14. 未決事項

- media schema。
- online storage provider。
- ownership model。
- bundle format version の採番。
- application version の取得元。
- manifest へ migration version を含めるか。
- encrypted bundle / signing。
- merge conflict policy。

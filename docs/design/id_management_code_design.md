# ID / 管理コード設計

## 目的

Phase 2 では、内部処理の安定性と、人が扱うときの探しやすさ・入力しやすさ・将来の OCR 連携を両立するため、内部主キーと管理コードを分離する。

今回の範囲では URL / API / UI の全面切替は行わない。まず docs、schema、migration/backfill、helper の土台を固定し、後続の `school_detail` 1年経過 core、検索、CSV、OCR 導線の前提にする。

## 基本方針

- 内部主キーは整数 ID のまま維持する。
- 人が扱う管理コードは内部主キーとは別に持つ。
- 表示用の複合コードは必要時に helper で生成する。
- 複合コードをそのまま主キーにしない。
- 既存の `players.id` ベース参照と relation 系テーブルは維持する。

## 用語

- `snapshot_key` を docs / API / 新規説明での正式名称とする。
- 現行 DB 列の `players.snapshot_label` は、当面 `snapshot_key` の互換名として扱う。
- `snapshot_order` は DB 列として保存しない。`backend/constants/playerSnapshots.js` の `SNAPSHOT_TIMELINE` から導出する。

## 学校コード

`schools.school_code` は、人が見間違いにくい Base31 相当の管理コードとする。

文字集合:

```text
23456789ABCDEFGHJKMNPQRSTUVWXYZ
```

除外文字:

- `0`, `O`
- `1`, `I`, `L`

この文字集合は厳密な Base32 ではなく 31 文字であるため、docs / helper 名では `humanSafeCode` や `safeBase31` のように、Base32 と誤解されにくい名前を使う。

## DB 列

### `schools`

- `id`: 内部整数主キー
- `school_code`: `TEXT NOT NULL UNIQUE`

### `player_series`

- `id`: 内部整数主キー
- `school_id`: 所属学校
- `series_no`: `INTEGER NOT NULL`
- `UNIQUE(school_id, series_no)`

### `players`

- `id`: snapshot 実体の内部整数主キー
- `player_series_id`: 親系列参照
- `snapshot_label`: 現行互換列。設計上は `snapshot_key` として扱う。

`snapshot_order` は追加しない。

## 表示用複合コード

表示用コードは DB 列として保持せず、helper で生成する。

| 種別 | 例 | 生成元 |
| --- | --- | --- |
| 学校表示コード | `A7K3M9Q2` | `schools.school_code` |
| 選手系列表示コード | `A7K3M9Q2-014` | `school_code + series_no` |
| snapshot 表示コード | `A7K3M9Q2-014-S05` | `school_code + series_no + 導出した snapshot order` |

`series_no` のゼロ埋めは表示用ルールであり、DB には整数として保存する。

`S05` は `snapshot_key` と共通の snapshot timeline から導出する。legacy 値の `post_tournament` は `snapshot_label` として互換維持するが、公式 `Sxx` 表示コードの対象は公式 snapshot key に限定する。

## 既存データ移行

### `school_code`

- `school_code` が空の school にだけ値を付与する。
- Base31 相当の human-safe code を生成する。
- 候補が既存コードと衝突した場合は破棄し、別候補を再生成する。
- 一度付与済みの `school_code` は原則として自動再生成しない。

### `series_no`

- `series_no` が空の `player_series` にだけ値を付与する。
- 初回 migration では、同一 `school_id` 内で `player_series.id ASC` 順に `1, 2, 3...` を振る。
- 既に `series_no` がある行は原則として自動再採番しない。
- 同一学校内で番号が衝突する場合は、空いている次の番号を割り当てる。

## 新規作成時

- 新規 school 作成時は `school_code` 候補を生成し、UNIQUE 衝突時は再生成して insert を再試行する。
- 新規 `player_series` 作成時は、同一 `school_id` の既存番号から次の `series_no` を決める。
- 表示用コードは保存せず、レスポンスや UI 表示など必要な場所で helper により生成する。

## 今回やらないこと

- URL を管理コードベースへ切り替える。
- API レスポンスを全面的に管理コード中心へ変える。
- 一覧 UI / 詳細 UI を大きく作り替える。
- `school_detail` の 1年経過 core を実装する。
- OCR 本体 MVP を実装する。

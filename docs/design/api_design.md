# API 設計

## 目的

学校データと選手データをフロントエンドから扱うための API 方針を整理する。

## 現在公開中の API（2026年6月時点）

### Schools

- `GET /api/schools`
- `GET /api/schools/:id/player-series`
- `GET /api/schools/:id`
- `POST /api/schools`
- `POST /api/schools/:id/progress-year`
- `POST /api/schools/:id/progress-year/undo`
- `PATCH /api/schools/:id`
- `DELETE /api/schools/:id`

### Players

- `GET /api/players`
- `GET /api/players/relation-options`
- `GET /api/players/:id/detail`
- `GET /api/players/:id`
- `POST /api/players`
- `PUT /api/players/:id`

### Player series

- `GET /api/player-series/:id`
- `GET /api/player-series/:id/snapshot-seed`
- `POST /api/player-series/:id/snapshots`

## API 詳細

| メソッド | パス | 主なステータス | 用途 |
| --- | --- | --- | --- |
| GET | `/api/schools` | `200`, `400` | 論理削除されていない学校一覧を取得する。basic 検索・ソート query を受け付ける |
| GET | `/api/schools/:id/player-series` | `200`, `404` | 学校詳細用に、所属選手を `player_series` 単位で取得する |
| GET | `/api/schools/:id` | `200`, `404` | 有効な学校詳細を取得する |
| POST | `/api/schools` | `201`, `400` | 学校を新規登録する |
| POST | `/api/schools/:id/progress-year` | `200`, `400`, `404` | 学校年度を1年進め、学校管理上の学年・在籍状態を更新する |
| POST | `/api/schools/:id/progress-year/undo` | `200`, `400`, `404` | 直前1回分の年度進行を取り消す |
| PATCH | `/api/schools/:id` | `200`, `400`, `404` | 学校名、都道府県、プレイ方針、開始年度、メモを更新する |
| DELETE | `/api/schools/:id` | `200`, `404` | 学校を論理削除する（`is_archived = 1` に更新） |
| GET | `/api/players` | `200`, `400`, `404` | 有効学校に属する選手一覧を取得する。検索・絞り込み・能力範囲検索・sort・snapshot表示時点 query を受け付ける |
| GET | `/api/players/relation-options` | `200` | relation 系編集 UI 用の候補値を取得する |
| GET | `/api/players/:id/detail` | `200`, `404` | 一覧 accordion などで使う詳細情報を取得する |
| GET | `/api/players/:id` | `200`, `404` | 選手 snapshot 詳細を取得する。削除済み学校に属する選手も取得可能 |
| POST | `/api/players` | `201`, `400` | 有効学校に対して選手を新規登録する |
| PUT | `/api/players/:id` | `200`, `400`, `404` | 選手 snapshot と relation 系情報を更新する。削除済み学校所属選手の更新は拒否する |
| GET | `/api/player-series/:id` | `200`, `404` | `player_series` と登録済み snapshot 情報を取得する |
| GET | `/api/player-series/:id/snapshot-seed` | `200`, `400`, `404`, `409` | 新規 snapshot 作成画面用に、公式時系列上の引き継ぎ元と snapshot 固有初期値を読み取り専用で取得する |
| POST | `/api/player-series/:id/snapshots` | `201`, `400`, `404`, `409` | 指定 `player_series` に新しい snapshot を作成する |


### `GET /api/player-series/:id/snapshot-seed`

新規 snapshot 作成画面で使用する読み取り専用 API。DB への INSERT / UPDATE / DELETE は行わない。

- query: `snapshot_label`
- 対象: 公式9時点のみ
- 成功: `200`
- 不正な series ID または不正な `snapshot_label`: `400`
- series 不存在: `404`
- 同じ `snapshot_label` が既に series 内に存在する場合: `409`
- response: `source_snapshot` と `seed` を返す
- `source_snapshot` は、作成対象より前で最も近い登録済み公式 snapshot。存在しない場合は `null`
- 未来側 snapshot、DB 登録順、更新日時上の最新 snapshot へ fallback しない
- `seed` には `grade`、`snapshot_label`、能力値、変化球、特殊能力、サブポジションなど、編集画面の snapshot 固有初期値を含める

## レスポンス形式

Schools / Players ともに `success`, `data`, `error` を持つ共通形式を返す。

### 成功時

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

### エラー時

- 404: データ未存在
- 400: バリデーションエラー
- 500: サーバーエラー

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "..."
  }
}
```

## バリデーション方針

- リクエスト ID の検証は service 層で行う。
- Schools の作成・更新 payload は service 層で必須項目と値域を検証する。
- Schools 一覧 query は service 層で正規化と enum 検証を行う。
- Players の作成・更新 payload も service 層で必須項目と値域を検証する。
- Players 一覧 query は service 層で正規化し、検索・能力範囲・sort・snapshot表示時点を扱う。
- 想定外エラーは共通エラーハンドラで 500 として返却する。

## 補足

- `DELETE /api/schools/:id` は物理削除ではなく、学校をアーカイブ状態へ変更する API として扱う。
- 削除済み学校は `GET /api/schools/:id` の通常利用対象外とし、404 相当で扱う。
- 削除済み学校の配下選手は通常一覧から除外するが、`GET /api/players/:id` では保持データとして取得できる。
- 学校年度進行では、能力値・snapshot・relation 系情報を自動変更しない。

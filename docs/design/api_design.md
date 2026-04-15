# API 設計

## 目的
学校データと選手データをフロントエンドから扱うための API 方針を整理する。

## 現在公開中の API

### Schools
- `GET /api/schools`
- `GET /api/schools/:id`
- `POST /api/schools`
- `PATCH /api/schools/:id`
- `DELETE /api/schools/:id`

### Players
- `GET /api/players`
- `GET /api/players/:id`
- `POST /api/players`
- `PUT /api/players/:id`

## API 詳細

| メソッド | パス | 主なステータス | 用途 |
| --- | --- | --- | --- |
| GET | `/api/schools` | `200` | 論理削除されていない学校一覧を取得する |
| GET | `/api/schools/:id` | `200`, `404` | 有効な学校詳細を取得する |
| POST | `/api/schools` | `201`, `400` | 学校を新規登録する |
| PATCH | `/api/schools/:id` | `200`, `400`, `404` | 学校名、プレイ方針、メモを更新する |
| DELETE | `/api/schools/:id` | `200`, `404` | 学校を論理削除する（`is_archived = 1` に更新） |
| GET | `/api/players` | `200`, `404` | 有効学校に属する選手一覧を取得する。`school_id` 指定時は対象学校が有効であることを前提にする |
| GET | `/api/players/:id` | `200`, `404` | 選手詳細を取得する。削除済み学校に属する選手も取得可能 |
| POST | `/api/players` | `201`, `400` | 有効学校に対して選手を新規登録する |
| PUT | `/api/players/:id` | `200`, `400`, `404` | 選手情報を更新する。削除済み学校所属選手の更新は拒否する |

## 設計観点
- レスポンス形式
- エラー形式
- バリデーション位置
- 論理削除の扱い

## 現行レスポンス形式

### Schools 成功時
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

## レスポンス形式
- Schools / Players ともに `success`, `data`, `error` を持つ共通形式を返す。
- `GET /api/players/:id` は画面制御用に `school_name` と `school_is_archived` を含む。

## バリデーション方針
- リクエスト ID の検証は service 層で行う。
- Schools の作成・更新 payload は service 層で必須項目と値域を検証する。
- Players の作成・更新 payload も service 層で必須項目と値域を検証する。
- 想定外エラーは共通エラーハンドラで 500 として返却する。

## 補足
- `DELETE /api/schools/:id` は物理削除ではなく、学校をアーカイブ状態へ変更する API として扱う。
- 削除済み学校は `GET /api/schools/:id` の通常利用対象外とし、404 相当で扱う。
- 削除済み学校の配下選手は通常一覧から除外するが、`GET /api/players/:id` では保持データとして取得できる。

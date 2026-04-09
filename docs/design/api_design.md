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
- 現時点では未公開
- `backend/routes/playerRoutes.js` に `GET /api/players` と `GET /api/players/:id` の雛形はあるが、`backend/app.js` では未マウント

## 今後公開予定の API

### Players
- `GET /api/players`
- `GET /api/players/:id`
- `POST /api/players`
- `PATCH /api/players/:id`
- `DELETE /api/players/:id`

## Schools API 詳細

| メソッド | パス | 用途 |
| --- | --- | --- |
| GET | `/api/schools` | 論理削除されていない学校一覧を取得する |
| GET | `/api/schools/:id` | 学校詳細を取得する |
| POST | `/api/schools` | 学校を新規登録する |
| PATCH | `/api/schools/:id` | 学校名、プレイ方針、メモを更新する |
| DELETE | `/api/schools/:id` | 学校を論理削除する（`is_archived = 1` に更新） |

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

## 目標レスポンス形式
- 将来的には Schools / Players ともに `success`, `data`, `error` を持つ共通形式へ統一する。
- Players API は公開時にこの共通形式へ揃える。

## バリデーション方針
- リクエスト ID の検証は service 層で行う。
- Schools の作成・更新 payload は service 層で必須項目と値域を検証する。
- 想定外エラーは共通エラーハンドラで 500 として返却する。

## 補足
- `DELETE /api/schools/:id` は物理削除ではなく、学校をアーカイブ状態へ変更する API として扱う。
- Players 一覧は将来的に `school_id` 指定での絞り込みを検討するが、現時点では正式仕様に含めない。

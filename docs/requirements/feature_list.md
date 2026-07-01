# 機能一覧

この文書は、2026年7月時点の実装状況を大まかに整理する。
詳細な画面導線は `docs/requirements/screen_list.md`、Phase上の位置づけは `docs/phases/phase2.md` を参照する。

## 実装済み

### 学校機能

- 学校作成
- 学校一覧表示
- 学校詳細表示
- 学校編集
- 学校削除（論理削除）
- 学校一覧の basic 検索・sort
- 学校年度進行
- 年度進行の直前 1 回 undo

### 選手・snapshot機能

- 選手登録（手動）
- 選手詳細表示
- 選手編集
- `player_series` / `players` snapshot 構造
- 正式 snapshot timeline
- snapshot 作成・切替・編集
- `player_detail` の snapshot 履歴確認
- `player_edit` の 1 snapshot 編集

### players一覧・検索・sort

- 独立した `players.html` 全体選手一覧
- 基本検索・絞り込み
- 通常能力範囲検索
- 通常能力 sort
- snapshot表示時点選択
- 一覧内 accordion 簡易詳細
- 選手一覧能力要約
- PC / narrow width 対応

### relation系・守備表示

- 変化球編集 UI
- 特殊能力編集 UI
- サブポジション編集 UI
- 守備位置図

### URL・状態管理

- schools検索stateのURL同期
- players検索stateのURL同期
- canonical URL生成
- legacy query読込互換
- reset / reload / back / forward復元
- unrelated query / hash保持
- fixed select invalid値の正規化
- ability range正規化
- schools stale response protection
- History API書き込みutility

### 管理コード基盤

- `school_code`
- `series_no`
- `snapshot_key`
- 表示用複合コード helper
- migration / backfill

### テスト・診断

- backend / frontend の構文確認 script
- frontend ESLint
- `no-undef` / `no-redeclare` / `no-unreachable`
- `npm run lint:frontend`
- core regression test
- URL state pure tests
- latest request runner tests
- History URL helper tests
- 通常 DB を使わない一時 SQLite DB によるテスト実行
- DB 診断 script `scripts/diagnostics/check-data-integrity.js`
- `git diff --check` 用 script
- `npm run verify:all`
- GitHub Actions `verify-all`
- `codex/staging` Ruleset による required status check `verify-all`
- PR browser smoke checklist
- 削除前参照調査手順

## 一部実装

### OCR

- OCR入口仮UI
- OCR設計
- `player_edit` の snapshot 作成導線との接続方針
- 画像アップロード、固定UI解析、OCR結果反映、低信頼項目レビューは未実装

### 管理コード

- 生成・backfill の基盤は実装済み
- 画面表示・検索・URL / API・export / import 連携への本格展開は未実装


## 未実装・今後

- OCR本体MVP
- DB backup / restore
- export / import
- 管理コードの画面表示・検索への本格展開
- 特殊能力の高度検索
- 複数能力 AND / OR 検索
- table header クリック sort
- browser E2E test
- duplicate push改善
- admission year厳格化
- error policy統一
- 公開用認証・権限・ユーザー所有権
- 転生選手フォーラム等の公開機能

## 現時点の対象外

- 本番公開前提の認証・課金・ホスティング設計
- 外部ユーザー投稿機能
- 公開フォーラムやランキングなどのコミュニティ機能
- OCR精度の最終最適化

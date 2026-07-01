# Phase 2

## 改訂版

以下を Phase 2 の正式な解釈とする。
以降の「目的」「大目標」「小目標」「完了条件」は、この現在地を前提に読む。

## 位置づけ

Phase 2 は「機能拡張」のフェーズとする。
Phase 1 で作った動く土台の上に、実運用で便利と言える機能を積み上げる段階である。

このフェーズでは、「登録できる」から「探しやすい」「入力しやすい」「年度進行に耐えやすい」「将来の OCR につなげやすい」へ進める。

## 現在地（2026年7月時点）

現在は **Phase 2後半〜終盤入口** と整理する。

Phase 2の主要機能が概ね成立し、残る大型機能と安定化へ移った段階である。ただし、以下が残っているため「Phase 2完了」とは断定しない。

- OCR本体MVPが未実装
- DB backup / restore、export / importが未実装
- 管理コードの画面表示・検索・export連携への本格展開が未実装

一方で、安定化基盤として core regression test、一時 SQLite DB、URL・状態管理整理、frontend lint、`npm run verify:all`、GitHub Actions、`codex/staging` Ruleset、required check `verify-all` は整備済みである。

## 実装済み

実コードと既存仕様書で確認できる範囲では、以下を Phase 2 の実装済み成果として扱う。

### 選手 series / snapshot

- `player_series` を親、`players` を各登録時点 snapshot 子とする構造
- 正式 snapshot timeline
  - `entrance`
  - `y1_summer`
  - `y1_autumn`
  - `y1_spring`
  - `y2_summer`
  - `y2_autumn`
  - `y2_spring`
  - `y3_summer`
  - `graduation`
- legacy / compatibility 値の表示補助
  - `admission`
  - `post_tournament`
  - `y3_autumn`
- `player_detail` の snapshot 切替
- 未登録時点から snapshot を作成して `player_edit` へ進む導線
- `players.html` の snapshot表示時点選択
- snapshot exact JOIN により、選択した時点に対応する snapshot を一覧へ反映する取得処理

### 選手一覧・検索・sort

- 独立した `players.html` 全体選手一覧
- 選手名、学校名、出身地、ポジション等を対象にした基本検索・絞り込み
- 投手・野手の通常能力範囲検索
- 通常能力 sort
- snapshot 表示時点選択
- 一覧内 accordion 簡易詳細
- 選手一覧能力要約
- 再取得時に既存一覧を保持し、空白化や scroll jump を抑える表示更新
- PC / narrow width を意識した responsive 表示

### 学校・年度進行

- 学校一覧の basic 検索・sort
- `school_detail` の `player_series` 単位所属選手一覧
- `school_detail` の年度進行
  - `schools.current_year` 更新
  - `player_series.school_grade` 更新
  - `player_series.roster_status` 更新
- 所属選手 0 人時の年度進行不可表示
- 年度進行の直前 1 回 undo
- snapshot 自動生成は行わず、school 管理と snapshot 履歴を分離する方針

### 詳細・編集 UI

- `player_detail` の read-only 詳細表示と snapshot 履歴確認
- `player_edit` の 1 snapshot 編集導線
- 特殊能力、変化球、サブポジションの relation 系編集 UI
- 守備位置図
  - `player_detail` で守備適性を確認するための表示として実装済み
  - 直接保存はせず、必要時は `player_edit` へ遷移する導線として扱う
- `player_edit` の `target_position` 受け取りによる対象サブポジション入力支援
- 2026向け出身地・変化球候補の一部対応

### 管理コード基盤

- `school_code`
- `series_no`
- `snapshot_key`
- 表示用複合コード生成 helper
- migration / backfill
- 診断 script による `school_code`、`series_no` 関連の基礎確認

### テスト・CI・保護ルール

- Node.js 標準の `node:test` による core regression test
- player 登録・snapshot、snapshot seed・重複防止、legacy snapshot 互換の回帰確認
- players validation、入学年度範囲、検索・能力 filter・sort、snapshot 指定時検索・sort の回帰確認
- 学校年度進行・undo の回帰確認
- 通常 DB を使わない一時 SQLite DB によるテスト実行
- backend / frontend 構文確認、DB 診断、core regression test、差分 check をまとめる `npm run verify:all`
- GitHub Actions `verify-all` による `codex/staging` への PR merge 前検証
- `codex/staging` Ruleset による PR 必須化、conversation resolution 必須化、base branch 最新化必須化、required status check `verify-all`

## 一部実装

以下は入口や基盤があるが、利用範囲が限定的なため一部実装として扱う。

- OCR入口仮UI
  - `player_edit` の snapshot 作成文脈で、将来の OCR / 固定UI解析導線を受け入れる仮表示がある
  - 画像アップロード、固定UI解析、OCR結果反映、低信頼項目レビューは未実装
- OCR設計
  - `docs/requirements/ocr_pipeline_design.md` に設計方針がある
  - 実処理はまだない
- 管理コード生成・backfill
  - 基盤は実装済み
  - 画面表示、検索、URL / API、export / import 連携への本格展開は未実装

## 未実装・今後

- OCR本体MVP
- DB backup / restore
- export / import
- 管理コードの画面・検索への本格展開
- 公開用認証・権限・所有者管理
- 特殊能力の高度検索
- 複数能力 AND / OR 検索
- table header クリック sort
- 転生選手フォーラム等の公開機能

## 6.1〜6.9 安定化ロードマップ

以下の 6.x は製品 Phase 番号ではなく、現在採用している実行順を示す作業番号である。

### 6.1 Repository改行コード・一時ファイル整理

状態: 完了

- `patch.diff`削除
- 診断scriptを`check-data-integrity.js`として正式配置
- `npm run db:check`追加
- `.gitattributes`追加
- repositoryのLF統一
- `node_modules`を含めないsource ZIP作成方法の確立
- SQLite DBとsource ZIPの分離

### 6.2 Phase・README・機能一覧の現状同期

状態: 完了

- README、Phase資料、機能一覧、画面一覧を現在の実装状況に同期する
- 実装済み、一部実装、未実装、歴史的MVP範囲を分ける

### 6.3 snapshot・検索・年度進行の自動回帰テストとCI基盤

状態: 完了

- player 登録・snapshot の core regression test
- snapshot seed・重複防止の回帰確認
- legacy snapshot 互換の回帰確認
- players validation の回帰確認
- 入学年度範囲 validation の回帰確認
- players 検索・能力 filter・sort の回帰確認
- snapshot 指定時検索・sort の回帰確認
- 学校年度進行・undo の回帰確認
- 通常 DB を使わない一時 SQLite DB によるテスト保護
- `npm run verify:all` による構文確認、frontend lint、DB 診断、core regression test、差分 check の一括実行
- GitHub Actions `verify-all` による CI 検証
- `codex/staging` Ruleset による PR 必須化、required status check `verify-all`、conversation resolution 必須化、base branch 最新化必須化
- GitHub Actions・Ruleset は 6.3 の安定化仕上げとして扱う

### 6.4 Prompt5-6 URL・状態管理の整理

状態: 完了

- 6.4-1 設計調査 完了
- 6.4-2 schools pure state 完了
- 6.4-3 players pure state 完了
- 6.4-4 frontend静的解析・削除安全基盤 完了
- 6.4-5 schools非同期競合対策 完了
- 6.4-6 History API検証・最小整理 完了
- 6.4-7 最終確認・docs同期 完了
- 成果: schools / players の pure state module、fixed select normalization、legacy query compatibility、canonical URL、schools stale response protection、History API utility、ESLint `no-undef`、automated core tests、browser smoke 運用を整備
- 現在の URL 同期は維持し、legacy query との互換も維持する
- 次の作業は 6.5 DB backup・export

### 6.5 DB backup・export

状態: 未着手

- backupを先に行う
- その後、export、importの順に進める方針
- SQLite DBはGit管理外であり、source ZIPとは別に保全する必要がある

### 6.6 管理コードの画面表示・検索

状態: 基盤実装済み、本格利用は未実装

- `school_code`、`series_no`、`snapshot_key` の生成・backfill は基盤済み
- 画面表示、検索、export / import 連携は未実装

### 6.7 OCR MVP

状態: 入口仮UI・設計のみ。一連の本体処理は未実装

- 画像アップロード
- 固定UI解析
- OCR結果反映
- 低信頼項目レビュー
- 手動修正フローとの接続

### 6.8 Phase 2完了判定

状態: 未実施

- OCR本体MVP、DB保全、状態管理、管理コード本格展開の残量を確認する
- Phase 2完了と見なせるかを判断する

### 6.9 Phase 3 UI・品質・公開前調整

状態: 未着手。ただし一部品質活動を前倒し中

- UI、品質、公開前リスク、運用・保守性の見直し
- 特定ゲーム画面の直接再現ではなく、野球ゲーム風の独自UIとして成立しているか確認する

## 目的

- 手入力中心の運用を、実際に使いやすい運用へ引き上げる
- snapshot / series を前提に、同一選手の年度・時点管理を破綻しにくくする
- 学校年度進行と選手管理を接続し、実運用上の roster 管理を扱えるようにする
- 検索、絞り込み、候補提示などの補助機能を追加する
- OCR を将来安全に組み込めるよう、受け口となる設計と UI を整える
- 共通部品と状態管理を整理して、機能追加しやすい構造へ近づける

## 大目標

### 1. データ検索性を上げる

- 一覧の絞り込み
- 条件検索
- 並び替え
- 管理コードを使った検索・照合への足場づくり
- 将来的な複合検索への足場づくり

### 2. 入力補助を強化する

- 候補選択 UI
- 入力補完
- relation 系編集UI
- 共通入力コンポーネントの再整理
- 項目ごとの入力負荷軽減

### 3. OCR 接続前提の設計を進める

- OCR 結果の受け口設計
- OCR 補助 UI の設計
- 手入力フローとの共存ルール決定
- 誤認識時の修正フロー整理
- snapshot 作成導線との接続整理

### 4. 一覧・詳細画面の実用性を上げる

- 詳細画面内の情報整理
- 関連データの見やすさ改善
- 条件変更時の再描画体験向上
- 年度進行後の補助表示・時点解放

### 5. 年度進行と管理コードの土台を固める

- `schools.current_year` と `player_series.school_grade` の整合管理
- `player_series.roster_status` の更新
- 直前年度進行の undo
- `school_code` / `series_no` / `snapshot_key` の命名と生成方針固定
- URL / API / import / export への本格展開準備

## 完了条件

Phase 2 の完了判定では、少なくとも以下を確認する。

- 手入力だけでなく、実運用で便利と言える検索・補助機能が揃っている
- 一覧から必要データを見つける負担が大きく下がっている
- snapshot / series を前提に、同一選手の時点管理と新規 snapshot 作成が破綻しにくい
- 学校年度進行により、学校の現在年度、所属選手の学年、roster 状態を扱える
- school 進行と latest snapshot のずれを、画面上の補助表示や時点切替で説明できる
- 管理コードの命名・生成方針が固定され、後続の URL / API / CSV 連携へ展開できる
- OCR を組み込んでも既存入力フローを壊しにくい構造になっている
- 検索、入力補助、共通部品、年度進行、管理コードの整理方針がドキュメント化されている
- 自動回帰テスト・CI・保護ルールの基盤が整備され、DB backup / restore、export / import の整備方針が明確になっている

## このフェーズではまだ主目的にしないこと

- 公開前の最終 UI 仕上げ
- 法的・運用リスクの最終調整
- 網羅的な品質保証体制の完成
- OCR 精度そのものの最終最適化
- CSV / import / export の完全運用

## 次の主戦場としての意味

Phase 2 後半〜終盤入口では、機能追加だけでなく、既存機能を壊さないための回帰テスト、DB 保全、状態管理整理、ドキュメント同期を重視する。
Phase 3 へ正式移行する前に、現行の実装済み機能と未実装機能を明確に分け、安定化の優先順位を固定する。

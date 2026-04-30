# Phase 2

## 改訂版

以下を Phase 2 の正式な解釈とする。
以降の「目的」「大目標」「小目標」「完了条件」は、この現在地を前提に読む。

追記:

- `schools.html` の basic 学校検索・basic ソートは、Phase 2 初手の一部として前倒し実装済みと扱う。
- 学校名・都道府県・プレイ方針の basic 検索と、学校名順・開始年度順・更新日時順の basic ソートまでは Phase 2 前半の成果とする。
- 都道府県独自順ソート、所属選手人数順ソート、所属選手名からの学校逆引き検索は、Phase 2 後半以降の advanced 検討として扱う。
- `player_detail` / `player_register` / `player_edit` に関わる選手スナップショット時系列管理の再設計は、Phase 2 の中核成果として固定済みとする。
- `player_series` を親、既存 `players` を各時点 snapshot 子とする設計を、requirements / DB / API / 主要画面導線の土台へ反映済みとする。
- relation 系編集UI、学校年度進行、ID / 管理コード土台実装は、Phase 2 後半入口までの主要成果として扱う。
- `player_detail` の守備・起用可視化としての守備位置図 UI は、時点切替・snapshot 作成導線・relation 系編集導線が成立した後の Phase 2 後半タスクとして扱う。
- OCR は、入口仮UIと設計整合までは Phase 2 の一部として進める。画像アップロード、固定UI解析、OCR結果反映、低信頼項目レビューを含む OCR 本体 MVP は未実装として残す。

## 位置づけ

Phase 2 は「機能拡張」のフェーズとする。
Phase 1 で作った動く土台の上に、実運用で便利と言える機能を積み上げる段階である。

このフェーズでは、
「登録できる」から「探しやすい」「入力しやすい」「年度進行に耐えやすい」「将来の OCR につなげやすい」へ進める。

## 現在地（2026/04/30時点）

Phase 2 は、現時点では snapshot / series 再設計を土台とした前半〜中盤を越え、
`player_detail` / `player_edit` / `school_detail` の実運用導線まで含む **後半入口〜中盤** と整理する。

### 実装済み

- 選手スナップショット時系列設計の固定
  - `player_series` を親、既存 `players` を各時点 snapshot 子とする方針を requirements と DB / API 土台へ反映済み
- `player_detail` の時点切替成立
  - 最新 snapshot 初期表示、正式時点ボタン、legacy 補助表示、`currentSnapshot` ベース描画まで実装済み
- 新規 snapshot 作成導線成立
  - 未登録時点から snapshot を作成し、そのまま `player_edit` の該当 snapshot 編集へ進む導線まで実装済み
- `school_detail` の `player_series` 単位一覧化
  - 所属選手一覧と人数表示を snapshot 単位ではなく同一選手単位へ整理済み
- relation 系編集UI
  - 特殊能力 / 変化球 / サブポジションの編集導線を `player_edit` に実装済み
- `player_detail` / `player_edit` の変化球UI調整
  - 読みやすさ・省スペース性・年度進行後の整合を含む実運用寄り調整まで実施済み
- 年ピッカーの整合改善
  - 学校年度進行後の `current_year` を、新規登録の初期値や補助表示へ反映する方針で整理済み
- `school_detail` の `1年経過` core 実装
  - `schools.current_year` 更新
  - `player_series.school_grade` 更新
  - `player_series.roster_status` 更新
  - snapshot 自動生成は未実装のまま維持
- `school_detail` の年度進行 UX 改善
  - 所属選手 0 人時の進行不可
  - 理由表示
  - `選手を登録する` 導線
  - 年度進行の undo（直前 1 回分）
- `player_detail` の時点切替段階解放
  - 学校年度進行に応じて、表示する時点群を段階的に拡張する実装済み
- ID / 管理コード設計の固定と土台実装
  - `school_code`
  - `series_no`
  - `snapshot_key`
  - 表示用複合コード生成 helper
  - migration / backfill
- OCR 設計書の現行導線整合
  - `ocr_pipeline_design.md` を、snapshot / series 設計、`player_detail` / `player_edit` 導線、現在の phase 方針に合わせて調整済み

### 一部実装済み

- OCR 入口仮UI
  - `player_edit` の `snapshot-create` モードで、将来の OCR / 固定UI解析導線を受け入れる仮カードまでは実装済み
  - ただし、画像アップロード、固定UI解析、OCR結果反映、低信頼項目レビューは未実装

### 未実装

- OCR 本体 MVP
- `player_detail` の守備位置図 UI
- 学校一覧 / 選手一覧の検索・絞り込み・並び替え強化
- CSV / import / export と管理コードの連携
- ID / 管理コードの URL / API / 一覧画面への本格展開
- 変化球UIの重なりカード試作（detail側限定案）

## 実装状況メモ（2026/04/30時点）

初期 core 実装として、以下は完了済み。

- `schools.current_year` 更新
- `player_series.school_grade` 更新
- `player_series.roster_status` 更新
- 所属選手 0 人時の年度進行不可
- 年度進行の直前 1 回分 undo
- snapshot 自動生成は未実装のまま維持

引き続き、school 進行と latest snapshot のずれは当面許容する。
このずれは `player_detail` 側の時点切替段階解放や補助表示で吸収する方針とする。

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

## 小目標

### 1.1 検索・絞り込み

- 学校名での絞り込み
- 選手名での検索
- 入学年での絞り込み
- 選手種別での絞り込み
- 学年、ポジション、都道府県などの条件追加検討
- 管理コードによる検索・照合の検討

### 1.2 並び替え

- 学校一覧の並び替え
- 選手一覧の並び替え
- デフォルト表示順の見直し
- 所属人数、更新日時、年度、管理コードを使った並び替え検討

### 1.3 詳細画面改善

- 学校詳細での所属選手一覧強化
- 選手詳細での能力・特殊能力・変化球表示改善
- 関連情報を section 単位で整理
- 年度進行後の school 管理情報と latest snapshot のずれを補助表示で吸収

#### 1.3.a Phase 2 後半の拡張タスク

- 追加順序は「選手スナップショット時系列設計の固定 → `player_detail` の時点切替成立 → 新規スナップショット作成導線成立 → relation 系編集UI → `school_detail` 年度進行 core → 守備位置図 UI → OCR 本体 MVP」とする。
- 選手スナップショット時系列設計では、`player_series` を親、既存 `players` を各時点 snapshot 子として扱う。
- `player_detail` は、同一選手の登録済み時点のうち最新 snapshot を初期表示し、ボタン押下で時点切替できる構造を維持する。
- 未登録時点は空ボタン表示とし、押下時は確認表示を出した上で新規 snapshot 作成導線へ進める。
- 新規 snapshot 作成時は、直前の登録済み snapshot を初期値コピーする方針を採る。
- 上記時系列設計の正式仕様は `docs/requirements/player_snapshot_timeline.md` を参照する。
- 守備位置図 UI は、時系列切替、snapshot 作成導線、relation 系編集導線、年度進行 core が安定した後に着手する。
- 守備位置図 UI は、守備・起用表示の強化として追加検討する。
- 追加対象は `player_detail.html` を基本とし、一覧画面や通常フォームとは分離した専用 UI とする。
- 初期実装は読み取り用の可視化を優先し、メインポジション、サブポジション、コンバート時の適性差を見やすくする。
- 初期導入では、現在のデータ構造で表現可能な守備適性を先に表示し、コンバート後守備力の詳細反映はデータモデル整理後の拡張とする。
- この時点では「選手を守備位置図に配置できる機能」までは含めず、配置 UI は別機能として後続検討に分離する。
- 守備位置図 UI の具体仕様は `docs/requirements/defense_position_map.md` を参照し、Phase 2 後半で仕様確定から着手する。

#### 1.3.b school_detail の学校年度進行（1年経過）

- `school_detail` の `1年経過` は、school 管理と player snapshot 運用を接続する中期拡張として扱う。
- 着手順は「snapshot 再設計の固定 → `player_detail` の時点切替安定化 → `school_detail` の所属選手一覧を `player_series` 単位へ統一 → 学校年度進行仕様の確定 → core 実装 → UX 改善」とする。
- 初期 core 実装では、学校の `current_year` 更新と、所属選手の school 管理上の現在学年 / roster 状態更新までを責務とする。
- 初期 core 実装では、`1年経過` により各選手の snapshot を自動生成しない。
- 所属選手 0 人時は年度進行不可とし、理由表示と `選手を登録する` 導線を出す。
- 年度進行は直前 1 回分の undo を持つ。
- school 進行と latest snapshot のずれは当面許容し、`player_detail` 側の時点切替段階解放や補助表示で埋める。
- 詳細仕様は `docs/requirements/school_year_progression.md` を参照する。

#### 1.3.c ID / 管理コード

- ID / 管理コードは、DB 内部 ID とは別に、人間が照合しやすい管理用の表示コードとして扱う。
- 正式名称は `school_code` / `series_no` / `snapshot_key` とする。
- 表示用複合コード生成 helper、migration、backfill までは Phase 2 の土台実装として完了済みとする。
- URL / API / 一覧画面 / CSV / import / export への本格展開は、Phase 2 後半以降の残タスクとする。

### 1.4 入力補助

- よく使う値の候補化
- 入力済み値の再利用
- 画面ごとの重複 UI の削減
- 必須入力の分かりやすさ向上
- 特殊能力 / 変化球 / サブポジション編集導線の実運用化
- 学校年度進行後の `current_year` を、新規登録の初期値や補助表示へ反映

### 1.5 OCR 準備

- OCR 入力対象項目の定義
- OCR 結果の中間データ形式整理
- OCR 結果を確認・修正する画面の検討
- OCR と手入力の優先順位ルール整理
- `player_edit` の `snapshot-create` モードに OCR / 固定UI解析導線を受け入れる
- 画像アップロード、固定UI解析、OCR結果反映、低信頼項目レビューは OCR 本体 MVP として後続実装する

## このフェーズでの代表成果物

- basic 検索 UI
- basic 絞り込み UI
- basic 並び替え機能
- `player_series` / snapshot 時系列管理の仕様メモと土台実装
- `player_detail` の時点切替 UI
- 新規 snapshot 作成導線
- `school_detail` の `player_series` 単位一覧
- relation 系編集UI
- 学校年度進行 core と undo
- ID / 管理コードの命名・生成・backfill 土台
- OCR 補助 UI の設計メモまたは入口仮UI
- `player_detail` の守備位置図 UI に関する仕様メモ、または軽い試作

## 完了条件

- 手入力だけでなく、実運用で便利と言える検索・補助機能が揃っている
- 一覧から必要データを見つける負担が大きく下がっている
- snapshot / series を前提に、同一選手の時点管理と新規 snapshot 作成が破綻しにくい
- 学校年度進行により、学校の現在年度、所属選手の学年、roster 状態を扱える
- school 進行と latest snapshot のずれを、画面上の補助表示や時点切替で説明できる
- 管理コードの命名・生成方針が固定され、後続の URL / API / CSV 連携へ展開できる
- OCR を組み込んでも既存入力フローを壊しにくい構造になっている
- 検索、入力補助、共通部品、年度進行、管理コードの整理方針がドキュメント化されている

## このフェーズではまだ主目的にしないこと

- 公開前の最終 UI 仕上げ
- 法的・運用リスクの最終調整
- 網羅的な品質保証体制の完成
- OCR 精度そのものの最終最適化
- CSV / import / export の完全運用

## 次の主戦場としての意味

現時点の本プロジェクトでは、Phase 2 はすでに本格進行中であり、後半入口〜中盤に入っているフェーズである。

理由:

- 基本導線に加え、snapshot / series 再設計の土台実装まで進んでいる
- `player_detail` / `player_edit` / `school_detail` の主要な実運用導線が進んでいる
- relation 系編集UI、年度進行 core、管理コード土台が成立し、Phase 2 的な拡張の中心部が実装済みになっている
- 残る価値の高い作業が、OCR 本体 MVP、守備位置図 UI、一覧検索強化、管理コードの本格展開に集中している

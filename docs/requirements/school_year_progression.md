# 学校年度進行（1年経過）仕様メモ

## 目的
- `school_detail` 上で学校全体の年度進行を管理する「1年経過」機能の仕様を整理する。
- 学校情報の年度進行、所属選手の現在学年、`player_detail` の snapshot 時点運用を役割分担したうえで接続する。
- まずは docs で仕様を固め、後続実装で DB / API / UI の責務がぶれない状態を作る。

## 前提
- 選手 snapshot 再設計は案Aを採用済み。
- 親は `player_series`、子は `players` であり、`players` は各時点 snapshot を保持する。
- `player_detail` は同一選手の複数時点を切り替える画面として進化中である。
- `school_detail` の所属選手一覧は `player_series` 単位へ移行する。

## この機能で扱う責務

### 学校進行の責務
- 学校が現在どの年度にいるかを管理する。
- 学校に所属する選手の「現在学年」を管理する。
- 学校一覧や学校詳細の roster 表示を、現時点の学校運用に合わせて見せる。

### snapshot の責務
- 入学時、1年夏大会後、卒業時など、特定時点の能力・起用・特殊能力・変化球を保存する。
- OCR 証跡や能力変化の履歴を、時点付きで残す。
- `player_detail` では snapshot を切り替え、個別に作成・編集する。

### 重要な整理
- 「1年経過」は school 全体の進行であり、snapshot の自動生成とは別概念とする。
- `1年経過` を押しても、既存 snapshot を大量自動生成しない。
- 既存 snapshot の `snapshot_label` を school 進行に合わせて自動で書き換えない。

## 学校側で持つ進行情報

### `schools` に持つ進行情報
- `start_year`
  - この学校データの起点年度。
  - 既存どおり保存値として扱う。
- `current_year`
  - 現在この学校がいる年度。
  - `1年経過` により更新される保存値として扱う。
- `elapsed_years`
  - `current_year - start_year` で導出する表示値。
  - 初期方針では保存せず、表示時導出でよい。

### 命名と保存方針の推奨
- 既存 `start_year` / `current_year` を継続利用する。
- `elapsed_years` は requirements / API レスポンス上の表示値として定義し、DB 保存は必須にしない。
- 将来的に集計や履歴用途で必要になった場合のみ、キャッシュ列や履歴テーブルを検討する。

## 選手側で持つ学校進行用の現在学年

### 推奨方針
- school 進行で一括更新する「現在学年」は、historical snapshot 側の `players.grade` ではなく、school 運用用の別責務として扱う。
- 初期案としては `player_series.current_grade` または `player_series.school_grade` のような列を検討する。

### この分離を推奨する理由
- snapshot 側の `grade` は、本来その snapshot 時点と整合する歴史データである。
- school 進行で snapshot の `grade` を一括更新すると、`snapshot_label` と `grade` の意味がずれやすい。
- `school_detail` 一覧で見たいのは「今この学校で何年生か」であり、これは current roster 情報として管理する方が自然である。

### 将来的に追加検討する関連項目
- `is_graduated`
- `graduated_year`
- `roster_status` (`active` / `graduated`)

上記は `3年 -> 卒業扱い` を school 進行で扱う場合の候補であり、初期実装時点では未確定とする。

## `1年経過` ボタンの基本仕様

### 配置想定
- `school_detail` の学校サマリー付近に配置する。
- 破壊的ではないが一括更新なので、押下前の確認 UI を持たせる。

### 押下時に起きること
1. `schools.current_year` を `+1` する。
2. `elapsed_years` 表示が `+1` される。
3. その学校に属する現役選手の「現在学年」を一括で `+1` する。
4. school_detail の所属選手一覧を再表示し、更新後学年を反映する。

### 初期仕様としてやらないこと
- 各選手の snapshot を自動生成しない。
- `player_detail` の 9時点ボタンを school 進行に応じて自動で埋めない。
- 特殊能力、変化球、サブポジションなど relation 系を school 進行で自動変更しない。

## school 進行と `player_detail` snapshot 時点の関係

### 役割分担
- school 進行:
  - 「今この学校が何年度で、各選手が何年生か」を管理する。
- snapshot 時点:
  - 「その選手をどの瞬間のデータとして保存したか」を管理する。

### 初期方針
- `1年経過` では snapshot を自動生成しない。
- `player_detail` の時点ボタンは常に正式9時点を固定表示する。
- どの時点を作るかは、引き続き個別選手ごとに管理する。

### 補助表示として将来追加できるもの
- school 進行に対する「今の推奨時点」
- school 進行に対する「次に登録すべき時点候補」
- school 進行と latest snapshot の差分警告
  - 例: `学校は2年夏まで進行済み / 最新snapshotは1年秋大会後`

## 推奨初期案

### 採用推奨
- `1年経過` は学校情報と選手の現在学年だけを一括更新する。
- snapshot は自動生成しない。
- `player_detail` の時点ボタンは従来どおり正式9時点を常時表示する。
- 時点登録は個別選手ごとの判断で行う。

### この方針のメリット
- 大量自動生成を避けられ、誤作成リスクが低い。
- `player_detail` の snapshot 設計を壊さずに school 管理を追加できる。
- `school_detail` 側の責務が「学校進行と roster 管理」に限定され、実装を段階化しやすい。

## `player_register` との関係

### school_detail 起点の初期値
- `school_id`
  - school_detail から遷移する場合は固定初期値とする。
- `prefecture`
  - 学校の都道府県を初期値候補として使う。
  - ただし選手個別出身地として上書き可能にする。
- `admission_year`
  - 学校の `current_year` と、登録しようとしている current grade または選択 snapshot の学年から初期値を導出する。
  - 例:
    - 1年生として登録するなら `admission_year = current_year`
    - 2年生として登録するなら `admission_year = current_year - 1`
    - 3年生として登録するなら `admission_year = current_year - 2`

### 導線整理
- 新規選手作成
  - `player_series` を新規作成する導線。
  - school 管理上の current grade 初期値もここで持たせる。
- 既存選手への新規時点追加
  - `player_detail` 側から `players` snapshot を追加する導線。
  - school current grade とは別責務として扱う。

## `school_detail` 一覧との関係

### 一覧の基本方針
- 一覧は `player_series` 単位で 1選手1行とする。
- school_detail 一覧の主表示学年は、latest snapshot の学年ではなく school 管理上の current grade を優先する。
- メインポジションや選手種別など snapshot 依存の表示値は、latest snapshot から採用する。

### school 進行と latest snapshot がずれる場合
- 初期方針では、ずれは許容する。
- ただし UI では「最新snapshot時点」も補助表示できるようにしておく。
- 学年は school current grade、snapshot 時点は履歴、という役割分担を崩さない。

## フェーズ位置づけ

### 着手順の推奨
1. snapshot 再設計と `player_detail` 時点切替を安定させる。
2. `school_detail` 所属選手一覧を `player_series` 単位へ揃える。
3. `1年経過` の requirements / DB 追加方針 / API 追加方針を確定する。
4. core school progression を実装する。
5. その後、school 進行に連動した推奨時点表示などの補助 UI を検討する。

### relation 系編集UI・守備位置図UIとの前後関係
- `1年経過` は単なる UI 微修正ではなく、school 管理と player 運用の接続仕様である。
- そのため、relation 系編集UIや守備位置図UIより先に、少なくとも仕様整理と DB / API 責務の確定を行う価値が高い。
- ただし、実装着手は snapshot 再設計の土台が安定してから行う。

## 未確定点・今後決めるべき点

### 1. 現在学年をどこに持つか
- `player_series.current_grade`
- 別の school membership テーブル

現時点では `player_series` に持つのが最小構成だが、転校や複数所属を考えるなら membership 化の余地がある。

### 2. 3年の卒業処理
- `3 -> 卒業済み` として roster から外すか
- `3年` のまま卒業フラグだけ立てるか
- `graduation` snapshot 作成を必須にするか

初期案では school 進行と graduation snapshot 自動生成は切り離す。

### 3. `players.grade` との整合
- snapshot 側 `grade` を将来的に完全導出値に寄せるか
- 互換維持のため DB 列を残しつつ school 管理用 current grade を別持ちするか

### 4. school current year と game 内イベントの粒度
- `1年経過` を年度単位に固定するか
- 将来的に `夏大会後へ進む` `秋大会後へ進む` など学内年次より細かい進行を持つか

初期案では年度単位に限定する。

## なぜ今は docs 化に留めるのが自然か
- snapshot 再設計と `player_detail` の時点切替がまだ進化中であり、school 進行を先に実装すると責務が再度ぶれやすい。
- school 進行は `grade` の保存場所や `school_detail` 一覧の基準値に影響するため、先に要件整理をしておく方が安全である。
- snapshot 自動生成まで含めると一気に複雑化するため、初期段階では school 管理と current grade 管理に責務を絞るのが自然である。

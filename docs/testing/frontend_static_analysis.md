# Frontend static analysis and deletion safety

## 目的

Frontend の `npm run check:frontend` は ES module として構文確認を行う。一方、`npm run lint:frontend` は ESLint による静的解析で、構文としては成立しても実行時に壊れる未定義参照を検出する。

今回の基盤では `no-undef` を error として扱うため、`ABILITY_FILTER_BY_KEY` のように定義だけを削除して参照が残った場合、browser 実行前に検出できる。

責務コメントは依存関係を読みやすくする補助であり、安全性を保証する根拠ではない。削除や移動を行う場合は、必ず機械的な参照検索と lint / verify を併用する。

## 実行コマンド

```bash
npm run check:frontend
npm run lint:frontend
npm run verify:all
```

## 削除前チェック

定数・関数・import・export・module を削除する前に、repository 全体で参照を確認する。

```bash
rg "\b識別子名\b" frontend backend tests scripts
```

各削除対象は次のいずれかへ分類する。

```text
- pure moduleへ移動済み
- 別名へ置換済み
- 完全に未使用
- UI側で継続使用
- backend側で使用
- test側で使用
- legacy互換のため維持
```

## Codex最終報告

削除を含む場合、最低限次を報告する。

```text
- 削除したtop-level定義
- 旧参照箇所
- 置換先
- 残存参照
- 意図的に残した定義
```

Programmatic PR 作成では GitHub の PR template が自動挿入されない場合があるため、今後の Codex prompt でも Deletion safety と Browser smoke test の確認事項を明示する。

## コメント方針

- why を記載する。
- source of truth を記載する。
- 複数責務・非自明な互換処理だけを対象にする。
- obvious な処理にはコメントを追加しない。
- コメントと実装を同時に更新する。

## Browser smoke test

Page script を変更した PR では最低限、次を確認する。

```text
- 対象ページが表示される
- 検索formが表示される
- 一覧が表示される
- consoleにReferenceErrorがない
- 変更したUIを1回操作する
- URL state変更ならreset / back / forwardを確認する
```

## no-unused-vars 監査

Phase 6.4-4 導入時点では `npx eslint "frontend/js/**/*.{js,mjs}" --rule "no-unused-vars: warn" --max-warnings=9999` により、既存の未使用変数 warning が16件確認された。分類は、API wrapper / page script の未使用 catch 変数、`player_detail.js` の legacy・補助関数・未使用定数、`players.js` / `player_edit.js` の未使用 catch 変数である。

挙動への影響を切り分けるため、この PR では `no-unused-vars` を有効化しない。将来、独立した cleanup task として参照調査・browser 確認込みで整理する。

## 将来方針

Playwright 等の browser 自動テストは今回導入しない。OCR MVP 着手前、または公開準備時に導入要否を再評価する。

## Summary

## Scope / Risk

## Verification

## Deletion safety

- [ ] top-level definitionを削除していない
- [ ] 削除した場合、repository全体で参照を検索した
- [ ] 削除対象の置換先・残存参照を確認した

## Browser smoke test

Frontend page scriptを変更した場合:

- [ ] 対象ページが表示される
- [ ] consoleにReferenceErrorがない
- [ ] 変更したUIを操作した
- [ ] URL state変更時はreset / back / forwardを確認した
- [ ] 対象外。理由を本文へ記載した

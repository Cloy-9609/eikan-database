# サーバーの起動方法（Phase1 時点）
1. ターミナルにて `npm run dev` を入力
2. ブラウザで `http://localhost:3000/pages` または `http://localhost:3000/pages/schools.html` に入る。
3. 取り敢えず F12 にてコンソールを開き、問題の有無を確認する。

補足:
- backend 変更時の自動再起動を使う場合は `npm run dev` だけを起動する。
- `node backend/app.js` と `npm run dev` を同時に起動すると、同じ port を取り合うため避ける。
- watch なしで単純起動したい場合のみ `npm start` を使う。

## 修正プロンプトをするときの有効なテンプレ
### 確認について
- 今回はローカルサーバー起動や HTTP 200 確認までは不要です
- コード差分、構造説明、影響範囲の整理、必要なら構文チェックのみ行ってください
- 実ブラウザでの最終見た目確認はユーザー側で行います
- そのため、確認結果には
  - どのCSS/JS/HTMLをどう変えたか
  - どの既存仕様を維持したか
  - 実ブラウザで確認すべきポイント
  を記載してください

### よく使うコマンド
- `git remote prune origin`  
・頻繁にクラウド上で更新がかかるため、手動でリモートブランチを更新する必要があるときに使用する。

- 
`
  git archive \
    --format=zip \
    --output="../eikan-database-source-$(date +%Y%m%d-%H%M).zip" \
    HEAD
`
・node_moduleを含まない、軽量なバックアップのzipファイルを作成するときに使用する。
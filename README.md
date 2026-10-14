# BAKA ARCADE — くだらない。でも、やめられない。
Vite + TypeScript(素のCanvas) + Matter.js / Cloudflare Workers(静的アセット + Durable Object SQLite)。
- 開発: `npm run dev`（フロント）、`npm run build && npx wrangler dev --port 8799`（API込み）
- テスト: `npm run typecheck` / `npx playwright test`（BASE_URL でURL切替）
- 新ゲーム追加: `src/games/<id>/{meta,index,config}.ts` を作り `src/core/registry.ts` に1行＋`worker/index.ts` の LIMITS に追記
- デプロイ: main → 本番 `baka-arcade`、develop → `baka-arcade-dev`（GitHub Actions。Secrets: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID）
- 設計メモ: BP=ゲーム内専用・換金不可（1日上限あり）。ランキングはサーバー発行セッション＋経過時間で検証。計測は匿名・軽量。

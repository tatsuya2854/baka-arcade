# 画像の作り方・入れ方（BAKA ARCADE）
方針: 「見た目は超リアル。やることは超くだらない。」写真品質の画像を ChatGPT で作って差し替える。絵文字・スタンプ風・簡易図形は使わない。
1. `npm run art` … 生成済み/未生成の一覧（新ゲームの meta を足すと雛形が自動追加される）
2. `npm run art:prompts` → `art/PROMPTS.md` のプロンプトを ChatGPT に1枚ずつ貼る（世界観ごと同じ会話で作ると光が揃う）
3. できた画像を `art/<slug>/<枠名>.png`（例 `art/egg-landing/key.png`）に保存
4. `npm run art:build` … WebP/AVIF・2解像度に最適化 → `public/img/`、ゲームが読む `src/generated/imagemap.json`、OGP を自動更新
5. `npm run deploy`
枠: key(1024x1536 開始画面・カード) / bg(同 背景) / hero・item(1024x1024 透過) / result_good・result_bad(1536x1024 結果画面・OGP)
画像が無い枠は「画像未生成」と明示される（絵文字に戻さない）。`npm run art:clean` で未使用ファイルを列挙。
**新作は1本ずつ**: 企画→先行事例調査→ビジュアル設計→ChatGPT画像→実装→スマホ検証→SNS共有設計→公開。10本まとめて作らない。

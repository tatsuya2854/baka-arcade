# 新規ゲーム担当エージェント向け追加ブリーフ（AGENTS_BRIEF.md も読むこと）
対象: egg / toothpaste / usb / ketchup / tissue。編集してよいのは `src/games/<id>/` のみ（meta.ts は編集禁止・既に定義済み。title/command/rares/slug を使う）。
実装物: `index.ts`(GameModule)・`config.ts`・`art.ts`(結果アート)・`demo.ts`(開始画面ループ・既にスタブあり、置き換える)。

## 品質基準（最重要）
- 「High Quality × Realistic × Minimal × Stupid」。くだらないのはゲームの目的であって制作品質ではない。**漫画的/チープなトゥーン禁止**。写実寄りの質感（陰影のグラデーション、ハイライト、接地影、素材感: 金属・プラスチック・液体・紙・卵の殻 等）。ミニマルで余白のある背景（キッチンカウンター/洗面台/デスク等、そのゲーム専用の世界観）。タイポは太く読みやすい日本語、数値は大きく。
- 1ゲーム1世界。他ゲームのテンプレ背景の使い回し禁止。
- 技術は自分で選ぶ（Canvas2D の高品質描画 / Three.js(`three` 導入済み・動的チャンクのみ) / 自前の簡易物理 / matter-js）。**iPhone Safari で60fps**。pixelRatio最大2、毎フレームnew回避、影マップ多用禁止。WebGL を使う場合は失敗時に2D描画へフォールバック、destroy で dispose + forceContextLoss。リトライ10回でリークしないこと。
- 操作は1つ（タップ/長押し/ドラッグ/スワイプのいずれか）。片手親指。誤タップ防止（touch-action:none、スクロール/拡大が操作を邪魔しない）。1プレイ5〜20秒。失敗の理由が見た目で分かる。
- 触った瞬間の気持ちよさ: 操作そのものに連続フィードバック（squash&stretch・微振動の画面揺れ・粒子・接触音・hit stop・スローモ・ズームを必要最小限で）。振動は `src/core/haptic.ts` の haptic()（未対応端末では無視される）。演出過多にしない（Apple製品のように自然に）。
- 音: `ctx.audio.sfx(...)` の既存音 + 必要なら自前に WebAudio で追加（audio.ctx / audio.master を使って短い合成音。ミュート時は audio.muted を尊重）。最初の入力で ctx.audio.unlock() と ctx.started()。BGMは基本なし（環境音程度）。
- スコア: 0〜1000 の整数「点」。精度で決まる決定論的な計算（ランダム禁止）。ctx.finish({score, scoreText:`${n}点`, shareText, durationMs, art})。durationMs は3000以上になるように、実際のプレイ時間を正しく測る（サーバー検証あり: score ≤ 400点×秒+8）。
- **結果アート art: ResultArt（必須）**: 成功も失敗も投稿したくなる。title(称号10種以上・精度/状況で分岐、失敗にも面白い称号)、comment(一言)、facts(実測値: 例 誤差 0.8mm / 出した長さ 10.3cm)、rare(meta.rares の id。実プレイ条件で判定)、postVariants(3つ。例『10.3cm出した。0.3cmの誤差で人生が終わった。』)、draw(g,w,h,t)（結果を象徴する絵。ポスター風、任意サイズで破綻しない、アニメ可）、replay（物理的な瞬間がある場合: 最後2〜6秒のトレースを記録し、replay.draw(g,w,h,t)でスロー再生できる）。
- 開始画面ループ `demo.ts`: `export const demo = (g,w,h,t)=>{...}`（軽量Canvas2D。対象物＋指(👆風)のタップ/長押し/ドラッグ動作を1〜3秒ループで見せる）。説明文は不要。
- 検証: `npx tsc --noEmit` 0エラー、`npm run build` 成功。Playwright(webkit iPhone13 と chromium)で `npx vite --port <割当ポート>` の `dev.html?game=<id>` のスクリーンショットを撮って**目視で品質確認**（安っぽくないか、対象物が何か一目で分かるか）。成功と失敗の両ケースで window.__result と art.draw を確認。コンソールエラー0。自分用検証スクリプトは scratchpad 配下にサブディレクトリを作って置く（他エージェントと衝突しない）。git commit しない。最後に短いレポート（実装・技術選定・サイズ・未確認点）。

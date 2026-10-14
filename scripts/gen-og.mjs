// OGP画像(PNG 1200x630)を生成: node scripts/gen-og.mjs  ※XはSVGのog:imageを表示しないためPNG
import { chromium } from '@playwright/test';
const G = [['default', 'BAKA ARCADE', 'くだらない。でも、やめられない。', '#ff3d81', '🧓'], ['ojisan-stack', 'おじさんを積め！', 'おじさんを、落として積め。', '#ff3d81', '🧓'], ['fart-elevator', 'おならエレベーター', 'タップで、空まで飛べ。', '#39ff88', '💨'],
  ['save-the-hair', 'ハゲを守れ！', '長押しで、最後の一本を守れ。', '#46c8ff', '🌬️'], ['nosehair-pull', '鼻毛を抜け！', '長押しして、ベストで離せ。', '#ffb02e', '👃'], ['dont-press', '絶対に押すなボタン', '絶対に、押すな。', '#ff2b2b', '🔴'],
  ['egg-landing', '目玉焼きを落とせ', '卵を、フライパンの真ん中に落とせ。', '#ffc83d', '🍳'],
  ['toothpaste-10cm', '歯磨き粉10.0cm', '10.0cmだけ、歯磨き粉を出せ。', '#46e0ff', '🪥'],
  ['usb-insert', 'USBを一発で', 'USBを、一発で挿せ。', '#8a7bff', '🔌'],
  ['ketchup-pour', 'ケチャップ黄金比', 'ケチャップを、ちょうどの量だけ出せ。', '#ff4a3d', '🍅'],
  ['tissue-one', 'ティッシュ1枚だけ', 'ティッシュを、1枚だけ取れ。', '#ffffff', '🧻']];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const [slug, title, cmd, c, e] of G) {
  await p.setContent(`<body style="margin:0;width:1200px;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:'Hiragino Sans',sans-serif;color:#fff;background:radial-gradient(circle at 50% 30%,${c}55,#07060f 70%)">
  <div style="font-size:190px;line-height:1">${e}</div><div style="font-size:${slug === 'default' ? 120 : 92}px;font-weight:900;text-shadow:0 0 30px ${c}">${title}</div>
  <div style="font-size:48px;font-weight:800;color:#ffd93d">${cmd}</div><div style="position:absolute;bottom:28px;font-size:30px;font-weight:900;color:${c};letter-spacing:.1em">BAKA ARCADE</div></body>`);
  await p.screenshot({ path: `public/og/${slug}.png` });
}
await b.close();

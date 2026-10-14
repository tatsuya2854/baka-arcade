// OGP/共有画像(PNG 1200x630)を生成: node scripts/gen-og.mjs   ※XはSVGのog:imageを表示しないためPNG
// art/<slug>/key.* があればそれを主役に使う。無ければ、絵文字なしの文字だけのカード（仮画像）。
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
const ROOT = path.resolve(import.meta.dirname, '..');
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/concepts.json'), 'utf8'));
const CMD = { 'ojisan-stack': 'おじさんを、落として積め。', 'fart-elevator': 'タップで、空まで飛べ。', 'save-the-hair': '長押しで、最後の一本を守れ。', 'nosehair-pull': '長押しして、ベストで離せ。', 'dont-press': '絶対に、押すな。', 'egg-landing': '卵を、フライパンの真ん中に落とせ。', 'toothpaste-10cm': '10.0cmだけ、歯磨き粉を出せ。', 'usb-insert': 'USBを、一発で挿せ。', 'ketchup-pour': 'ケチャップを、ちょうどの量だけ出せ。', 'tissue-one': 'ティッシュを、1枚だけ取れ。' };
const find = (slug, id) => ['png', 'webp', 'jpg', 'jpeg'].map(e => path.join(ROOT, 'art', slug, `${id}.${e}`)).find(p => fs.existsSync(p));
const uri = p => { const e = path.extname(p).slice(1).replace('jpg', 'jpeg'); return `data:image/${e};base64,${fs.readFileSync(p).toString('base64')}`; };
const list = [['default', 'BAKA ARCADE', '見た目は超リアル。やることは超くだらない。'], ...Object.entries(C.games).map(([s, g]) => [s, g.title, CMD[s] ?? ''])];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
let real = 0;
for (const [slug, title, cmd] of list) {
  const src = slug === 'default' ? null : (find(slug, 'result_good') ?? find(slug, 'key')); // 横長の結果画像を優先
  const bg = src ? `<img src="${uri(src)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : '';
  if (src) real++;
  await p.setContent(`<body style="margin:0;width:1200px;height:630px;position:relative;overflow:hidden;font-family:'Hiragino Sans',sans-serif;color:#f3f1ec;background:${src ? '#0b0b0c' : 'repeating-linear-gradient(135deg,#121214 0 22px,#16161a 22px 44px)'}">
  ${bg}<div style="position:absolute;inset:0;background:linear-gradient(90deg,#0b0b0cee 0,#0b0b0c99 45%,transparent 80%)"></div>
  <div style="position:absolute;left:70px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:18px;max-width:760px">
  <div style="font-size:22px;letter-spacing:.34em;color:#8e8b84">BAKA ARCADE</div>
  <div style="font-size:${slug === 'default' ? 110 : 84}px;font-weight:800;line-height:1.05">${title}</div>
  <div style="font-size:36px;font-weight:500;color:#d6d3cb;line-height:1.4">${cmd}</div></div>
  ${src ? '' : '<div style="position:absolute;right:30px;bottom:22px;font-size:16px;letter-spacing:.2em;color:#5f5d58">画像未生成</div>'}</body>`);
  await p.screenshot({ path: path.join(ROOT, `public/og/${slug}.png`) });
}
await b.close(); console.log(`OGP ${list.length} 枚（実画像使用 ${real}）`);

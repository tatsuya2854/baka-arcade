// 画像パイプライン: node scripts/art.mjs <status|prompts|sync|build|clean>
//  art/concepts.json  … 世界観と各画像の中身（唯一の元データ）
//  art/<slug>/<slot>.png|webp|jpg … ChatGPTで作った原画を置く場所
//  build → public/img/<slug>/…（WebP/AVIF・2解像度・ハッシュ付き）＋ src/generated/imagemap.json（ゲームが自動で読む）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const ART = path.join(ROOT, 'art'), OUT = path.join(ROOT, 'public/img'), MAP = path.join(ROOT, 'src/generated/imagemap.json');
const EXT = ['.png', '.webp', '.jpg', '.jpeg', '.avif'];
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const C = readJson(path.join(ART, 'concepts.json'));
const kindOf = id => id.split('_')[0];
const WIDTHS = { key: [540, 1080], bg: [540, 1080], result: [640, 1280], hero: [360, 720], item: [360, 720] };
const srcFile = (slug, id) => { for (const e of EXT) { const p = path.join(ART, slug, id + e); if (fs.existsSync(p)) return p; } return null; };
const fullPrompt = (slug, id) => {
  const g = C.games[slug], k = C.kinds[kindOf(id)];
  return `${k.tpl.replace('{subject}', g.slots[id])}\nSetting/world: ${g.world}. Lighting: ${g.light}.\nStyle: ${C.style}\nOutput size: ${k.size} (${k.ratio}).`;
};

function sync() { // src/games/*/meta.ts の slug が concepts.json に無ければ雛形を追加
  const dir = path.join(ROOT, 'src/games'); let added = 0;
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'meta.ts'); if (!fs.existsSync(f)) continue;
    const t = fs.readFileSync(f, 'utf8'), slug = /slug:\s*'([^']+)'/.exec(t)?.[1], title = /title:\s*'([^']+)'/.exec(t)?.[1];
    if (slug && !C.games[slug]) {
      C.games[slug] = { title, world: 'TODO: 世界観（場所・時間帯）を英語で', light: 'TODO: 光の向きと質', slots: Object.fromEntries(['key', 'bg', 'hero', 'item', 'result_good', 'result_bad'].map(s => [s, 'TODO: 何を写すか（英語）'])) };
      added++; console.log('追加:', slug);
    }
  }
  if (added) fs.writeFileSync(path.join(ART, 'concepts.json'), JSON.stringify(C, null, 2) + '\n');
  return added;
}

function status() {
  let done = 0, total = 0, todo = 0;
  for (const [slug, g] of Object.entries(C.games)) {
    const row = Object.keys(g.slots).map(id => { total++; const ok = srcFile(slug, id); if (ok) done++; if (/^TODO/.test(g.slots[id])) todo++; return `${id}:${ok ? '済' : '未'}`; });
    console.log(slug.padEnd(18), row.join('  '));
  }
  console.log(`\n生成済み ${done} / ${total}（未生成の間は画面に「画像未生成」と表示されます）${todo ? `\n※ ${todo} 枠は中身が TODO（concepts.json を埋めてください）` : ''}`);
}

function prompts() {
  let md = `# 画像生成プロンプト集（自動生成: node scripts/art.mjs prompts）\n\nChatGPT の画像生成に1枚ずつ貼る。できた画像は **art/<slug>/<枠名>.png** に保存 → \`npm run art:build\` で反映。\n- 透過が必要な枠（hero/item）は、透過PNGで出せなければ白背景のままでOK（build が白を抜く。完全ではないので可能なら透過で）。\n- 1枚ずつ、世界観が揃うよう同じ会話の中で作ると光が揃いやすい。\n- 文字・ロゴ・絵文字は入れさせない（プロンプトに含み済み）。\n`;
  for (const [slug, g] of Object.entries(C.games)) {
    md += `\n---\n## ${g.title}  \`${slug}\`\n世界観: ${g.world} ／ 光: ${g.light}\n`;
    for (const id of Object.keys(g.slots)) {
      const k = C.kinds[kindOf(id)];
      md += `\n### ${slug}/${id}  ${srcFile(slug, id) ? '✅生成済み' : '⬜未生成'}\n保存先: \`art/${slug}/${id}.png\` ／ ${k.size} ${k.alpha ? '／ 透過' : ''}\n\`\`\`\n${fullPrompt(slug, id)}\n\`\`\`\n`;
    }
  }
  fs.writeFileSync(path.join(ART, 'PROMPTS.md'), md); console.log('art/PROMPTS.md を更新');
}

async function whiteToAlpha(buf) { // 画像の縁から白を塗りつぶして透過化（透過PNGで出せなかった場合の応急処置）
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info, seen = new Uint8Array(w * h), st = [];
  const white = i => data[i * 4] > 238 && data[i * 4 + 1] > 238 && data[i * 4 + 2] > 238;
  const push = i => { if (!seen[i] && white(i)) { seen[i] = 1; st.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (st.length) { const i = st.pop(), x = i % w; data[i * 4 + 3] = 0; if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < w * h - w) push(i + w); }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).blur(0.6).png().toBuffer();
}

async function build() {
  const map = {}, keep = new Set(); let made = 0;
  const seenHash = new Map();
  for (const [slug, g] of Object.entries(C.games)) {
    for (const id of Object.keys(g.slots)) {
      const f = srcFile(slug, id); if (!f) continue;
      const raw = fs.readFileSync(f), hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 8);
      if (seenHash.has(hash)) console.warn(`⚠ 重複: ${slug}/${id} は ${seenHash.get(hash)} と同じ画像です`); seenHash.set(hash, `${slug}/${id}`);
      const k = C.kinds[kindOf(id)], meta0 = await sharp(raw).metadata();
      const [tw, th] = k.size.split('x').map(Number), ar = meta0.width / meta0.height;
      if (Math.abs(ar - tw / th) > 0.06) console.warn(`⚠ 縦横比: ${slug}/${id} は ${meta0.width}x${meta0.height}（期待 ${k.ratio}）。cover で切り抜きます`);
      if (meta0.width < tw * 0.6) console.warn(`⚠ 解像度不足: ${slug}/${id} ${meta0.width}px（期待 ${tw}px 前後）`);
      let src = raw, alpha = false;
      if (k.alpha) { alpha = !!meta0.hasAlpha; if (!alpha) { src = await whiteToAlpha(raw); alpha = true; console.log(`  白抜き処理: ${slug}/${id}`); } }
      const widths = WIDTHS[kindOf(id)] ?? [540, 1080], dir = path.join(OUT, slug); fs.mkdirSync(dir, { recursive: true });
      for (const w of widths) for (const fmt of ['webp', 'avif']) {
        const name = `${id}.${hash}-${w}.${fmt}`, p = path.join(dir, name); keep.add(p);
        if (fs.existsSync(p)) continue;
        const h = Math.round(w * th / tw);
        let s = sharp(src).resize(w, h, { fit: k.alpha ? 'inside' : 'cover', withoutEnlargement: false });
        s = fmt === 'webp' ? s.webp({ quality: k.alpha ? 86 : 80, alphaQuality: 90 }) : s.avif({ quality: 55, effort: 3 });
        await s.toFile(p); made++;
      }
      (map[slug] ??= {})[id] = { v: hash, widths, w: tw, h: th, alpha };
    }
  }
  fs.mkdirSync(path.dirname(MAP), { recursive: true }); fs.writeFileSync(MAP, JSON.stringify(map, null, 1) + '\n');
  let removed = 0; // 使われなくなった出力を掃除
  if (fs.existsSync(OUT)) for (const d of fs.readdirSync(OUT)) { const dd = path.join(OUT, d); for (const f of fs.readdirSync(dd)) { const p = path.join(dd, f); if (!keep.has(p)) { fs.rmSync(p); removed++; } } if (!fs.readdirSync(dd).length) fs.rmdirSync(dd); }
  console.log(`build 完了: 新規出力 ${made} 枚 / 掃除 ${removed} 枚 / 登録 ${Object.values(map).reduce((a, m) => a + Object.keys(m).length, 0)} 枠`);
}

function clean() { // art/ 内の「どの枠にも対応しない」ファイルを列挙（削除はしない）
  let n = 0;
  for (const d of fs.existsSync(ART) ? fs.readdirSync(ART) : []) {
    const dd = path.join(ART, d); if (!fs.statSync(dd).isDirectory()) continue;
    for (const f of fs.readdirSync(dd)) { const id = path.parse(f).name; if (!C.games[d]?.slots[id]) { console.log('未使用:', `art/${d}/${f}`); n++; } }
  }
  console.log(n ? `${n} 件の未使用ファイル（手動で整理してください）` : '未使用ファイルなし');
}

export { C, kindOf, srcFile, fullPrompt, ART };
if (process.argv[1] === import.meta.filename) {
const cmd = process.argv[2] ?? 'status';
if (cmd === 'sync') sync(); else if (cmd === 'status') { sync(); status(); } else if (cmd === 'prompts') { sync(); prompts(); } else if (cmd === 'build') { sync(); await build(); } else if (cmd === 'clean') clean(); else console.log('usage: status | prompts | sync | build | clean');

}

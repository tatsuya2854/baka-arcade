// ChatGPT(Codex)の画像生成で、未生成の枠を自動で作る: node scripts/art-gen.mjs [slug[/slot] ...] [--limit N] [--force]
// ATELIER AI で確かめた方法: codex exec --json の thread_id → ~/.codex/generated_images/<thread_id>/ から画像を回収。
// ChatGPTの契約枠を使う（API従量課金なし）。上限に当たったら止まる。成果は art/<slug>/<slot>.png → npm run art:build で反映。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { C, kindOf, srcFile, fullPrompt, ART } from './art.mjs';

const args = process.argv.slice(2), force = args.includes('--force');
const li = args.indexOf('--limit'), limit = li >= 0 ? Number(args[li + 1]) : Infinity;
const wanted = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--limit');
const jobs = [];
for (const [slug, g] of Object.entries(C.games)) for (const id of Object.keys(g.slots)) {
  if (/^TODO/.test(g.slots[id])) continue;
  if (wanted.length && !wanted.some(w => w === slug || w === `${slug}/${id}`)) continue;
  if (!force && srcFile(slug, id)) continue;
  jobs.push([slug, id]);
}
const run = (cmd, argv, input) => new Promise(res => {
  const p = spawn(cmd, argv, { env: { ...process.env, OBSIDIAN_VAULT_READONLY: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('close', code => res({ code, out, err })); p.stdin.end(input);
});
const GEN = path.join(os.homedir(), '.codex/generated_images');
let ok = 0;
console.log(`生成予定 ${Math.min(jobs.length, limit)} 枚（未生成 ${jobs.length}）`);
for (const [slug, id] of jobs.slice(0, limit)) {
  const k = C.kinds[kindOf(id)];
  const prompt = `Use your image generation tool to create exactly ONE image from the spec below. Output a ${k.ratio} image (${k.size}). ${k.alpha ? 'Transparency is not available: use a pure flat white #FFFFFF background with no floor shadow and no vignette.' : ''} Do not write or copy any files. When finished, reply with just "done".\n\n${fullPrompt(slug, id)}`;
  const t0 = Date.now();
  const r = await run('codex', ['exec', '-m', 'gpt-6-luna', '-s', 'read-only', '--skip-git-repo-check', '--json', '-'], prompt);
  const tid = r.out.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).find(e => e?.type === 'thread.started')?.thread_id;
  const dir = tid && path.join(GEN, tid), files = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.(png|webp|jpe?g)$/i.test(f)).sort() : [];
  if (!files.length) {
    const text = (r.out + r.err).slice(-600);
    console.error(`✗ ${slug}/${id} 画像なし（${Math.round((Date.now() - t0) / 1000)}秒）`);
    if (/limit|上限|usage|quota|rate/i.test(text)) { console.error('→ 使用上限の可能性。ここで止めます。時間をおいて再実行（済みの枠は飛ばします）:\n' + text); break; }
    continue;
  }
  fs.mkdirSync(path.join(ART, slug), { recursive: true });
  fs.copyFileSync(path.join(dir, files[files.length - 1]), path.join(ART, slug, `${id}.png`)); ok++;
  console.log(`✓ ${slug}/${id}（${Math.round((Date.now() - t0) / 1000)}秒）`);
}
console.log(`完了 ${ok} 枚。反映: npm run art:build`);

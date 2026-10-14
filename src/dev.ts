// 単体確認用: /dev.html?game=stack （本番ビルドには含まれない）。window.__result に結果が入る。
import { AudioEngine } from './core/audio';
import { GAME_LOADERS } from './core/registry';
const id = new URLSearchParams(location.search).get('game') ?? 'stack';
const root = document.getElementById('root')!;
const audio = new AudioEngine();
addEventListener('pointerdown', () => audio.unlock(), { once: true });
let inst: { destroy(): void } | null = null;
async function run() {
  inst?.destroy(); root.innerHTML = '';
  const mod = await GAME_LOADERS[id]();
  inst = mod.start({
    root, audio, unlockedSkins: ['skin_normal', 'skin_blond', 'skin_muscle', 'skin_space', 'skin_legend'], best: 0,
    started: () => console.log('[dev] started'),
    finish: r => { (window as any).__result = r; console.log('[dev] finish', JSON.stringify(r)); const b = document.createElement('button'); b.textContent = `RETRY (${r.scoreText})`; b.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99;font-size:18px;padding:10px'; b.onclick = () => { b.remove(); run(); }; document.body.append(b); },
    exit: () => console.log('[dev] exit'),
  });
}
run();
(window as any).__restart = run;

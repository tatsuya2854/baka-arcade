// 生成画像（bg / hero / item）の読み込みと白抜きスプライトの前処理。読めない枠は null（呼び出し側が従来描画へフォールバック）。
import { loadImg } from '../../core/images';

const SLUG = 'fart-elevator';
export interface Spr { c: HTMLCanvasElement; aspect: number }
export const ASSETS: { bg: HTMLImageElement | null; hero: Spr | null; crow: Spr | null } = { bg: null, hero: null, crow: null };
let loading: Promise<void> | null = null;

/** 不透明部分だけを切り出し、軽量サイズにして色味(右上の陽)を軽く乗せる。 */
function prep(img: HTMLImageElement, H: number): Spr {
  const q = 160, k = q / Math.max(img.width, img.height), sw = Math.max(1, Math.round(img.width * k)), sh = Math.max(1, Math.round(img.height * k));
  const sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
  const sg = sm.getContext('2d', { willReadFrequently: true })!; sg.drawImage(img, 0, 0, sw, sh);
  const d = sg.getImageData(0, 0, sw, sh).data; let x0 = sw, y0 = sh, x1 = 0, y1 = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (d[(y * sw + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = sw - 1; y1 = sh - 1; }
  const bx = x0 / k, by = y0 / k, bw = (x1 - x0 + 1) / k, bh = (y1 - y0 + 1) / k, W = Math.max(8, Math.round(bw / bh * H));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  g.drawImage(img, bx, by, bw, bh, 0, 0, W, H);
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(20,40,110,0.16)'); lg.addColorStop(0.55, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,240,200,0.14)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);   // 陽は右上
  return { c, aspect: W / H };
}

export function loadFartAssets(): Promise<void> {
  return loading ??= Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero'), loadImg(SLUG, 'item')]).then(([bg, hero, item]) => {
    ASSETS.bg = bg; ASSETS.hero = hero ? prep(hero, 300) : null; ASSETS.crow = item ? prep(item, 200) : null;
  });
}

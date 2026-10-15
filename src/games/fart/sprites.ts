// 生成画像（bg / hero / item）の読み込みと白抜きスプライトの前処理。読めない枠は null（呼び出し側が従来描画へフォールバック）。
import { loadImg } from '../../core/images';

const SLUG = 'fart-elevator';
export interface Spr { c: HTMLCanvasElement; aspect: number }
/** 障害物の画像枠。w=描画幅, ax/ay=当たり判定の中心にあたる画像内の位置(0..1) */
export interface ItemSpr { s: Spr; w: number; ax: number; ay: number }
const ITEMS: Record<string, { id: string; w: number; ax: number; ay: number }> = {
  balloon: { id: 'item_balloon', w: 56, ax: 0.5, ay: 0.26 },
  storm: { id: 'item_cloud', w: 124, ax: 0.5, ay: 0.5 },
  plane: { id: 'item_plane', w: 108, ax: 0.5, ay: 0.5 },
  ufo: { id: 'item_ufo', w: 88, ax: 0.5, ay: 0.5 },
  meteor: { id: 'item_meteor', w: 76, ax: 0.6, ay: 0.5 },
};
/** 宇宙の装飾（当たり判定なし・見た目だけ）。w=描画幅 */
const DECOR: Record<string, { id: string; w: number }> = { iss: { id: 'item_iss', w: 170 }, moon: { id: 'item_moon', w: 190 }, planet: { id: 'item_planet', w: 330 } };
export const ASSETS: { bg: HTMLImageElement | null; hero: Spr | null; crow: Spr | null; items: Record<string, ItemSpr | undefined>; decor: Record<string, { s: Spr; w: number } | undefined> } = { bg: null, hero: null, crow: null, items: {}, decor: {} };
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
  return loading ??= Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero'), loadImg(SLUG, 'item'), ...Object.values(ITEMS).map(v => loadImg(SLUG, v.id)), ...Object.values(DECOR).map(v => loadImg(SLUG, v.id))]).then(([bg, hero, item, ...all]) => {
    const its = all.slice(0, Object.keys(ITEMS).length), dcs = all.slice(Object.keys(ITEMS).length);
    Object.keys(DECOR).forEach((k, i) => { const im = dcs[i]; ASSETS.decor[k] = im ? { s: prep(im, 220), w: DECOR[k].w } : undefined; });
    Object.keys(ITEMS).forEach((k, i) => { const im = its[i]; const v = ITEMS[k]; ASSETS.items[k] = im ? { s: prep(im, 140), w: v.w, ax: v.ax, ay: v.ay } : undefined; });
    ASSETS.bg = bg; ASSETS.hero = hero ? prep(hero, 300) : null; ASSETS.crow = item ? prep(item, 200) : null;
  });
}

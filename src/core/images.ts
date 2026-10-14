// 生成画像のローダ。src/generated/imagemap.json は `npm run art:build` が作る。無い枠は null（=画像未生成）。
import map from '../generated/imagemap.json';
type Entry = { v: string; widths: number[]; w: number; h: number; alpha: boolean };
const M = map as Record<string, Record<string, Entry>>;
export const hasImg = (slug: string, id: string) => !!M[slug]?.[id];
const url = (slug: string, id: string, w: number, fmt: string) => `/img/${slug}/${id}.${M[slug][id].v}-${w}.${fmt}`;
export function imgSrc(slug: string, id: string, big = true): string | null {
  const e = M[slug]?.[id]; if (!e) return null;
  return url(slug, id, e.widths[big ? e.widths.length - 1 : 0], 'webp');
}
/** <picture> を返す。画像が無ければ空文字。 */
export function pic(slug: string, id: string, cls = '', alt = ''): string {
  const e = M[slug]?.[id]; if (!e) return '';
  const set = (f: string) => e.widths.map(w => `${url(slug, id, w, f)} ${w}w`).join(', ');
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="100vw"><img class="${cls}" src="${imgSrc(slug, id)}" srcset="${set('webp')}" sizes="100vw" alt="${alt}" decoding="async"></picture>`;
}
/** ゲーム内で使うとき用: 画像を読み込んで返す（無ければ null）。 */
export function loadImg(slug: string, id: string): Promise<HTMLImageElement | null> {
  const s = imgSrc(slug, id); if (!s) return Promise.resolve(null);
  return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = s; });
}
/** 未生成の枠に出す、仮画像であることを明示するパネル。 */
export const placeholder = (label: string) => `<div class="ph"><span>画像未生成</span><i>${label}</i></div>`;
/** 背景を画面いっぱいに cover で描く（画像の縦横比を保つ）。fx/fy は切り抜きの基準位置(0..1)。 */
export function drawCover(g: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, w: number, h: number, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  g.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh);
}
/** 画像を中心(cx,cy)に、高さ h で描く（縦横比を保つ）。回転 rot ラジアン。 */
export function drawSprite(g: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, cx: number, cy: number, h: number, rot = 0, flip = false) {
  const w = img.width / img.height * h; g.save(); g.translate(cx, cy); g.rotate(rot); if (flip) g.scale(-1, 1); g.drawImage(img, -w / 2, -h / 2, w, h); g.restore();
}

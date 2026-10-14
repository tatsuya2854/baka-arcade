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

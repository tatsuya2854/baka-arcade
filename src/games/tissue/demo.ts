// 開始画面のループ: 箱から指でつまんで上へ引く
import { drawScene } from './render';
import { newSnap } from './sim';
const s = newSnap();
export const demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  const p = (t % 2.8) / 2.8, e = p < 0.62 ? (1 - Math.pow(1 - p / 0.62, 2)) : 1;
  s.y0 = 0.22 + e * 1.15; s.held = p < 0.78; s.m = 0; s.v = p < 0.62 ? 2 * (1 - p / 0.62) : 0;
  s.dx = Math.sin(p * 5) * 0.02; s.sw = s.dx * 0.6 - 0.03 * e; s.nextY = 0.3 - 0.1 * (1 - e);
  s.press = p < 0.2 ? 0.6 : 0; s.count = 0; s.hint = 0; s.fall = 0; s.torn = false; s.shx = 0; s.shy = 0;
  if (p >= 0.78) { s.y0 = 1.37 + (p - 0.78) * 2; s.held = false; }
  g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  drawScene(g, w, h, s, t);
  g.restore();
};

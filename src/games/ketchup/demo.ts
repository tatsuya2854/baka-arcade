// 開始画面ループ: ボトルを傾けて皿にケチャップが溜まり、指が長押しする(約2.8秒)
import { buildBackdrop, drawBottle, drawStream, layoutFor, type Layout } from './scene';

let cacheKey = '', cacheL: Layout | null = null, cacheBg: HTMLCanvasElement | null = null;
const FONT = 'sans-serif';
export const demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  if (key !== cacheKey || !cacheL || !cacheBg) { cacheKey = key; cacheL = layoutFor(w, h); cacheBg = buildBackdrop(cacheL, Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)); }
  const L = cacheL, P = 3.2, u = (t % P) / P;
  g.drawImage(cacheBg, 0, 0, w, h);
  const hold = u > 0.12 && u < 0.62;
  const th = u < 0.12 ? u / 0.12 * 0.1 : hold ? Math.min(1, 0.1 + (u - 0.12) * 1.9) : Math.max(0, Math.min(1, 1.0 - (u - 0.62) * 5));
  const flow = hold && th > 0.35 ? 400 + 900 * (th - 0.35) : 0;
  // 溜まったケチャップ(ラジアル+ツヤ)
  const grow = u < 0.12 ? 0 : u < 0.62 ? Math.max(0, (u - 0.22) / 0.4) : 1;
  const R = L.rx * 0.34 * Math.pow(grow, 0.7);
  if (R > 1) {
    g.save(); g.translate(L.px, L.py + L.ry * 0.02); g.scale(1, 0.6);
    let gr = g.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.05, 0, 0, R); gr.addColorStop(0, '#ff6a55'); gr.addColorStop(0.3, '#d9231f'); gr.addColorStop(0.85, '#8e0d14'); gr.addColorStop(1, '#6a0810');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-R * 0.3, -R * 0.38, R * 0.22, R * 0.1, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  if (flow > 0) drawStream(g, L, flow, L.py - R * 0.2, t);
  drawBottle(g, L, th, Math.min(1, flow / 1200));
  // 指(長押し)
  const fx = w * 0.5, fy = h * 0.9, press = hold ? 1 : 0;
  g.save(); g.globalAlpha = 0.9; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(fx, fy, 26 * L.s + (hold ? 6 : 0), 0, Math.PI * 2); g.fill();
  g.fillStyle = hold ? '#e9a98a' : '#f1c4aa'; g.beginPath(); g.ellipse(fx, fy - 4 + press * 3, 15 * L.s, 20 * L.s, 0, 0, Math.PI * 2); g.fill();
  g.restore(); void FONT;
};

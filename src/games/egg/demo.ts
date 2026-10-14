// 開始画面のループ(軽量): 卵が左右に揺れ→タップで落ちて広がる
import { makeDrop, drawScene, type Drop } from './scene';
import { C } from './config';

let dd: Drop | null = null;
export const demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  dd ??= makeDrop(9, -6, C.BASE_Z, 0);
  const T = 3.6, u = t % T, tapAt = 1.7;
  if (u < tapAt) {
    const X = 9 - 110 * Math.cos((u / tapAt) * Math.PI * 1.5), z = C.BASE_Z;
    drawScene(g, w, h, t, { held: { X, Y: 0, z }, steam: 0.6 });
    if (u > tapAt - 0.35) { const k = (u - (tapAt - 0.35)) / 0.35; drawFinger(g, w / 2 + X * Math.min(w / 318, h / 640), h * 0.8, k); }
  } else {
    const tau = u - tapAt;
    drawScene(g, w, h, t, { drop: dd, tau, steam: 0.6 });
    if (tau < 0.3) drawFinger(g, w / 2 + dd.X * Math.min(w / 318, h / 640), h * 0.8, 1 - tau / 0.3 * 0.2);
  }
};
function drawFinger(g: CanvasRenderingContext2D, x: number, y: number, k: number) {
  g.save(); g.font = `${Math.round(Math.min(g.canvas.width, 80) * 0.7 + 20)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = 0.9; g.fillText('👆', x, y - (1 - k) * -10 + 10 * k); g.restore();
}

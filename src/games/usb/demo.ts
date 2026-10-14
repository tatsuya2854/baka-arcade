import { drawScene, newScene } from './scene';
// 開始画面ループ(約3秒): 指でUSBを動かして → 離して挿す。タップで反転も1回見せる
export const demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  const T = t % 3.4, S = newScene(); S.desk = false; S.finger = true; S.zoom = 1.0; S.cy = 0.4; S.dark = 0.55;
  S.lx = Math.sin(t * 1.1) * 3; S.ly = Math.sin(t * 0.9) * 1.2;
  const e = (a: number) => a * a * (3 - 2 * a), c = (a: number) => Math.max(0, Math.min(1, a));
  S.flipT = 1 - e(c((T - 0.2) / 0.4)); // 反転
  const mv = e(c((T - 0.7) / 1.2)); S.x = 3.5 * (1 - mv) + Math.sin(T * 6) * 0.15 * (1 - mv); S.y = 12 * (1 - mv); S.z = 9 - 9 * e(c((T - 2.0) / 0.35));
  S.rot = Math.sin(T * 8) * 0.04 * (1 - mv); S.insert = e(c((T - 2.35) / 0.3)); S.led = S.insert > 0.9 ? 1 : 0;
  drawScene(g, w, h, S);
  // 指タップ表示
  if (T < 0.7) { const a = Math.sin(Math.min(1, Math.max(0, (T - 0.1) / 0.5)) * Math.PI); g.save(); g.strokeStyle = `rgba(255,255,255,${0.6 * a})`; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h * 0.4 + 12 * Math.min(w / 19, h / 11), 14 + 20 * (1 - a), 0, 7); g.stroke(); g.restore(); }
};

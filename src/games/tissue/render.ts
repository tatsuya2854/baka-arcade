import { CFG } from './config';
import type { Snap } from './sim';

export interface Lay { cx: number; slotY: number; L: number; ws: number; bw: number; fh: number; dh: number; S: number; tableTop: number; w: number; h: number }
export const layout = (w: number, h: number): Lay => {
  const S = Math.min(w, h * 0.5), bw = S * 0.78;
  return { cx: w / 2, slotY: h * 0.7, L: Math.min(h * 0.3, S * 0.72), ws: S * 0.5, bw, fh: bw * 0.34, dh: bw * 0.085, S, tableTop: h * 0.58, w, h };
};
const sm = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const hash = (i: number) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };

/** 平らに置かれた/浮かぶ1枚（結果アート・山用） */
export function flatSheet(g: CanvasRenderingContext2D, x: number, y: number, sw: number, sl: number, ang: number, alpha: number, seed: number, squash = 1, jag = false, shadow = true) {
  g.save(); g.translate(x, y); g.scale(1, squash); g.rotate(ang);
  const ca = Math.cos(0), n = 7; void ca;
  const pts: [number, number][] = [];
  const wob = (k: number) => Math.sin(k * 1.7 + seed * 5.3) * sw * 0.012 + Math.sin(k * 3.1 + seed * 2.1) * sw * 0.007;
  for (let i = 0; i <= n; i++) pts.push([-sw / 2 + sw * i / n, -sl / 2 + wob(i)]);
  for (let i = 1; i <= n; i++) pts.push([sw / 2 + wob(i + 9) * 1.5, -sl / 2 + sl * i / n]);
  for (let i = 1; i <= n; i++) pts.push([sw / 2 - sw * i / n, sl / 2 + (jag ? (i % 2 ? 1 : -1) * sl * 0.05 : wob(i + 20))]);
  for (let i = 1; i < n; i++) pts.push([-sw / 2 + wob(i + 30) * 1.5, sl / 2 - sl * i / n]);
  if (shadow) {
    g.fillStyle = `rgba(0,0,0,${0.22 * alpha})`; g.beginPath();
    pts.forEach((p, i) => i ? g.lineTo(p[0] + sw * 0.03, p[1] + sl * 0.05) : g.moveTo(p[0] + sw * 0.03, p[1] + sl * 0.05)); g.fill();
  }
  const gr = g.createLinearGradient(-sw / 2, -sl / 2, sw / 2, sl / 2);
  gr.addColorStop(0, `rgba(255,255,255,${0.78 * alpha})`); gr.addColorStop(0.5, `rgba(240,245,252,${0.64 * alpha})`); gr.addColorStop(1, `rgba(214,224,238,${0.62 * alpha})`);
  g.fillStyle = gr; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
  g.strokeStyle = `rgba(255,255,255,${0.7 * alpha})`; g.lineWidth = Math.max(0.8, sw * 0.004); g.stroke();
  g.lineWidth = 0.8;
  for (let k = 0; k < 4; k++) {
    const f = hash(seed * 7 + k), y0 = -sl / 2 + sl * (0.15 + 0.7 * f);
    g.strokeStyle = k % 2 ? `rgba(255,255,255,${0.35 * alpha})` : `rgba(90,105,130,${0.14 * alpha})`;
    g.beginPath(); g.moveTo(-sw * 0.46, y0); g.quadraticCurveTo(0, y0 + (hash(seed + k) - 0.5) * sl * 0.12, sw * 0.46, y0 + (hash(seed * 3 + k) - 0.5) * sl * 0.1); g.stroke();
  }
  g.restore();
}

interface RibbonOpt { jagBottom?: boolean; jagTop?: boolean; alpha?: number }
const N = 22;
const xs = new Float32Array(N + 1), ys = new Float32Array(N + 1), ws = new Float32Array(N + 1);
function ribbon(g: CanvasRenderingContext2D, lay: Lay, off: (Y: number) => number, Y0: number, Y1: number, ph: number, amp: number, t: number, o: RibbonOpt = {}) {
  const { cx, slotY, L, ws: Wb } = lay, al = o.alpha ?? 1, W = Wb * (0.94 + 0.1 * hash(ph * 3.1)), sh = (hash(ph * 5.7) - 0.5) * 0.16 * Wb;
  for (let j = 0; j <= N; j++) {
    const Y = Y0 + (Y1 - Y0) * j / N, env = sm(Y / (0.8 * L));
    const gather = 0.5 + 0.5 * sm(Y / (0.6 * L));
    const tw = 0.86 + 0.14 * Math.cos(Y * 0.021 - t * 3 + ph);
    const fl = amp * env * (Math.sin(Y * 0.018 + ph - t * 7) * 0.6 + Math.sin(Y * 0.041 - t * 11 + ph * 1.7) * 0.4);
    xs[j] = cx + off(Y) + fl + sh * sm(Y / (0.7 * L)); ys[j] = slotY - Y; ws[j] = W * gather * tw;
  }
  g.beginPath();
  for (let j = 0; j <= N; j++) g.lineTo(xs[j] - ws[j] / 2 + Math.sin(ys[j] * 0.11 + ph) * 1.2, ys[j] + (j === N ? 5 : 0));
  if (!o.jagTop) g.quadraticCurveTo(xs[N], ys[N] - 4 + Math.sin(ph) * 2, xs[N] + ws[N] / 2, ys[N] + 5);
  if (o.jagTop) for (let k = 0; k < 8; k++) g.lineTo(xs[N] - ws[N] / 2 + ws[N] * (k + 0.5) / 8, ys[N] + (k % 2 ? 5 : -4));
  for (let j = N - 1; j >= 0; j--) g.lineTo(xs[j] + ws[j] / 2 + Math.sin(ys[j] * 0.13 + ph * 2) * 1.2, ys[j]);
  if (o.jagBottom) for (let k = 7; k >= 0; k--) g.lineTo(xs[0] - ws[0] / 2 + ws[0] * (k + 0.5) / 8, ys[0] + (k % 2 ? 7 : -3));
  g.closePath();
  g.fillStyle = `rgba(252,253,255,${0.6 * al})`; g.fill();
  g.save(); g.clip();
  let lx = 1e9, rx2 = -1e9; for (let j = 0; j <= N; j++) { lx = Math.min(lx, xs[j] - ws[j] / 2); rx2 = Math.max(rx2, xs[j] + ws[j] / 2); }
  const hg = g.createLinearGradient(lx, 0, rx2, 0); hg.addColorStop(0, `rgba(120,138,170,${0.22 * al})`); hg.addColorStop(0.2, `rgba(255,255,255,${0.1 * al})`); hg.addColorStop(0.55, `rgba(255,255,255,${0.2 * al})`); hg.addColorStop(1, `rgba(110,128,160,${0.26 * al})`);
  g.fillStyle = hg; g.fillRect(lx, ys[N] - 8, rx2 - lx, ys[0] - ys[N] + 16);
  // 陰影: 傾きに応じて明暗
  {
    const vg = g.createLinearGradient(0, ys[0], 0, ys[N]);
    for (let j = 0; j <= N; j++) {
      const j2 = Math.min(N, j + 1), j1 = Math.max(0, j - 1);
      const sl = (xs[j2] - xs[j1]) / Math.max(1, ys[j1] - ys[j2]) * 4;
      const a = Math.min(0.12, Math.abs(sl) * 0.3) * al;
      vg.addColorStop(j / N, sl > 0 ? `rgba(70,84,110,${a})` : `rgba(255,255,255,${a * 1.3})`);
    }
    g.fillStyle = vg; g.fillRect(lx, ys[N] - 8, rx2 - lx, ys[0] - ys[N] + 16);
  }
  g.restore();
  // しわ（縦の筋）
  for (let k = 0; k < 6; k++) {
    const f = 0.1 + 0.8 * hash(ph * 13 + k), dark = k % 3 === 0;
    g.strokeStyle = dark ? `rgba(80,95,125,${0.10 * al})` : `rgba(255,255,255,${0.30 * al})`; g.lineWidth = dark ? 1 : 0.8;
    g.beginPath();
    for (let j = 0; j <= N; j++) { const x = xs[j] + (f - 0.5) * ws[j] + Math.sin(ys[j] * 0.05 + k * 2 + ph) * 2.2; j ? g.lineTo(x, ys[j]) : g.moveTo(x, ys[j]); }
    g.stroke();
  }
  g.strokeStyle = `rgba(255,255,255,${0.62 * al})`; g.lineWidth = 1;
  g.beginPath(); for (let j = 0; j <= N; j++) { const x = xs[j] - ws[j] / 2; j ? g.lineTo(x, ys[j]) : g.moveTo(x, ys[j]); } g.stroke();
  g.beginPath(); for (let j = 0; j <= N; j++) { const x = xs[j] + ws[j] / 2; j ? g.lineTo(x, ys[j]) : g.moveTo(x, ys[j]); } g.stroke();
}

function finger(g: CanvasRenderingContext2D, x: number, y: number, r: number, side: number, a: number) {
  g.save(); g.translate(x, y); g.rotate(-side * 0.2); g.globalAlpha = a;
  const len = r * 4.5;
  let gr = g.createLinearGradient(-r, 0, r, 0); gr.addColorStop(0, '#c58b6f'); gr.addColorStop(0.35, '#f0c6ac'); gr.addColorStop(0.7, '#e3b194'); gr.addColorStop(1, '#b97f64');
  const fp = new Path2D(); fp.moveTo(-r, 0); fp.lineTo(-r * 1.08, len); fp.arc(0, len, r * 1.08, Math.PI, 0, true); fp.lineTo(r, 0); fp.arc(0, 0, r, 0, Math.PI, true); fp.closePath();
  g.fillStyle = gr; g.fill(fp);
  g.save(); g.clip(fp); const fade = g.createLinearGradient(0, len * 0.2, 0, len + r); fade.addColorStop(0, 'rgba(60,40,36,0)'); fade.addColorStop(1, 'rgba(60,40,36,0.5)');
  g.fillStyle = fade; g.fillRect(-r * 1.2, 0, r * 2.4, len + r * 1.2); g.restore();
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.35, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2); g.fill();
  g.restore();
}

export interface Opt { hud?: boolean; label?: string; pop?: number; timeFrac?: number }

export function drawScene(g: CanvasRenderingContext2D, w: number, h: number, s: Snap, time: number, o: Opt = {}) {
  const lay = layout(w, h), { cx, slotY, L, ws: W, bw, fh, dh, tableTop } = lay;
  // 壁
  let gr = g.createLinearGradient(0, 0, 0, tableTop); gr.addColorStop(0, '#3a4350'); gr.addColorStop(1, '#262c35');
  g.fillStyle = gr; g.fillRect(0, 0, w, tableTop + 1);
  // テーブル
  gr = g.createLinearGradient(0, tableTop, 0, h); gr.addColorStop(0, '#5a524b'); gr.addColorStop(0.5, '#3b3531'); gr.addColorStop(1, '#2a2522');
  g.fillStyle = gr; g.fillRect(0, tableTop, w, h - tableTop);
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, tableTop, w, 1.5);
  // スポットライト
  gr = g.createRadialGradient(cx - w * 0.1, h * 0.28, 10, cx, h * 0.5, h * 0.7); gr.addColorStop(0, 'rgba(255,244,225,0.16)'); gr.addColorStop(1, 'rgba(255,244,225,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);

  g.save(); g.translate(s.shx, s.shy);
  const topF = slotY + dh, botY = topF + fh;
  // 接地影
  for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(0,0,0,${0.16 - i * 0.04})`; g.beginPath(); g.ellipse(cx + bw * 0.03, botY - 2, bw * (0.56 + i * 0.07), dh * (0.9 + i * 0.55), 0, 0, Math.PI * 2); g.fill(); }
  // 前面
  gr = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); gr.addColorStop(0, '#f4f1ea'); gr.addColorStop(0.55, '#e8e4da'); gr.addColorStop(1, '#c9c4b8');
  g.fillStyle = gr; g.beginPath(); g.roundRect(cx - bw / 2, topF, bw, fh, [2, 2, 8, 8]); g.fill();
  g.save(); g.beginPath(); g.roundRect(cx - bw / 2, topF, bw, fh, [2, 2, 8, 8]); g.clip();
  g.fillStyle = 'rgba(150,190,176,0.85)'; g.fillRect(cx - bw / 2, topF + fh * 0.62, bw, fh * 0.2);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(cx - bw / 2, topF + fh * 0.62, bw, 1.2);
  g.fillStyle = 'rgba(70,80,86,0.78)'; g.font = `600 ${bw * 0.06}px "Helvetica Neue",Arial,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  try { (g as any).letterSpacing = `${bw * 0.02}px`; } catch { /* */ }
  g.fillText('SOFT TISSUE', cx, topF + fh * 0.32);
  try { (g as any).letterSpacing = '0px'; } catch { /* */ }
  g.fillStyle = 'rgba(70,80,86,0.5)'; g.font = `500 ${bw * 0.036}px "Helvetica Neue",Arial,sans-serif`; g.fillText('2 PLY  ·  200', cx, topF + fh * 0.45);
  gr = g.createLinearGradient(0, topF, 0, botY); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.15, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.16)');
  g.fillStyle = gr; g.fillRect(cx - bw / 2, topF, bw, fh); g.restore();
  // 上面
  gr = g.createLinearGradient(0, slotY - dh, 0, topF); gr.addColorStop(0, '#fcfbf7'); gr.addColorStop(1, '#ebe7de');
  g.fillStyle = gr; g.beginPath(); g.moveTo(cx - bw * 0.46, slotY - dh); g.lineTo(cx + bw * 0.46, slotY - dh); g.lineTo(cx + bw / 2, topF); g.lineTo(cx - bw / 2, topF); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - bw / 2, topF); g.lineTo(cx + bw / 2, topF); g.stroke();
  // 取り出し口
  const rx = W * 0.46, ry = dh * 0.62 - s.press * 1.5;
  const wavy = (k: number, ex: number) => { g.beginPath(); for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2, r = 1 + Math.sin(a * 3 + k) * 0.05 + Math.sin(a * 5 + 1) * 0.035; const x = cx + Math.cos(a) * (rx + ex) * r, y = slotY + Math.sin(a) * (ry + ex * 0.4) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  wavy(0, rx * 0.28); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.stroke();
  gr = g.createRadialGradient(cx, slotY, 2, cx, slotY, rx); gr.addColorStop(0, '#1d1c1a'); gr.addColorStop(1, '#4c4944');
  wavy(1.3, 0); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.6; g.stroke();

  // ティッシュ
  const hx = s.dx * L, swx = s.sw * L;
  if (s.fall < 0.17) {
    const al = 1 - s.fall * 6;
    const Yh0 = Math.max(1, s.y0 * L);
    const off = (Y: number) => { const xi = Math.min(1, Y / Yh0); return hx * Math.pow(xi, 1.3) + (swx - hx) * Math.sin(Math.PI * xi) * 0.45; };
    const amp = (4 + Math.min(1, s.v / 3) * 9) * (lay.S / 390) * (s.y0 > 1 ? 1 : 0.5);
    ctxRibbons(g, lay, s, off, amp, time, al);
    if (s.held || s.hint > 0) {
      const px = cx + hx, py = slotY - s.y0 * L, r = lay.S * 0.04;
      if (s.held) { finger(g, px - r * 0.9, py + r * 0.3, r, -1, 0.95); finger(g, px + r * 0.9, py + r * 0.5, r, 1, 0.95); }
    }
  }
  if (s.fall >= 0.17 && s.m + 1 < CFG.maxSheets) ribbon(g, lay, (Y) => Y * 0, 0, s.nextY * L, 7.7 + s.m, 0.5, time, {});
  if (s.fall > 0) pile(g, lay, s, time);
  // 手前の縁
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, slotY, rx, ry, 0, 0.05 * Math.PI, 0.95 * Math.PI); g.stroke();
  g.restore();

  // ヒント指
  if (s.hint > 0) {
    const k = (time % 1.6) / 1.6, e = sm(k < 0.75 ? k / 0.75 : 1), a = (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25) * s.hint;
    const py = slotY - (CFG.peek + 0.2) * L - e * L * 0.9, r = lay.S * 0.04;
    finger(g, cx - r * 0.9, py + r * 0.3, r, -1, a * 0.9); finger(g, cx + r * 0.9, py + r * 0.5, r, 1, a * 0.9);
  }
  if (o.hud) hud(g, lay, s, o);
}

function ctxRibbons(g: CanvasRenderingContext2D, lay: Lay, s: Snap, off: (Y: number) => number, amp: number, t: number, al: number) {
  const { L } = lay, ov = CFG.overlap;
  if (s.torn) {
    ribbon(g, lay, off, 0, 0.18 * L, 1.1, amp * 0.3, t, { jagTop: true, alpha: al });
    const Yh = s.y0 * L, Yt = Math.max(0.2 * L, Yh - s.tornAt * L);
    ribbon(g, lay, off, Yt, Yh, 2.3, amp, t, { jagBottom: true, alpha: al });
    return;
  }
  if (s.m + 1 < CFG.maxSheets) ribbon(g, lay, (Y) => off(Y) * 0.2, 0, s.nextY * L, 7.7 + s.m, amp * 0.4, t, { alpha: al });
  for (let i = s.m; i >= 0; i--) {
    const Yh = (s.y0 - ov * i) * L, Yt = Math.max(0, Yh - L);
    if (Yt > lay.slotY + 20) continue;
    ribbon(g, lay, off, Yt, Math.max(Yt + 4, Yh), i * 1.9 + 0.3, amp * (1 + 0.05 * (i % 3)), t, { alpha: al });
  }
}

function pile(g: CanvasRenderingContext2D, lay: Lay, s: Snap, time: number) {
  const { cx, slotY, L, ws: W, h } = lay, f = sm(s.fall), n = s.torn ? 1 : s.count;
  const cnt = Math.min(n, 40);
  for (let i = cnt - 1; i >= 0; i--) {
    const Yh = (s.y0 - CFG.overlap * i) * L, Ymid = Math.max(0.2 * L, Yh - L / 2);
    const sx = cx + s.dx * L * Math.min(1, Ymid / Math.max(1, s.y0 * L)), sy = slotY - Ymid;
    const tx = cx + (hash(i + 3) - 0.5) * W * 0.9, ty = h * 0.9 - Math.min(i, 16) * 2.5 + (hash(i + 9) - 0.5) * 14;
    const e = Math.min(1, f * (1.15 - i * 0.012)), ee = sm(e);
    const x = sx + (tx - sx) * ee + Math.sin(time * 5 + i) * 6 * (1 - ee) * ee * 4, y = sy + (ty - sy) * ee * ee;
    const len = (s.torn ? Math.min(1, s.tornAt) : 1) * L, sq = 1 - 0.62 * ee;
    flatSheet(g, x, y, W * (s.torn ? 0.9 : 1), len * (1 - 0.55 * ee), (hash(i + 5) - 0.5) * 1.6 * ee, Math.min(1, 0.35 + f * 4), i + 1, sq, s.torn, ee > 0.7);
  }
}

function hud(g: CanvasRenderingContext2D, lay: Lay, s: Snap, o: Opt) {
  const { w, h, S } = lay;
  if (o.timeFrac !== undefined) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(S * 0.06 + (w - S) / 2, h * 0.035, S * 0.88, 3); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(S * 0.06 + (w - S) / 2, h * 0.035, S * 0.88 * Math.max(0, o.timeFrac), 3); }
  const pop = o.pop ?? 0, sz = S * (0.3 + 0.05 * pop), str = String(s.count);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `800 ${sz}px "Hiragino Sans","Helvetica Neue",sans-serif`; const nw = g.measureText(str).width, tot = nw + S * 0.12, x0 = w / 2 - tot / 2;
  g.fillStyle = `rgba(255,255,255,${0.3 + Math.min(0.6, s.count * 0.4)})`; g.fillText(str, x0, h * 0.17);
  g.font = `800 ${S * 0.09}px "Hiragino Sans",sans-serif`; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('枚', x0 + nw + S * 0.02, h * 0.17);
  g.textAlign = 'center';
  if (o.label) { g.font = `700 ${S * 0.05}px "Hiragino Sans",sans-serif`; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(o.label, w / 2, h * 0.22); }
}

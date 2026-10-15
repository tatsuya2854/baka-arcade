import { fmtCm, fmtErr, verdictOf } from './config';
import { loadImg } from '../../core/images';

const SLUG = 'toothpaste-10cm';
/** 生成画像(読めなければ null=旧描画にフォールバック)。モジュール共有 */
export const TI: { bg: HTMLImageElement | null; hero: HTMLImageElement | null; hand: HTMLImageElement | null } = { bg: null, hero: null, hand: null };
let tiP: Promise<void> | null = null;
export const loadToothpasteImgs = (): Promise<void> => (tiP ??= Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero'), loadImg(SLUG, 'hand_press')]).then(([b, h, hd]) => { TI.bg = b; TI.hero = h; TI.hand = hd; }));
/** 画像の縁(袖口の切れ目)を透明にフェードさせたオフスクリーンを作る。e = 上,右,下,左 の割合 */
function fadedHand(im: HTMLImageElement, W: number, e: [number, number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = Math.round(W * im.height / im.width);
  const q = c.getContext('2d')!; q.drawImage(im, 0, 0, c.width, c.height); q.globalCompositeOperation = 'destination-out';
  const edge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const gr = q.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(rx, ry, rw, rh);
  };
  const w = c.width, h = c.height;
  if (e[0]) edge(0, 0, 0, h * e[0], 0, 0, w, h * e[0]);
  if (e[2]) edge(0, h, 0, h * (1 - e[2]), 0, h * (1 - e[2]), w, h * e[2]);
  if (e[1]) edge(w, 0, w * (1 - e[1]), 0, w * (1 - e[1]), 0, w * e[1], h);
  if (e[3]) edge(0, 0, w * e[3], 0, 0, 0, w * e[3], h);
  return c;
}
let handC: HTMLCanvasElement | null = null;
// 背景は静的なのでオフスクリーンに1回だけ描いて使い回す
let bgCv: HTMLCanvasElement | null = null;
export const releaseBg = () => { bgCv = null; handC = null; };
export function bgCanvas(w: number, h: number): HTMLCanvasElement {
  if (bgCv && bgCv.width === w && bgCv.height === h) return bgCv;
  const c = bgCv && bgCv.width === w && bgCv.height === h ? bgCv : document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!, b = TI.bg!;
  // 左端の鋼の定規(縦)は使わず大理石の部分だけ切り出す(定規はゲーム側で水平に描く)
  const sx = b.width * 0.08, sw = b.width - sx, sc = Math.max(w / sw, h / b.height), dw = sw * sc, dh = b.height * sc;
  g.drawImage(b, sx, 0, sw, b.height, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
  const v = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,45,60,0.16)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  bgCv = c; return c;
}

// 仮想キャンバス 390x620 に描いて contain で拡縮する
export const VW = 390, VH = 620;
export const X0 = 42;        // 定規の0mm位置
export const PXMM = 1.95;    // 1mm = 1.95px（16cmで312px）
export const YB = 300;       // 歯ブラシ中心y
export const YR = 336;       // 定規上端y
export const PD = 15;        // 歯磨き粉の太さ
const MAXPX = 322;           // これ以上は山になる
const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,sans-serif';

export interface Scene {
  L: number; target: number; grip: number; flow: number; amp: number;
  lift: number; thread: number; spat: number; used: number; reveal: number; taper: number;
  hud?: { round: number; total: number; hint: string; held: boolean };
}
export const newScene = (): Scene => ({ L: 0, target: 100, grip: 0, flow: 0, amp: 0, lift: 0, thread: 0, spat: -1, used: 0, reveal: 0, taper: 0 });

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---- 背景（洗面台） ----
function drawBg(g: CanvasRenderingContext2D, w: number, h: number, ox: number, oy: number, S: number) {
  if (TI.bg) { g.drawImage(bgCanvas(w, h), 0, 0); return; }
  const hy = oy + 150 * S;
  let gr = g.createLinearGradient(0, 0, 0, hy);
  gr.addColorStop(0, '#cfdbe2'); gr.addColorStop(1, '#e8eef1');
  g.fillStyle = gr; g.fillRect(0, 0, w, hy);
  g.strokeStyle = 'rgba(110,135,150,0.16)'; g.lineWidth = Math.max(1, S);
  g.beginPath();
  const tile = 64 * S;
  for (let x = ox % tile; x < w; x += tile) { g.moveTo(x, 0); g.lineTo(x, hy); }
  for (let y = hy; y > -tile; y -= tile) { g.moveTo(0, y); g.lineTo(w, y); }
  g.stroke();
  // 壁の落ち影
  gr = g.createLinearGradient(0, hy - 26 * S, 0, hy);
  gr.addColorStop(0, 'rgba(60,80,95,0)'); gr.addColorStop(1, 'rgba(60,80,95,0.16)');
  g.fillStyle = gr; g.fillRect(0, hy - 26 * S, w, 26 * S);
  // カウンター（白い人工大理石）
  gr = g.createLinearGradient(0, hy, 0, h);
  gr.addColorStop(0, '#f6f6f4'); gr.addColorStop(0.45, '#e9eaea'); gr.addColorStop(1, '#cfd3d6');
  g.fillStyle = gr; g.fillRect(0, hy, w, h - hy);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, hy, w, Math.max(1, 1.5 * S));
  g.strokeStyle = 'rgba(150,160,170,0.14)'; g.lineWidth = Math.max(1, 1.2 * S);
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    const y0 = hy + (60 + i * 130) * S;
    g.moveTo(0, y0); g.bezierCurveTo(w * 0.3, y0 - 30 * S, w * 0.6, y0 + 40 * S, w, y0 - 14 * S); g.stroke();
  }
  const v = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,45,60,0.22)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
}

// ---- キャップ（カウンターに置いてある） ----
function drawCap(g: CanvasRenderingContext2D) {
  g.save(); g.translate(318, 214);
  g.fillStyle = 'rgba(40,55,70,0.16)'; g.beginPath(); g.ellipse(2, 15, 30, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(40,55,70,0.10)'; g.beginPath(); g.ellipse(4, 17, 36, 8, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(0, -14, 0, 14);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#eef3f7'); gr.addColorStop(1, '#a9b6c2');
  g.fillStyle = gr; rr(g, -26, -14, 52, 28, 7); g.fill();
  g.strokeStyle = 'rgba(80,100,120,0.28)'; g.lineWidth = 1;
  g.beginPath(); for (let i = -16; i <= 18; i += 4.2) { g.moveTo(i, -13); g.lineTo(i, 13); } g.stroke();
  const e = g.createRadialGradient(-22, -4, 1, -22, 0, 16);
  e.addColorStop(0, '#ffffff'); e.addColorStop(1, '#c4cfd8');
  g.fillStyle = e; g.beginPath(); g.ellipse(-26, 0, 5, 13, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, -9); g.lineTo(20, -9); g.stroke();
  if (TI.hero) { // チューブの赤白ストライプのキャップに合わせる
    g.save(); rr(g, -26, -14, 52, 28, 7); g.clip(); g.fillStyle = 'rgba(214,32,38,0.92)';
    for (let i = -28; i < 28; i += 8) g.fillRect(i, -14, 4, 28);
    g.restore();
  }
  g.restore();
}

// ---- 歯ブラシ（上から） ----
export function drawBrush(g: CanvasRenderingContext2D) {
  const hx0 = X0 - 24, hx1 = 374;
  // 接地影
  for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(40,55,70,${0.07})`; rr(g, hx0 - i * 2, YB - 19 + 6 + i * 3, hx1 - hx0 + 70 + i * 4, 40 + i * 2, 20); g.fill(); }
  // 柄
  let gr = g.createLinearGradient(0, YB - 11, 0, YB + 11);
  gr.addColorStop(0, '#f4f9ff'); gr.addColorStop(0.5, '#8fb7ea'); gr.addColorStop(1, '#3f6fb5');
  g.fillStyle = gr; rr(g, hx1 - 14, YB - 11, 90, 22, 11); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; rr(g, hx1 + 2, YB - 8, 70, 3, 1.5); g.fill();
  // ヘッド
  gr = g.createLinearGradient(0, YB - 20, 0, YB + 20);
  gr.addColorStop(0, '#fbfdff'); gr.addColorStop(0.5, '#cfe0f4'); gr.addColorStop(1, '#7ea3d2');
  g.fillStyle = gr; rr(g, hx0, YB - 20, hx1 - hx0, 40, 19); g.fill();
  g.strokeStyle = 'rgba(30,60,110,0.3)'; g.lineWidth = 1; g.stroke();
  // 毛の土台
  g.fillStyle = '#2b4c7e'; rr(g, hx0 + 8, YB - 14, hx1 - hx0 - 16, 28, 12); g.fill();
  // 毛束
  const cols = ['#3d86f2', '#f3f7fb', '#9cc4ff'];
  for (let c = 0; c < 3; c++) {
    g.fillStyle = cols[c]; g.beginPath();
    for (let r = 0; r < 3; r++) {
      const y = YB - 8 + r * 8, off = (r & 1) * 4.5;
      for (let x = hx0 + 16 + off, i = 0; x < hx1 - 12; x += 9, i++) {
        if (((i + r) % 3) !== c) continue;
        g.moveTo(x + 3.6, y); g.arc(x, y, 3.6, 0, Math.PI * 2);
      }
    }
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, hx0 + 8, YB - 14, hx1 - hx0 - 16, 8, 5); g.fill();
}

// ---- 定規 ----
export function drawRuler(g: CanvasRenderingContext2D) {
  const x0 = X0 - 18, x1 = 376, y0 = YR, hh = 46;
  for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(40,55,70,0.07)'; rr(g, x0 - i, y0 + 5 + i * 2, x1 - x0 + i * 2, hh + i, 5); g.fill(); }
  const gr = g.createLinearGradient(0, y0, 0, y0 + hh);
  if (TI.bg) { gr.addColorStop(0, '#eef1f3'); gr.addColorStop(0.5, '#cdd3d8'); gr.addColorStop(1, '#a9b1b8'); }
  else { gr.addColorStop(0, '#f1dfb8'); gr.addColorStop(0.5, '#e2c88f'); gr.addColorStop(1, '#cfae6f'); }
  g.fillStyle = gr; rr(g, x0, y0, x1 - x0, hh, 5); g.fill();
  g.strokeStyle = 'rgba(120,85,30,0.12)'; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i < 7; i++) { const y = y0 + 8 + i * 6; g.moveTo(x0 + 4, y); g.bezierCurveTo(x0 + 110, y - 1.5, x0 + 240, y + 2, x1 - 4, y - 0.5); }
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x0 + 3, y0 + 1, x1 - x0 - 6, 1.5);
  g.strokeStyle = '#2a2118'; g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i <= 163; i++) {
    const x = X0 + i * PXMM, l = i % 10 === 0 ? 15 : i % 5 === 0 ? 10 : 6;
    g.moveTo(x + 0.5, y0 + 1.5); g.lineTo(x + 0.5, y0 + 1.5 + l);
  }
  g.stroke();
  g.fillStyle = '#2a2118'; g.font = `700 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (let c = 0; c <= 16; c++) g.fillText(String(c), X0 + c * 10 * PXMM + 0.5, y0 + 31);
  g.textAlign = 'right'; g.font = `700 10px ${FONT}`; g.fillText('cm', x1 - 5, y0 + 41);
}

// ---- 歯磨き粉（縞入りの押し出し円柱） ----
const PX = new Float32Array(300), PY = new Float32Array(300), PR = new Float32Array(300);
export function drawPaste(g: CanvasRenderingContext2D, x0: number, yc: number, len: number, D: number, amp: number, t: number, taper = 0) {
  if (len < 0.5) return;
  const n = Math.max(3, Math.min(280, Math.ceil(len / (D * 0.4))));
  const r0 = D / 2;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + len * u;
    PX[i] = x;
    PY[i] = yc - amp * Math.sin(x / D * 0.55 - t * 7) * (0.25 + 0.75 * u) * 0.55 + taper * 2.2 * Math.pow(Math.max(0, (u - 0.85) / 0.15), 2);
    const nearTip = Math.max(0, 1 - (len * (1 - u)) / (D * 1.2));
    PR[i] = r0 * (1 + 0.05 * Math.sin(x / D * 2.1)) * (1 - taper * 0.4 * nearTip * nearTip) * (i === 0 ? 0.85 : 1);
  }
  const path = () => {
    g.beginPath(); g.moveTo(PX[0], PY[0] - PR[0]);
    for (let i = 1; i <= n; i++) g.lineTo(PX[i], PY[i] - PR[i]);
    g.arc(PX[n], PY[n], PR[n], -Math.PI / 2, Math.PI / 2);
    for (let i = n - 1; i >= 0; i--) g.lineTo(PX[i], PY[i] + PR[i]);
    g.arc(PX[0], PY[0], PR[0], Math.PI / 2, Math.PI * 1.5);
    g.closePath();
  };
  // 接地影
  g.strokeStyle = 'rgba(15,30,60,0.22)'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = D * 1.05;
  g.beginPath(); g.moveTo(PX[0], PY[0] + r0 * 0.75); for (let i = 1; i <= n; i++) g.lineTo(PX[i], PY[i] + r0 * 0.75); g.stroke();
  g.strokeStyle = 'rgba(15,30,60,0.12)'; g.lineWidth = D * 1.5;
  g.beginPath(); g.moveTo(PX[0], PY[0] + r0 * 0.9); for (let i = 1; i <= n; i++) g.lineTo(PX[i], PY[i] + r0 * 0.9); g.stroke();
  g.save(); path(); g.clip();
  const yt = yc - r0 - amp - 2, yb = yc + r0 + amp + 2;
  let gr = g.createLinearGradient(0, yc - r0, 0, yc + r0);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#f1f4f7'); gr.addColorStop(1, '#c4cdd8');
  g.fillStyle = gr; g.fillRect(x0 - D, yt, len + D * 2, yb - yt);
  const P = D * 1.35, sk = (yb - yt) * 0.5;
  g.fillStyle = '#e03a3e'; g.beginPath();
  for (let xs = x0 - P - sk; xs < x0 + len + P; xs += P) { g.moveTo(xs, yt); g.lineTo(xs + P * 0.2, yt); g.lineTo(xs + P * 0.2 + sk, yb); g.lineTo(xs + sk, yb); g.closePath(); }
  g.fill();
  g.fillStyle = '#2f6fe0'; g.beginPath();
  for (let xs = x0 - P - sk + P / 2; xs < x0 + len + P; xs += P) { g.moveTo(xs, yt); g.lineTo(xs + P * 0.2, yt); g.lineTo(xs + P * 0.2 + sk, yb); g.lineTo(xs + sk, yb); g.closePath(); }
  g.fill();
  gr = g.createLinearGradient(0, yc - r0, 0, yc + r0);
  gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.35, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(10,25,60,0.08)'); gr.addColorStop(1, 'rgba(10,25,60,0.42)');
  g.fillStyle = gr; g.fillRect(x0 - D, yt, len + D * 2, yb - yt);
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = D * 0.13;
  g.beginPath(); g.moveTo(PX[0] + 2, PY[0] - PR[0] * 0.5); for (let i = 1; i <= n; i++) g.lineTo(PX[i] - (i === n ? D * 0.3 : 0), PY[i] - PR[i] * 0.5); g.stroke();
  g.strokeStyle = 'rgba(20,40,80,0.18)'; g.lineWidth = 1; path(); g.stroke();
}

/** 出しすぎ: とぐろを巻いた山 */
export function drawPile(g: CanvasRenderingContext2D, x: number, yb: number, D: number, hgt: number) {
  const tiers = Math.max(1, Math.min(10, Math.ceil(hgt / (D * 0.55))));
  for (let i = 0; i < tiers; i++) {
    const rx = D * (1.9 - i * 0.14), ry = D * 0.6, y = yb - i * D * 0.55, cx = x - 4 + (i % 2 ? 3 : -3);
    const gr = g.createLinearGradient(0, y - ry, 0, y + ry);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#e9eef3'); gr.addColorStop(1, '#a9b6c6');
    g.fillStyle = 'rgba(15,30,60,0.18)'; g.beginPath(); g.ellipse(cx + 2, y + 3, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.lineCap = 'round'; g.lineWidth = D * 0.2;
    g.strokeStyle = '#e03a3e'; g.beginPath(); g.ellipse(cx, y, rx * 0.92, ry * 0.86, 0, 0.35 + i * 0.4, 1.35 + i * 0.4); g.stroke();
    g.strokeStyle = '#2f6fe0'; g.beginPath(); g.ellipse(cx, y, rx * 0.92, ry * 0.86, 0, 1.9 + i * 0.4, 2.9 + i * 0.4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = D * 0.1; g.beginPath(); g.ellipse(cx, y - 1, rx * 0.8, ry * 0.7, 0, Math.PI * 1.15, Math.PI * 1.7); g.stroke();
  }
}

// ---- チューブ（ラミネート、ローカル座標: 口が原点、本体は -y） ----
const BW = 74;
function drawTube(g: CanvasRenderingContext2D, s: Scene, t: number) {
  const Lb = 150 - s.used * 26, y0 = -34, y1 = y0 - Lb, sq = s.grip;
  const mid = y0 - Lb * 0.45, bell = (y: number) => Math.exp(-Math.pow((y - mid) / (Lb * 0.3), 2));
  const hw = (y: number) => BW / 2 * (1 - 0.27 * sq * bell(y));
  const bodyPath = () => {
    g.beginPath(); g.moveTo(-hw(y0), y0);
    for (let y = y0; y >= y1; y -= 6) g.lineTo(-hw(y), y);
    g.lineTo(-hw(y1), y1); g.lineTo(hw(y1), y1);
    for (let y = y1; y <= y0; y += 6) g.lineTo(hw(y), y);
    g.lineTo(hw(y0), y0); g.closePath();
  };
  // 空中の落ち影
  if (TI.hero) { // 画像のチューブには四角い影を付けず、浮いている柔らかい影だけ
    g.fillStyle = 'rgba(30,45,60,0.07)'; g.beginPath(); g.ellipse(12, y0 - Lb * 0.45 + 18, 30, Lb * 0.5, 0, 0, Math.PI * 2); g.fill();
  } else {
    g.save(); g.translate(16, 20); g.fillStyle = 'rgba(30,45,60,0.07)';
    bodyPath(); g.fill(); g.translate(-6, -7); bodyPath(); g.fill(); g.restore();
  }
  const him = TI.hero;
  if (him) {
    const k = him.width / 1254, sx = 455 * k, sy = 55 * k, sw = 350 * k, sh = 1140 * k;
    const H = 34 + Lb + 15, n = 20;
    g.save(); g.rotate(Math.PI); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (let i = 0; i < n; i++) {
      const f0 = i / n, pw = hw(-(f0 + 0.5 / n) * H) * 2 * 0.95 * 1.12;
      g.drawImage(him, sx, sy + f0 * sh, sw, sh / n + 0.6, -pw / 2, f0 * H, pw, H / n + 1);
    }
    g.restore();
  } else {
    // 口
    let gr = g.createLinearGradient(-7, 0, 7, 0);
    gr.addColorStop(0, '#c4ced8'); gr.addColorStop(0.35, '#ffffff'); gr.addColorStop(1, '#a3b0bd');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-4.2, 0); g.lineTo(4.2, 0); g.lineTo(6.8, -15); g.lineTo(-6.8, -15); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,90,110,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-5.6, -7); g.lineTo(5.6, -7); g.moveTo(-6.2, -11); g.lineTo(6.2, -11); g.stroke();
    g.fillStyle = s.flow > 0.02 ? '#e03a3e' : '#8a98a6'; g.beginPath(); g.ellipse(0, -0.5, 3, 1.4, 0, 0, Math.PI * 2); g.fill();
    // 肩（硬いプラ）
    gr = g.createLinearGradient(-BW / 2, 0, BW / 2, 0);
    gr.addColorStop(0, '#aab6c2'); gr.addColorStop(0.3, '#f2f6f9'); gr.addColorStop(0.55, '#ffffff'); gr.addColorStop(1, '#98a6b4');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-6.8, -14);
    for (let i = 0; i <= 8; i++) { const u = i / 8, yy = -14 - 20 * u; g.lineTo(-(6.8 + (hw(y0) - 6.8) * Math.sin(u * Math.PI / 2)), yy); }
    for (let i = 8; i >= 0; i--) { const u = i / 8, yy = -14 - 20 * u; g.lineTo(6.8 + (hw(y0) - 6.8) * Math.sin(u * Math.PI / 2), yy); }
    g.closePath(); g.fill();
    // 本体
    g.save(); bodyPath(); g.clip();
    gr = g.createLinearGradient(-BW / 2, 0, BW / 2, 0);
    gr.addColorStop(0, '#b9c5d0'); gr.addColorStop(0.2, '#f6f9fb'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.85, '#e0e7ed'); gr.addColorStop(1, '#a5b2bf');
    g.fillStyle = gr; g.fillRect(-BW / 2 - 2, y1 - 2, BW + 4, Lb + 6);
    // 印刷
    g.fillStyle = '#e03a3e'; g.fillRect(-BW / 2 - 2, y0 - 10, BW + 4, 5);
    g.fillStyle = '#2459c9'; g.fillRect(-BW / 2 - 2, y0 - 16, BW + 4, 6);
    g.fillStyle = '#2f6fe0'; g.fillRect(-BW / 2 - 2, y0 - 62, BW + 4, 46);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `900 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(0, y0 - 39); g.fillText('FRESH', 0, -7); g.font = `700 9px ${FONT}`; g.fillText('MINT  100g', 0, 7); g.restore();
    g.save(); g.translate(2, y0 - 62 - (Lb - 62) * 0.5 - 6); g.rotate(-Math.PI / 2);
    g.fillStyle = '#2459c9'; g.font = `900 22px ${FONT}`; g.fillText('MINT', 0, 0); g.restore();
    g.fillStyle = '#e03a3e'; g.beginPath(); g.arc(0, y1 + 22, 5, 0, Math.PI * 2); g.fill();
    // 円筒の陰影
    gr = g.createLinearGradient(-BW / 2, 0, BW / 2, 0);
    gr.addColorStop(0, 'rgba(10,25,50,0.38)'); gr.addColorStop(0.18, 'rgba(10,25,50,0)'); gr.addColorStop(0.62, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(10,25,50,0.36)');
    g.fillStyle = gr; g.fillRect(-BW / 2 - 2, y1 - 2, BW + 4, Lb + 6);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-BW * 0.24, y1, 4, Lb);
    // しわ
    const wk = 12;
    for (let k = 0; k < wk; k++) {
      const y = y0 - 8 - k * (Lb - 14) / wk, b = bell(y);
      const a = 0.06 + 0.3 * s.used * ((k * 7) % 5) / 4 + 0.5 * sq * b;
      const hh = hw(y);
      g.strokeStyle = `rgba(30,45,70,${a})`; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-hh, y + ((k * 3) % 4)); g.quadraticCurveTo(0, y + 2 + 5 * sq * b, hh, y - 3 + ((k * 5) % 3)); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${a * 1.3})`;
      g.beginPath(); g.moveTo(-hh, y + 1.6 + ((k * 3) % 4)); g.quadraticCurveTo(0, y + 3.6 + 5 * sq * b, hh, y - 1.4 + ((k * 5) % 3)); g.stroke();
    }
    if (sq > 0.05) {
      g.strokeStyle = `rgba(30,45,70,${sq * 0.38})`; g.lineWidth = 1.1; g.beginPath();
      for (let k = 0; k < 5; k++) { const y = mid + (k - 2) * 15; g.moveTo(-hw(y), y - 4); g.lineTo(-hw(y) * 0.2, y + 6 + k); g.moveTo(hw(y), y + 2); g.lineTo(hw(y) * 0.25, y - 7 + k); }
      g.stroke();
    }
    g.restore();
    // 圧着部
    gr = g.createLinearGradient(-BW / 2, 0, BW / 2, 0);
    gr.addColorStop(0, '#9fadba'); gr.addColorStop(0.3, '#e9eef2'); gr.addColorStop(1, '#8e9dab');
    g.fillStyle = gr; g.fillRect(-hw(y1), y1 - 15, hw(y1) * 2, 15);
    g.strokeStyle = 'rgba(40,55,75,0.4)'; g.lineWidth = 1; g.beginPath();
    for (let y = y1 - 13; y < y1 - 1; y += 2.6) { g.moveTo(-hw(y1), y); g.lineTo(hw(y1), y); }
    g.stroke();
  }
  // 指
  const tipY = mid, fy = [tipY, tipY + 16];
  if (TI.hand) { // 実写の手: 指先をチューブ右側面に当て、押し込みに合わせて食い込ませる
    const hd = (handC ??= fadedHand(TI.hand, 540, [0.06, 0, 0, 0])), Hs = 250, tx = hw(mid) - 4 - sq * 7, ty = mid + 4;
    g.save(); g.translate(tx, ty);
    g.rotate(Math.PI / 2); g.imageSmoothingQuality = 'high';
    g.drawImage(hd, -0.56 * Hs, -0.9 * Hs, Hs, Hs * hd.height / hd.width);
    g.restore(); void t; return;
  }
  for (let k = 0; k < 2; k++) {
    const side = k === 0 ? 1 : -1, rx = 17, ry = 27;
    const cx = side * (hw(fy[k]) + rx - 4 + (1 - sq) * 6);
    const sg = g.createRadialGradient(cx - side * 6, fy[k] - 8, 3, cx, fy[k], 36);
    sg.addColorStop(0, '#f6d3b6'); sg.addColorStop(0.6, '#e2ab86'); sg.addColorStop(1, '#bd7f5a');
    g.fillStyle = 'rgba(40,20,10,0.18)'; g.beginPath(); g.ellipse(cx - side * 3, fy[k] + 3, rx + 2, ry + 2, side * 0.15, 0, Math.PI * 2); g.fill();
    g.fillStyle = sg; g.beginPath(); g.ellipse(cx, fy[k], rx, ry, side * 0.15, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,60,30,0.28)'; g.lineWidth = 1; g.beginPath(); g.arc(cx + side * 4, fy[k] + 6, 14, side > 0 ? 2.3 : 0.2, side > 0 ? 3.6 : 1.5); g.stroke();
  }
  void t;
}

// ---- 全体 ----
export function drawScene(g: CanvasRenderingContext2D, w: number, h: number, s: Scene, t: number, dx = 0) {
  const S = Math.min(w / VW, h / VH);
  const ox = (w - VW * S) / 2, oy = (h - VH * S) * 0.4;
  drawBg(g, w, h, ox, oy, S);
  g.save(); g.translate(ox, oy); g.scale(S, S); g.translate(dx, 0);
  drawCap(g); drawBrush(g); drawRuler(g);
  const over = s.L * PXMM > MAXPX;
  const tipPx = Math.min(s.L * PXMM, MAXPX), yc = YB - 4;
  // 歯磨き粉
  drawPaste(g, X0, yc, tipPx, PD, s.amp, t, s.taper);
  if (over) drawPile(g, X0 + MAXPX - 6, yc - 2, PD, Math.min(95, (s.L - MAXPX / PXMM) * 0.6));
  const tipX = X0 + tipPx;
  // 目標線
  const tx = X0 + s.target * PXMM;
  g.strokeStyle = 'rgba(255,59,48,0.22)'; g.lineWidth = 5; g.beginPath(); g.moveTo(tx, YB - 36); g.lineTo(tx, YR + 46); g.stroke();
  g.strokeStyle = '#ff3b30'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx, YB - 36); g.lineTo(tx, YR + 46); g.stroke();
  g.fillStyle = '#ff3b30'; rr(g, tx - 28, YB - 58, 56, 21, 10.5); g.fill();
  g.beginPath(); g.moveTo(tx - 5, YB - 38); g.lineTo(tx + 5, YB - 38); g.lineTo(tx, YB - 32); g.fill();
  g.fillStyle = '#fff'; g.font = `800 12px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fmtCm(s.target), tx, YB - 47);
  // 先端マーカー
  if (s.L > 0.5) {
    g.strokeStyle = 'rgba(30,110,230,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(tipX, yc + 8); g.lineTo(tipX, YR + 20); g.stroke();
    g.fillStyle = '#1f6fe0'; g.beginPath(); g.moveTo(tipX, YR + 2); g.lineTo(tipX - 5, YR + 12); g.lineTo(tipX + 5, YR + 12); g.closePath(); g.fill();
  }
  // チューブ
  const sw = Math.sin(t * 1.3) * 0.012, jt = s.flow * 1.1 + s.grip * 0.4;
  const jx = Math.sin(t * 91) * jt, jy = Math.cos(t * 77) * jt;
  const nx = tipX + 3 - s.lift * 12 + jx, ny = yc - 8 - s.lift * 30 + jy;
  if (s.thread > 0.02 && s.L > 1) {
    g.strokeStyle = '#f4f6f8'; g.lineWidth = Math.max(0.6, PD * 0.45 * s.thread); g.lineCap = 'round';
    g.beginPath(); g.moveTo(tipX, yc); g.quadraticCurveTo(tipX + 1, (yc + ny) / 2 + 4, nx, ny + 2); g.stroke();
  }
  g.save(); g.translate(nx, ny); g.rotate(-0.3 + sw + s.grip * 0.01); g.scale(0.85, 0.85); drawTube(g, s, t); g.restore();
  // ブシュッの飛沫
  if (s.spat >= 0) {
    const k = s.spat / 0.7;
    g.fillStyle = `rgba(250,252,255,${(1 - k) * 0.9})`;
    for (let i = 0; i < 7; i++) {
      const a = -0.2 - i * 0.28 + (i % 2) * 0.2, d = 8 + k * (22 + i * 6);
      g.beginPath(); g.arc(nx + Math.cos(a) * d + 6, ny + 6 + Math.sin(a) * d * 0.7 + k * k * 22, 2.4 - k * 1.2 + (i % 3) * 0.5, 0, Math.PI * 2); g.fill();
    }
  }
  // 結果表示
  if (s.reveal > 0.01) {
    const k = clamp(s.reveal), e = s.L - s.target, a = Math.abs(e);
    const col = a <= 0.5 ? '#12a85a' : a <= 3 ? '#e8890c' : '#e03a3e';
    g.globalAlpha = k;
    const ly = YB - 66 - 4 * (1 - k);
    g.fillStyle = '#10202e'; rr(g, tipX - 31, ly - 11, 62, 22, 11); g.fill();
    g.fillStyle = '#fff'; g.font = `800 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fmtCm(s.L), tipX, ly);
    const by = YR + 62;
    if (Math.abs(tipX - tx) > 4) {
      g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(tipX, by); g.lineTo(tx, by);
      g.moveTo(tipX, by - 6); g.lineTo(tipX, by + 6); g.moveTo(tx, by - 6); g.lineTo(tx, by + 6); g.stroke();
    }
    const pop = 0.75 + 0.25 * Math.min(1, k * 1.4) + Math.sin(k * Math.PI) * 0.06;
    g.save(); g.translate(VW / 2, by + 52); g.scale(pop, pop);
    g.fillStyle = col; g.font = `900 52px ${FONT}`; g.textBaseline = 'middle'; g.fillText(fmtErr(e), 0, 0);
    g.fillStyle = '#3a4a58'; g.font = `800 18px ${FONT}`; g.fillText(verdictOf(e), 0, 40);
    g.restore();
    g.globalAlpha = 1;
  }
  // HUD
  if (s.hud) {
    g.fillStyle = '#4a5c6a'; g.font = `800 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`ROUND ${s.hud.round} / ${s.hud.total}　目標`, VW / 2, 34);
    g.fillStyle = '#10202e'; g.font = `900 46px ${FONT}`; g.fillText(fmtCm(s.target), VW / 2, 74);
    if (s.hud.hint) {
      g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 4); g.fillStyle = '#10202e'; g.font = `800 17px ${FONT}`;
      g.fillText(s.hud.hint, VW / 2, YR + 100); g.globalAlpha = 1;
    }
    if (s.hud.held) {
      g.strokeStyle = 'rgba(31,111,224,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(VW / 2, 540, 20 + s.grip * 10, 0, Math.PI * 2); g.stroke();
    }
  }
  g.restore();
}

export { lerp };

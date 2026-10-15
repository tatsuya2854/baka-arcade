import { CFG } from './config';
import { loadImg } from '../../core/images';

const SLUG = 'ketchup-pour';
/** 生成画像(読めなければ null=旧描画にフォールバック)。モジュール共有・小さいので解放不要 */
export const KI: { bg: HTMLImageElement | null; hero: HTMLImageElement | null } = { bg: null, hero: null };
let kiP: Promise<void> | null = null;
export const loadKetchupImgs = (): Promise<void> => (kiP ??= Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero')]).then(([b, h]) => { KI.bg = b; KI.hero = h; }));

export interface Layout {
  w: number; h: number; cx: number; cy: number; rx: number; ry: number;
  kx: number; ky: number; px: number; py: number; tipX: number; tipY: number; s: number; poster: boolean;
}
/** ゲーム/リプレイ用(ボトルあり) と ポスター用(皿を中央に大きく) */
/** 背景写真の配置。ゲーム/リプレイ=右寄せ cover、ポスター=皿の中央を画面中央へ寄せて少しズーム */
function bgPlace(w: number, h: number, poster: boolean) {
  const b = KI.bg!, base = Math.max(w / b.width, h / b.height), sc = base * (poster && h > w ? 1.5 : 1), dw = b.width * sc, dh = b.height * sc;
  const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const ox = poster ? cl(w * 0.5 - 0.70 * dw, w - dw, 0) : w - dw, oy = poster ? cl(h * 0.55 - 0.485 * dh, h - dh, 0) : (h - dh) * 0.5;
  return { ox, oy, dw, dh };
}
/** ゲーム/リプレイ用(ボトルあり) と ポスター用(皿を中央に大きく) */
export function layoutFor(w: number, h: number, poster = false): Layout {
  let cx = w / 2;
  let rx: number, cy: number;
  if (KI.bg) {
    // 背景写真の皿(真上から・円形)のきれいな中央に合わせる。ふちぎわのポテトを避ける
    const { ox, oy, dw, dh } = bgPlace(w, h, poster);
    cx = ox + 0.70 * dw; cy = oy + 0.485 * dh;
    rx = Math.min(0.29 * dw * 0.95, w * 0.44);
    if (poster) { rx = Math.min(rx, cx - 4, w - cx - 4, cy - 4, h - cy - 4); }
    const kx = rx / CFG.plateR, ky = kx, s = rx / 165, px = cx, py = cy;
    return { w, h, cx, cy, rx, ry: rx, kx, ky, px, py, tipX: px, tipY: py - rx * 0.82, s, poster };
  }
  if (poster) { rx = Math.min(w * 0.46, h * 0.6); cy = h * 0.5; } else { rx = Math.min(w * 0.44, h * 0.3); cy = h * 0.66; }
  const ry = rx * 0.6, kx = rx / CFG.plateR, ky = ry / CFG.plateR;
  const px = cx, py = cy - ry * 0.04;
  const s = rx / 165;
  return { w, h, cx, cy, rx, ry, kx, ky, px, py, tipX: px, tipY: py - rx * 0.82, s, poster };
}
export const cellX = (L: Layout, gx: number) => L.cx + (gx - CFG.N / 2) * L.kx;
export const cellY = (L: Layout, gy: number) => L.cy + (gy - CFG.N / 2) * L.ky;

const ell = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };

/** 背景(カウンター)・皿・オムライス。重いのでキャッシュして使う */
export function buildBackdrop(L: Layout, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(L.w * scale)); c.height = Math.max(2, Math.round(L.h * scale));
  const g = c.getContext('2d')!; g.scale(scale, scale);
  const { w, h, cx, cy, rx, ry } = L;
  if (KI.bg) {
    const b = KI.bg, { ox, oy, dw, dh } = bgPlace(w, h, L.poster);
    g.drawImage(b, ox, oy, dw, dh);
    // 上部の文字・HUD/下部の文字が読めるよう暗幕を薄く
    const top = L.poster ? 0.3 : 0.2;
    let gr = g.createLinearGradient(0, 0, 0, h * top); gr.addColorStop(0, `rgba(20,10,4,${L.poster ? 0.6 : 0.35})`); gr.addColorStop(1, 'rgba(20,10,4,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h * top);
    if (L.poster) { gr = g.createLinearGradient(0, h * 0.78, 0, h); gr.addColorStop(0, 'rgba(20,10,4,0)'); gr.addColorStop(1, 'rgba(20,10,4,0.62)'); g.fillStyle = gr; g.fillRect(0, h * 0.78, w, h * 0.22); }
    return c;
  }
  // カウンター(淡い面)
  let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e4dfd6'); gr.addColorStop(0.55, '#d6d0c5'); gr.addColorStop(1, '#bfb8ab');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  gr = g.createRadialGradient(cx, cy - ry * 0.4, rx * 0.2, cx, cy, Math.max(w, h) * 0.85); gr.addColorStop(0, 'rgba(255,250,240,.55)'); gr.addColorStop(1, 'rgba(60,45,30,.28)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.05; g.strokeStyle = '#6b5d4a'; g.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const y = ((i + 0.5) / 9) * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 8, w, y + 3); g.stroke(); }
  g.globalAlpha = 1;
  // 皿の影
  g.save(); g.filter = `blur(${Math.round(rx * 0.06)}px)`; g.fillStyle = 'rgba(40,28,16,.38)'; ell(g, cx + rx * 0.04, cy + ry * 0.2, rx * 1.01, ry * 1.0); g.fill(); g.restore();
  g.save(); g.filter = `blur(${Math.round(rx * 0.02)}px)`; g.fillStyle = 'rgba(30,20,10,.35)'; ell(g, cx, cy + ry * 0.08, rx * 1.0, ry * 1.0); g.fill(); g.restore();
  // 皿の厚み
  gr = g.createLinearGradient(cx - rx, 0, cx + rx, 0); gr.addColorStop(0, '#cfcbc4'); gr.addColorStop(0.5, '#f1efea'); gr.addColorStop(1, '#bdb9b2');
  g.fillStyle = gr; ell(g, cx, cy + ry * 0.07, rx, ry); g.fill();
  // リム
  gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.8, cy + ry); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#f4f2ee'); gr.addColorStop(1, '#d9d6cf');
  g.fillStyle = gr; ell(g, cx, cy, rx, ry); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.5 * L.s; ell(g, cx, cy, rx - 1, ry - 1); g.stroke();
  // くぼみ
  gr = g.createLinearGradient(cx, cy - ry * 0.8, cx, cy + ry * 0.8); gr.addColorStop(0, '#dedbd4'); gr.addColorStop(0.35, '#f3f1ec'); gr.addColorStop(1, '#fbfaf7');
  g.fillStyle = gr; ell(g, cx, cy + ry * 0.01, rx * 0.8, ry * 0.8); g.fill();
  g.strokeStyle = 'rgba(120,110,95,.28)'; g.lineWidth = 1.2 * L.s; ell(g, cx, cy + ry * 0.01, rx * 0.8, ry * 0.8); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.8)'; ell(g, cx, cy + ry * 0.03, rx * 0.8, ry * 0.8); g.stroke();
  // オムライス
  const ox = cx - rx * 0.01, oy = cy - ry * 0.02, orx = rx * 0.58, ory = ry * 0.56, rot = -0.1;
  g.save(); g.filter = `blur(${Math.round(rx * 0.03)}px)`; g.fillStyle = 'rgba(70,40,10,.32)'; ell(g, ox + rx * 0.02, oy + ry * 0.14, orx * 1.02, ory * 0.98, rot); g.fill(); g.restore();
  g.save(); ell(g, ox, oy, orx, ory, rot); g.clip();
  gr = g.createRadialGradient(ox - orx * 0.25, oy - ory * 0.45, orx * 0.05, ox, oy, orx * 1.05);
  gr.addColorStop(0, '#ffe88a'); gr.addColorStop(0.45, '#fbcf4c'); gr.addColorStop(0.85, '#eba526'); gr.addColorStop(1, '#c9821a');
  g.fillStyle = gr; g.fillRect(ox - orx, oy - ory, orx * 2, ory * 2);
  g.globalAlpha = 0.18; g.fillStyle = '#fff3b0';
  for (let i = 0; i < 26; i++) { const a = i * 2.399, r = 0.15 + 0.8 * ((i * 37) % 100) / 100; ell(g, ox + Math.cos(a) * orx * r, oy + Math.sin(a) * ory * r, (6 + (i % 5) * 3) * L.s, (3 + (i % 3) * 2) * L.s, a); g.fill(); }
  g.globalAlpha = 0.14; g.fillStyle = '#b8701a';
  for (let i = 0; i < 18; i++) { const a = i * 1.7 + 1, r = 0.2 + 0.75 * ((i * 53) % 100) / 100; ell(g, ox + Math.cos(a) * orx * r, oy + Math.sin(a) * ory * r, (5 + (i % 4) * 3) * L.s, (2 + (i % 3)) * L.s, a); g.fill(); }
  g.globalAlpha = 1;
  gr = g.createRadialGradient(ox - orx * 0.3, oy - ory * 0.55, 1, ox - orx * 0.3, oy - ory * 0.55, orx * 0.55); gr.addColorStop(0, 'rgba(255,255,240,.75)'); gr.addColorStop(1, 'rgba(255,255,240,0)');
  g.fillStyle = gr; g.fillRect(ox - orx, oy - ory, orx * 2, ory * 2);
  g.restore();
  g.strokeStyle = 'rgba(150,90,10,.35)'; g.lineWidth = 1.2 * L.s; ell(g, ox, oy, orx, ory, rot); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2 * L.s; g.beginPath(); g.ellipse(ox, oy, orx * 0.97, ory * 0.97, rot, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
  return c;
}

/** ケチャップの高さマップを陰影つきで N×N の canvas に焼く */
export class KetchupShader {
  readonly cv = document.createElement('canvas');
  private g: CanvasRenderingContext2D; private img: ImageData; private buf: Uint32Array;
  private ba = new Float32Array(CFG.N * CFG.N); private bb2 = new Float32Array(CFG.N * CFG.N);
  constructor() {
    const N = CFG.N; this.cv.width = N; this.cv.height = N;
    this.g = this.cv.getContext('2d')!; this.img = this.g.createImageData(N, N); this.buf = new Uint32Array(this.img.data.buffer);
  }
  /** H: 高さ。scale: 量子化データの場合の係数(h = H*scale) */
  shade(Hraw: ArrayLike<number>, scale = 1) {
    const N = CFG.N, buf = this.buf;
    // 面を丸くするため高さを軽くぼかす(法線のカクつき・階段を消す)
    let A = this.ba, B = this.bb2;
    for (let i = 0; i < A.length; i++) A[i] = Hraw[i] * scale;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < N; j++) for (let i = 1; i < N - 1; i++) { const k = j * N + i; B[k] = (A[k - 1] + 2 * A[k] + A[k + 1]) * 0.25; }
      for (let j = 1; j < N - 1; j++) for (let i = 0; i < N; i++) { const k = j * N + i; A[k] = (B[k - N] + 2 * B[k] + B[k + N]) * 0.25; }
    }
    const H = A; scale = 1;
    const lx = KI.bg ? 0.42 : -0.42, ly = -0.52, lz = 0.74; const ln = Math.hypot(lx, ly, lz); const Lx = lx / ln, Ly = ly / ln, Lz = lz / ln;
    let hx = Lx, hy = Ly, hz = Lz + 1; const hn = Math.hypot(hx, hy, hz); hx /= hn; hy /= hn; hz /= hn;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const idx = j * N + i, h = H[idx];
      if (h < 0.012 || i === 0 || j === 0 || i === N - 1 || j === N - 1) { buf[idx] = 0; continue; }
      const o2 = (i > 1 && j > 1 && i < N - 2 && j < N - 2) ? 2 : 1;
      const gx = ((H[idx + 1] - H[idx - 1]) * 0.6 + (H[idx + o2] - H[idx - o2]) * 0.2) * 0.5 * scale, gy = ((H[idx + N] - H[idx - N]) * 0.6 + (H[idx + o2 * N] - H[idx - o2 * N]) * 0.2) * 0.5 * scale;
      let nx = -gx * 6, ny = -gy * 6, nz = 1; const il = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= il; ny *= il; nz *= il;
      const diff = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      const nh = Math.max(0, nx * hx + ny * hy + nz * hz); const s2 = nh * nh, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8, s32 = s16 * s16;
      const spec = s16 * s8 * 0.9 + s8 * 0.28 + s2 * 0.04;
      const t = Math.min(1, h / 3.2);
      const br = 240 - 40 * t, bgc = 84 - 54 * t, bb = 50 - 22 * t;
      const lit = 0.66 + 0.52 * diff + 0.1 * (1 - nz);
      let r = br * lit + spec * 255 + 14, gg = bgc * lit + spec * 235 + 2, b = bb * lit + spec * 225 + 2;
      const edge = Math.max(0, 1 - h / 0.5) * 0.25; r += 40 * edge; gg += 22 * edge;
      const a = Math.min(1, Math.max(0, (h - 0.012) / 0.1)); const aa = a * a * (3 - 2 * a);
      r = r > 255 ? 255 : r; gg = gg > 255 ? 255 : gg; b = b > 255 ? 255 : b;
      buf[idx] = (Math.round(aa * 255) << 24) | ((b | 0) << 16) | ((gg | 0) << 8) | (r | 0);
    }
    this.g.putImageData(this.img, 0, 0);
  }
  draw(g: CanvasRenderingContext2D, L: Layout) {
    const N = CFG.N; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(this.cv, L.cx - (N / 2) * L.kx, L.cy - (N / 2) * L.ky, N * L.kx, N * L.ky);
  }
}

/** 目標輪郭(点線) */
export function drawTarget(g: CanvasRenderingContext2D, L: Layout, t: number, alpha = 1, label = true) {
  const R = CFG.outlineR, lw = 1.7 / ((L.kx + L.ky) / 2) * Math.max(1, L.s * 0.9);
  g.save(); g.translate(L.cx, L.cy); g.scale(L.kx, L.ky);
  g.globalAlpha = alpha; g.lineCap = 'round';
  g.setLineDash([2.6, 2.4]); g.lineDashOffset = -t * 3;
  g.strokeStyle = 'rgba(40,28,20,.55)'; g.lineWidth = lw * 1.7; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
  g.restore();
  if (label) {
    g.save(); g.globalAlpha = alpha; g.textAlign = 'center'; g.font = `900 ${Math.round(12 * L.s + 3)}px "Hiragino Sans","Noto Sans JP",sans-serif`;
    const tx = L.cx, ty = L.cy + CFG.outlineR * L.ky + 17 * L.s;
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.strokeText('この量が理想', tx, ty); g.fillStyle = '#4a3226'; g.fillText('この量が理想', tx, ty); g.restore();
  }
}

/** ボトル。ノズル先端が (L.tipX,L.tipY)。theta=傾き(0..1), squeeze=握り(0..1) */
export function drawBottle(g: CanvasRenderingContext2D, L: Layout, theta: number, squeeze: number) {
  if (KI.hero) { drawBottleImg(g, L, theta, squeeze, KI.hero); return; }
  const s = L.s; g.save(); g.translate(L.tipX, L.tipY); g.rotate((1 - theta) * 0.95);
  const bw = 34 * s;
  const sq = 1 - 0.1 * squeeze, st = 1 + 0.035 * squeeze;
  g.save(); g.scale(sq, st);
  const top = -228 * s, sh = -64 * s;
  g.beginPath();
  g.moveTo(-13 * s, -34 * s); g.lineTo(-17 * s, -40 * s);
  g.bezierCurveTo(-24 * s, sh + 6 * s, -bw, sh - 4 * s, -bw - 1 * s, sh - 28 * s);
  g.lineTo(-bw - 2 * s, top + 22 * s); g.quadraticCurveTo(-bw - 2 * s, top, -bw + 18 * s, top);
  g.lineTo(bw - 18 * s, top); g.quadraticCurveTo(bw + 2 * s, top, bw + 2 * s, top + 22 * s);
  g.lineTo(bw + 1 * s, sh - 28 * s); g.bezierCurveTo(bw, sh - 4 * s, 24 * s, sh + 6 * s, 17 * s, -40 * s); g.lineTo(13 * s, -34 * s); g.closePath();
  let gr = g.createLinearGradient(-bw, 0, bw, 0);
  gr.addColorStop(0, '#6d0a10'); gr.addColorStop(0.18, '#b3141b'); gr.addColorStop(0.38, '#e8362b'); gr.addColorStop(0.55, '#d11d22'); gr.addColorStop(0.85, '#8a0d14'); gr.addColorStop(1, '#5a070d');
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  // ラベル
  gr = g.createLinearGradient(-bw, 0, bw, 0); gr.addColorStop(0, '#d9ccb2'); gr.addColorStop(0.35, '#fbf4e3'); gr.addColorStop(0.7, '#efe3c9'); gr.addColorStop(1, '#bfae8b');
  g.fillStyle = gr; g.beginPath(); g.roundRect(-bw - 4 * s, -176 * s, bw * 2 + 8 * s, 74 * s, 10 * s); g.fill();
  g.fillStyle = '#c4161c'; g.beginPath(); g.arc(0, -138 * s, 19 * s, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-6 * s, -145 * s, 6 * s, 4 * s, -0.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2f7d32'; g.beginPath();
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; g.lineTo(Math.cos(a) * 11 * s, -156 * s + Math.sin(a) * 6 * s); g.lineTo(Math.cos(a + 0.6283) * 4 * s, -156 * s + Math.sin(a + 0.6283) * 2.2 * s); }
  g.closePath(); g.fill();
  // 縦ハイライト
  gr = g.createLinearGradient(-bw * 0.62, 0, -bw * 0.38, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-bw * 0.62, top + 10 * s, bw * 0.24, sh - top - 10 * s);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(bw * 0.55, top + 14 * s, 3 * s, sh - top - 24 * s);
  g.restore(); g.restore();
  // キャップ(ノズル)
  g.beginPath(); g.moveTo(-5 * s, 0); g.lineTo(5 * s, 0); g.lineTo(15 * s, -34 * s); g.lineTo(-15 * s, -34 * s); g.closePath();
  gr = g.createLinearGradient(-15 * s, 0, 15 * s, 0); gr.addColorStop(0, '#b8aa8c'); gr.addColorStop(0.35, '#fffaf0'); gr.addColorStop(1, '#a89a7b'); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 1.6 * s, -1); g.lineTo(k * 5.5 * s, -33 * s); g.stroke(); }
  g.fillStyle = gr; g.beginPath(); g.roundRect(-20 * s, -46 * s, 40 * s, 13 * s, 3 * s); g.fill();
  g.restore();
}

/** 流れ。q=現在流量。ノズル先端から landY まで */
export function drawStream(g: CanvasRenderingContext2D, L: Layout, q: number, landY: number, t: number) {
  if (q < 8) return;
  const s = L.s, w0 = (2.2 + Math.sqrt(q) * 0.3) * s, neck = Math.max(0, Math.min(1, 1 - q / 260));
  const x = L.tipX, y0 = L.tipY - 2 * s, y1 = landY, n = 16;
  const wid = (f: number) => w0 * (1.15 - 0.4 * f) * (1 - 0.72 * neck * Math.sin(Math.PI * f)) + 0.6 * s;
  const cxAt = (f: number) => x + Math.sin(f * 7 + t * 14) * Math.min(3, q / 500) * s * f;
  g.beginPath();
  for (let i = 0; i <= n; i++) { const f = i / n; g.lineTo(cxAt(f) - wid(f) / 2, y0 + (y1 - y0) * f); }
  for (let i = n; i >= 0; i--) { const f = i / n; g.lineTo(cxAt(f) + wid(f) / 2, y0 + (y1 - y0) * f); }
  g.closePath();
  const gr = g.createLinearGradient(x - w0, 0, x + w0, 0); gr.addColorStop(0, '#6e0910'); gr.addColorStop(0.3, '#e0352a'); gr.addColorStop(0.55, '#b3151b'); gr.addColorStop(1, '#5a060c');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,230,220,.7)'; g.lineWidth = Math.max(0.8, w0 * 0.14); g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i <= n; i++) { const f = i / n; const px = cxAt(f) - wid(f) * 0.2, py = y0 + (y1 - y0) * f; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.stroke();
}

export function drawDrop(g: CanvasRenderingContext2D, x: number, y: number, r: number, a = 1) {
  g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1); gr.addColorStop(0, '#ff7766'); gr.addColorStop(0.35, '#d9231f'); gr.addColorStop(1, '#6a0810');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 0.85, r * 1.1, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.4, Math.max(0.6, r * 0.2), 0, Math.PI * 2); g.fill();
  g.restore();
}

/** 生成画像のボトル(ポテト付き原画からボトル部分だけ切り出す)。傾き・握りのつぶれは既存ロジックのまま */
function drawBottleImg(g: CanvasRenderingContext2D, L: Layout, theta: number, squeeze: number, im: HTMLImageElement) {
  const k = im.width / 1254, sx = 858 * k, sy = 24 * k, sw = 336 * k, sh = 690 * k;   // ボトルだけの範囲(下端はココットに隠れるため y=715 で切り、丸く見せる)
  const tipX = (1052 - 858) * k;                       // ノズル先端の x(切り出し内)
  const H = 238 * L.s, sc = H / sh, bodyW = sw * sc;
  const sq = 1 - 0.1 * squeeze, st = 1 + 0.035 * squeeze;
  g.save(); g.translate(L.tipX, L.tipY); g.rotate((1 - theta) * 0.95);
  // 接地しない影(皿へ落ちる柔らかい影)
  g.fillStyle = 'rgba(30,18,8,.16)'; g.beginPath(); g.ellipse(10 * L.s, 6 * L.s, 20 * L.s, 7 * L.s, 0, 0, Math.PI * 2); g.fill();
  g.scale(sq, st); g.rotate(Math.PI);   // 画像はノズルが上 → ノズルを下に
  g.beginPath(); g.roundRect(-tipX * sc - 2, -2, bodyW + 4, H + 2, [0, 0, 44 * sc * 1.2, 44 * sc * 1.2]); g.clip();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  // 胴体を横ストリップで描き、握った所(中ほど)だけ細くする
  const n = 24;
  for (let i = 0; i < n; i++) {
    const f0 = i / n, fm = f0 + 0.5 / n;
    const pinch = 1 - 0.18 * squeeze * Math.exp(-Math.pow((fm - 0.5) / 0.22, 2));
    g.drawImage(im, sx, sy + f0 * sh, sw, sh / n + 0.6, -tipX * sc * pinch, f0 * H, bodyW * pinch, H / n + 1);
  }
  g.restore();
}

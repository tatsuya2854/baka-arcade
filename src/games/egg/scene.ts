// 目玉焼きの世界の描画（ゲーム本編・リプレイ・結果アート・開始デモで共有）。すべて Canvas2D。
import { C } from './config';
import { loadImg } from '../../core/images';

// 生成画像(無ければ null → 従来の Canvas 描画にフォールバック)
const SLUG = 'egg-landing';
const IM: { bg: HTMLImageElement | null; hero: HTMLImageElement | null; item: HTMLImageElement | null } = { bg: null, hero: null, item: null };
let imPromise: Promise<void> | null = null;
/** 開始前に先読み。失敗しても resolve する */
export function preloadEggImages(): Promise<void> {
  imPromise ??= Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero'), loadImg(SLUG, 'item')]).then(([bg, hero, item]) => { IM.bg = bg; IM.hero = hero; IM.item = item; bgCache.clear(); });
  return imPromise;
}
// bg.png(1024x1536)上のフライパン底の中心と半径(px)
const BG_W = 1024, BG_H = 1536, PAN_PX = 515, PAN_PY = 670, PAN_RPX = 345, BG_K = 0.94;

export interface Geom { cx: number; cy: number; s: number; k: number; kz?: number }
/** ゲーム/リプレイ用: やや斜め上から見たフライパン。k=縦つぶし率 */
export const geomFor = (w: number, h: number): Geom => {
  if (IM.bg) { // 背景画像を上端揃えで置き、フライパンの位置に座標系を合わせる(真上からの視点)。足りない下側は鏡像で延長
    const sc = Math.max(w / BG_W, Math.min(Math.max(w / BG_W, h / BG_H), w / 350 * C.PAN_R / PAN_RPX)), ox = (w - BG_W * sc) / 2;
    return { cx: ox + PAN_PX * sc, cy: PAN_PY * sc, s: PAN_RPX * sc / C.PAN_R, k: BG_K, kz: 0.5 };
  }
  return { cx: w / 2, cy: h * 0.6, s: Math.min(w / 318, h / 640), k: 0.55 };
};
const KZ = 0.83;
const TAU = Math.PI * 2;
const px = (gm: Geom, X: number) => gm.cx + X * gm.s;
const py = (gm: Geom, Y: number, z = 0) => gm.cy + Y * gm.s * gm.k - z * gm.s * (gm.kz ?? KZ);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const el = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); };

// ---------------- 落とした卵 ----------------
export interface Drop {
  X: number; Y: number; z0: number; idx: number;
  d: number; miss: boolean; rim: boolean; burst: boolean;
  Wf: number; score: number; tFall: number;
  a: number[]; ph: number[]; yx: number; yy: number; rot0: number;
}
export function makeDrop(X: number, Y: number, z0: number, idx: number): Drop {
  const d = Math.hypot(X, Y);
  const miss = d > C.PAN_R + C.MISS_MARGIN, rim = !miss && d > C.PAN_R - C.RIM_BAND, burst = z0 > C.BURST_Z;
  let sc = d >= C.PAN_R ? 0 : 1000 * Math.pow(1 - Math.max(0, d - C.PERFECT_MM) / C.PAN_R, 3);
  if (burst) sc *= C.BURST_MUL;
  if (rim) sc *= C.RIM_MUL;
  // 決定論的シード（着地位置・高さのみで決まる）
  let h = Math.floor((Math.sin(X * 12.9898 + Y * 78.233 + z0 * 0.37 + idx) * 43758.5453 % 1 + 1) * 1e6) | 1;
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  const spd = clamp((z0 - 120) / 200);
  return {
    X, Y, z0, idx, d, miss, rim, burst, score: Math.round(sc),
    Wf: (30 + z0 * 0.075) * (burst ? 1.12 : 1), tFall: Math.sqrt((2 * z0) / C.G),
    a: [0.07 + rnd() * 0.08, 0.05 + rnd() * 0.07 + spd * 0.04, 0.03 + rnd() * 0.05, 0.02 + rnd() * 0.04],
    ph: [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU], yx: (rnd() - 0.5) * 6, yy: (rnd() - 0.5) * 6, rot0: (rnd() - 0.5) * 0.6,
  };
}
export const impactSpeed = (dr: Drop) => C.G * dr.tFall;
const spreadP = (ts: number) => 1 - Math.exp(-ts * 2.6);

// ---------------- 背景(キャッシュ) ----------------
const bgCache = new Map<string, HTMLCanvasElement>();
function bgFor(g: CanvasRenderingContext2D, w: number, h: number, gm: Geom): HTMLCanvasElement {
  const sc = Math.round(Math.max(1, Math.min(2, g.getTransform().a)) * 2) / 2;
  const key = `${IM.bg ? 'i' : 'p'}${Math.round(w)}x${Math.round(h)}|${gm.k}|${Math.round(gm.cx)},${Math.round(gm.cy)},${gm.s.toFixed(2)}|${sc}`;
  let cv = bgCache.get(key);
  if (!cv) {
    if (bgCache.size >= 4) { const k0 = bgCache.keys().next().value; if (k0 !== undefined) bgCache.delete(k0); }
    cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
    const c = cv.getContext('2d')!; c.scale(sc, sc); paintBg(c, w, h, gm); bgCache.set(key, cv);
  }
  return cv;
}
export const releaseEggCaches = () => { bgCache.clear(); puff = null; };

function paintImgBg(c: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, gm: Geom) {
  const { cx, cy, s, k } = gm, R = C.PAN_R;
  c.fillStyle = '#1a1612'; c.fillRect(0, 0, w, h);
  const sx = R * s / PAN_RPX, sy = sx * k / BG_K;
  const x0 = cx - PAN_PX * sx, y0 = cy - PAN_PY * sy, ih = BG_H * sy, iw = BG_W * sx;
  // 画像が足りない上下は反転コピーで延長(木のカウンターが続いて見える)
  for (let i = Math.min(0, -Math.ceil(y0 / ih)); i <= Math.max(0, Math.ceil((h - y0) / ih) - 1); i++) {
    const top = y0 + ih * i; if (top > h || top + ih < 0) continue;
    if (i % 2) { c.save(); c.translate(0, top + ih); c.scale(1, -1); c.drawImage(img, x0, 0, iw, ih); c.restore(); } else c.drawImage(img, x0, top, iw, ih);
  }
  if (y0 + ih < h) { const g2 = c.createLinearGradient(0, y0 + ih - 40 * sy, 0, y0 + ih + 70 * sy); g2.addColorStop(0, 'rgba(14,9,5,0)'); g2.addColorStop(1, 'rgba(14,9,5,.9)'); c.fillStyle = g2; c.fillRect(0, y0 + ih - 40 * sy, w, h); }
  // ゲーム要素が見やすいよう薄く暗幕(周辺を少し落とす)
  const gr = c.createRadialGradient(cx, cy, R * s * 0.7, cx, cy, Math.max(w, h) * 0.8); gr.addColorStop(0, 'rgba(8,6,4,0)'); gr.addColorStop(1, 'rgba(8,6,4,.35)');
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.2; el(c, cx, cy, 7 * s, 7 * s * k); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.45)'; el(c, cx, cy, 1.3 * s, 1.3 * s * k); c.fill();
}
function paintBg(c: CanvasRenderingContext2D, w: number, h: number, gm: Geom) {
  if (IM.bg) { paintImgBg(c, IM.bg, w, h, gm); return; }
  const { cx, cy, s, k } = gm, R = C.PAN_R;
  // カウンター(ダークな石天板)
  let gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d1b1a'); gr.addColorStop(0.55, '#262321'); gr.addColorStop(1, '#171514');
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
  let r = 12345; const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  for (let i = 0; i < 700; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.10)'; const q = rnd() * 1.6 + 0.4; c.fillRect(rnd() * w, rnd() * h, q, q); }
  // バーナーの熱のにじみ
  gr = c.createRadialGradient(cx, cy, 0, cx, cy, (R + 90) * s); gr.addColorStop(0, 'rgba(255,150,60,.16)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = gr; el(c, cx, cy, (R + 90) * s, (R + 90) * s * Math.max(k, 0.7)); c.fill();
  // 落ち影
  c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 40 * s; c.shadowOffsetY = 18 * s * k; c.fillStyle = '#000'; el(c, cx, cy, (R + 16) * s, (R + 16) * s * k); c.fill(); c.restore();
  // 持ち手(手前)
  const hy0 = cy + (R + 6) * s * k, hl = 175 * s * Math.min(k, 0.55), hw0 = 15 * s, hw1 = 11 * s;
  gr = c.createLinearGradient(cx - hw0, 0, cx + hw0, 0); gr.addColorStop(0, '#0c0c0d'); gr.addColorStop(0.32, '#45464b'); gr.addColorStop(0.55, '#1c1d1f'); gr.addColorStop(1, '#0a0a0b');
  c.fillStyle = gr; c.beginPath(); c.moveTo(cx - hw0, hy0); c.lineTo(cx - hw1, hy0 + hl); c.arcTo(cx - hw1, hy0 + hl + hw1 * 1.4, cx, hy0 + hl + hw1 * 1.4, hw1); c.arcTo(cx + hw1, hy0 + hl + hw1 * 1.4, cx + hw1, hy0 + hl, hw1); c.lineTo(cx + hw0, hy0); c.closePath(); c.fill();
  c.fillStyle = '#050505'; el(c, cx, hy0 + hl - 2 * s, 4 * s, 4 * s * k + 1); c.fill();
  // リム外周
  gr = c.createLinearGradient(0, cy - (R + 16) * s * k, 0, cy + (R + 16) * s * k); gr.addColorStop(0, '#56585e'); gr.addColorStop(0.45, '#2a2b2e'); gr.addColorStop(1, '#0f1011');
  c.fillStyle = gr; el(c, cx, cy, (R + 16) * s, (R + 16) * s * k); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.4 * s; c.beginPath(); c.ellipse(cx, cy, (R + 15) * s, (R + 15) * s * k, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  // 内壁(奥が明るい)
  gr = c.createLinearGradient(0, cy - (R + 6) * s * k, 0, cy + (R + 6) * s * k); gr.addColorStop(0, '#3a3c41'); gr.addColorStop(0.5, '#1d1e21'); gr.addColorStop(1, '#0d0d0e');
  c.fillStyle = gr; el(c, cx, cy, (R + 6) * s, (R + 6) * s * k); c.fill();
  // 底
  gr = c.createRadialGradient(cx - R * 0.2 * s, cy - R * 0.25 * s * k, 0, cx, cy, R * s);
  gr.addColorStop(0, '#36373c'); gr.addColorStop(0.55, '#212225'); gr.addColorStop(1, '#121315');
  c.fillStyle = gr; el(c, cx, cy, R * s, R * s * k); c.fill();
  c.save(); el(c, cx, cy, R * s, R * s * k); c.clip();
  c.lineWidth = 1; for (let q = 8; q < R; q += 6.5) { c.strokeStyle = `rgba(255,255,255,${0.012 + 0.012 * ((q / 6.5) % 3)})`; el(c, cx, cy, q * s, q * s * k); c.stroke(); }
  gr = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.85 * s); gr.addColorStop(0, 'rgba(255,196,96,.13)'); gr.addColorStop(0.7, 'rgba(255,190,90,.06)'); gr.addColorStop(1, 'rgba(255,190,90,0)');
  c.fillStyle = gr; el(c, cx, cy, R * 0.85 * s, R * 0.85 * s * k); c.fill();
  gr = c.createRadialGradient(cx - R * 0.45 * s, cy - R * 0.5 * s * k, 0, cx - R * 0.45 * s, cy - R * 0.5 * s * k, R * 0.9 * s);
  gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(cx - R * s, cy - R * s * k, R * 2 * s, R * 2 * s * k);
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 9 * s; el(c, cx, cy, R * s, R * s * k); c.stroke();
  c.restore();
  // ねらいの目印(ごく薄く)
  c.strokeStyle = 'rgba(255,255,255,.13)'; c.lineWidth = 1.2; el(c, cx, cy, 7 * s, 7 * s * k); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.38)'; el(c, cx, cy, 1.3 * s, 1.3 * s * k); c.fill();
}

// ---------------- 湯気・油のきらめき ----------------
let puff: HTMLCanvasElement | null = null;
function puffSprite() {
  if (puff) return puff;
  puff = document.createElement('canvas'); puff.width = puff.height = 64;
  const c = puff.getContext('2d')!, gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return puff;
}
function drawGlints(g: CanvasRenderingContext2D, gm: Geom, t: number) {
  g.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) {
    const a = i * 2.399 + 0.5, rr = (0.25 + ((i * 37) % 10) / 14) * C.PAN_R * 0.82;
    const f = Math.max(0, Math.sin(t * (1.3 + (i % 3) * 0.5) + i * 1.7)); if (f < 0.35) continue;
    const x = px(gm, Math.cos(a) * rr), y = py(gm, Math.sin(a) * rr), L = (3 + f * 4) * gm.s;
    g.globalAlpha = 0.5 * f; g.fillRect(x - L, y - 0.5, L * 2, 1); g.fillRect(x - 0.5, y - L * gm.k, 1, L * 2 * gm.k);
  }
  g.globalAlpha = 1;
}
function drawSteam(g: CanvasRenderingContext2D, gm: Geom, t: number, amt: number) {
  const sp = puffSprite();
  for (let i = 0; i < 12; i++) {
    const ph = (t * 0.13 + i / 12) % 1, fx = ((i * 53) % 100) / 100 - 0.5;
    const x = gm.cx + fx * C.PAN_R * 1.3 * gm.s + Math.sin(t * 0.9 + i * 2) * 10 * gm.s * ph;
    const y = gm.cy - (10 + ph * 190) * gm.s * KZ, r = (16 + ph * 38) * gm.s;
    g.globalAlpha = Math.sin(ph * Math.PI) * 0.1 * amt; g.drawImage(sp, x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
}

// ---------------- 卵(殻) ----------------
function shellPath(c: CanvasRenderingContext2D, a: number, b: number) {
  c.beginPath(); c.moveTo(0, -b);
  c.bezierCurveTo(a * 0.75, -b, a, -b * 0.15, a, b * 0.25); c.bezierCurveTo(a, b * 0.75, a * 0.55, b, 0, b);
  c.bezierCurveTo(-a * 0.55, b, -a, b * 0.75, -a, b * 0.25); c.bezierCurveTo(-a, -b * 0.15, -a * 0.75, -b, 0, -b); c.closePath();
}
function drawShell(g: CanvasRenderingContext2D, x: number, y: number, u: number, rot: number, half = 0, stretch = 1) {
  if (IM.hero && !half) { // 実写の卵。落下速度で縦に伸ばす(体積保存)
    const hh = 2 * C.EGG_B * u / 0.68, ww = hh * IM.hero.width / IM.hero.height;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1 / Math.sqrt(stretch), stretch); g.drawImage(IM.hero, -ww / 2, -hh / 2, ww, hh); g.restore(); return;
  }
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(u, u);
  const A = C.EGG_A, B = C.EGG_B;
  shellPath(g, A, B);
  if (half) { g.save(); g.clip(); }
  const gr = g.createRadialGradient(-A * 0.4, -B * 0.4, 1, 0, 0, B * 1.45);
  if (IM.hero) { gr.addColorStop(0, '#d9a070'); gr.addColorStop(0.5, '#bf7f4a'); gr.addColorStop(1, '#8a5530'); } else { gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.5, '#f0e2c8'); gr.addColorStop(1, '#b9a07a'); }
  g.fillStyle = gr; g.fill();
  if (half) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-A, half > 0 ? -B * 0.1 : -B, A * 2, B * 1.1); g.restore(); shellPath(g, A, B); }
  g.strokeStyle = 'rgba(110,80,40,.35)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = 'rgba(120,85,45,.22)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(Math.sin(i * 7.1) * A * 0.6, Math.cos(i * 4.3) * B * 0.7, 0.6 + (i % 3) * 0.3, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-A * 0.38, -B * 0.42, A * 0.17, B * 0.3, 0.35, 0, TAU); g.fill();
  g.restore();
}

// ---------------- 手 ----------------
function drawHand(g: CanvasRenderingContext2D, x: number, y: number, u: number, open: number, lift: number, alpha: number) {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha = alpha; g.translate(0, -lift * u); g.lineCap = 'round';
  // 袖
  const sg = g.createLinearGradient(x - 60 * u, 0, x + 60 * u, 0); sg.addColorStop(0, '#171d26'); sg.addColorStop(0.4, '#3a4657'); sg.addColorStop(1, '#141a22');
  g.fillStyle = sg; g.beginPath(); g.moveTo(x - 36 * u, y - 96 * u); g.lineTo(x - 62 * u, y - 900 * u); g.lineTo(x + 62 * u, y - 900 * u); g.lineTo(x + 36 * u, y - 96 * u); g.closePath(); g.fill();
  g.fillStyle = '#e9e6df'; g.beginPath(); g.roundRect(x - 38 * u, y - 112 * u, 76 * u, 18 * u, 6 * u); g.fill();
  // てのひら
  const skin = g.createRadialGradient(x - 10 * u, y - 70 * u, 2 * u, x, y - 56 * u, 46 * u); skin.addColorStop(0, '#f3cfae'); skin.addColorStop(1, '#cf9874');
  g.fillStyle = skin; el(g, x, y - 66 * u, 33 * u, 30 * u); g.fill();
  const finger = (x0: number, y0: number, x1: number, y1: number, wd: number) => {
    g.strokeStyle = '#c58f6b'; g.lineWidth = wd * u + 1.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = skin; g.lineWidth = wd * u; g.stroke();
    g.strokeStyle = 'rgba(255,230,205,.5)'; g.lineWidth = wd * u * 0.28; g.beginPath(); g.moveTo(x0 - wd * u * 0.18, y0); g.lineTo(x1 - wd * u * 0.18, y1); g.stroke();
    g.fillStyle = 'rgba(255,245,235,.55)'; el(g, x1, y1 + wd * u * 0.1, wd * u * 0.3, wd * u * 0.22); g.fill();
  };
  const o = open * 11 * u;
  finger(x + 22 * u, y - 70 * u, x + 20 * u + o, y - 14 * u, 12);
  finger(x + 12 * u, y - 72 * u, x + 13 * u + o * 0.6, y - 20 * u, 12);
  finger(x - 24 * u, y - 66 * u, x - 19 * u - o, y - 8 * u, 14);
  g.restore();
}

// ---------------- 着地後の目玉焼き ----------------
const NP = 72, PX = new Float32Array(NP), PY = new Float32Array(NP);
function fillShape(g: CanvasRenderingContext2D) {
  g.beginPath(); g.moveTo((PX[NP - 1] + PX[0]) / 2, (PY[NP - 1] + PY[0]) / 2);
  for (let i = 0; i < NP; i++) { const j = (i + 1) % NP; g.quadraticCurveTo(PX[i], PY[i], (PX[i] + PX[j]) / 2, (PY[i] + PY[j]) / 2); }
  g.closePath();
}
function buildShape(dr: Drop, ts: number, gm: Geom, scale: number, jag: number, X0: number, Y0: number, clampPan: boolean) {
  const p = spreadP(ts), rr = dr.Wf * scale * (0.34 + 0.66 * p) * (1 + 0.045 * Math.exp(-ts * 3.2) * Math.sin(ts * 15));
  for (let i = 0; i < NP; i++) {
    const th = (i / NP) * TAU; let f = 1;
    for (let j = 0; j < 4; j++) f += dr.a[j] * jag * Math.cos((j + 2) * th + dr.ph[j]) * (0.35 + 0.65 * p);
    const r = rr * f; let X = X0 + Math.cos(th) * r, Y = Y0 + Math.sin(th) * r;
    if (clampPan) { const m = Math.hypot(X, Y), lim = C.PAN_R + 4; if (m > lim) { X *= lim / m; Y *= lim / m; } }
    PX[i] = px(gm, X); PY[i] = py(gm, Y);
  }
}
/** 白身+黄身(+飛沫/殻)。ts=着地からの秒。本編・結果アート共通 */
export function drawLanded(g: CanvasRenderingContext2D, dr: Drop, ts: number, gm: Geom, alpha: number, time: number) {
  const s = gm.s, p = spreadP(ts), cook = clamp(ts / 1.5);
  g.save(); g.globalAlpha = alpha;
  // 白身
  buildShape(dr, ts, gm, 1, 1, dr.X, dr.Y, !dr.miss);
  const x0 = px(gm, dr.X), y0 = py(gm, dr.Y), wr = dr.Wf * s * 1.1;
  const A = 0.5 + 0.5 * clamp(ts / 1.2);
  const gr = g.createRadialGradient(x0, y0, 0, x0, y0, wr);
  gr.addColorStop(0, `rgba(255,254,248,${A})`); gr.addColorStop(0.65, `rgba(248,244,230,${A})`); gr.addColorStop(1, `rgba(224,210,176,${A * 0.92})`);
  if (IM.item) { g.save(); g.translate(2.5 * s, 3.5 * s * gm.k); g.fillStyle = 'rgba(0,0,0,.38)'; fillShape(g); g.fill(); g.restore(); }
  else { g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 9 * s; g.shadowOffsetY = 3 * s * gm.k; g.fillStyle = gr; fillShape(g); g.fill(); g.restore(); }
  if (IM.item) { // 実写の目玉焼きを白身の輪郭でクリップ(広がり・揺れは既存ロジックのまま)
    const f = dr.Wf * (0.34 + 0.66 * p) * (1 + 0.045 * Math.exp(-ts * 3.2) * Math.sin(ts * 15)), iw = 2 * f * s / 0.87, ih = iw * gm.k;
    g.save(); g.globalAlpha = alpha * clamp(0.35 + ts * 3); g.drawImage(IM.item, x0 - iw * 0.514, y0 - ih * 0.5, iw, ih); g.restore();
  }
  if (!IM.item) { g.strokeStyle = `rgba(206,150,68,${0.55 * cook})`; g.lineWidth = 2 * s; fillShape(g); g.stroke(); }
  if (!IM.item) {
  g.save(); g.translate(0, -0.9 * s * gm.k); g.strokeStyle = `rgba(255,255,255,${0.35 * A})`; g.lineWidth = 0.9 * s; fillShape(g); g.stroke(); g.restore();
  g.fillStyle = 'rgba(255,255,255,.22)'; el(g, px(gm, dr.X - dr.Wf * 0.42), py(gm, dr.Y - dr.Wf * 0.32), dr.Wf * 0.2 * s * p, dr.Wf * 0.1 * s * p * (0.4 + gm.k), -0.4); g.fill();
  }
  // 黄身
  const yx = px(gm, dr.X + dr.yx), yy = py(gm, dr.Y + dr.yy);
  if (IM.item && !dr.burst) { /* 黄身は画像に含まれる */ } else if (dr.burst) {
    const rb = C.YOLK_R * (1 + 0.85 * p) * s;
    const blob = (rad: number, col0: string, col1: string, al: number) => {
      for (let i = 0; i < NP; i++) { const th = (i / NP) * TAU; const f = 1 + 0.26 * Math.cos(2 * th + dr.ph[0]) + 0.18 * Math.cos(3 * th + dr.ph[1]) + 0.1 * Math.cos(5 * th + dr.ph[2]); PX[i] = yx + Math.cos(th) * rad * f; PY[i] = yy + Math.sin(th) * rad * f * (0.4 + 0.6 * gm.k); }
      const q = g.createRadialGradient(yx, yy, 0, yx, yy, rad * 1.3); q.addColorStop(0, col0); q.addColorStop(1, col1);
      g.globalAlpha = alpha * al; g.fillStyle = q; fillShape(g); g.fill();
    };
    blob(rb * 1.9, 'rgba(246,170,40,.5)', 'rgba(246,170,40,0)', 1);
    blob(rb * 1.1, '#fbb838', '#e2860c', 0.95);
    g.globalAlpha = alpha * 0.4; g.fillStyle = '#fff'; el(g, yx - rb * 0.3, yy - rb * 0.3 * gm.k, rb * 0.25, rb * 0.09, -0.5); g.fill();
  } else {
    const sq = ts >= 0 ? Math.exp(-ts * 6) * -Math.cos(ts * 26) * 0.3 : 0, gro = Math.min(1, 0.7 + ts * 4);
    const rx = C.YOLK_R * s * gro * (1 - sq * 0.5), ry = C.YOLK_R * s * gro * (1 + sq) * (gm.k + (1 - gm.k) * 0.5), ly = yy - 3.5 * s * (1 - gm.k) * (1 + sq);
    g.save(); g.shadowColor = 'rgba(110,55,0,.45)'; g.shadowBlur = 7 * s; g.shadowOffsetX = rx * 0.12; g.shadowOffsetY = ry * 0.3; g.fillStyle = '#f0a020'; el(g, yx, ly, rx, ry); g.fill(); g.restore();
    const q = g.createRadialGradient(yx - rx * 0.3, ly - ry * 0.4, 0, yx, ly, rx * 1.35);
    q.addColorStop(0, '#ffe38c'); q.addColorStop(0.35, '#ffb52c'); q.addColorStop(0.78, '#ee8a0c'); q.addColorStop(1, '#bf5f05');
    g.fillStyle = q; el(g, yx, ly, rx, ry); g.fill();
    g.strokeStyle = 'rgba(140,60,0,.35)'; g.lineWidth = 1; g.stroke();
    const tw = 0.82 + 0.18 * Math.sin(time * 2.1);
    g.fillStyle = `rgba(255,255,255,${0.8 * tw})`; el(g, yx - rx * 0.36, ly - ry * 0.42, rx * 0.27, ry * 0.16, -0.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; el(g, yx + rx * 0.3, ly + ry * 0.38, rx * 0.2, ry * 0.07, -0.3); g.fill();
  }
  // 飛沫
  if (ts >= 0 && ts < 0.5) {
    g.fillStyle = 'rgba(255,252,240,.85)';
    for (let i = 0; i < 9; i++) {
      const th = dr.ph[i % 4] + i * 0.7, v = 70 + (i % 3) * 35, z = 90 * ts * (0.6 + (i % 4) * 0.2) - 0.5 * C.G * 0.5 * ts * ts; if (z < 0) continue;
      const rr = v * ts * 0.55; g.globalAlpha = alpha * (1 - ts * 2);
      el(g, px(gm, dr.X + Math.cos(th) * rr), py(gm, dr.Y + Math.sin(th) * rr, z), 1.8 * s, 1.8 * s * (0.5 + gm.k * 0.5)); g.fill();
    }
  }
  // 殻の破片
  if (ts >= 0 && ts < 0.8 && gm.k < 0.9) {
    for (let i = 0; i < 2; i++) {
      const sg = i ? 1 : -1, x = dr.X + sg * (14 + 90 * ts), z = 40 * ts * 3 - 0.5 * C.G * ts * ts * 0.35 + 6; if (z < -4) continue;
      g.globalAlpha = alpha * (1 - ts / 0.8); drawShell(g, px(gm, x), py(gm, dr.Y + 4, Math.max(0, z)), s * 0.55, sg * (0.6 + ts * 5), sg);
    }
  }
  g.restore();
}

// ---------------- シーン ----------------
export interface SceneState {
  held?: { X: number; Y: number; z: number };
  drop?: Drop; tau?: number;                                // 落とした卵と、離した瞬間からの秒(負なら手に持ったまま)
  ghost?: { drop: Drop; tau: number; alpha: number };       // 前のラウンド(フェードアウト)
  steam?: number;
}
export function drawScene(g: CanvasRenderingContext2D, w: number, h: number, time: number, S: SceneState, gmIn?: Geom) {
  const gm = gmIn ?? geomFor(w, h), s = gm.s;
  g.save();
  const dr = S.drop, tau = S.tau ?? 0;
  if (dr && tau > dr.tFall) {
    const ts = tau - dr.tFall;
    if (ts < 0.45) { const amp = Math.min(8, impactSpeed(dr) / 180) * (s / 1.3) * (dr.burst ? 1.4 : 1), e = Math.exp(-ts * 11); g.translate(Math.sin(ts * 75) * amp * e, Math.cos(ts * 58) * amp * 0.7 * e); }
  }
  g.drawImage(bgFor(g, w, h, gm), 0, 0, w, h);
  if (!IM.bg) drawGlints(g, gm, time);
  if (S.ghost) drawLanded(g, S.ghost.drop, S.ghost.tau - S.ghost.drop.tFall, gm, S.ghost.alpha, time);
  const shadow = (X: number, Y: number, z: number) => {
    const a = 0.5 * clamp(1 - z / 480), r = (C.EGG_A * 1.15 + z * 0.03) * s;
    g.fillStyle = `rgba(0,0,0,${a * 0.35})`; for (let i = 3; i >= 1; i--) { el(g, px(gm, X), py(gm, Y), r * (0.6 + i * 0.28), r * (0.6 + i * 0.28) * gm.k); g.fill(); }
  };
  if (dr && tau >= 0 && tau >= dr.tFall) {
    drawLanded(g, dr, tau - dr.tFall, gm, 1, time);
  } else {
    const o = dr ? { X: dr.X, Y: dr.Y, z: dr.z0 - 0.5 * C.G * Math.max(0, tau) ** 2 } : S.held;
    if (o) {
      const t0 = Math.max(0, tau), dz = dr ? 0 : 0;
      shadow(o.X, o.Y, o.z + dz);
      const ex = px(gm, o.X), ey = py(gm, o.Y, o.z + C.EGG_B);
      const holding = !dr || tau < 0, rot = holding ? Math.sin(time * 3) * 0.05 : (dr!.rot0 + t0 * 2.2);
      drawShell(g, ex, ey, s, rot, 0, dr && tau > 0 ? 1 + Math.min(0.1, C.G * t0 / 9000) : 1);
      if (dr) {
        const hx = px(gm, dr.X), hy = py(gm, dr.Y, dr.z0 + C.EGG_B), ph = clamp(t0 / 0.14), lift = clamp((t0 - 0.12) / 0.6) ** 2 * 260;
        drawHand(g, hx, hy, s, ph, lift, 1 - clamp((t0 - 0.35) / 0.3));
      } else drawHand(g, ex, ey, s, 0, 0, 1);
    }
  }
  drawSteam(g, gm, time, S.steam ?? 1);
  g.restore();
}
export const sceneGeom = geomFor;
export const topGeom = (cx: number, cy: number, pr: number): Geom => ({ cx, cy, s: pr / (C.PAN_R + 16), k: 1 });
/** 卵の画面座標(UI演出用) */
export const eggScreen = (gm: Geom, X: number, Y: number, z = 0) => [px(gm, X), py(gm, Y, z)] as const;
/** 背景(カウンター+フライパン)だけ描く */
export const drawPanBg = (g: CanvasRenderingContext2D, w: number, h: number, gm: Geom) => { g.drawImage(bgFor(g, w, h, gm), 0, 0, w, h); };
export const drawGlintsPublic = drawGlints;
export const drawSteamPublic = drawSteam;

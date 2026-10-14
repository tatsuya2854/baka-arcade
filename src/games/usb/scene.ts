import { CFG } from './config';
import { loadImg, drawCover } from '../../core/images';

// 生成画像(無ければ null → 従来の Canvas 描画にフォールバック)
const SLUG = 'usb-insert';
const IM: { bg: HTMLImageElement | null; hero: HTMLImageElement | null; item: HTMLImageElement | null } = { bg: null, hero: null, item: null };
let imPromise: Promise<void> | null = null;
export function preloadUsbImages(): Promise<void> {
  imPromise ??= Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero'), loadImg(SLUG, 'item')]).then(([bg, hero, item]) => { IM.bg = bg; IM.hero = hero; IM.item = item; bgCache = null; });
  return imPromise;
}
export const releaseUsbCaches = () => { bgCache = null; };
// item.png(1024x1024)上のUSBポート開口の中心と幅(px) / hero.png 上のコネクタ前面の中心と幅、先端が上を向くための回転
const IT_CX = 515, IT_CY = 527, IT_PW = 282;
const HE_CX = 171, HE_CY = 700, HE_PW = 214, HE_ROT = 1.943;
let bgCache: { cv: HTMLCanvasElement; key: string } | null = null;
function bgFor(g: CanvasRenderingContext2D, w: number, h: number): HTMLCanvasElement {
  const sc = Math.round(Math.max(1, Math.min(2, g.getTransform().a)) * 2) / 2, key = `${Math.round(w)}x${Math.round(h)}|${sc}`;
  if (bgCache?.key === key) return bgCache.cv;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
  const c = cv.getContext('2d')!; c.scale(sc, sc); drawCover(c, IM.bg!, w, h, 1, 0.5); // 右寄せ: 背景の画面端ノートPCを外し、ランプ側を残す
  bgCache = { cv, key }; return cv;
}

export interface Scratch { x: number; y: number; a: number; l: number }
export interface SceneState {
  x: number; y: number; z: number; rot: number; flipT: number; // プラグ先端(mm, ポート中心基準)・高さ・手ブレ角・反転(1=裏,0=表)
  shx: number; shy: number;      // 画面揺れ(px)
  lx: number; ly: number;        // ライト位置(mm)
  dark: number;                  // 暗さ倍率(0..1)
  insert: number;                // 挿入進行 0..1
  led: number;                   // LED 0..1 (緑) / -1..0 (赤)
  sparkAge: number;              // 火花の経過秒(<0 で無し)
  sparkN: number;
  flash: number;                 // 衝突フラッシュ 0..1
  scratches: Scratch[];
  zoom: number; cy: number;      // 画面フィット倍率 / ポート中心Y比率
  desk: boolean; finger: boolean;
}
export const newScene = (): SceneState => ({ x: 0, y: 15, z: CFG.hover, rot: 0, flipT: 1, shx: 0, shy: 0, lx: 0, ly: 0, dark: CFG.dark, insert: 0, led: 0, sparkAge: -1, sparkN: 0, flash: 0, scratches: [], zoom: 1, cy: 0.36, desk: true, finger: true });
export const mmOf = (w: number, h: number, zoom = 1) => Math.min(w / 19, h / 11) * zoom;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

let brushed: HTMLCanvasElement | null = null;
const getBrushed = () => {
  if (brushed) return brushed;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  for (let i = 0; i < 900; i++) {
    const y = hash(i) * 256, l = 30 + hash(i + 1800) * 100, x = hash(i + 900) * (256 - l - 2);
    g.strokeStyle = hash(i + 2700) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (hash(i + 3600) - 0.5) * 1.2); g.stroke();
  }
  brushed = c; return c;
};

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const quad = (g: CanvasRenderingContext2D, a: number[]) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[2], a[3]); g.lineTo(a[4], a[5]); g.lineTo(a[6], a[7]); g.closePath(); };
const lin = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, st: [number, string][]) => { const k = g.createLinearGradient(x0, y0, x1, y1); st.forEach(s => k.addColorStop(s[0], s[1])); return k; };

export function drawSparks(g: CanvasRenderingContext2D, px: number, py: number, m: number, age: number, n: number) {
  if (age < 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const life = 0.22 + hash(i * 1.3) * 0.4; if (age > life) continue;
    const ang = -Math.PI * (0.05 + 0.9 * hash(i * 3.1)), v = (6 + 12 * hash(i * 7.7)) * m, a = 1 - age / life;
    const x = px + Math.cos(ang) * v * age, y = py + Math.sin(ang) * v * age + 22 * m * age * age;
    const x0 = px + Math.cos(ang) * v * Math.max(0, age - 0.04), y0 = py + Math.sin(ang) * v * Math.max(0, age - 0.04) + 22 * m * Math.max(0, age - 0.04) ** 2;
    g.strokeStyle = `rgba(255,${190 + (hash(i) * 50) | 0},110,${a})`; g.lineWidth = Math.max(1, m * 0.1); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
  }
  g.restore();
}

export function drawScene(g: CanvasRenderingContext2D, w: number, h: number, S: SceneState) {
  const m = mmOf(w, h, S.zoom), cx = w / 2 + S.shx, cy = h * S.cy + S.shy;
  g.save();
  if (IM.bg) g.drawImage(bgFor(g, w, h), 0, 0, w, h);
  else {
  // 筐体パネル
  g.fillStyle = lin(g, 0, 0, w, h, [[0, '#33373e'], [0.5, '#1c1f24'], [1, '#2a2d33']]); g.fillRect(-20, -20, w + 40, h + 40);
  g.globalAlpha = 0.9; g.fillStyle = g.createPattern(getBrushed(), 'repeat')!; g.fillRect(-20, -20, w + 40, h + 40); g.globalAlpha = 1;
  if (S.desk) {
    const dy = h * 0.9; g.fillStyle = lin(g, 0, dy, 0, h, [[0, '#2a1c13'], [1, '#120b07']]); g.fillRect(-20, dy, w + 40, h);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(-20, dy, w + 40, 1.5);
    g.fillStyle = lin(g, 0, dy - 14, 0, dy, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]); g.fillRect(-20, dy - 14, w + 40, 14);
  }
  }
  if (!IM.bg) {
  // USB マーク(刻印)
  g.save(); g.translate(cx, cy - 5.4 * m); g.strokeStyle = 'rgba(255,255,255,0.13)'; g.fillStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 0.16 * m;
  g.beginPath(); g.moveTo(-2.2 * m, 0); g.lineTo(2.4 * m, 0); g.moveTo(-0.6 * m, 0); g.lineTo(0.2 * m, -0.7 * m); g.lineTo(1 * m, -0.7 * m); g.moveTo(0.4 * m, 0); g.lineTo(1.1 * m, 0.7 * m); g.stroke();
  g.beginPath(); g.arc(-2.5 * m, 0, 0.32 * m, 0, 7); g.fill(); g.beginPath(); g.moveTo(2.4 * m, -0.4 * m); g.lineTo(3 * m, 0); g.lineTo(2.4 * m, 0.4 * m); g.fill(); g.restore();

  }
  // ---- ポート ----
  if (IM.item) { // 実写のノートPC側面。ポート開口を既存の判定位置(cx,cy)に合わせる
    const f = CFG.portW * m / IT_PW; g.drawImage(IM.item, cx - IT_CX * f, cy - IT_CY * f, 1024 * f, 1024 * f);
  } else {
  const PW = CFG.portW * m, PH = CFG.portH * m, x0 = cx - PW / 2, y0 = cy - PH / 2;
  rr(g, x0 - 0.9 * m, y0 - 0.9 * m, PW + 1.8 * m, PH + 1.8 * m, 1.4 * m); g.fillStyle = lin(g, 0, y0 - m, 0, y0 + PH + m, [[0, '#6b7078'], [1, '#1b1d21']]); g.fill();
  rr(g, x0 - 0.35 * m, y0 - 0.35 * m, PW + 0.7 * m, PH + 0.7 * m, 1 * m); g.fillStyle = lin(g, 0, y0, 0, y0 + PH, [[0, '#17191d'], [1, '#4d525a']]); g.fill();
  // 空洞 + 奥行き(斜め手前から: 左・上の壁が見える)
  const bx0 = x0 + 0.65 * m, by0 = y0 + 0.45 * m, bx1 = x0 + PW - 0.9 * m, by1 = y0 + PH - 0.8 * m; // 奥の矩形
  g.save(); rr(g, x0, y0, PW, PH, 0.5 * m); g.clip();
  g.fillStyle = '#030304'; g.fillRect(x0, y0, PW, PH);
  quad(g, [x0, y0, x0 + PW, y0, bx1, by0, bx0, by0]); g.fillStyle = lin(g, 0, y0, 0, by0, [[0, '#5c616a'], [1, '#101216']]); g.fill();
  quad(g, [x0, y0, bx0, by0, bx0, by1, x0, y0 + PH]); g.fillStyle = lin(g, x0, 0, bx0, 0, [[0, '#3a3e45'], [1, '#08090b']]); g.fill();
  quad(g, [x0, y0 + PH, bx0, by1, bx1, by1, x0 + PW, y0 + PH]); g.fillStyle = lin(g, 0, y0 + PH, 0, by1, [[0, '#2e3238'], [1, '#07080a']]); g.fill();
  // タン(舌片) + 接点
  const tx0 = bx0 + 0.5 * m, tx1 = bx1 - 0.5 * m, ty = by0 + (by1 - by0) * 0.42, tb = by1 - 0.1 * m;
  g.fillStyle = lin(g, 0, ty, 0, tb, [[0, '#23262c'], [1, '#0d0e11']]); g.fillRect(tx0, ty, tx1 - tx0, tb - ty);
  quad(g, [tx0, ty, tx1, ty, tx1 + 0.5 * m, ty + 0.5 * m, tx0 - 0.5 * m, ty + 0.5 * m]); g.fillStyle = '#2f333a'; g.fill();
  for (let i = 0; i < 4; i++) {
    const px = tx0 + (tx1 - tx0) * (0.14 + i * 0.24), pw = (tx1 - tx0) * 0.14;
    quad(g, [px, ty + 0.1 * m, px + pw, ty + 0.1 * m, px + pw + 0.12 * m, ty + 0.42 * m, px - 0.12 * m, ty + 0.42 * m]); g.fillStyle = lin(g, 0, ty, 0, ty + 0.5 * m, [[0, '#f6d77a'], [1, '#a77d2a']]); g.fill();
  }
  g.restore();
  rr(g, x0, y0, PW, PH, 0.5 * m); g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1; g.stroke();
  }
  // 接触傷
  g.save(); g.lineCap = 'round';
  for (const s of S.scratches) {
    const sx = cx + s.x * m, sy = cy + s.y * m, dx = Math.cos(s.a) * s.l * m, dy = Math.sin(s.a) * s.l * m;
    g.strokeStyle = 'rgba(235,240,248,0.55)'; g.lineWidth = Math.max(1, 0.1 * m); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + dx, sy + dy); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(sx + 1, sy + 1.2); g.lineTo(sx + dx + 1, sy + dy + 1.2); g.stroke();
  }
  g.restore();
  // LED
  { const lx = cx + 8.6 * m, ly = cy - 4.8 * m; g.beginPath(); g.arc(lx, ly, 0.34 * m, 0, 7); g.fillStyle = '#0a0b0d'; g.fill();
    if (S.led !== 0) { const c = S.led > 0 ? '90,255,150' : '255,70,60', a = Math.abs(S.led);
      const gl = g.createRadialGradient(lx, ly, 0, lx, ly, 4 * m); gl.addColorStop(0, `rgba(${c},${0.6 * a})`); gl.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gl; g.fillRect(lx - 4 * m, ly - 4 * m, 8 * m, 8 * m);
      g.beginPath(); g.arc(lx, ly, 0.3 * m, 0, 7); g.fillStyle = `rgba(${c},${a})`; g.fill(); } }

  // ---- USB メモリ ----
  const s = (1 + S.z * CFG.persp) * (1 - 0.05 * S.insert), px = cx + S.x * m, py = cy + S.y * m;
  // 影(ライトと逆方向へ。高いほど離れてぼける)
  { const zz = Math.max(0, S.z), dxl = S.x - S.lx, dyl = S.y - S.ly, dl = Math.hypot(dxl, dyl) + 6, ox = dxl / dl * zz * 0.5 * m, oy = dyl / dl * zz * 0.35 * m + zz * 0.15 * m;
    for (let i = 0; i < 3; i++) { const e = i * (0.15 + zz * 0.05) * m; g.fillStyle = `rgba(0,0,0,${0.16 / (1 + zz * 0.15)})`; rr(g, px - CFG.plugW / 2 * m + ox - e, py - CFG.plugH / 2 * m + oy - e, CFG.plugW * m + e * 2, CFG.plugH * m + e * 2, 0.7 * m); g.fill(); } }
  if (IM.hero) { // 実写のUSBメモリ。先端を上に向け、反転は長軸まわりの回転(横幅の伸縮+左右反転)で表現
    const f = CFG.plugW * m / HE_PW * 0.8, sx = Math.cos(Math.PI * S.flipT), pb = CFG.portH * m;
    g.save();
    if (S.insert > 0.25) { g.beginPath(); g.rect(-20, cy - pb * 0.2, w + 40, h); g.clip(); } // ポートに入った先端は見えない
    g.translate(px, py - S.insert * 0.4 * m); g.rotate(S.rot); g.scale(s * (Math.abs(sx) < 0.04 ? 0.04 * Math.sign(sx || 1) : sx), s);
    g.rotate(HE_ROT); g.drawImage(IM.hero, -HE_CX * f, -HE_CY * f, 1024 * f, 1024 * f); g.restore();
  } else {
  g.save(); g.translate(px, py);
  // 本体(奥側: 手前に傾けた視点で見える背面プレート)
  g.save(); g.rotate(S.rot); g.scale(s, s);
  const bw = 16 * m, bh = 7 * m, bo = (1 - S.insert * 0.8);
  g.translate(1.0 * m * bo, 2.7 * m * bo + 0.4 * m);
  if (S.finger) { // 指(つまむ)
    const fg = lin(g, -4 * m, 0, 4 * m, 0, [[0, '#7a4d3a'], [0.35, '#d9a287'], [0.65, '#c68b6f'], [1, '#6e4332']]);
    g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, -3.6 * m, 1.5 * m, 7.8 * m, 40 * m, 3.8 * m); g.fill();
    g.fillStyle = fg; rr(g, -3.9 * m, 2.2 * m, 7.8 * m, 40 * m, 3.9 * m); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.10)'; rr(g, -2.2 * m, 3.0 * m, 1.6 * m, 12 * m, 0.8 * m); g.fill();
    g.fillStyle = 'rgba(70,35,25,0.35)'; g.fillRect(-3.5 * m, 14 * m, 7 * m, 0.25 * m);
  }
  rr(g, -bw / 2, -bh / 2, bw, bh, 1.8 * m); g.fillStyle = lin(g, 0, -bh / 2, 0, bh / 2, [[0, '#3a3f4d'], [0.5, '#1a1d26'], [1, '#0d0f14']]); g.fill();
  rr(g, -bw / 2 + 0.3 * m, -bh / 2 + 0.3 * m, bw - 0.6 * m, bh * 0.4, 1.4 * m); g.fillStyle = 'rgba(255,255,255,0.09)'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; rr(g, -bw / 2, -bh / 2, bw, bh, 1.8 * m); g.stroke();
  g.beginPath(); g.arc(bw / 2 - 1.8 * m, bh / 2 - 1.8 * m, 0.55 * m, 0, 7); g.fillStyle = '#05060a'; g.fill();
  g.restore();
  // 先端(メタルシェル)。flipT=1 で上下反転(裏)
  g.rotate(S.rot + S.flipT * Math.PI); g.scale(s, s);
  const W = CFG.plugW * m, H = CFG.plugH * m;
  rr(g, -W / 2, -H / 2, W, H, 0.6 * m); g.fillStyle = lin(g, 0, -H / 2, 0, H / 2, [[0, '#e3e6ea'], [0.45, '#8b919a'], [0.55, '#9ca2ab'], [1, '#c9ced5']]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
  rr(g, -W / 2 + 0.5 * m, -H / 2 + 0.5 * m, W - m, H - m, 0.35 * m); g.fillStyle = '#07080b'; g.fill();
  g.fillStyle = lin(g, 0, -0.8 * m, 0, 0.8 * m, [[0, '#2a2d34'], [1, '#14161a']]); g.fillRect(-W / 2 + 1 * m, -0.8 * m, W - 2 * m, 1.6 * m);
  for (let i = 0; i < 4; i++) { // 接点(上側=表)
    const gx = -W / 2 + 1.6 * m + (W - 3.2 * m) * (0.04 + i * 0.3), gw = (W - 3.2 * m) * 0.18;
    g.fillStyle = lin(g, 0, -0.8 * m, 0, -0.1 * m, [[0, '#f6d77a'], [1, '#a77d2a']]); g.fillRect(gx, -0.75 * m, gw, 0.62 * m);
  }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-W / 2 + 0.7 * m, -H / 2 + 0.12 * m, W - 1.4 * m, 0.12 * m);
  g.restore();
  }
  // 火花
  if (S.sparkAge >= 0) drawSparks(g, cx + Math.max(-5.5, Math.min(5.5, S.x)) * m, cy + Math.max(-2.4, Math.min(2.4, S.y)) * m, m, S.sparkAge, S.sparkN);
  // 暗がり(ライト)
  if (S.dark > 0) {
    const lx = cx + S.lx * m, ly = cy + S.ly * m, r = CFG.lightR * m;
    const k = g.createRadialGradient(lx, ly, r * 0.15, lx, ly, r * 1.5);
    k.addColorStop(0, 'rgba(3,4,8,0)'); k.addColorStop(0.55, `rgba(3,4,8,${0.25 * S.dark})`); k.addColorStop(1, `rgba(3,4,8,${S.dark})`);
    g.fillStyle = k; g.fillRect(-20, -20, w + 40, h + 40);
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(lx, ly, 0, lx, ly, r); gl.addColorStop(0, 'rgba(255,240,215,0.14)'); gl.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gl; g.fillRect(lx - r, ly - r, r * 2, r * 2); g.restore();
  }
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${0.22 * S.flash})`; g.fillRect(-20, -20, w + 40, h + 40); }
  g.restore();
}

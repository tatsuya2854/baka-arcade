import type { ResultArt } from '../../core/types';
import { drawUncle } from '../../core/characters';
import { CFG } from './config';

export interface Stats {
  m: number; taps: number; playSec: number; peakGas: number; overheat: number; birdNear: number;
  death: 'hit' | 'ground'; killer: string; maxVy: number;
}
type Pose = 'planet' | 'space' | 'bird' | 'tiny' | 'afro' | 'soot' | 'crash' | 'cloud';
const KILLER: Record<string, string> = { bird: '鳥', balloon: '風船', storm: '雷雲', plane: '飛行機', ufo: 'UFO', meteor: '隕石', ground: '地面' };

export function judge(s: Stats): { pose: Pose; rare?: string; title: string; comment: string } {
  const tps = s.taps / Math.max(1, s.playSec);
  if (s.m >= 1500) return { pose: 'planet', rare: 'planet', title: '謎の惑星に着陸した男', comment: '宇宙の果てで何かが待っていた。たぶんおなら星人。' };
  if (s.m >= 700) return { pose: 'space', rare: 'space', title: s.m >= 1200 ? '人類初の屁力宇宙飛行士' : 'NASAが困惑した男', comment: s.m >= 1200 ? '推進剤はすべて自前。宇宙の静寂におならが響く。' : '管制室「あの推進力の説明をお願いします」' };
  if (s.birdNear >= 5) return { pose: 'bird', rare: 'bird', title: '鳥に囲まれた男', comment: '鳥たちは仲間だと思っている。' };
  if (s.m <= 15) return { pose: 'tiny', rare: 'tiny', title: `高度${s.m}mの伝説`, comment: '飛んだ、というより、浮いた。' };
  if (tps >= 5.5 && s.m >= 60) return { pose: 'afro', title: '髪型爆発おじさん', comment: '連打の勢いで髪が宇宙を目指した。' };
  if (s.overheat >= 6) return { pose: 'soot', title: 'ガス欠の煤まみれ', comment: '出しすぎた。顔面が真っ黒。' };
  if (s.m >= 400) return { pose: 'cloud', title: '成層圏の屁こき', comment: '雲の上の景色は、においで台無し。' };
  if (s.death === 'ground') return { pose: 'crash', title: s.m >= 150 ? '大地に刺さる屁こき' : '離陸失敗の達人', comment: '重力は、おならより強かった。' };
  if (s.killer === 'bird') return { pose: 'cloud', title: '鳥に屁を返された男', comment: '鳥「こっちの空だぞ」' };
  if (s.killer === 'storm') return { pose: 'soot', title: '雷でアフロの人', comment: '落雷でこんがり。でもちょっと高かった。' };
  if (s.killer === 'plane') return { pose: 'cloud', title: '航空法違反おじさん', comment: '飛行ルートに屁で割り込んだ。' };
  return { pose: 'cloud', title: s.m >= 200 ? '空飛ぶ屁こき' : '屁力ルーキー', comment: 'あと少しで雲の上だった。' };
}

function mixc(a: number[], b: number[], t: number) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
const rgb = (c: number[]) => `rgb(${c.join(',')})`;
function bgFor(m: number): [number[], number[]] {
  const z: [number, number[], number[]][] = [[0, [94, 200, 255], [216, 242, 255]], [120, [58, 141, 224], [159, 214, 255]], [350, [22, 50, 122], [76, 134, 214]], [700, [8, 10, 38], [42, 47, 122]], [1200, [26, 6, 56], [106, 27, 122]]];
  let i = 0; while (i < z.length - 1 && m >= z[i + 1][0]) i++;
  if (i === z.length - 1) return [z[i][1], z[i][2]];
  const t = (m - z[i][0]) / (z[i + 1][0] - z[i][0]); return [mixc(z[i][1], z[i + 1][1], t), mixc(z[i][2], z[i + 1][2], t)];
}
const h01 = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function drawBird(g: CanvasRenderingContext2D, x: number, y: number, s: number, f: number, t: number) {
  g.save(); g.translate(x, y); g.scale(s * f, s);
  g.fillStyle = '#3a3a4a'; g.beginPath(); g.ellipse(0, 0, 20, 12, 0, 0, 6.3); g.ellipse(14, -4, 9, 8, 0, 0, 6.3); g.fill();
  g.fillStyle = '#ffb02e'; g.beginPath(); g.moveTo(21, -4); g.lineTo(31, -1); g.lineTo(21, 2); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(16, -6, 3, 0, 6.3); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(17, -6, 1.6, 0, 6.3); g.fill();
  g.fillStyle = '#3a3a4a'; g.beginPath(); g.moveTo(-4, -2); g.lineTo(-14, -22 + Math.sin(t * 10 + x) * 12); g.lineTo(6, -4); g.fill(); g.restore();
}

export function buildArt(s: Stats): ResultArt {
  const j = judge(s);
  const tps = s.taps / Math.max(1, s.playSec);
  const m = s.m;
  const killer = KILLER[s.killer] ?? '不明';
  const draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const u = Math.min(w, h), pose = j.pose;
    g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    const bm = pose === 'planet' ? 1500 : pose === 'tiny' || pose === 'crash' ? Math.min(m, 40) : m;
    const [c1, c2] = bgFor(bm);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, rgb(c1)); gr.addColorStop(1, rgb(c2)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (bm > 280) { g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { g.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))) * Math.min(1, (bm - 280) / 400); g.fillRect(h01(i) * w, h01(i + 9) * h, u * 0.005 + 1, u * 0.005 + 1); } g.globalAlpha = 1; }
    if (bm >= 1000) { for (let i = 0; i < 3; i++) { const cx = [0.2, 0.8, 0.5][i] * w, cy = [0.25, 0.4, 0.75][i] * h, r = u * 0.5; const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); const col = ['255,80,200', '90,160,255', '180,90,255'][i]; rg.addColorStop(0, `rgba(${col},0.35)`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(0, 0, w, h); } }
    // 雲
    if (bm < 420 && pose !== 'tiny') { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 6; i++) { const cx = ((h01(i) * 1.4 - 0.2) * w + t * 6 * (1 + i % 3)) % (w * 1.3) - w * 0.15, cy = h * (0.15 + h01(i + 3) * 0.7), r = u * (0.05 + h01(i + 6) * 0.05); g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.arc(cx + r * 1.1, cy - r * 0.3, r * 1.2, 0, 6.3); g.arc(cx + r * 2.2, cy, r, 0, 6.3); g.fill(); } }
    const cx = w / 2, hh = u * 0.42;
    let cy = h * 0.56 + Math.sin(t * 2) * u * 0.01;
    // 地面 or 惑星
    if (pose === 'planet') {
      g.fillStyle = '#a8325e'; g.beginPath(); g.ellipse(cx, h * 1.12, w * 0.9, h * 0.42, 0, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,200,120,0.5)'; g.beginPath(); g.ellipse(cx - w * 0.2, h * 0.86, u * 0.1, u * 0.03, 0, 0, 6.3); g.ellipse(cx + w * 0.25, h * 0.9, u * 0.07, u * 0.02, 0, 0, 6.3); g.fill();
      cy = h * 0.7 - hh * 0.0;
      // 宇宙人たち
      for (let i = 0; i < 3; i++) { const ax = cx + (i - 1) * u * 0.34 + (i === 1 ? u * 0.0 : 0), ay = h * 0.84 + Math.sin(t * 3 + i) * u * 0.01; if (i === 1) continue; g.fillStyle = '#7cf09a'; g.beginPath(); g.ellipse(ax, ay, u * 0.06, u * 0.08, 0, 0, 6.3); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.ellipse(ax - u * 0.02, ay - u * 0.01, u * 0.012, u * 0.02, 0, 0, 6.3); g.ellipse(ax + u * 0.02, ay - u * 0.01, u * 0.012, u * 0.02, 0, 0, 6.3); g.fill(); }
    } else if (pose === 'tiny' || pose === 'crash') {
      g.fillStyle = '#4fb04f'; g.fillRect(0, h * 0.8, w, h * 0.2); g.fillStyle = '#3a8f3a'; g.fillRect(0, h * 0.8, w, u * 0.015);
    }
    // 月 / 地球
    if (pose === 'space') { g.fillStyle = '#e8e4cc'; g.beginPath(); g.arc(w * 0.82, h * 0.2, u * 0.12, 0, 6.3); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(w * 0.82 - u * 0.04, h * 0.2 - u * 0.01, u * 0.012, 0, 6.3); g.arc(w * 0.82 + u * 0.03, h * 0.2 - u * 0.01, u * 0.012, 0, 6.3); g.fill(); }
    // 主人公
    g.save();
    let rot = 0, expr: 'idle' | 'happy' | 'angry' | 'wow' | 'scared' | 'dead' | 'sweat' = 'happy', jet = pose !== 'tiny' && pose !== 'crash' && pose !== 'planet';
    let hy = cy, hsize = hh;
    if (pose === 'tiny') { hsize = hh * 0.8; hy = h * 0.8 - hsize * 0.5; expr = 'sweat'; jet = false; }
    if (pose === 'crash') { rot = Math.PI * 0.95; hy = h * 0.8 - hh * 0.1; expr = 'dead'; }
    if (pose === 'planet') { hy = h * 0.8 - hh * 0.25; expr = 'wow'; rot = Math.sin(t * 2) * 0.05; }
    if (pose === 'space') { rot = Math.sin(t * 1.3) * 0.5 - 0.3; expr = 'wow'; }
    if (pose === 'cloud') { rot = 0.3 * Math.sin(t * 2); expr = s.death === 'hit' ? 'scared' : 'happy'; }
    if (pose === 'afro') { rot = Math.sin(t * 8) * 0.06; expr = 'angry'; }
    if (pose === 'soot') { rot = Math.sin(t * 3) * 0.1; expr = 'sweat'; }
    if (pose === 'bird') { expr = 'scared'; }
    g.translate(cx, hy); g.rotate(rot);
    if (jet) { // おならジェット
      const len = hsize * (0.55 + 0.12 * Math.sin(t * 25)); const gj = g.createLinearGradient(0, hsize * 0.15, 0, hsize * 0.15 + len);
      gj.addColorStop(0, 'rgba(255,255,140,0.95)'); gj.addColorStop(0.5, 'rgba(120,255,110,0.75)'); gj.addColorStop(1, 'rgba(60,200,80,0)'); g.fillStyle = gj;
      g.beginPath(); g.moveTo(-hsize * 0.08, hsize * 0.15); g.quadraticCurveTo(-hsize * 0.2, hsize * 0.15 + len * 0.5, 0, hsize * 0.15 + len); g.quadraticCurveTo(hsize * 0.2, hsize * 0.15 + len * 0.5, hsize * 0.08, hsize * 0.15); g.fill();
      g.fillStyle = 'rgba(150,230,110,0.4)'; for (let i = 0; i < 6; i++) { const k = (t * 1.5 + i / 6) % 1; g.beginPath(); g.arc(Math.sin(i * 3 + t) * hsize * 0.1, hsize * 0.2 + len * (0.4 + k * 0.9), hsize * (0.04 + k * 0.08), 0, 6.3); g.fill(); }
    }
    drawUncle(g, { x: 0, y: 0, h: hsize, expr, t, flail: pose === 'tiny' ? 0 : 1, skin: 'skin_normal' });
    const headR = hsize * 0.19, headCy = -hsize / 2 + headR;
    if (pose === 'space' || pose === 'planet') { g.strokeStyle = 'rgba(200,240,255,0.9)'; g.lineWidth = hsize * 0.02; g.fillStyle = 'rgba(160,220,255,0.25)'; g.beginPath(); g.arc(0, headCy, headR * 1.35, 0, 6.3); g.fill(); g.stroke(); }
    if (pose === 'afro') { g.fillStyle = '#3b2a20'; for (let i = 0; i < 18; i++) { const a = -Math.PI + (i / 17) * Math.PI, r0 = headR * 0.9, r1 = headR * (1.9 + 0.5 * h01(i) + 0.15 * Math.sin(t * 12 + i)); g.beginPath(); g.moveTo(Math.cos(a - 0.12) * r0, headCy + Math.sin(a - 0.12) * r0); g.lineTo(Math.cos(a) * r1, headCy + Math.sin(a) * r1); g.lineTo(Math.cos(a + 0.12) * r0, headCy + Math.sin(a + 0.12) * r0); g.fill(); } }
    if (pose === 'soot') { g.fillStyle = 'rgba(20,16,14,0.88)'; g.beginPath(); g.arc(0, headCy, headR * 0.95, 0, 6.3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-headR * 0.35, headCy - headR * 0.1, headR * 0.17, 0, 6.3); g.arc(headR * 0.35, headCy - headR * 0.1, headR * 0.17, 0, 6.3); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(-headR * 0.35, headCy - headR * 0.1, headR * 0.07, 0, 6.3); g.arc(headR * 0.35, headCy - headR * 0.1, headR * 0.07, 0, 6.3); g.fill(); }
    g.restore();
    // 鳥の群れ
    if (pose === 'bird' || s.birdNear >= 3) { const n = Math.min(8, 3 + s.birdNear); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + t * 0.8; drawBird(g, cx + Math.cos(a) * u * 0.3, cy + Math.sin(a) * u * 0.22, u * 0.0042 * 5, Math.cos(a + 1.57) > 0 ? 1 : -1, t); } }
    // クラッシュの星
    if (pose === 'crash') { g.fillStyle = '#ffe35a'; for (let i = 0; i < 5; i++) { const a = t * 2 + i * 1.26; g.beginPath(); g.arc(cx + Math.cos(a) * u * 0.2, h * 0.8 - hh * 1.05 + Math.sin(a) * u * 0.03, u * 0.014, 0, 6.3); g.fill(); } }
    // ポスター文字
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.font = `900 ${u * 0.17}px "Hiragino Sans", sans-serif`; g.lineWidth = u * 0.025; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.fillStyle = '#fff';
    g.strokeText(`${m}m`, cx, h * 0.12); g.fillText(`${m}m`, cx, h * 0.12);
    g.font = `800 ${u * 0.05}px "Hiragino Sans", sans-serif`; g.lineWidth = u * 0.012; g.fillStyle = '#c9ffd0';
    g.strokeText('おならエレベーター', cx, h * 0.12 + u * 0.14); g.fillText('おならエレベーター', cx, h * 0.12 + u * 0.14);
    g.restore();
  };
  return {
    title: j.title, comment: j.comment, rare: j.rare,
    facts: [
      { label: '到達高度', value: `${m}m` }, { label: 'タップ数', value: `${s.taps}回` }, { label: 'タップ/秒', value: tps.toFixed(1) },
      { label: 'ガス消費ピーク', value: `${Math.round(Math.min(1, s.peakGas) * 100)}%` }, { label: '最期', value: s.death === 'ground' ? '地面に落下' : `${killer}に衝突` },
      { label: '鳥ニアミス', value: `${s.birdNear}羽` },
    ],
    draw,
    postVariants: [
      `おならで${m}m飛んだ。称号は「${j.title}」`, `${j.comment} おならエレベーターで${m}m到達`, `連打${s.taps}回、おなら${m}m。${killer}にやられた…`,
    ],
  };
}
void CFG;

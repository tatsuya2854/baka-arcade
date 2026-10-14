import type { ResultArt } from '../../core/types';
import { EXACT_MM, MOUNTAIN_MM, NEAR_MM, ROUNDS, ZERO_MM, fmtCm, fmtErr, roundScore } from './config';
import { drawPaste, drawPile, drawScene, newScene, rr, type Scene } from './draw';

export interface RoundRes { target: number; L: number; err: number }
/** 記録サンプル: t(秒) と [L,grip,flow,amp,lift,thread,spat,used,reveal,taper,target] */
export interface Sample { t: number; v: number[] }
export const sampleOf = (s: Scene): number[] => [s.L, s.grip, s.flow, s.amp, s.lift, s.thread, s.spat, s.used, s.reveal, s.taper, s.target];

const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,sans-serif';
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function judge(rs: RoundRes[]) {
  const abs = rs.map(r => Math.abs(r.err));
  const mean = abs.reduce((a, b) => a + b, 0) / rs.length;
  const signed = rs.reduce((a, r) => a + r.err, 0) / rs.length;
  const exact = abs.some(a => a <= EXACT_MM);
  const exact10 = rs.some(r => r.target === 100 && Math.abs(r.err) <= EXACT_MM);
  const zero = rs.some(r => r.L < ZERO_MM);
  const mountain = rs.some(r => r.L >= MOUNTAIN_MM);
  const near = abs.some(a => a > EXACT_MM && a <= NEAR_MM);
  const rare = exact ? 'exact' : mountain ? 'mountain' : zero ? 'zero' : near ? 'near' : undefined;
  return { mean, signed, exact, exact10, zero, mountain, near, rare };
}

function titleOf(j: ReturnType<typeof judge>): [string, string] {
  if (j.exact10) return ['10.0cmジャスト', '歯科医も二度見する精度。今日のあなたは洗面台の神。'];
  if (j.mountain) return ['歯磨き粉の山', '一回分という概念が消滅した。ブラシが見えない。'];
  if (j.zero) return ['出なかった男', '握りが足りない。チューブは何も言わなかった。'];
  if (j.exact) return ['ミリ単位の職人', 'どれか1回は完璧。手に染みついた感覚。'];
  if (j.near) return ['惜しすぎる1mm', 'あと1mm。この1mmが人生で一番遠い。'];
  if (j.mean < 3) return ['歯科衛生士の手', 'ほぼ全部ぴったり。毎朝の積み重ね。'];
  if (j.mean < 6) return ['洗面台の精密機械', '誤差は数ミリ。かなり良い指。'];
  if (j.signed >= 10 && j.mean < 25) return ['出しすぎ常習犯', '「ちょっと多め」が口癖。歯ブラシがもう重い。'];
  if (j.signed <= -10 && j.mean < 25) return ['歯磨き粉節約家', 'ケチった。チューブ代は守られた。'];
  if (j.mean < 10) return ['誤差1cmの男', 'だいたいで生きている。それも悪くない。'];
  if (j.mean < 20) return ['朝の寝ぼけ指', 'まだ頭が起きていない。もう一度。'];
  if (j.mean < 40) return ['握力に支配された人', '指が勝手に動いた。チューブが主導権を握った。'];
  return ['チューブとの決別', '目標という概念はどこかへ消えた。'];
}

const e1 = (x: number) => Math.abs(x).toFixed(1);

export function buildArt(rs: RoundRes[], trace: Sample[]): ResultArt {
  const j = judge(rs);
  const [title, comment] = titleOf(j);
  const r0 = rs[0], worst = rs.reduce((a, r) => (Math.abs(r.err) > Math.abs(a.err) ? r : a), rs[0]);
  const facts = rs.map((r, i) => ({ label: `${i + 1}回目 目標${fmtCm(r.target)}`, value: `${fmtCm(r.L)}（${fmtErr(r.err)}）` }));
  facts.push({ label: '平均誤差', value: `${j.mean.toFixed(1)}mm` });
  const postVariants = [
    `${fmtCm(r0.target)}出すはずが${fmtCm(r0.L)}出た。誤差${e1(r0.err)}mmで人生が終わった。`,
    `歯磨き粉を3回測って平均誤差${j.mean.toFixed(1)}mm。称号は『${title}』。`,
    j.exact ? `誤差${EXACT_MM}mm以内で出した。『${title}』になった。` : `いちばんひどいズレは${e1(worst.err)}mm。歯磨き粉に勝てない。`,
  ];
  // リプレイ: 最後の押し出し〜離した瞬間をスロー再生
  let replay: ResultArt['replay'];
  if (trace.length > 4) {
    const tEnd = trace[trace.length - 1].t, t0 = Math.max(trace[0].t, tEnd - 3.0), SLOW = 0.5;
    const sc = newScene();
    replay = {
      durationSec: Math.min(6, (tEnd - t0) / SLOW),
      draw(g, w, h, t) {
        const tt = t0 + t * SLOW;
        let i = 0; while (i < trace.length - 2 && trace[i + 1].t < tt) i++;
        const a = trace[i], b = trace[i + 1], k = clamp((tt - a.t) / Math.max(1e-4, b.t - a.t));
        const v = (n: number) => a.v[n] + (b.v[n] - a.v[n]) * k;
        sc.L = v(0); sc.grip = v(1); sc.flow = v(2); sc.amp = v(3); sc.lift = v(4); sc.thread = v(5); sc.spat = a.v[6]; sc.used = v(7); sc.reveal = v(8); sc.taper = v(9); sc.target = a.v[10];
        drawScene(g, w, h, sc, tt);
      },
    };
  }
  return {
    title, comment, facts, rare: j.rare, postVariants, replay,
    draw(g, w, h, t) {
      const u = Math.min(w / 390, h / 500), pad = w * 0.07;
      let gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#f2f6f8'); gr.addColorStop(1, '#cdd8e0');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(110,135,150,0.14)'; g.lineWidth = 1; g.beginPath();
      for (let x = pad; x < w; x += 56 * u) { g.moveTo(x, 0); g.lineTo(x, h); }
      g.stroke();
      g.fillStyle = '#10202e'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = `800 ${12 * u}px ${FONT}`; g.fillStyle = '#5a6c7a'; g.fillText('歯磨き粉10.0cm　平均誤差', pad, h * 0.075);
      const avg = j.mean;
      g.fillStyle = avg <= 1 ? '#12a85a' : avg <= 6 ? '#e8890c' : '#e03a3e';
      g.font = `900 ${58 * u}px ${FONT}`; g.fillText(avg.toFixed(1), pad, h * 0.075 + 56 * u);
      const nw = g.measureText(avg.toFixed(1)).width;
      g.font = `900 ${22 * u}px ${FONT}`; g.fillText('mm', pad + nw + 6 * u, h * 0.075 + 56 * u);
      const top = h * 0.25, rh = (h * 0.72) / ROUNDS, mm = (w - pad * 2 - 12 * u) / 170, bx = pad + 6 * u;
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i], y = top + i * rh, bh = Math.min(rh * 0.3, 32 * u), yb = y + rh * 0.5, D = bh * 0.46;
        const ease = t <= 0 ? 1 : (() => { const q = clamp((t - i * 0.5) / 0.9); return 1 - Math.pow(1 - q, 3); })();
        g.font = `800 ${11 * u}px ${FONT}`; g.fillStyle = '#5a6c7a'; g.textAlign = 'left'; g.fillText(`${i + 1}回目　目標 ${fmtCm(r.target)}`, bx, y + rh * 0.14);
        const col = Math.abs(r.err) <= EXACT_MM ? '#12a85a' : Math.abs(r.err) <= 3 ? '#e8890c' : '#e03a3e';
        g.textAlign = 'right'; g.fillStyle = col; g.font = `900 ${20 * u}px ${FONT}`; g.fillText(fmtErr(r.err), w - pad, y + rh * 0.17);
        // ブラシ
        g.fillStyle = 'rgba(40,55,70,0.12)'; rr(g, bx - 8 * u, yb - bh / 2 + 5 * u, w - pad * 2 + 6 * u, bh, bh / 2); g.fill();
        gr = g.createLinearGradient(0, yb - bh / 2, 0, yb + bh / 2);
        gr.addColorStop(0, '#fbfdff'); gr.addColorStop(1, '#8fb0d8');
        g.fillStyle = gr; rr(g, bx - 8 * u, yb - bh / 2, w - pad * 2 + 6 * u, bh, bh / 2); g.fill();
        g.fillStyle = '#2b4c7e'; rr(g, bx - 2 * u, yb - bh * 0.34, w - pad * 2 - 6 * u, bh * 0.68, bh * 0.3); g.fill();
        g.fillStyle = '#3d86f2'; g.beginPath();
        for (let x = bx + 2 * u; x < w - pad - 6 * u; x += 6 * u) for (let q = 0; q < 2; q++) { g.moveTo(x + 2 * u, yb - bh * 0.14 + q * bh * 0.28); g.arc(x, yb - bh * 0.14 + q * bh * 0.28, 2 * u, 0, Math.PI * 2); }
        g.fill();
        // 歯磨き粉
        const Lm = Math.min(r.L, MOUNTAIN_MM - 14) * ease, over = r.L >= MOUNTAIN_MM - 14;
        drawPaste(g, bx, yb - D * 0.4, Lm * mm, D, 0, 0, 0);
        if (over && ease > 0.9) drawPile(g, bx + Lm * mm - D, yb - D * 0.4, D, bh * 1.2);
        // 目標線
        const tx = bx + r.target * mm;
        g.strokeStyle = '#ff3b30'; g.lineWidth = 1.6 * u; g.setLineDash([4 * u, 3 * u]);
        g.beginPath(); g.moveTo(tx, yb - bh * 0.95); g.lineTo(tx, yb + bh * 1.05); g.stroke(); g.setLineDash([]);
        // 定規
        const ry = yb + bh * 0.75;
        g.fillStyle = '#e2c88f'; rr(g, bx - 8 * u, ry, w - pad * 2 + 6 * u, 15 * u, 3 * u); g.fill();
        g.strokeStyle = '#2a2118'; g.lineWidth = 1; g.beginPath();
        for (let c = 0; c <= 16; c++) { const x = bx + c * 10 * mm; g.moveTo(x, ry + 1); g.lineTo(x, ry + (c % 5 === 0 ? 9 : 6) * u); }
        g.stroke();
        const tipx = bx + Lm * mm;
        g.fillStyle = '#1f6fe0'; g.beginPath(); g.moveTo(tipx, ry + 1); g.lineTo(tipx - 4 * u, ry - 6 * u); g.lineTo(tipx + 4 * u, ry - 6 * u); g.closePath(); g.fill();
        g.textAlign = 'left'; g.fillStyle = '#10202e'; g.font = `800 ${11 * u}px ${FONT}`;
        g.fillText(fmtCm(r.L), Math.min(tipx + 6 * u, w - pad - 44 * u), ry + 28 * u);
      }
      void roundScore;
    },
  };
}

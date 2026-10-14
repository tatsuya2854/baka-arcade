import type { ResultArt } from '../../core/types';
import { CFG } from './config';
import { KetchupShader, buildBackdrop, drawBottle, drawStream, drawTarget, layoutFor, type Layout } from './scene';

export interface Frame { data: Uint8Array; theta: number; q: number }
export interface Summary {
  err: number; V: number; Vt: number; grams: number; targetG: number; score: number;
  burst: number; presses: number; elapsed: number;
}
export const QSCALE = 20; // replay の Uint8 量子化(h*QSCALE)

const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';
const sgn = (e: number) => (e >= 0 ? '+' : '−') + (Math.abs(e) * 100).toFixed(1) + '%';

export function titleFor(s: Summary): { title: string; comment: string; rare?: string } {
  const e = s.err, a = Math.abs(e), r = s.V / s.Vt;
  if (a <= CFG.goldenErr) return { title: '黄金比', comment: 'この皿は美術館に収蔵されます。', rare: 'golden' };
  if (a <= 0.04) return { title: 'ケチャップ職人', comment: '指先に定規が入っている。' };
  if (r < 0.01) return { title: '空気だけ出した人', comment: 'ブッ、だけ。中身は出ていない。' };
  if (r >= 2) return { title: r >= 3 ? 'ケチャップ事件' : 'ケチャップ洪水', comment: r >= 3 ? '皿は証拠品として押収された。' : 'もう「かける」ではなく「沈める」。', rare: 'flood' };
  if (r < 0.2) return { title: '一滴の男', comment: '遠慮が国宝級。', rare: 'drop' };
  if (a <= 0.08) return { title: 'ほぼ職人', comment: '惜しい。あと一押し(か一引き)。' };
  if (s.burst >= 15 && s.score < 700) return { title: 'ブシャー芸人', comment: '勢いが良すぎて壁が赤い。', rare: 'burst' };
  if (e < -0.5) return { title: '遠慮の塊', comment: '半分も出していない。もっと信じて。' };
  if (e < -0.25) return { title: 'ケチケチャップ', comment: '節約家。皿はさみしい。' };
  if (e < 0) return { title: 'ちょい足りない人', comment: '目標までもう少し。' };
  if (e > 0.5) return { title: 'ドバッと派', comment: '「ちょうど」の概念がない。' };
  if (e > 0.2) return { title: 'ちょい足しの人', comment: '気持ちが溢れた。' };
  return { title: 'やや盛りの人', comment: '少し多い。愛情ということで。' };
}

/** 結果アート: 皿の上の実際のケチャップ + 目標輪郭 */
export function buildArt(s: Summary, field: Float32Array, frames: Frame[]): ResultArt {
  const tt = titleFor(s);
  // 称号に加えて、実条件で判定したレア(burst は他称号でも飛沫が多ければ付与)
  let rare = tt.rare;
  if (!rare && s.burst >= 8) rare = 'burst';
  const gs = s.grams.toFixed(1), tg = s.targetG.toFixed(1), pct = sgn(s.err);
  const facts = [
    { label: '目標量', value: `${tg}g` },
    { label: '出した量', value: `${gs}g` },
    { label: '誤差', value: pct },
    { label: '長押し回数', value: `${s.presses}回` },
  ];
  if (s.burst > 0) facts.push({ label: '飛び散った粒', value: `${s.burst}粒` });
  const caches = new Map<string, HTMLCanvasElement>();
  const backdrop = (L: Layout) => {
    const k = `${Math.round(L.w)}x${Math.round(L.h)}${L.poster ? 'p' : 'g'}`; let c = caches.get(k);
    if (!c) { c = buildBackdrop(L, Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)); if (caches.size > 6) caches.clear(); caches.set(k, c); } return c;
  };
  let posterShader: KetchupShader | null = null, replayShader: KetchupShader | null = null;
  const draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const L = layoutFor(w, h, true);
    if (!posterShader) { posterShader = new KetchupShader(); posterShader.shade(field); }
    g.drawImage(backdrop(L), 0, 0, w, h);
    posterShader.draw(g, L);
    drawTarget(g, L, t, 0.95, false);
    // ツヤのきらめき
    const gx = L.cx - 8 * L.kx + Math.sin(t * 1.3) * 3 * L.kx, gy = L.cy - 9 * L.ky;
    const sp = 0.5 + 0.5 * Math.sin(t * 3); g.save(); g.globalAlpha = 0.25 + 0.4 * sp; g.strokeStyle = '#fff'; g.lineWidth = 1.6 * L.s; g.lineCap = 'round';
    const rr = (3 + 3 * sp) * L.s * 2; g.beginPath(); g.moveTo(gx - rr, gy); g.lineTo(gx + rr, gy); g.moveTo(gx, gy - rr * 1.2); g.lineTo(gx, gy + rr * 1.2); g.stroke(); g.restore();
    g.textAlign = 'center'; g.lineJoin = 'round';
    const big = Math.round(Math.min(w * 0.17, h * 0.12));
    g.font = `900 ${big}px ${FONT}`; g.lineWidth = big * 0.14; g.strokeStyle = 'rgba(255,255,255,.9)';
    const ty = h * 0.16; g.strokeText(pct, w / 2, ty); g.fillStyle = a(s) ; g.fillText(pct, w / 2, ty);
    const sm = Math.round(big * 0.3); g.font = `900 ${sm}px ${FONT}`; g.lineWidth = sm * 0.2;
    g.strokeText('目標との誤差', w / 2, ty - big * 0.95); g.fillStyle = '#4a3226'; g.fillText('目標との誤差', w / 2, ty - big * 0.95);
    const by = h * 0.9; const bsm = Math.round(Math.min(w * 0.058, h * 0.045)); g.font = `900 ${bsm}px ${FONT}`; g.lineWidth = bsm * 0.22;
    const line = `出した量 ${gs}g ／ 目標 ${tg}g`; g.strokeText(line, w / 2, by); g.fillStyle = '#4a3226'; g.fillText(line, w / 2, by);
  };
  const n = frames.length;
  const dur = Math.min(7, n / (60 / CFG.recEvery) * 2.2);
  const replay = n > 6 ? {
    durationSec: dur,
    draw(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const L = layoutFor(w, h, false); const i = Math.max(0, Math.min(n - 1, Math.floor((t / dur) * n))); const fr = frames[i];
      if (!replayShader) replayShader = new KetchupShader();
      g.drawImage(backdrop(L), 0, 0, w, h);
      replayShader.shade(fr.data, 1 / QSCALE); replayShader.draw(g, L);
      drawTarget(g, L, t, 0.7, false);
      drawStream(g, L, fr.q, L.py - 2, t);
      drawBottle(g, L, fr.theta, Math.min(1, fr.q / 1000));
      g.font = `900 ${Math.round(14 * L.s + 4)}px ${FONT}`; g.textAlign = 'left'; g.fillStyle = 'rgba(74,50,38,.8)'; g.fillText('SLOW ▶', 14, 28);
    },
  } : undefined;
  return {
    title: tt.title, comment: tt.comment, facts, rare, replay,
    postVariants: [
      `ケチャップ${gs}g出した。目標${tg}gとの誤差${pct}。人生で一番ケチャップに集中した。`,
      `「ちょうどの量」が分からなくなった。${s.score}点。称号『${tt.title}』`,
      `${gs}g。${s.err >= 0 ? 'ケチャップに負けた' : 'ケチャップに遠慮した'}。誤差${pct}。`,
    ],
    draw,
  };
}
const a = (s: Summary) => (Math.abs(s.err) <= 0.04 ? '#1c7a3a' : Math.abs(s.err) <= 0.15 ? '#c26a00' : '#b3151b');

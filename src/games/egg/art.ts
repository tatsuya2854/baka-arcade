import type { ResultArt } from '../../core/types';
import { C, FONT } from './config';
import { type Drop, drawLanded, drawPanBg, drawScene, topGeom, drawGlintsPublic, drawSteamPublic } from './scene';

const fmm = (d: number) => `${d.toFixed(1)}mm`;
const COLS = ['#ffd45a', '#7fd6ff', '#ff8fb1'];

function pick(ds: Drop[], avg: number): { title: string; comment: string } {
  const misses = ds.filter(d => d.miss).length, bursts = ds.filter(d => d.burst).length, rims = ds.filter(d => d.rim).length;
  const tall = ds.some(d => d.z0 > 240 && !d.burst);
  if (ds.some(d => d.d < C.PERFECT_MM)) return { title: 'ど真ん中の神', comment: '1mm未満。卵のほうが驚いている。' };
  if (misses === 3) return { title: 'フライパン不在の男', comment: '全弾コンロ。落とす先はそこじゃない。' };
  if (misses === 2) return { title: 'カウンターの汚し屋', comment: '2個はフライパンの外。掃除は任せた。' };
  if (misses === 1) return { title: 'フライパンを外した男', comment: '1個は台に直接落ちた。それも料理。' };
  if (bursts >= 2) return { title: '黄身大爆発の人', comment: '勢いが良すぎる。卵は投げるものじゃない。' };
  if (bursts === 1 && avg < 500) return { title: '黄身の殉職者', comment: '黄身が犠牲になった。ご冥福を。' };
  if (avg >= 900) return { title: '黄身が主役', comment: '白身は脇役。主役は完璧に中央。' };
  if (avg >= 800) return { title: '朝食の匠', comment: 'ミシュランも二度見する精度。' };
  if (rims >= 1 && avg >= 300) return { title: 'フライパンの外交官', comment: 'フチギリギリで交渉成立。際どい。' };
  if (tall && avg >= 500) return { title: '白身が広がりすぎた人', comment: '高い所から落とすと白身は広がる。' };
  if (avg >= 650) return { title: '惜しいが旨い', comment: '少しズレたけど味は変わらない。' };
  if (avg >= 500) return { title: '半熟の見習い', comment: '修行あるのみ。まず卵を割ろう。' };
  if (avg >= 350) return { title: '洗い物が増える人', comment: 'フライパンの端で焦げが育っている。' };
  if (avg >= 200) return { title: '床の目玉焼き職人', comment: '惜しい。着地点は台所のどこか。' };
  return { title: '卵に謝れ', comment: '卵「なぜ私を…」' };
}

export function buildArt(ds: Drop[], avg: number): ResultArt {
  const { title, comment } = pick(ds, avg);
  const best = ds.reduce((a, b) => (b.score > a.score ? b : a), ds[0]);
  const bursts = ds.filter(d => d.burst).length, misses = ds.filter(d => d.miss).length, rims = ds.filter(d => d.rim && !d.miss).length;
  const mean = ds.reduce((a, d) => a + d.d, 0) / ds.length, minD = Math.min(...ds.map(d => d.d));
  const wAvg = ds.reduce((a, d) => a + d.Wf * 2, 0) / ds.length;
  const rare = ds.some(d => d.d < C.PERFECT_MM) ? 'bullseye' : rims ? 'edge' : bursts ? 'yolkburst' : misses ? 'miss' : undefined;
  const facts = [
    ...ds.map((d, i) => ({ label: `${i + 1}個目の誤差`, value: d.miss ? `${fmm(d.d)}（フライパン外）` : fmm(d.d) })),
    { label: '黄身', value: bursts ? `${bursts}個 割れた` : '全部 無事' },
    { label: '白身の広がり', value: `直径 ${Math.round(wAvg)}mm` },
  ];
  const pv = [
    `フライパンの真ん中に卵を落とした。最小誤差${fmm(minD)}。称号は「${title}」。`,
    `卵3個の平均誤差${fmm(mean)}。${bursts ? `黄身が${bursts}個割れた。` : '黄身は守った。'}「${title}」`,
    misses ? `フライパンを外して${avg}点。台所が犠牲になった。` : `目玉焼きを落として${avg}点。「${title}」になった。`,
  ];
  const draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const pr = Math.min(w * 0.42, h * 0.31), gm = topGeom(w / 2, h * 0.45, pr), s = gm.s;
    drawPanBg(g, w, h, gm); drawGlintsPublic(g, gm, t);
    const order = [...ds].sort((a, b) => a.score - b.score);
    for (const d of order) drawLanded(g, d, 4, gm, 1, t);
    // 誤差線と番号
    g.textBaseline = 'middle'; g.textAlign = 'center';
    ds.forEach((d, i) => {
      const x = gm.cx + d.X * s, y = gm.cy + d.Y * s, col = COLS[i % 3], rr = Math.max(8, w * 0.024);
      g.save(); g.strokeStyle = col; g.lineWidth = Math.max(1.5, w / 300); g.setLineDash([w / 90, w / 110]); g.beginPath(); g.moveTo(gm.cx, gm.cy); g.lineTo(x, y); g.stroke(); g.restore();
      g.fillStyle = col; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#111'; g.font = `900 ${Math.round(rr * 1.4)}px ${FONT}`; g.fillText(String(i + 1), x, y + 1);
    });
    const fs = Math.round(Math.max(11, w * 0.034)), cw = w * 0.29;
    ds.forEach((d, i) => {
      const x = w / 2 + (i - 1) * (cw + w * 0.02), y = h * 0.8;
      g.fillStyle = 'rgba(8,8,10,.78)'; g.beginPath(); g.roundRect(x - cw / 2, y - fs, cw, fs * 2, fs); g.fill();
      g.fillStyle = COLS[i % 3]; g.font = `800 ${fs}px ${FONT}`; g.fillText(`${i + 1}  ${d.miss ? '外れ' : fmm(d.d)}`, x, y + 1);
    });
    drawSteamPublic(g, gm, t, 0.7);
    // 見出し
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = `900 ${Math.round(w * 0.05)}px ${FONT}`; g.fillText('目玉焼きを落とせ', w / 2, h * 0.07);
    g.fillStyle = '#ffc83d'; g.font = `900 ${Math.round(w * 0.1)}px ${FONT}`; g.fillText(`${avg}点`, w / 2, h * 0.88);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `800 ${Math.round(w * 0.04)}px ${FONT}`; g.fillText(title, w / 2, h * 0.95);
  };
  const durationSec = 4.2;
  const replay = {
    durationSec,
    draw(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const tau = -0.25 + t * 0.5;
      const wide = w / h > 0.9;
      drawScene(g, w, h, t, { drop: best, tau }, wide ? { cx: w / 2, cy: h * 0.72, s: Math.min(w / 300, h / 400), k: 0.55 } : undefined);
      const ts = tau - best.tFall;
      if (ts > 0.5) {
        const a = Math.min(1, (ts - 0.5) / 0.4), fs = Math.round(Math.min(w * 0.09, h * 0.1));
        g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${fs}px ${FONT}`;
        g.lineJoin = 'round'; g.lineWidth = fs * 0.2; g.strokeStyle = 'rgba(0,0,0,.8)'; const txt = `誤差 ${fmm(best.d)}`;
        g.strokeText(txt, w / 2, h * 0.16); g.fillStyle = '#ffd45a'; g.fillText(txt, w / 2, h * 0.16); g.restore();
      }
    },
  };
  return { title, comment, facts, rare, postVariants: pv, draw, replay };
}

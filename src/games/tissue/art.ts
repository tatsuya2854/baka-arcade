import type { ResultArt } from '../../core/types';
import { CFG } from './config';
import { drawScene, flatSheet, hash } from './render';
import type { Snap } from './sim';

export interface Info {
  n: number; torn: boolean; tornFrac: number; returned: boolean; timeout: boolean;
  score: number; angDeg: number; avgV: number; peakV: number; travel: number; snaps: Snap[];
}

export function pickTitle(i: Info): { title: string; comment: string; rare?: string } {
  const { n } = i;
  if (i.timeout) return { title: 'ためらいの10秒', comment: '10秒間、ティッシュを見つめ続けた。' };
  if (i.torn) return i.tornFrac >= 0.5 ? { title: 'ちぎれた1枚', comment: 'ゆっくり引きすぎて、途中でちぎれた。', rare: 'torn' } : { title: 'ほぼ紙片', comment: 'ほとんど取り出し口に残った。', rare: 'torn' };
  if (i.returned) return i.travel < 0.4 ? { title: '引っ込み思案', comment: 'つまんだだけで、離した。' } : { title: '惜しい寸前', comment: '取り出し口から出きらず、箱に戻った。' };
  if (n === 1) {
    if (i.score >= 950) return { title: 'ちょうど1枚', comment: '1枚だけ。美しい引き抜きだった。', rare: 'one' };
    if (i.score >= 900) return { title: 'ティッシュ職人', comment: '指先の精度が1枚を分けた。', rare: 'one' };
    if (i.avgV < 0.5) return { title: '慎重すぎる1枚', comment: '丁寧すぎて、少し破れそうだった。', rare: 'one' };
    if (i.angDeg > 25) return { title: '斜めの1枚', comment: '横から引いても、1枚は1枚。', rare: 'one' };
    return { title: 'ギリ1枚', comment: '1枚。でも指の動きにまだ無駄がある。', rare: 'one' };
  }
  if (n === 2) return { title: '2枚目が付いてきた', comment: '1枚のつもりが、オマケが付いた。' };
  if (n === 3) return { title: '連なる運命', comment: '端と端が絡み合い、運命は連なった。', rare: 'chain' };
  if (n <= 5) return { title: '欲張りの手', comment: `${n}枚。ちょっと引きが速かった。`, rare: 'chain' };
  if (n <= 7) return { title: '止まらない連鎖', comment: '1度つながったら、もう止まらない。', rare: 'chain' };
  if (n <= 11) return { title: 'ティッシュ雪崩', comment: '箱から紙があふれ出した。', rare: 'avalanche' };
  if (n <= 19) return { title: '箱が空っぽ寸前', comment: '指が速すぎて、箱の中身が消えた。', rare: 'avalanche' };
  return { title: 'ティッシュ全滅', comment: '箱の中身をほぼ全部引き抜いた。', rare: 'avalanche' };
}

export function makeArt(i: Info): ResultArt {
  const { n } = i, p = pickTitle(i);
  const facts = i.timeout ? [{ label: '引いた枚数', value: '0枚' }, { label: '迷った時間', value: '10秒' }] : [
    { label: i.torn ? '取れた枚数' : '取れた枚数', value: i.torn ? '0枚(ちぎれ)' : `${n}枚` },
    { label: '引く速さ', value: `${Math.round(i.avgV * CFG.sheetCm)} cm/s` },
    { label: '引く角度', value: `${Math.round(i.angDeg)}°` },
    { label: '引いた長さ', value: `${Math.round(i.travel * CFG.sheetCm)} cm` },
  ];
  const tag = i.timeout ? '10秒迷って、1枚も取れなかった。' : i.torn ? 'ゆっくり引きすぎて、ちぎれた。' : i.returned ? 'つまんだけど、出せなかった。' : n === 1 ? '1枚だけ取れた。それだけで気持ちいい。' : `1枚のつもりが${n}枚出た。`;
  const postVariants = i.timeout ? ['ティッシュを前に10秒固まった。', '1枚取るだけなのに、手が動かなかった。', 'ティッシュ1枚取るのに迷いすぎ。']
    : i.torn ? ['ゆっくり引きすぎて、ちぎれた。', 'ティッシュを丁寧に引いたらちぎれた。', 'ちぎれた1枚。人生みたいだ。']
    : n === 1 ? [`ティッシュ、ちょうど1枚。${i.score}点。`, `1枚だけ取れた。${i.score}点。指先の勝利。`, 'ティッシュを1枚だけ取るだけのゲームで本気になった。']
    : n >= 8 ? [`ティッシュを${n}枚出した。雪崩。`, `1枚のつもりが${n}枚。箱が空になる。`, `${n}枚。もう止まらなかった。`]
    : [`1枚のつもりが${n}枚出た。`, `ティッシュ${n}枚。連なる運命だった。`, `${n}枚つながった。1枚だけが難しい。`];
  const frames = i.snaps;
  return {
    title: p.title, comment: p.comment || tag, facts, rare: p.rare, postVariants,
    draw(g, w, h, t) { poster(g, w, h, t, i); },
    replay: frames.length > 8 ? { durationSec: 4, draw(g, w, h, t) { const k = Math.min(frames.length - 1, Math.floor(t / 4 * frames.length)); const s = frames[k]; drawScene(g, w, h, s, s.time, { hud: true, label: 'REPLAY' }); } } : undefined,
  };
}

function poster(g: CanvasRenderingContext2D, w: number, h: number, t: number, i: Info) {
  const S = Math.min(w, h), n = i.n;
  let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#39424f'); gr.addColorStop(1, '#1b2027'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  gr = g.createRadialGradient(w / 2, h * 0.5, 5, w / 2, h * 0.5, S * 0.8); gr.addColorStop(0, 'rgba(255,246,228,0.28)'); gr.addColorStop(1, 'rgba(255,246,228,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const fl = Math.sin(t * 1.6) * S * 0.01;
  if (i.timeout || (i.returned && !i.torn)) {
    flatSheet(g, w / 2, h * 0.7, S * 0.36, S * 0.3, 0.1, 0.5, 2, 0.45);
  } else if (i.torn) {
    flatSheet(g, w / 2 - S * 0.05, h * 0.52 + fl, S * 0.4, S * 0.3 * Math.max(0.4, i.tornFrac), -0.12, 1, 4, 0.9, true);
    flatSheet(g, w / 2 + S * 0.22, h * 0.72, S * 0.12, S * 0.07, 0.6, 0.9, 8, 0.7, true);
  } else if (n === 1) {
    gr = g.createRadialGradient(w / 2, h * 0.5, 5, w / 2, h * 0.5, S * 0.45); gr.addColorStop(0, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(w / 2, h * 0.9, S * 0.2, S * 0.03, 0, 0, Math.PI * 2); g.fill();
    flatSheet(g, w / 2, h * 0.6 + fl, S * 0.38, S * 0.52, Math.sin(t) * 0.03, 1, 3, 1, false, false);
  } else {
    const c = Math.min(n, 36), by = h * 0.76;
    for (let k = 0; k < c; k++) {
      const spread = S * 0.34 * (1 - 0.55 * k / c), x = w / 2 + (hash(k + 2) - 0.5) * 2 * spread, y = by - (k / c) * S * 0.3 + (hash(k) - 0.5) * S * 0.03;
      flatSheet(g, x, y, S * 0.3, S * 0.3, (hash(k + 7) - 0.5) * 2.2, 0.92, k + 1, 0.55, false, k < 24);
    }
    if (n >= 8) for (let k = 0; k < 7; k++) { const f = (t * 0.25 + hash(k + 40)) % 1; flatSheet(g, w * (0.2 + 0.6 * hash(k + 50)) + Math.sin(t * 2 + k) * 10, h * 0.1 + f * h * 0.5, S * 0.22, S * 0.2, Math.sin(t * 2 + k) * 0.8, 0.7 * (1 - f * 0.4), k + 90, 0.6 + 0.3 * Math.abs(Math.sin(t * 3 + k)), false, false); }
  }
  const num = i.timeout ? '0' : i.torn ? '0' : String(n);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = `800 ${S * 0.34}px "Hiragino Sans","Helvetica Neue",sans-serif`; const nw = g.measureText(num).width;
  const x0 = w / 2 - (nw + S * 0.14) / 2;
  g.fillStyle = 'rgba(255,255,255,0.94)'; g.fillText(num, x0, h * 0.2 + S * 0.12);
  g.font = `800 ${S * 0.1}px "Hiragino Sans",sans-serif`; g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('枚', x0 + nw + S * 0.02, h * 0.2 + S * 0.12);
}

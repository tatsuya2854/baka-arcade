import type { ResultArt } from '../../core/types';
import { drawBtn } from './events';
import { drawUncle } from '../../core/characters';
import { loadImg, drawCover } from '../../core/images';

/** 現場写真用の生成画像(読めなければ null=従来のベクター描画にフォールバック)。モジュール共有・小さいので解放不要 */
const NI: { bg: HTMLImageElement | null; hero: HTMLImageElement | null; item: HTMLImageElement | null } = { bg: null, hero: null, item: null };
let niP: Promise<void> | null = null;
/** item/hero の下端に残る白い縁(切り抜きの取り残し)を一度だけ消したキャンバスを作る */
const cleaned = new Map<HTMLImageElement, HTMLCanvasElement>();
function cleanImg(im: HTMLImageElement): CanvasImageSource & { width: number; height: number } {
  let c = cleaned.get(im);
  if (!c) {
    c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const q = c.getContext('2d')!; q.drawImage(im, 0, 0);
    try {
      const d = q.getImageData(0, 0, c.width, c.height), a = d.data, y0 = Math.floor(c.height * 0.5);
      for (let y = y0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const k = (y * c.width + x) * 4, m = Math.min(a[k], a[k + 1], a[k + 2]); if (m > 226) a[k + 3] = Math.round(a[k + 3] * Math.max(0, 1 - (m - 226) / 20)); }
      q.putImageData(d, 0, 0);
    } catch { /* 読めなければそのまま */ }
    cleaned.set(im, c);
  }
  return c;
}
export const loadNewsImgs = (): Promise<void> => (niP ??= Promise.all([loadImg('dont-press', 'bg'), loadImg('dont-press', 'hero'), loadImg('dont-press', 'item')]).then(([b, h, i]) => { NI.bg = b; NI.hero = h; NI.item = i; }));

/** 事件(演出)ごとの見出し断片と記事用の一行 */
export const INCIDENTS: Record<string, { head: string; line: string; pri: number }> = {
  shake: { head: 'ボタンが震え出し', line: 'ボタンが突如ガタガタ震えた', pri: 1 },
  grow: { head: 'ボタンが巨大化し', line: 'ボタンが突然巨大化した', pri: 3 },
  shrink: { head: 'ボタンが縮み', line: 'ボタンが縮んだ', pri: 1 },
  talk: { head: 'ボタンがしゃべり出し', line: 'ボタンが人語を話した', pri: 2 },
  color: { head: 'ボタンが変色し', line: 'ボタンの色が変わった', pri: 1 },
  ouch: { head: 'ボタンが「痛い」と訴え', line: 'ボタンが痛みを訴えた', pri: 2 },
  bounce: { head: 'ボタンが跳ね回り', line: 'ボタンが跳ね回った', pri: 1 },
  jelly: { head: 'ボタンがゼリー化し', line: 'ボタンがぷるぷるになった', pri: 1 },
  spin: { head: 'ボタンが高速回転し', line: 'ボタンが回転した', pri: 2 },
  title: { head: '注意書きが書き換わり', line: '注意書きが勝手に変わった', pri: 1 },
  flee: { head: 'ボタンが逃走し', line: 'ボタンが逃げ出した', pri: 3 },
  uncle: { head: '謎のおじさんが出現し', line: '謎のおじさんが現れた', pri: 5 },
  crack: { head: '画面が割れ', line: '画面にひびが入った', pri: 5 },
  countdown: { head: '謎のカウントダウンが始まり', line: '謎のカウントダウンが始まった', pri: 3 },
  hiccup: { head: 'ボタンがしゃっくりし', line: 'ボタンがしゃっくりした', pri: 1 },
  sleepy: { head: 'ボタンが居眠りし', line: 'ボタンが居眠りした', pri: 1 },
  explode: { head: 'ボタンが爆発し', line: 'ボタンが爆発(演出)した', pri: 7 },
  ghost: { head: 'ボタンが消失し', line: 'ボタンが透明になった', pri: 3 },
  glasses: { head: 'ボタンがサングラスを着用し', line: 'ボタンがサングラスをかけた', pri: 2 },
  multi: { head: 'ボタンが増殖し', line: 'ボタンが増殖した', pri: 6 },
  sorry: { head: 'おじさんが土下座し', line: 'おじさんが謝罪した', pri: 4 },
  fakebtn: { head: '偽ボタンが出回り', line: '偽ボタンが出回った', pri: 3 },
  tap10: { head: '10連打を迫られ', line: '10連打を強要された', pri: 4 },
  coins: { head: 'コインが降り注ぎ', line: 'コインが降ってきた', pri: 3 },
  flip: { head: '世界が逆さまになり', line: '世界が逆さまになった', pri: 8 },
  confetti: { head: '紙吹雪が舞い', line: '紙吹雪が舞った', pri: 2 },
  slot: { head: 'スロットが回り出し', line: 'スロットマシンが現れた', pri: 4 },
  gravity: { head: 'ボタンが墜落し', line: 'ボタンが落下した', pri: 3 },
  angry: { head: 'おじさんが激怒し', line: 'おじさんが激怒した', pri: 5 },
  targets: { head: '的当てが強制開催され', line: '的当てが開催された', pri: 3 },
  rain: { head: 'ボタンの雨が降り', line: 'ボタンの雨が降った', pri: 5 },
  dark: { head: '停電が発生し', line: '停電が発生した', pri: 4 },
  quake: { head: '大地震が発生し', line: '大地震が発生した', pri: 6 },
  horde: { head: 'ボタンの大群が押し寄せ', line: 'ボタンの大群が集結した', pri: 6 },
  waitgo: { head: '反射神経テストが行われ', line: '反射神経を試された', pri: 3 },
  rainbow: { head: 'ボタンが虹色に輝き', line: 'ボタンが虹色に光った', pri: 3 },
  fakeerror: { head: '致命的エラーが表示され', line: '偽のエラー画面が出た', pri: 4 },
  sp100: { head: '100回記念式典が開かれ', line: '100回達成を祝われた', pri: 6 },
  sp500: { head: '500回記念で国民的祝賀となり', line: '500回達成で伝説扱いされた', pri: 9 },
  ending: { head: '伝説のエンディングが訪れ', line: '隠しエンディングに到達した', pri: 10 },
};

export interface RoundStats {
  presses: number; total: number; durSec: number; log: Record<string, number>; found: number; newCount: number; distinct: number; spawn: number; mini: number; score: number;
}

function wrap(g: CanvasRenderingContext2D, s: string, maxW: number): string[] {
  const out: string[] = []; let cur = '';
  for (const ch of s) { if (g.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur); return out;
}

export function buildArt(st: RoundStats): ResultArt {
  void loadNewsImgs();
  const ids = Object.keys(st.log).sort((a, b) => (INCIDENTS[b]?.pri ?? 0) - (INCIDENTS[a]?.pri ?? 0));
  const has = (...k: string[]) => k.some(x => st.log[x]);
  const uncles = (st.log.uncle ?? 0) + (st.log.sorry ?? 0) + (st.log.angry ?? 0) + (st.log.sp500 ?? 0);
  const ending = has('ending'), legend = st.total >= 1000, hundred = st.spawn >= 100, inverted = has('flip');
  let title = '普通の一般人', comment = '押さない勇気は、ありませんでした。';
  const T: [boolean, string, string][] = [
    [ending, 'エンディング到達者', '押しすぎた果てに、世界が終わりを告げた。'],
    [legend, '伝説のボタン使い', '1000回。もはや指が本体。'],
    [hundred, 'ボタン増殖の魔術師', '世界はボタンで埋め尽くされた。'],
    [inverted, '世界をひっくり返した人', '地球が逆さまなのはあなたのせい。'],
    [has('explode') && uncles >= 2, 'おじさん大炎上の元凶', 'おじさんの人生を台無しにした。'],
    [uncles >= 3, 'おじさん召喚士', 'おじさんがあなたを呼んでいる。'],
    [st.presses >= 250, '指が千手観音', '連打速度は人類の限界。'],
    [st.mini >= 2, 'ミニゲーム荒らし', '押すなと言われても遊びたい人。'],
    [st.distinct >= 20, '珍事コレクター', '図鑑を埋めるのが生きがい。'],
    [st.distinct >= 10, '好奇心の塊', '押すなと言われたら押す。基本です。'],
    [st.presses < 30, '慎重派の押し人', 'もっと押せる。あなたなら押せる。'],
  ];
  for (const [c, t, m] of T) if (c) { title = t; comment = m; break; }
  const heads = ids.slice(0, 2).map(i => INCIDENTS[i]?.head).filter(Boolean);
  const headline = heads.length ? `【速報】一般人が赤いボタンを押し、${heads.join('、')}、世界が大混乱` : '【速報】一般人が赤いボタンを押し、特に何も起きず';
  const lines = ids.map(i => `${INCIDENTS[i]?.line ?? i}${st.log[i] > 1 ? `(×${st.log[i]})` : ''}`);
  const topId = ids[0] ?? '';
  const rare = ending ? 'ending' : legend ? 'legend' : hundred ? 'hundred' : inverted ? 'inverted' : undefined;
  const n = st.score;
  return {
    title, comment, rare,
    facts: [{ label: '押した回数', value: `${st.presses}回` }, { label: '起きた事件', value: `${Object.values(st.log).reduce((a, b) => a + b, 0)}件` }, { label: '発見した演出', value: `${st.distinct}種(新規${st.newCount})` }],
    postVariants: [
      `「絶対に押すな」を${st.presses}回押して${st.distinct}種の珍事を発見！称号は『${title}』`,
      `${headline}`,
      `押すなと言われたので押した結果→${lines[0] ?? '何も起きなかった'}。スコア${n}種`,
    ],
    draw(g, w, h, t) {
      const u = Math.min(w / 400, h / 500);
      g.save(); g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,100,60,.08)'; for (let i = 0; i < 80; i++) g.fillRect((i * 97 % 400) / 400 * w, (i * 53 % 500) / 500 * h, 2 * u, 2 * u);
      const pad = 16 * u; g.fillStyle = '#1a1a1a'; g.textBaseline = 'top';
      g.textAlign = 'center'; g.font = `900 ${34 * u}px "Hiragino Mincho ProN", serif`; g.fillText('ボタン新聞', w / 2, pad * 0.6);
      g.font = `${10 * u}px sans-serif`; g.fillText(`号外 ・ 押下${st.presses}回 ・ 定価0円`, w / 2, pad * 0.6 + 38 * u);
      let y = pad * 0.6 + 54 * u; g.fillRect(pad, y, w - pad * 2, 3 * u); y += 8 * u;
      g.textAlign = 'left'; g.font = `900 ${19 * u}px "Hiragino Sans", sans-serif`;
      for (const l of wrap(g, headline, w - pad * 2).slice(0, 4)) { g.fillText(l, pad, y); y += 23 * u; }
      y += 4 * u;
      // 写真
      const ph = Math.min(h * 0.34, 175 * u), px = pad, pw = w - pad * 2;
      g.save(); g.beginPath(); g.rect(px, y, pw, ph); g.clip();
      const photo = !!(NI.bg && NI.hero && NI.item);
      if (photo) {
        // 実写の床に赤いボタン。bg の床(テープ付近)を写真枠に cover で切り出す
        const bg = NI.bg!, k = Math.max(pw / bg.width, ph / bg.height), dw = bg.width * k, dh = bg.height * k;
        g.drawImage(bg, px + (pw - dw) / 2, y + Math.min(0, Math.max(ph - dh, ph / 2 - 0.55 * dh)), dw, dh);
        g.fillStyle = 'rgba(20,24,34,.12)'; g.fillRect(px, y, pw, ph);
      } else {
        const sg = g.createLinearGradient(0, y, 0, y + ph); sg.addColorStop(0, '#9aa8b8'); sg.addColorStop(1, '#556'); g.fillStyle = sg; g.fillRect(px, y, pw, ph);
      }
      g.translate(px + pw / 2, y + ph / 2); if (inverted) g.rotate(Math.PI); g.translate(-(px + pw / 2), -(y + ph / 2));
      if (has('explode') || topId === 'explode') { g.fillStyle = photo ? 'rgba(255,179,71,.8)' : '#ffb347'; for (let i = 0; i < 12; i++) { const a = i / 12 * 7 + t; g.beginPath(); g.moveTo(px + pw / 2, y + ph / 2); g.lineTo(px + pw / 2 + Math.cos(a) * ph, y + ph / 2 + Math.sin(a) * ph); g.lineTo(px + pw / 2 + Math.cos(a + 0.2) * ph * 0.6, y + ph / 2 + Math.sin(a + 0.2) * ph * 0.6); g.fill(); } }
      if (uncles) drawUncle(g, { x: px + pw * 0.78, y: y + ph * 0.62, h: ph * 0.95, expr: has('angry') ? 'angry' : has('sorry') ? 'cry' : 'wow', t, flail: 0.4 });
      const nb = Math.min(5, 1 + Math.floor(st.spawn / 20));
      for (let i = 0; i < nb; i++) {
        const bx = px + pw * (0.28 + (i - (nb - 1) / 2) * 0.1), by = y + ph * (0.6 + (i % 2) * 0.12), bh = ph * (i === 0 ? 0.3 : 0.18);
        if (photo) {
          // 主役ボタンは押した後の姿(item)、増殖した分は hero。接地影つき。画像の底は 0.88 付近
          const im = i === 0 && st.presses > 0 ? NI.item! : NI.hero!, sz = bh * 3.1;
          g.save(); g.translate(bx + sz * 0.05, by + sz * 0.26); g.scale(1, 0.2); const sh = g.createRadialGradient(0, 0, 0, 0, 0, sz * 0.4); sh.addColorStop(0, 'rgba(15,18,26,.6)'); sh.addColorStop(1, 'rgba(15,18,26,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, sz * 0.4, 0, 7); g.fill(); g.restore();
          g.drawImage(cleanImg(im), bx - sz / 2, by - sz * 0.62, sz, sz);
        } else drawBtn(g, bx, by, bh, 0, i === 0 ? 'PUSH' : '', 0, i === 0);
      }
      if (has('crack')) { g.strokeStyle = '#fff'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(px + pw * 0.5, y); g.lineTo(px + pw * 0.45, y + ph * 0.4); g.lineTo(px + pw * 0.6, y + ph * 0.7); g.lineTo(px + pw * 0.5, y + ph); g.stroke(); }
      g.restore(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 2 * u; g.strokeRect(px, y, pw, ph);
      y += ph + 4 * u; g.fillStyle = '#333'; g.font = `${9 * u}px sans-serif`; g.fillText(`▲ 現場写真(提供: ${title})`, px, y); y += 14 * u;
      g.fillStyle = '#1a1a1a'; g.font = `900 ${12 * u}px "Hiragino Sans", sans-serif`; g.fillText('■ 本日の事件簿', pad, y); y += 16 * u;
      g.font = `${11 * u}px "Hiragino Sans", sans-serif`; const room = Math.max(1, Math.floor((h - y - 20 * u) / (14 * u)));
      lines.slice(0, room).forEach((l, i) => { if (i === room - 1 && lines.length > room) l = `…ほか${lines.length - room + 1}件`; g.fillText(`・${l}`, pad, y + i * 14 * u); });
      g.restore();
    },
  };
}

import type { AudioEngine } from '../../core/audio';
import { drawUncle, drawBubble } from '../../core/characters';
import type { Expr } from '../../core/characters';

/** 1フレーム分のボタン変形（毎フレーム初期化され、演出が加算する） */
export interface Mod { dx: number; dy: number; s: number; sx: number; sy: number; rot: number; hue: number | null; alpha: number; label: string | null; hide: boolean }
/** 画面全体の変形（ゲーム画面内のみ） */
export interface Scr { rot: number; shake: number; dim: number }
export interface Fx {
  t: number; dur: number; tag?: string;
  /** true の間は通常のボタン押下を受け付けない */
  block?: boolean;
  update?(p: number, dt: number, m: Mod, S: Scr): void;
  draw?(g: CanvasRenderingContext2D, p: number): void;
  drawHud?(g: CanvasRenderingContext2D, p: number): void;
  tap?(x: number, y: number): boolean;
  end?(): void;
}
export type FxInit = Omit<Fx, 't'>;
export interface BurstOpt { colors?: string[]; speed?: number; angle?: number; spread?: number; life?: number; size?: number; grav?: number; rect?: boolean }
export interface Game {
  W: number; H: number; cx: number; cy: number; R: number; time: number;
  btn: { x: number; y: number; r: number };
  audio: AudioEngine;
  add(f: FxInit): Fx;
  has(tag: string): boolean;
  say(text: string, dur?: number): void;
  title(text: string, dur?: number): void;
  burst(x: number, y: number, n: number, o?: BurstOpt): void;
  sfx(n: Parameters<AudioEngine['sfx']>[0], v?: number): void;
  tempo(t: number): void;
  rnd(a: number, b: number): number;
  pick<T>(a: T[]): T;
  finishNow(): void;
  /** ラウンド内の統計加算（art用） */
  stat(k: string, n?: number): void;
}
export interface GameEvent { id: string; name: string; unlock: number; weight: number; run(G: Game): void; can?(G: Game): boolean }

const sm = (p: number) => p * p * (3 - 2 * p);
const env = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
const c01 = (p: number) => Math.min(1, Math.max(0, p));

export function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#fff', stroke = '#000', align: CanvasTextAlign = 'center') {
  g.save(); g.font = `900 ${size}px "Hiragino Sans", sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(3, size / 6); g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y); g.restore();
}
/** 赤ボタンの描画（plate=土台あり）。press: 0..1 の押し込み量 */
export function drawBtn(g: CanvasRenderingContext2D, x: number, y: number, r: number, hue: number, label: string, press = 0, plate = true) {
  g.save(); g.translate(x, y);
  if (plate) {
    const pg = g.createLinearGradient(0, -r, 0, r * 1.2); pg.addColorStop(0, '#9aa0aa'); pg.addColorStop(1, '#3c4048');
    g.fillStyle = pg; g.beginPath(); g.ellipse(0, r * 0.12, r * 1.22, r * 1.12, 0, 0, 7); g.fill();
    g.fillStyle = '#15171c'; g.beginPath(); g.ellipse(0, r * 0.12, r * 1.04, r * 0.96, 0, 0, 7); g.fill();
  }
  const off = press * r * 0.14;
  g.fillStyle = `hsl(${hue},70%,28%)`; g.beginPath(); g.ellipse(0, r * 0.2, r * 0.98, r * 0.9, 0, 0, 7); g.fill();
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.4 + off, r * 0.1, 0, off, r);
  gr.addColorStop(0, `hsl(${hue},95%,68%)`); gr.addColorStop(0.55, `hsl(${hue},85%,50%)`); gr.addColorStop(1, `hsl(${hue},80%,36%)`);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, off - r * 0.06, r * 0.98, r * 0.88 - off * 0.2, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.42 + off, r * 0.32, r * 0.14, -0.5, 0, 7); g.fill();
  if (label) txt(g, label, 0, off - r * 0.04, Math.max(10, r * (label.length > 3 ? 0.26 : 0.34)), '#fff', 'rgba(90,0,0,.7)');
  g.restore();
}

const LINES = ['押すなって言ったのに', 'やめて…', 'くすぐったい', 'もう一回押して', 'ぼく赤いボタン', 'だれ？', '押したね？', '後悔するよ', 'ボタンにも人権が…', 'ふふふ'];

function uncleFx(G: Game, o: { expr: Expr; line: string; dur: number; shake?: number; tag?: string; low?: boolean }) {
  const side = Math.random() < 0.5 ? -1 : 1, h = G.H * 0.3, ux = G.W / 2 + side * G.W * 0.27;
  G.add({ dur: o.dur, tag: o.tag, update(p, _d, _m, S) { if (o.shake) S.shake = Math.max(S.shake, o.shake * env(p)); },
    draw(g, p) {
      const rise = sm(c01(p / 0.2)) * (1 - sm(c01((p - 0.85) / 0.15)));
      const y = (G.H + h * 0.6) + (G.H * 0.78 - (G.H + h * 0.6)) * rise + (o.low ? 14 : 0);
      drawUncle(g, { x: ux, y, h, expr: o.expr, t: G.time, flail: o.shake ? 0.9 : 0.15, flip: side > 0, rot: o.low ? 0.18 * Math.sin(G.time * 3) : 0 });
      if (rise > 0.85) drawBubble(g, o.line, Math.min(G.W - 110, Math.max(110, ux)), y - h / 2 - 6, 20);
    } });
}
function confetti(G: Game, n = 70) {
  G.burst(G.W / 2, G.H * 0.35, n, { colors: ['#ff4d6d', '#ffd93d', '#4aa3ff', '#7be07b', '#b66dff'], speed: 420, angle: -Math.PI / 2, spread: Math.PI * 0.9, life: 2.2, size: 8, grav: 520, rect: true });
}
function pointIn(x: number, y: number, cx: number, cy: number, r: number) { return Math.hypot(x - cx, y - cy) <= r; }

/** ミニゲーム共通: 結果表示 */
function result(G: Game, ok: boolean, good: string, bad: string) {
  if (ok) G.stat('mini'); G.sfx(ok ? 'combo' : 'ng'); G.say(ok ? good : bad, 1.6);
  if (ok) G.burst(G.btn.x, G.btn.y, 24, { colors: ['#ffd93d', '#fff', '#ff8a3d'], speed: 260, life: 1, size: 6, grav: 300 });
}

export const EVENTS: GameEvent[] = [
  { id: 'shake', name: 'ガタガタ震える', unlock: 0, weight: 10, run(G) { G.sfx('squeak', 1); G.say('ガタガタ…', 1.4); G.add({ dur: 1.6, update(p, _d, m) { const a = env(p) * 12; m.dx += Math.sin(G.time * 70) * a; m.dy += Math.cos(G.time * 83) * a * 0.6; } }); } },
  { id: 'grow', name: '突然巨大化', unlock: 0, weight: 10, run(G) { G.sfx('boing'); G.say('でかっ!', 1.6); G.add({ dur: 2.2, update(p, _d, m) { m.s *= 1 + env(p) * 0.9; } }); } },
  { id: 'shrink', name: 'ボタンが小さくなる', unlock: 0, weight: 10, run(G) { G.sfx('squeak', 3); G.say('縮んだ…', 1.6); G.add({ dur: 2.2, update(p, _d, m) { m.s *= 1 - env(p) * 0.65; } }); } },
  { id: 'talk', name: 'ボタンがしゃべる', unlock: 0, weight: 10, run(G) { G.sfx('pop'); G.say(G.pick(LINES), 1.8); } },
  { id: 'color', name: '色が変わる', unlock: 0, weight: 10, run(G) { G.sfx('pop'); G.say('イメチェン!', 1.6); const h = G.rnd(80, 280); G.add({ dur: 2.4, update(p, _d, m) { m.hue = h * env(p); } }); } },
  { id: 'ouch', name: 'ボタンが「痛い」', unlock: 0, weight: 10, run(G) { G.sfx('hit'); G.say('痛い!!', 1.4); G.burst(G.btn.x, G.btn.y - G.btn.r * 0.6, 8, { colors: ['#ffd93d'], speed: 200, life: 0.6, size: 6, grav: 200 });
    G.add({ dur: 0.9, update(p, _d, m) { const e = env(p); m.sy *= 1 - 0.35 * e; m.sx *= 1 + 0.2 * e; } }); } },
  { id: 'bounce', name: 'ぴょんぴょん跳ねる', unlock: 3, weight: 9, run(G) { G.sfx('boing'); G.say('ぴょーん', 1.4); G.add({ dur: 2, update(p, _d, m) { m.dy -= Math.abs(Math.sin(p * Math.PI * 4)) * 130 * (1 - p); } }); } },
  { id: 'jelly', name: 'ぷるぷるゼリー', unlock: 3, weight: 9, run(G) { G.sfx('squeak', 5); G.say('ぷるん', 1.4); G.add({ dur: 1.8, update(p, _d, m) { const w = Math.sin(p * 40) * 0.18 * (1 - p); m.sx *= 1 + w; m.sy *= 1 - w; } }); } },
  { id: 'spin', name: 'ボタンの回転', unlock: 5, weight: 9, run(G) { G.sfx('whoosh'); G.say('目が回る〜', 1.6); G.add({ dur: 2, update(p, _d, m) { m.rot += sm(p) * Math.PI * 4; } }); } },
  { id: 'title', name: '注意書きが変わる', unlock: 5, weight: 8, run(G) { G.sfx('pop'); G.title(G.pick(['つまり押せ', '…押すなってば', '本当に押すな', 'フリじゃない', '絶対だぞ', '押したら負け']), 2.8); } },
  { id: 'flee', name: 'ボタンが逃げる', unlock: 8, weight: 9, run(G) { G.sfx('whoosh'); G.say('やだ!', 1.2);
    const tx = G.rnd(-1, 1) * (G.W / 2 - G.R * 0.8), ty = G.rnd(-0.3, 0.3) * G.H;
    G.add({ dur: 2.8, update(p, _d, m) { const k = p < 0.25 ? sm(p / 0.25) : p > 0.75 ? 1 - sm((p - 0.75) / 0.25) : 1; m.dx += tx * k; m.dy += ty * k; m.s *= 1 - 0.3 * k; } }); } },
  { id: 'uncle', name: '謎のおじさん登場', unlock: 8, weight: 9, run(G) { G.sfx('pop'); uncleFx(G, { expr: 'wow', line: '呼んだかね?', dur: 2.8 }); } },
  { id: 'crack', name: '画面が割れる', unlock: 12, weight: 8, run(G) {
    G.sfx('hit'); G.say('パリーン!', 1.6);
    const ox = G.cx + G.rnd(-1, 1) * G.W * 0.3, oy = G.cy + G.rnd(-1, 1) * G.H * 0.25;
    const lines: number[][][] = [];
    for (let i = 0; i < 9; i++) { let a = (i / 9) * 7 + G.rnd(-0.3, 0.3), x = ox, y = oy; const pts = [[x, y]]; for (let k = 0; k < 5; k++) { a += G.rnd(-0.4, 0.4); const l = G.rnd(40, 110); x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); } lines.push(pts); }
    G.add({ dur: 3.6, update(p, _d, _m, S) { S.shake = Math.max(S.shake, 8 * Math.max(0, 1 - p * 6)); },
      draw(g, p) { const al = 1 - c01((p - 0.7) / 0.3); g.save(); g.globalAlpha = al; g.lineCap = 'round';
        for (const [c, w] of [['rgba(0,0,0,.6)', 5], ['#e8f6ff', 2]] as [string, number][]) { g.strokeStyle = c; g.lineWidth = w; for (const pts of lines) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); } }
        g.restore(); } }); } },
  { id: 'countdown', name: 'カウントダウン', unlock: 12, weight: 8, run(G) {
    let last = 4; G.say('な、何だ!?', 1);
    G.add({ dur: 3.6, update(p) { const n = 3 - Math.floor(p * 3.6); if (n !== last && n >= 1) { last = n; G.sfx('tap', n); } },
      draw(g, p) { const t = p * 3.6, n = 3 - Math.floor(t); if (n < 1) { if (t < 3.5) txt(g, '…………', G.cx, G.H * 0.3, 40); return; } const f = t % 1; g.save(); g.globalAlpha = 1 - f * 0.5; txt(g, String(n), G.cx, G.H * 0.28, 130 - f * 20, '#ffd93d'); g.restore(); },
      end() { G.say('…何も起きない', 1.8); } }); } },
  { id: 'hiccup', name: 'ボタンがしゃっくり', unlock: 16, weight: 8, run(G) { G.sfx('squeak', 7); G.say('ヒック!', 1.2); G.add({ dur: 2.4, update(p, _d, m) { m.dy -= Math.abs(Math.sin(p * Math.PI * 3)) * 35 * (1 - p); } }); } },
  { id: 'sleepy', name: 'ボタンが居眠り', unlock: 16, weight: 8, run(G) { G.say('ぐー…', 2); G.sfx('squeak', 9);
    G.add({ dur: 3, update(p, _d, m) { m.s *= 1 + Math.sin(G.time * 2.2) * 0.04; m.label = 'Zzz'; m.alpha *= 0.9; },
      draw(g, p) { for (let i = 0; i < 3; i++) { const q = (p * 1.5 + i / 3) % 1; g.save(); g.globalAlpha = 1 - q; txt(g, 'Z', G.btn.x + G.btn.r * (0.7 + q * 0.6), G.btn.y - G.btn.r * (0.6 + q), 22 + i * 8); g.restore(); } } }); } },
  { id: 'explode', name: '爆発(演出のみ)', unlock: 20, weight: 8, run(G) {
    G.sfx('boom'); G.say('ドッカーン!', 1.6);
    G.burst(G.btn.x, G.btn.y, 44, { colors: ['#ff8a3d', '#ffd93d', '#ff4d6d', '#555'], speed: 380, life: 0.9, size: 9, grav: 120 });
    G.add({ dur: 1.4, update(p, _d, m, S) { m.s *= p < 0.2 ? 0 : sm(c01((p - 0.2) / 0.3)); S.shake = Math.max(S.shake, 14 * (1 - p)); },
      draw(g, p) { g.save(); g.globalAlpha = 0.5 * (1 - p); g.strokeStyle = '#ffb347'; g.lineWidth = 10; g.beginPath(); g.arc(G.btn.x, G.btn.y, 20 + p * G.W * 0.55, 0, 7); g.stroke(); g.restore(); } }); } },
  { id: 'ghost', name: 'ボタンが透明に', unlock: 20, weight: 8, run(G) { G.sfx('whoosh'); G.say('いません', 1.6); G.add({ dur: 3, update(p, _d, m) { m.alpha *= 1 - 0.85 * env(p); } }); } },
  { id: 'glasses', name: 'サングラスをかける', unlock: 20, weight: 8, run(G) { G.sfx('combo'); G.say('クール。', 1.8);
    G.add({ dur: 3, draw(g, p) { const b = G.btn, r = b.r, dy = (1 - sm(c01(p / 0.15))) * -r; g.save(); g.globalAlpha = 1 - c01((p - 0.9) / 0.1); g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineWidth = r * 0.06;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(b.x + s * r * 0.34, b.y - r * 0.1 + dy, r * 0.3, r * 0.2, 0, 0, 7); g.fill(); }
      g.beginPath(); g.moveTo(b.x - r * 0.1, b.y - r * 0.12 + dy); g.lineTo(b.x + r * 0.1, b.y - r * 0.12 + dy); g.stroke(); g.restore(); } }); } },
  { id: 'multi', name: 'ボタン増殖(本物探し)', unlock: 25, weight: 8, run(G) {
    const n = 7, r = G.R * 0.42, pts: { x: number; y: number; alive: boolean; ph: number }[] = [];
    for (let i = 0; i < n; i++) { let best = { x: G.W / 2, y: G.H / 2 }; for (let k = 0; k < 40; k++) { const x = G.rnd(r + 8, G.W - r - 8), y = G.rnd(G.H * 0.27, G.H * 0.8); if (pts.every(q => Math.hypot(q.x - x, q.y - y) > r * 2.3)) { best = { x, y }; break; } best = { x, y }; } pts.push({ ...best, alive: true, ph: G.rnd(0, 7) }); }
    G.stat('spawn', n); const real = Math.floor(Math.random() * n); let done = false; G.sfx('whoosh'); G.tempo(185);
    const f = G.add({ dur: 9, block: true,
      update(_p, _d, m) { m.hide = true; },
      draw(g, p) { txt(g, '本物はどれだ!', G.cx, G.H * 0.2, 30, '#ffd93d'); txt(g, '動かないのが本物…?', G.cx, G.H * 0.2 + 30, 14, '#fff');
        pts.forEach((q, i) => { if (!q.alive) return; g.save(); g.translate(q.x, q.y); if (i !== real) g.rotate(Math.sin(G.time * 6 + q.ph) * 0.12); drawBtn(g, 0, 0, r, 0, 'PUSH', 0, false); g.restore(); });
        void p; },
      tap(x, y) { if (done) return true; for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; if (!q.alive || !pointIn(x, y, q.x, q.y, r)) continue;
        if (i === real) { done = true; G.sfx('combo'); G.burst(q.x, q.y, 30, { colors: ['#ffd93d', '#fff'], speed: 300, life: 1, size: 7, grav: 250 }); G.say('正解! 本物!', 1.6); f.t = f.dur - 0.5; } else { q.alive = false; G.sfx('pop', i); G.burst(q.x, q.y, 10, { colors: ['#aaa'], speed: 160, life: 0.5, size: 5 }); }
        return true; } return true; },
      end() { G.tempo(160); if (!done) G.say('時間切れ…', 1.4); } }); } },
  { id: 'sorry', name: 'おじさんに謝られる', unlock: 25, weight: 8, run(G) { G.sfx('squeak', 2); uncleFx(G, { expr: 'cry', line: 'ごめんなさい!!', dur: 3, low: true }); } },
  { id: 'fakebtn', name: '偽ボタン', unlock: 30, weight: 8, run(G) {
    const x = G.rnd(G.R * 0.5, G.W - G.R * 0.5), y = G.rnd(G.H * 0.72, G.H * 0.84), r = G.R * 0.45; G.sfx('pop'); G.say('こっちが本物だよ', 1.8);
    const f = G.add({ dur: 4, draw(g, p) { const s = sm(c01(p / 0.1)) * (1 - sm(c01((p - 0.9) / 0.1))); drawBtn(g, x, y, r * s, 130, '押せ', 0, true); },
      tap(tx, ty) { if (!pointIn(tx, ty, x, y, r)) return false; G.sfx('ng'); G.say('偽物でした〜', 1.6); G.burst(x, y, 12, { colors: ['#7be07b'], speed: 200, life: 0.6, size: 6 }); f.t = f.dur; return true; } }); } },
  { id: 'tap10', name: '3秒10連打チャレンジ', unlock: 30, weight: 7, run(G) {
    let n = 0, done = false; G.sfx('alarm'); G.tempo(190);
    const f = G.add({ dur: 3.2, block: true, update(_p, _d, m) { m.hide = true; },
      draw(g, p) { txt(g, '3秒で10回タップ!', G.cx, G.H * 0.22, 28, '#ffd93d'); txt(g, `${n}/10`, G.cx, G.cy, 110, done ? '#7be07b' : '#fff');
        g.fillStyle = '#222'; g.fillRect(G.W * 0.15, G.H * 0.68, G.W * 0.7, 16); g.fillStyle = '#ff4d6d'; g.fillRect(G.W * 0.15, G.H * 0.68, G.W * 0.7 * (1 - p), 16); },
      tap() { if (done) return true; n++; G.sfx('tap', n); if (n >= 10) { done = true; result(G, true, '10連打成功!', ''); f.t = f.dur - 0.4; } return true; },
      end() { G.tempo(160); if (!done) result(G, false, '', '遅い…'); } }); } },
  { id: 'coins', name: 'コインが降ってくる', unlock: 40, weight: 8, run(G) { G.sfx('coin'); G.say('ボーナス…なし', 1.8);
    G.burst(G.W / 2, -10, 40, { colors: ['#ffd93d', '#ffb800'], speed: 80, angle: Math.PI / 2, spread: Math.PI * 0.6, life: 2.4, size: 9, grav: 420 });
    G.add({ dur: 1.2, update(p) { if (Math.random() < 0.15) G.sfx('coin'); void p; } }); } },
  { id: 'flip', name: '画面が逆さま', unlock: 40, weight: 7, can: G => !G.has('flip'), run(G) { G.sfx('whoosh'); G.say('あべこべ!', 1.8);
    G.add({ dur: 4.5, tag: 'flip', update(p, _d, _m, S) { S.rot = Math.PI * (sm(c01(p / 0.15)) * (1 - sm(c01((p - 0.85) / 0.15)))); } }); } },
  { id: 'confetti', name: '紙吹雪パーティ', unlock: 50, weight: 8, run(G) { G.sfx('combo'); G.say('おめでとう(?)', 1.8); confetti(G); } },
  { id: 'slot', name: 'スロットマシン', unlock: 50, weight: 7, run(G) {
    const sy = ['🍒', '🔔', '7', '🍋', '💩', '👨'], triple = Math.random() < 0.3, res = triple ? Array(3).fill(Math.floor(Math.random() * 6)) as number[] : [0, 1, 2].map(() => Math.floor(Math.random() * 6));
    if (!triple && res[0] === res[1] && res[1] === res[2]) res[2] = (res[2] + 1) % 6;
    const stop = [1.2, 1.7, 2.2], st = [false, false, false]; G.sfx('alarm');
    G.add({ dur: 2.9, block: true, update(p, _d, m) { m.hide = true; const t = p * 2.9; stop.forEach((s, i) => { if (!st[i] && t >= s) { st[i] = true; G.sfx('thud', i); } }); },
      draw(g, p) { const t = p * 2.9, w = Math.min(G.W - 40, 330), h = 150, x = G.cx - w / 2, y = G.cy - h / 2;
        g.fillStyle = '#7a1f1f'; g.fillRect(x, y, w, h); g.fillStyle = '#fff'; g.fillRect(x + 12, y + 12, w - 24, h - 24);
        for (let i = 0; i < 3; i++) { const idx = t < stop[i] ? Math.floor(t * 14 + i * 3) % 6 : res[i]; txt(g, sy[idx], x + w * (0.2 + i * 0.3), G.cy, 56, '#000', ''); }
        if (t > 2.3) txt(g, triple ? 'JACKPOT!?' : 'ハズレ', G.cx, y - 26, 34, triple ? '#ffd93d' : '#fff'); },
      end() { G.say(triple ? '大当たり…の演出!' : 'ハズレ!', 1.6); if (triple) { G.sfx('unlock'); confetti(G, 40); } } }); } },
  { id: 'gravity', name: 'ボタンが落ちる', unlock: 60, weight: 7, run(G) { G.sfx('whoosh'); G.say('重力には勝てない', 1.8); const D = G.H * 0.3;
    G.add({ dur: 3, update(p, _d, m) { let y: number; if (p < 0.4) y = D * (p / 0.4) ** 2; else if (p < 0.8) { const q = (p - 0.4) / 0.4; y = D - Math.abs(Math.sin(q * Math.PI * 2)) * D * 0.25 * (1 - q); } else y = D * (1 - sm((p - 0.8) / 0.2)); m.dy += y; m.rot += y / D * 0.5; } }); } },
  { id: 'angry', name: 'おじさんが怒る', unlock: 60, weight: 7, run(G) { G.sfx('scream', 1); uncleFx(G, { expr: 'angry', line: '押すなと言っただろ!!', dur: 2.8, shake: 8 }); } },
  { id: 'targets', name: '的当てチャレンジ', unlock: 70, weight: 6, run(G) {
    const T = Array.from({ length: 5 }, () => ({ x: G.rnd(50, G.W - 50), y: G.rnd(G.H * 0.3, G.H * 0.75), vx: G.rnd(-90, 90), vy: G.rnd(-90, 90), alive: true })); let left = 5, done = false; G.sfx('alarm'); G.tempo(190);
    const f = G.add({ dur: 4.2, block: true, update(_p, dt, m) { m.hide = true; for (const q of T) { if (!q.alive) continue; q.x += q.vx * dt; q.y += q.vy * dt; if (q.x < 40 || q.x > G.W - 40) q.vx *= -1; if (q.y < G.H * 0.28 || q.y > G.H * 0.82) q.vy *= -1; } },
      draw(g) { txt(g, '5個タップ!', G.cx, G.H * 0.2, 30, '#ffd93d'); for (const q of T) if (q.alive) { g.fillStyle = '#fff'; g.beginPath(); g.arc(q.x, q.y, 34, 0, 7); g.fill(); g.fillStyle = '#e63946'; g.beginPath(); g.arc(q.x, q.y, 24, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(q.x, q.y, 12, 0, 7); g.fill(); g.fillStyle = '#e63946'; g.beginPath(); g.arc(q.x, q.y, 5, 0, 7); g.fill(); } },
      tap(x, y) { if (done) return true; for (const q of T) if (q.alive && pointIn(x, y, q.x, q.y, 40)) { q.alive = false; left--; G.sfx('pop', left); G.burst(q.x, q.y, 8, { colors: ['#e63946', '#fff'], speed: 180, life: 0.5, size: 5 }); if (left === 0) { done = true; result(G, true, '全部命中!', ''); f.t = f.dur - 0.3; } break; } return true; },
      end() { G.tempo(160); if (!done) result(G, false, '', '外れ…'); } }); } },
  { id: 'rain', name: 'ミニボタンの雨', unlock: 70, weight: 7, run(G) { G.sfx('whoosh'); G.say('ボタン注意報', 1.8); G.stat('spawn', 24);
    const R = Array.from({ length: 24 }, () => ({ x: G.rnd(10, G.W - 10), y: G.rnd(-G.H * 0.6, -10), v: G.rnd(250, 450), r: G.rnd(12, 22) }));
    G.add({ dur: 3, update(_p, dt) { for (const q of R) q.y += q.v * dt; }, draw(g) { for (const q of R) drawBtn(g, q.x, q.y, q.r, 0, '', 0, false); } }); } },
  { id: 'dark', name: '停電', unlock: 80, weight: 7, run(G) { G.sfx('thud', 3); G.say('停電…?', 1.8); G.add({ dur: 2.8, update(p, _d, _m, S) { S.dim = Math.max(S.dim, 0.88 * c01(p / 0.15) * c01((1 - p) / 0.15)); } }); } },
  { id: 'quake', name: '大地震', unlock: 80, weight: 7, run(G) { G.sfx('thud', 1); G.say('ゴゴゴゴ…', 2); G.burst(G.cx, G.H, 20, { colors: ['#8a7a6a'], speed: 150, angle: -Math.PI / 2, spread: 1.2, life: 1.2, size: 8, grav: 200 });
    G.add({ dur: 2.2, update(p, _d, _m, S) { S.shake = Math.max(S.shake, 16 * env(p)); } }); } },
  { id: 'horde', name: '仲間が集結', unlock: 90, weight: 6, run(G) { G.sfx('combo'); G.say('仲間を連れてきた', 1.8); G.stat('spawn', 12);
    G.add({ dur: 3.4, draw(g, p) { const a = env(c01(p * 1.1)); for (let i = 0; i < 12; i++) { const th = G.time * 1.5 + i / 12 * 7; drawBtn(g, G.btn.x + Math.cos(th) * G.btn.r * 1.7 * a, G.btn.y + Math.sin(th) * G.btn.r * 1.3 * a, G.R * 0.22, i * 30, '', 0, false); } } }); } },
  { id: 'waitgo', name: '反射神経チャレンジ', unlock: 90, weight: 6, run(G) {
    const goAt = G.rnd(1, 1.7); let done = false; G.sfx('alarm');
    const f = G.add({ dur: 3.4, block: true, update(_p, _d, m) { m.hide = true; },
      draw(g, p) { const t = p * 3.4, go = t >= goAt; txt(g, '緑になったらタップ!', G.cx, G.H * 0.22, 26, '#ffd93d');
        g.fillStyle = go ? '#2ecc71' : '#c0392b'; g.beginPath(); g.arc(G.cx, G.cy, 80, 0, 7); g.fill(); txt(g, go ? 'いま!' : 'まて…', G.cx, G.cy, 40); },
      tap() { if (done) return true; done = true; const t = f.t; if (t < goAt) result(G, false, '', 'フライング!'); else if (t < goAt + 0.9) result(G, true, '反応速い!', ''); else result(G, false, '', '遅い…'); f.t = Math.max(f.t, f.dur - 0.5); return true; },
      end() { if (!done) result(G, false, '', '寝てた?'); } }); } },
  { id: 'rainbow', name: 'レインボーボタン', unlock: 110, weight: 6, run(G) { G.sfx('unlock'); G.say('ゲーミングボタン', 2); G.add({ dur: 3.2, update(p, _d, m) { m.hue = p * 360; } }); } },
  { id: 'fakeerror', name: 'フェイクエラー画面', unlock: 110, weight: 6, run(G) {
    G.sfx('alarm'); let done = false;
    const bw = Math.min(G.W - 60, 320), bh = 200, bx = G.cx - bw / 2, by = G.cy - bh / 2, okx = G.cx - 50, oky = by + bh - 56;
    const f = G.add({ dur: 4.5, block: true, update(_p, _d, m) { m.hide = true; },
      draw(g, p) { const a = c01(p / 0.07); g.save(); g.fillStyle = `rgba(0,0,0,${0.6 * a})`; g.fillRect(-G.W, -G.H, G.W * 3, G.H * 3); g.globalAlpha = a;
        g.fillStyle = '#ececec'; g.fillRect(bx, by, bw, bh); g.fillStyle = '#1a4fb0'; g.fillRect(bx, by, bw, 34); txt(g, '⚠ 致命的エラー', bx + 12, by + 17, 17, '#fff', '', 'left');
        txt(g, 'ボタンが壊れました', G.cx, by + 76, 22, '#222', ''); txt(g, 'エラーコード: 0xBAKA', G.cx, by + 108, 14, '#555', '');
        g.fillStyle = '#d8d8d8'; g.fillRect(okx, oky, 100, 38); g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(okx, oky, 100, 38); txt(g, 'OK', G.cx, oky + 19, 20, '#111', '');
        txt(g, '(ゲーム内の演出です)', G.cx, by + bh + 14, 12, '#ccc', ''); g.restore(); },
      tap(x, y) { if (done || x < okx || x > okx + 100 || y < oky || y > oky + 38) return true; done = true; G.sfx('ok'); f.t = f.dur; return true; },
      end() { G.say('なんてね', 1.6); } }); } },
  { id: 'sp100', name: '100回記念', unlock: 100, weight: 0, run(G) { G.sfx('unlock'); G.say('100回!? 暇なの?', 2.4); confetti(G, 90); G.add({ dur: 2.5, update(_p, _d, m) { m.s *= 1 + Math.sin(G.time * 8) * 0.05; m.hue = 45; } }); } },
  { id: 'sp500', name: '500回記念', unlock: 500, weight: 0, run(G) { G.sfx('unlock'); confetti(G, 110); uncleFx(G, { expr: 'happy', line: '500回!! 伝説だ!', dur: 4 }); } },
  { id: 'ending', name: '隠しエンディング', unlock: 1000, weight: 0, run(G) {
    G.sfx('unlock'); G.tempo(120); let acc = 0;
    G.add({ dur: 6, block: true, update(_p, dt, m) { m.hide = true; acc += dt; if (acc > 0.6) { acc = 0; G.burst(G.rnd(60, G.W - 60), G.rnd(G.H * 0.15, G.H * 0.45), 22, { colors: ['#ffd93d', '#ff4d6d', '#4aa3ff', '#7be07b'], speed: 220, life: 1.2, size: 6, grav: 140 }); G.sfx('pop'); } },
      draw(g, p) { const a = c01(p / 0.1); g.save(); g.fillStyle = `rgba(10,10,30,${0.85 * a})`; g.fillRect(-G.W, -G.H, G.W * 3, G.H * 3); g.restore();
        drawUncle(g, { x: G.cx, y: G.H * 0.62, h: G.H * 0.36, expr: 'happy', t: G.time, flail: 0.7, type: 'special' });
        txt(g, 'おめでとう!', G.cx, G.H * 0.18, 44, '#ffd93d'); txt(g, '「絶対に押すな」を極めた', G.cx, G.H * 0.18 + 46, 20); txt(g, '押しすぎです。', G.cx, G.H * 0.88, 24); },
      end() { G.finishNow(); } }); } },
];

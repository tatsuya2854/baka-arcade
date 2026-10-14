import { Engine, Bodies, Body, Composite, Events, Sleeping } from 'matter-js';
import type { GameModule, GameContext, ResultArt } from '../../core/types';
import { drawUncle, drawBubble, TYPE_DIM, type UncleType, type Expr } from '../../core/characters';
import { Stage3D } from '../../core/uncle3d';
import { meta } from './meta';
import { CFG, lerp } from './config';

const STEP = 1000 / 60;
const SCREAMS = ['ぎゃー', 'うわー', 'たすけてー', 'ひぇー', 'おちるー', 'あああ！', 'むりー'];

interface Uncle {
  id: number; body: Body; type: UncleType; skin: string; h: number; w: number; seed: number;
  landed: boolean; lost: boolean; removed: boolean; giant: boolean; impact: number; happyT: number;
}
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: 'conf' | 'dust' | 'star'; rot: number; vr: number }
interface FText { x: number; y: number; text: string; life: number; max: number; color: string; size: number }
interface Banner { text: string; sub?: string; life: number; max: number; color: string; size: number }
interface Bubble { u: Uncle; text: string; life: number }
type Phase = 'aim' | 'wait' | 'warn' | 'over';

interface Item { type: UncleType; skin: string; x: number; y: number; a: number; h: number; seed: number; bt?: number; bx0?: number; bx1?: number }
interface View { x0: number; x1: number; top: number; bottom: number }
interface Frame { plat: number; over: boolean; ids: number[]; d: Float32Array }
let uid = 1;

function sceneBg(g: CanvasRenderingContext2D, w: number, h: number, seed = 1) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120830'); gr.addColorStop(0.55, '#3a1568'); gr.addColorStop(1, '#8a2a7a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const x = ((i * 9301 + seed * 49297) % 233280) / 233280 * w, y = ((i * 7919 + 13) % 1000) / 1000 * h * 0.8; g.globalAlpha = 0.3 + (i % 5) * 0.12; g.fillRect(x, y, 1 + i % 3, 1 + i % 3); }
  g.globalAlpha = 1;
}
function drawScene(g: CanvasRenderingContext2D, w: number, h: number, items: Item[], v: View, o: { plat: number; over: boolean; t: number; platOn?: boolean }) {
  const sc = Math.min(w / (v.x1 - v.x0), h / (v.bottom - v.top));
  g.save(); g.translate(w / 2 - (v.x0 + v.x1) / 2 * sc, (h - (v.bottom - v.top) * sc) / 2 - v.top * sc); g.scale(sc, sc);
  const pw = CFG.platformW, th = CFG.platformThick;
  g.save(); g.translate(0, o.plat);
  if (!o.over) { g.fillStyle = '#6a3a9a'; g.fillRect(-36, th, 72, 2000); }
  const sg = g.createLinearGradient(0, 0, 0, th); sg.addColorStop(0, '#ffb35a'); sg.addColorStop(0.2, '#ff7a3d'); sg.addColorStop(1, '#a8341f');
  g.fillStyle = sg; g.beginPath(); g.roundRect(-pw / 2, 0, pw, th, 10); g.fill(); g.restore();
  items.forEach((it, i) => {
    const e: Expr = o.over ? (i % 2 ? 'cry' : 'dead') : (i % 3 === 0 ? 'scared' : 'sweat');
    g.save(); g.translate(it.x + Math.sin(it.a) * 0.025 * it.h, it.y - Math.cos(it.a) * 0.025 * it.h); g.rotate(it.a + (o.over ? 0 : Math.sin(o.t * 3 + i) * 0.008));
    drawUncle(g, { x: 0, y: 0, h: it.h, type: it.type, skin: it.skin, expr: e, flail: o.over ? 1 : 0.2, t: o.t + it.seed, seed: it.seed }); g.restore();
  });
  g.restore();
}
function outlined(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, lw = 8) {
  g.font = `900 ${size}px "Hiragino Sans",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = lw; g.strokeStyle = '#1a0a33'; g.lineJoin = 'round'; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
}

function judgeTitle(n: number, lean: number, ratio: number, heavy: number, thin: number, special: boolean, inverted: boolean, giantOk: boolean): [string, string] {
  if (giantOk) return ['巨大おじさんを従えし者', '最強の体重すら味方につけた。'];
  if (inverted) return ['逆立ちの賢者', '頭が下。それでも立っている。'];
  if (n <= 1) return ['序章で終わった男', 'まだ物語は始まってすらいない。'];
  if (n <= 3) return ['おじさん入門', 'まずは土台に慣れよう。'];
  if (n === 9 || n === 19 || n === 49) return ['あと1人で世界遺産', 'あと1人…あと1人だったのに！'];
  if (lean > 0.3 && n >= 5) return ['重力に嫌われた男', '物理法則が全力で拒否している。'];
  if (lean > 0.15 && n >= 8) return ['おじさんの違法建築', '建築基準法に正面から喧嘩を売った。'];
  if (ratio > 4 && n >= 10) return ['奇跡の人体建築', 'この細さでこの高さ。設計者は天才か狂人。'];
  if (n >= 30) return ['人類史上最も無駄な建造物', '誰も頼んでいない。だが美しい。'];
  if (special) return ['黄金に魅せられた男', 'ぴかぴかのおじさんが運をくれた。'];
  if (heavy >= 0.6) return ['筋肉と脂肪の要塞', '重量級だけで組んだ力技の城。'];
  if (thin >= 0.4) return ['ヒョロヒョロ摩天楼', '風が吹いたら終わる細さ。'];
  if (n >= 20) return ['おじさん建築の匠', '塔の上から見る景色はどうだ？'];
  if (n >= 10) return ['ギリギリ建築士', '毎回心臓に悪い積み方。'];
  return ['近所の迷惑建築', '町内会から苦情が来そうな高さ。'];
}

function start(ctx: GameContext) {
  const { root, audio } = ctx;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none';
  const gTop = canvas.getContext('2d')!;
  let g = gTop;
  let cw = 390, ch = 844, dpr = 1, k = 1;
  // 3D描画（WebGL）。失敗したら従来の2D描画のまま。重ね順: 背景2D → three → 前景2D(canvas: 演出+HUD)
  let stage: Stage3D | null = null, bgCanvas: HTMLCanvasElement | null = null, gBg: CanvasRenderingContext2D | null = null, use3d = false;
  function disable3d() { use3d = false; if (bgCanvas) bgCanvas.style.display = 'none'; if (stage) stage.canvas.style.display = 'none'; g = gTop; }
  try {
    stage = new Stage3D(() => disable3d());
    bgCanvas = document.createElement('canvas'); bgCanvas.style.cssText = canvas.style.cssText; gBg = bgCanvas.getContext('2d');
    stage.canvas.style.cssText = canvas.style.cssText + ';pointer-events:none';
    if (!gBg) throw new Error('2d');
    root.append(bgCanvas, stage.canvas, canvas); use3d = true;
  } catch { try { stage?.dispose(); } catch { /* ignore */ } stage = null; bgCanvas = null; gBg = null; use3d = false; root.appendChild(canvas); }
  let shX = 0, shY = 0;

  // ---------- 物理 ----------
  const engine = Engine.create({
    enableSleeping: true, positionIterations: CFG.positionIterations, velocityIterations: CFG.velocityIterations,
    constraintIterations: CFG.constraintIterations, gravity: { x: 0, y: CFG.gravityY },
  });
  const world = engine.world;
  const platform = Bodies.rectangle(0, CFG.platformThick / 2, CFG.platformW, CFG.platformThick, {
    isStatic: true, friction: CFG.friction, frictionStatic: CFG.frictionStatic, restitution: 0, label: 'platform',
  });
  Composite.add(world, platform);
  const normalArea = TYPE_DIM.normal.w * CFG.baseH * CFG.bodyWRatio * CFG.baseH * CFG.bodyHRatio;
  const baseMass = CFG.density * normalArea;

  // ---------- 状態 ----------
  let uncles: Uncle[] = [];
  let phase: Phase = 'aim';
  let t = 0;                 // ゲーム内時間(秒, 実時間ベース)
  let tutorial = true, startedFlag = false, startMs = 0, finished = false;
  let ph = 0, aimT = 0;
  let holder = { type: 'normal' as UncleType, skin: 'skin_normal', appear: 0 };
  let pending: Uncle | null = null, dropT = 0;
  let spawned = 0, lives = CFG.lives, bonus = 0;
  let shownScore = 0, scorePop = 0, prevStanding = 0;
  const milestonesDone = new Set<number>();
  let giantIdx = 0, warnT = 0, giantU: Uncle | null = null, judgeT = 0, giantNext = false;
  let shake = 0, flash = 0, flashColor = '255,60,60';
  let tH = 0, zoom = 1, holderY = -300, overT = 0, overReason = '';
  let platFall = { y: 0, vy: 0, rot: 0, vr: 0 };
  const info = new Map<number, { type: UncleType; skin: string; h: number; seed: number }>();
  let frames: Frame[] = [], stepN = 0, lastAuto = false;
  let snap: Item[] = [], stable: Item[] | null = null, snapGiantOk = false;
  const takeSnap = (): Item[] => standing().map(u => ({ type: u.type, skin: u.skin, x: u.body.position.x, y: u.body.position.y, a: u.body.angle, h: u.h, seed: u.seed, bt: u.body.bounds.min.y, bx0: u.body.bounds.min.x, bx1: u.body.bounds.max.x }));
  let timeScale = 1, finishTimer = 0, raf = 0, last = 0, acc = 0;
  const parts: Part[] = [], texts: FText[] = [], banners: Banner[] = [], bubbles: Bubble[] = [];
  const lastSfx: Record<string, number> = {};
  const rnd = Math.random;

  const sfx = (name: Parameters<typeof audio.sfx>[0], v = 0, gap = 0.06) => {
    if (t - (lastSfx[name] ?? -9) < gap) return;
    lastSfx[name] = t; audio.sfx(name, v);
  };
  const standing = () => uncles.filter(u => u.landed && !u.lost && !u.removed);
  const score = () => standing().length + bonus;
  const progress = (n: number, cnt: number) => Math.min(1, n / cnt);

  function pickType(): UncleType {
    if (spawned < CFG.firstNormal) return 'normal';
    const p = progress(spawned, CFG.typeRampCount);
    const keys = Object.keys(CFG.weightsEarly) as UncleType[];
    const w = keys.map(kk => lerp(CFG.weightsEarly[kk], CFG.weightsLate[kk], p));
    let r = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r <= 0) return keys[i]; }
    return 'normal';
  }
  function pickSkin(): string {
    const sk = ctx.unlockedSkins ?? [];
    if (!sk.length || rnd() > CFG.nonNormalSkinChance) return 'skin_normal';
    return sk[Math.floor(rnd() * sk.length)];
  }
  const sizeOf = (type: UncleType) => CFG.baseH * (type === 'giant' ? CFG.giantScale : 1) * CFG.typeHScale[type];

  function newHolder(giant = false) {
    holder = { type: giant ? 'giant' : pickType(), skin: giant ? 'skin_normal' : pickSkin(), appear: 0 };
    phase = 'aim'; aimT = 0;
  }
  const omega = () => lerp(CFG.omegaStart, CFG.omegaEnd, progress(spawned, CFG.omegaRampCount)) * (holder.type === 'giant' ? CFG.giantSpeedScale : 1);
  const range = () => lerp(CFG.rangeStart, CFG.rangeEnd, progress(spawned, CFG.rangeRampCount));
  const holderX = () => range() * Math.sin(ph) * (holder.type === 'giant' ? 0.85 : 1);

  function makeUncle(type: UncleType, skin: string, x: number, y: number): Uncle {
    const d = TYPE_DIM[type], h = sizeOf(type), w = d.w * h;
    const body = Bodies.rectangle(x, y + 0.025 * h, w * CFG.bodyWRatio, h * CFG.bodyHRatio, {
      chamfer: { radius: w * 0.12 }, friction: CFG.friction, frictionStatic: CFG.frictionStatic,
      restitution: type === 'special' ? CFG.specialRestitution : CFG.restitution, frictionAir: CFG.frictionAir,
      slop: CFG.slop, sleepThreshold: CFG.sleepThreshold, label: 'uncle',
    });
    Body.setMass(body, baseMass * d.mass * (type === 'giant' ? CFG.giantMassScale : 1));
    Body.setInertia(body, body.inertia * CFG.inertiaScale);
    const u: Uncle = { id: uid++, body, type, skin, h, w, seed: rnd() * 100, landed: false, lost: false, removed: false, giant: type === 'giant', impact: 0, happyT: 0 };
    (body as any).u = u;
    Composite.add(world, body);
    uncles.push(u); info.set(u.id, { type, skin, h, seed: u.seed });
    return u;
  }

  // ---------- 演出ユーティリティ ----------
  function burst(x: number, y: number, n: number, kind: Part['kind'], spread = 6, up = 4) {
    const cols = ['#ff3d81', '#ffd93d', '#4aa3ff', '#7be07b', '#b66dff', '#ffffff', '#ff8a3d'];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, sp = rnd() * spread;
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up * rnd(), life: 0, max: kind === 'dust' ? 0.5 + rnd() * 0.3 : 1.2 + rnd() * 1.2,
        size: kind === 'dust' ? 5 + rnd() * 7 : 5 + rnd() * 6, color: kind === 'dust' ? 'rgba(255,255,255,0.7)' : cols[Math.floor(rnd() * cols.length)], kind, rot: rnd() * 6, vr: (rnd() - 0.5) * 0.4,
      });
    }
  }
  function confettiRain(n: number) {
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * 520, y = holderY - 120 - rnd() * 200;
      parts.push({ x, y, vx: (rnd() - 0.5) * 2, vy: rnd() * 2, life: 0, max: 2.5 + rnd() * 1.5, size: 6 + rnd() * 6, color: ['#ff3d81', '#ffd93d', '#4aa3ff', '#7be07b', '#b66dff', '#fff'][i % 6], kind: 'conf', rot: rnd() * 6, vr: (rnd() - 0.5) * 0.3 });
    }
  }
  const ftext = (x: number, y: number, text: string, color = '#fff', size = 26) => texts.push({ x, y, text, life: 0, max: 1.1, color, size });
  const banner = (text: string, color = '#ffd93d', size = 44, sub?: string, max = 1.6) => banners.push({ text, sub, life: 0, max, color, size });
  function scream(u: Uncle, always = false) {
    if (!always && bubbles.length > 5) return;
    bubbles.push({ u, text: SCREAMS[Math.floor(rnd() * SCREAMS.length)], life: 0 });
    audio.sfx('scream', Math.floor(rnd() * 8));
  }

  // ---------- 入力 ----------
  function onTap() {
    if (finished) return;
    if (!startedFlag) {
      startedFlag = true; startMs = performance.now(); tutorial = false;
      audio.unlock(); ctx.started(); audio.startBgm(0, 150);
    }
    if (phase === 'aim') drop();
  }
  const onPointer = (e: Event) => { e.preventDefault(); onTap(); };
  const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') { e.preventDefault(); if (!e.repeat) onTap(); } };
  canvas.addEventListener('pointerdown', onPointer);
  addEventListener('keydown', onKey);

  const u_isOver = () => phase === 'over';
  function drop(auto = false) {
    lastAuto = auto;
    if (!u_isOver()) stable = takeSnap();
    const u = makeUncle(holder.type, holder.skin, holderX(), holderY);
    const spin = (rnd() - 0.5) * 2 * CFG.spinMax * (0.3 + progress(spawned, 30));
    Body.setVelocity(u.body, { x: 0, y: 1 });
    Body.setAngularVelocity(u.body, spin);
    spawned++; pending = u; dropT = t; phase = 'wait';
    if (u.giant) { giantU = u; sfx('whoosh', 0, 0); ftext(u.body.position.x, holderY - 60, 'ズドーン！？', '#ffd93d', 30); }
    else sfx('whoosh', 0, 0);
    if (rnd() < CFG.scream || u.giant) scream(u);
  }

  // ---------- 衝突 ----------
  Events.on(engine, 'collisionStart', (e) => {
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB;
      const ua: Uncle | undefined = (a as any).u, ub: Uncle | undefined = (b as any).u;
      const sp = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      const pt = p.collision.supports[0] ?? { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
      if (ua && !ua.landed && !ua.lost && (!ub || ub.landed)) land(ua, sp, pt);
      if (ub && !ub.landed && !ub.lost && (!ua || ua.landed)) land(ub, sp, pt);
      if (sp > 1.2 && (ua || ub)) {
        const big = (ua?.giant || ub?.giant);
        const kind = ((ua?.type === 'special' || ub?.type === 'special') && sp > 2) ? 'boing' : (sp > 3 || big) ? 'thud' : 'squeak';
        sfx(kind, uncles.length, 0.09);
        if (ua) ua.impact = Math.max(ua.impact, Math.min(1, sp / 6));
        if (ub) ub.impact = Math.max(ub.impact, Math.min(1, sp / 6));
        if (sp > 2.5) burst(pt.x, pt.y, 3, 'dust', 2, 1);
      }
    }
  });
  function land(u: Uncle, sp: number, pt: { x: number; y: number }) {
    u.landed = true; u.impact = 1;
    shake = Math.max(shake, Math.min(u.giant ? 22 : 9, sp * (u.giant ? 1.8 : 0.9)));
    burst(pt.x, pt.y, u.giant ? 22 : 7, 'dust', u.giant ? 5 : 3, 1);
    if (u.giant) {
      sfx('boom', 0, 0); judgeT = CFG.giantJudgeSec;
      banner('耐えろ…！', '#ff5a5a', 52, undefined, CFG.giantJudgeSec);
    } else if (!giantNext) ftext(pt.x, pt.y - u.h, '+1', '#ffd93d', 24);
  }

  // ---------- ゲームオーバー ----------
  function gameOver(reason: 'fall' | 'giant') {
    if (phase === 'over') return;
    phase = 'over'; overT = 0; overReason = reason;
    const final = score();
    const cur = standing();
    snap = stable && stable.length >= takeSnap().length - 1 ? stable : takeSnap();
    snapGiantOk = bonus > 0;
    const art = buildArt(reason, final);
    const cx = cur.length ? cur.reduce((s, u) => s + u.body.position.x, 0) / cur.length : 0;
    const mult = reason === 'giant' ? 1.7 : 1;
    timeScale = CFG.overSlowScale; engine.timing.timeScale = timeScale;
    Composite.remove(world, platform);
    platFall = { y: 0, vy: 0, rot: 0, vr: (rnd() - 0.5) * 0.02 };
    for (const u of uncles) {
      if (u.removed) continue;
      Sleeping.set(u.body, false);
      const dx = u.body.position.x - cx;
      Body.setVelocity(u.body, { x: Math.max(-14, Math.min(14, dx * 0.07 + (rnd() - 0.5) * 6)) * mult, y: -(3 + rnd() * CFG.explodeImpulse) * mult });
      Body.setAngularVelocity(u.body, (rnd() - 0.5) * 0.45 * mult);
    }
    const top = cur.length ? Math.min(...cur.map(u => u.body.position.y)) : -50;
    burst(cx, top / 2, 70, 'conf', 9, 6); burst(cx, 0, 30, 'dust', 8, 3);
    shake = 28; flash = 1; flashColor = '255,255,255';
    audio.stopBgm();
    sfx('boom', 0, 0); setTimeout(() => audio.sfx('gameover'), 350);
    if (reason === 'giant') setTimeout(() => audio.sfx('boom'), 220);
    const sc = Math.min(8, cur.length);
    for (let i = 0; i < sc; i++) setTimeout(() => { if (!destroyed && cur[i]) scream(cur[i], true); }, 80 + i * 110);
    banner(reason === 'giant' ? '巨大おじさんで崩壊！' : 'おじさんが落ちた！', '#ff5a5a', 40, undefined, 1.8);
    const duration = startedFlag ? performance.now() - startMs : 0;
    finishTimer = window.setTimeout(() => {
      if (finished || destroyed) return; finished = true;
      ctx.finish({ score: final, scoreText: `${final}人`, shareText: `おじさんを${final}人積みました！`, durationMs: Math.max(1, Math.round(duration + CFG.finishDelayMs)), art });
    }, CFG.finishDelayMs);
  }

  function buildArt(reason: 'fall' | 'giant', final: number): ResultArt {
    const items = snap, n = items.length;
    const topY = n ? Math.min(...items.map(i => i.bt ?? i.y)) : 0;
    const hUnits = Math.max(0, -topY), meters = Math.round(hUnits / CFG.baseH * 1.7 * 10) / 10;
    const sorted = [...items].sort((a, b) => a.y - b.y);
    const avgX = (a: Item[]) => a.length ? a.reduce((s, u) => s + u.x, 0) / a.length : 0;
    const lean = hUnits > 1 ? Math.abs(avgX(sorted.slice(0, 3)) - avgX(sorted.slice(-3))) / hUnits : 0;
    const wUnits = n ? Math.max(...items.map(i => i.bx1 ?? i.x)) - Math.min(...items.map(i => i.bx0 ?? i.x)) : 1;
    const ratio = hUnits / Math.max(40, wUnits);
    const cnt = (ty: UncleType) => items.filter(u => u.type === ty).length;
    const heavy = n ? (cnt('fat') + cnt('muscle') + cnt('giant')) / n : 0, thin = n ? cnt('thin') / n : 0;
    const hasSpecial = cnt('special') > 0, inverted = items.some(u => Math.cos(u.a) < -0.85);
    const giantOk = snapGiantOk;
    const [title, comment] = judgeTitle(final, lean, ratio, heavy, thin, hasSpecial, inverted, giantOk);
    let cause = 'バランス崩れ';
    if (reason === 'giant') cause = '巨大おじさん直撃';
    else if (lastAuto) cause = '放置で自然落下';
    else if (final <= 3) cause = '狙いのズレ';
    else if (heavy >= 0.5) cause = '重すぎる土台';
    else if (lean > 0.2) cause = '傾きすぎ';
    let rare: string | undefined;
    if (giantOk) rare = 'giant_ok'; else if (inverted) rare = 'inverted'; else if (hasSpecial && n >= 3) rare = 'gold'; else if (lean > 0.22 && n >= 6) rare = 'lean';
    const facts = [{ label: '積んだ人数', value: `${final}人` }, { label: 'タワーの高さ', value: `${meters}m` }, { label: '崩壊原因', value: cause }];
    if (giantOk) facts.push({ label: '巨大おじさん', value: '制覇！' });
    const view: View = { x0: Math.min(-190, ...items.map(i => i.x - i.h * 0.6)), x1: Math.max(190, ...items.map(i => i.x + i.h * 0.6)), top: Math.min(-80, topY - 40), bottom: 70 };
    const rf = frames.slice();
    const rview: View = (() => {
      const f0 = rf[0]; let top = topY - 60; if (f0) for (let i = 0; i < f0.ids.length; i++) top = Math.min(top, f0.d[i * 3 + 1] - 50);
      return { x0: -300, x1: 300, top: Math.min(top, -120), bottom: 260 };
    })();
    const st = info;
    return {
      title, comment, facts, rare,
      postVariants: [
        `おじさんを${final}人積んだ結果、${title}が完成した。\nこれ超えられる人いる？😂`,
        `${meters}mのおじさんタワーが「${cause}」で崩壊した。\n称号:${title}`,
        `おじさん${final}人でタワー崩壊💥 ${comment}\n同じ高さまで積める？`,
      ],
      draw(g, w, h, t) {
        sceneBg(g, w, h, final);
        const hh = h * 0.62; g.save(); g.translate(0, h * 0.2); drawScene(g, w, hh, items, view, { plat: 0, over: false, t, platOn: true }); g.restore();
        const u = Math.min(w, h * 1.1) / 400;
        outlined(g, `高さ ${meters}m ／ ${cause}`, w / 2, h * 0.9, Math.max(12, 20 * u + 4), '#fff', 5);
        outlined(g, '崩壊！', w * 0.78, h * 0.14, Math.max(14, 28 * u + 6), '#ff5a5a', 6);
      },
      replay: rf.length > 5 ? {
        durationSec: rf.length / 20,
        draw(g, w, h, t) {
          const f = rf[Math.max(0, Math.min(rf.length - 1, Math.floor(t * 20)))];
          sceneBg(g, w, h, final);
          const its: Item[] = f.ids.map((id, i) => { const m = st.get(id)!; return { type: m.type, skin: m.skin, h: m.h, seed: m.seed, x: f.d[i * 3], y: f.d[i * 3 + 1], a: f.d[i * 3 + 2] }; });
          drawScene(g, w, h, its, rview, { plat: f.plat, over: f.over, t });
          if (f.over) outlined(g, '崩壊！', w / 2, h * 0.12, Math.max(20, w * 0.1), '#ff5a5a', 8);
        },
      } : undefined,
    };
  }

  function loseUncle(u: Uncle) {
    u.lost = true; lives--;
    scream(u, true); sfx('ng', 0, 0);
    ftext(u.body.position.x, Math.min(u.body.position.y, CFG.loseY) - 10, 'ミス！', '#ff5a5a', 28);
    flash = 0.5; flashColor = '255,60,60'; shake = Math.max(shake, 8);
    if (judgeT > 0 && giantU) { gameOver('giant'); return; }
    if (lives <= 0) gameOver('fall');
    else banner(`あと${lives}回`, '#ff9f5a', 30, undefined, 1);
  }

  // ---------- 1ステップ ----------
  function step() {
    const dt = STEP / 1000;
    t += dt * (phase === 'over' ? timeScale : 1);
    // 往復・自動落下
    if (phase === 'aim' || phase === 'warn') {
      if (phase === 'aim') { ph += omega() * dt; aimT += dt; holder.appear = Math.min(1, holder.appear + dt * 4); }
      if (phase === 'warn') {
        warnT -= dt;
        if (warnT <= 0) { newHolder(true); giantNext = false; }
        else if (Math.floor(warnT * 5) % 2 === 0) flash = Math.max(flash, 0.18);
      }
      if (phase === 'aim' && startedFlag && aimT > CFG.autoDropSec) drop(true);
    }
    // 落下速度制限
    for (const u of uncles) {
      if (u.removed) continue;
      const v = u.body.velocity;
      if (v.y > CFG.maxFallSpeed) Body.setVelocity(u.body, { x: v.x, y: CFG.maxFallSpeed });
      u.impact *= 0.93; u.happyT = Math.max(0, u.happyT - dt);
    }
    Engine.update(engine, STEP);
    if (++stepN % 3 === 0) {
      const act = uncles.filter(u => !u.removed && u.body.position.y < 1000), d = new Float32Array(act.length * 3);
      act.forEach((u, i) => { d[i * 3] = u.body.position.x; d[i * 3 + 1] = u.body.position.y; d[i * 3 + 2] = u.body.angle; });
      frames.push({ plat: platFall.y, over: phase === 'over', ids: act.map(u => u.id), d });
      if (frames.length > 160) frames.shift();
    }

    // 巨大着地後の安定補助
    if (judgeT > 0 && CFG.giantDamp < 1) {
      for (const u of uncles) if (u.landed && !u.lost && !u.removed) {
        const b = u.body; Body.setVelocity(b, { x: b.velocity.x * CFG.giantDamp, y: b.velocity.y }); Body.setAngularVelocity(b, b.angularVelocity * CFG.giantDamp);
      }
    }

    // 落下判定
    for (const u of uncles) {
      if (u.removed) continue;
      if (!u.lost && u.body.position.y > CFG.loseY && phase !== 'over') loseUncle(u);
      if (u.body.position.y > 1400) { u.removed = true; Composite.remove(world, u.body); }
    }
    uncles = uncles.filter(u => !u.removed);

    // 巨大の判定
    if (judgeT > 0 && phase !== 'over') {
      judgeT -= dt;
      if (judgeT <= 0 && giantU && giantU.landed && !giantU.lost) giantSuccess();
    }

    // 次のおじさん
    if (phase === 'wait' && pending) {
      const el = t - dropT;
      if (judgeT <= 0 && ((el >= CFG.minInterval && (pending.landed || pending.lost)) || el >= CFG.maxWait)) {
        pending = null; spawnNext();
      }
    }

    // スコア変化
    const n = standing().length;
    if (n !== prevStanding) {
      if (n > prevStanding) { scorePop = 1; sfx('pop', n, 0.05); checkMilestones(n); }
      prevStanding = n;
    }

    // カメラ
    const tops = standing();
    let target = 0;
    for (const u of tops) target = Math.max(target, -u.body.bounds.min.y);
    tH += (target - tH) * 0.06;
    const groundScreen = Math.max(hy() + 220, ch - 100);
    const zt = Math.max(0.28, Math.min(CFG.zoomMax, (groundScreen - hy()) / (k * (tH + 260))));
    zoom += (zt - zoom) * 0.05;
    holderY = -Math.max(tH + 260, (groundScreen - hy()) / (k * zoom));

    // 演出更新
    shake *= 0.9; flash *= 0.92; scorePop *= 0.9;
    shownScore += (score() - shownScore) * 0.35;
    for (const p of parts) {
      p.life += dt; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      p.vy += p.kind === 'conf' ? 0.07 : p.kind === 'dust' ? -0.02 : 0.12; p.vx *= 0.99;
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life > parts[i].max) parts.splice(i, 1);
    for (const x of texts) { x.life += dt; x.y -= 0.6; }
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life > texts[i].max) texts.splice(i, 1);
    for (const x of banners) x.life += dt;
    for (let i = banners.length - 1; i >= 0; i--) if (banners[i].life > banners[i].max) banners.splice(i, 1);
    for (const x of bubbles) x.life += dt;
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].life > 1.1) bubbles.splice(i, 1);

    if (phase === 'over') {
      overT += dt;
      platFall.vy += 0.25; platFall.y += platFall.vy; platFall.rot += platFall.vr;
      timeScale = overT < CFG.overSlowSec ? CFG.overSlowScale : Math.min(1, CFG.overSlowScale + (overT - CFG.overSlowSec) * 1.2);
      engine.timing.timeScale = timeScale;
    }
  }

  function spawnNext() {
    const n = standing().length;
    if (giantIdx < CFG.giantAt.length && n >= CFG.giantAt[giantIdx] && !giantNext) {
      giantNext = true; giantIdx++; phase = 'warn'; warnT = CFG.giantWarnSec;
      sfx('alarm', 0, 0); setTimeout(() => { if (!destroyed && phase === 'warn') audio.sfx('alarm'); }, 700);
      banner('⚠ 警告 ⚠', '#ff3b3b', 54, '巨大おじさん接近中！', CFG.giantWarnSec);
      shake = Math.max(shake, 10);
      return;
    }
    newHolder(false);
  }
  function giantSuccess() {
    bonus += CFG.giantBonus; giantU = null; judgeT = 0;
    sfx('unlock', 0, 0); sfx('combo', 0, 0);
    banner('耐えた！！', '#ffd93d', 58, `ボーナス +${CFG.giantBonus}人`, 2);
    confettiRain(110); shake = 12; scorePop = 1.5;
    ftext(0, -tH - 80, `+${CFG.giantBonus}`, '#ffd93d', 44);
    for (const u of uncles) u.happyT = 2;
  }
  function checkMilestones(n: number) {
    for (const m of CFG.milestones) {
      if (n >= m && !milestonesDone.has(m)) {
        milestonesDone.add(m);
        sfx(m >= 50 ? 'unlock' : 'combo', 0, 0);
        banner(`${m}人！`, m >= 50 ? '#ff3d81' : '#ffd93d', m >= 50 ? 70 : 56, m >= 50 ? 'すごすぎる！' : m === 20 ? 'ここからが本番…' : undefined);
        confettiRain(m >= 50 ? 150 : 70); shake = Math.max(shake, m >= 50 ? 16 : 9);
        for (const u of uncles) u.happyT = 1.4;
      }
    }
  }

  // ---------- 描画 ----------
  const hy = () => Math.max(118, ch * 0.155);
  const stars = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), s: 0.6 + rnd() * 1.8, p: rnd() * 6 }));
  const city = Array.from({ length: 28 }, (_, i) => ({ x: -560 + i * 42 + rnd() * 10, w: 30 + rnd() * 26, h: 70 + rnd() * 210, lit: rnd() }));

  function towerCenter() {
    const s = standing().sort((a, b) => a.body.bounds.min.y - b.body.bounds.min.y).slice(0, 3);
    return s.length ? s.reduce((a, u) => a + u.body.position.x, 0) / s.length : 0;
  }

  function drawBg() {
    const gr = g.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, '#120830'); gr.addColorStop(0.55, '#3a1568'); gr.addColorStop(1, '#8a2a7a');
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    const scroll = -holderY * zoom * 0.05;
    for (const s of stars) {
      const y = ((s.y * ch + scroll) % ch + ch) % ch;
      g.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.5 + s.p)); g.fillStyle = '#fff';
      g.fillRect(s.x * cw, y, s.s, s.s);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#ffe9a8'; g.globalAlpha = 0.9; g.beginPath(); g.arc(cw * 0.8, ch * 0.3 + scroll * 0.5, 26, 0, 7); g.fill();
    g.fillStyle = '#3a1568'; g.beginPath(); g.arc(cw * 0.8 + 10, ch * 0.3 + scroll * 0.5 - 4, 24, 0, 7); g.fill(); g.globalAlpha = 1;
  }

  // pass: 0=全部(2D) 1=背面のみ(3D時) 2=前面のみ(3D時: 演出)
  function drawWorld(pass: 0 | 1 | 2 = 0) {
    const sc = k * zoom, gScreen = hy() + (0 - holderY) * sc;
    // 街のシルエット（地面基準）
    if (pass !== 2) {
    g.save();
    g.translate(cw / 2, gScreen); g.scale(sc * 0.8, sc * 0.8);
    for (const b of city) {
      g.fillStyle = '#1d0c40'; g.fillRect(b.x, 40 - b.h, b.w, b.h + 800);
      g.fillStyle = 'rgba(255,220,120,0.55)';
      for (let y = 40 - b.h + 14; y < 20; y += 24) for (let x = b.x + 6; x < b.x + b.w - 8; x += 12) if (((x * 7 + y * 3) | 0) % 5 < 2 * b.lit + 0.8) g.fillRect(x, y, 5, 8);
    }
    g.restore();
    }

    g.save();
    g.translate(cw / 2 + shX, hy() + shY);
    g.scale(sc, sc); g.translate(0, -holderY);

    // 土台
    const pw = CFG.platformW, th = CFG.platformThick;
    if (pass === 0) {
    g.save(); g.translate(0, platFall.y); g.rotate(platFall.rot);
    if (phase !== 'over') { // 柱
      const pg = g.createLinearGradient(-40, 0, 40, 0); pg.addColorStop(0, '#5a2f8a'); pg.addColorStop(0.5, '#8a52c0'); pg.addColorStop(1, '#4a2578');
      g.fillStyle = pg; g.fillRect(-36, th, 72, 4000);
    }
    const sg = g.createLinearGradient(0, 0, 0, th); sg.addColorStop(0, '#ffb35a'); sg.addColorStop(0.18, '#ff7a3d'); sg.addColorStop(1, '#a8341f');
    g.fillStyle = sg; g.beginPath(); g.roundRect(-pw / 2, 0, pw, th, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-pw / 2 + 8, 3, pw - 16, 4);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = -pw / 2 + 16; x < pw / 2 - 20; x += 36) { g.beginPath(); g.moveTo(x, th - 3); g.lineTo(x + 14, th - 3); g.lineTo(x + 28, 12); g.lineTo(x + 14, 12); g.closePath(); g.fill(); }
    g.restore();
    }

    // 狙いガイド
    if (pass !== 2 && phase === 'aim') {
      const hx = holderX(), isG = holder.type === 'giant', tc = towerCenter();
      g.save(); g.setLineDash([8, 10]); g.lineWidth = 3;
      const endY = isG ? -tH : (Math.abs(hx) < pw / 2 ? -tH * (Math.abs(hx - tc) < 70 ? 1 : 0) : 120);
      g.strokeStyle = isG ? 'rgba(255,90,90,0.8)' : 'rgba(255,255,255,0.25)';
      g.beginPath(); g.moveTo(hx, holderY + 40); g.lineTo(hx, endY); g.stroke(); g.setLineDash([]);
      if (isG) {
        const tx = tc, ty = -tH, pulse = 1 + 0.12 * Math.sin(t * 8);
        g.strokeStyle = '#ffd93d'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(tx, ty - 4, 46 * pulse, 14 * pulse, 0, 0, 7); g.stroke();
        g.fillStyle = '#ffd93d'; g.font = '900 20px "Hiragino Sans",sans-serif'; g.textAlign = 'center'; g.fillText('ここ！', tx, ty - 28);
      }
      g.restore();
    }

    // 積まれたおじさん
    if (pass === 0) { const rank = standing().sort((a, b) => a.body.position.y - b.body.position.y); for (const u of uncles) drawOne(u, rank.indexOf(u)); }

    // 保持中のおじさん + レール
    if (pass !== 2 && (phase === 'aim' || phase === 'warn')) {
      const R = range() + 40 * (holder.type === 'giant' ? 1 : 0), top = holderY - sizeOf(holder.type) * 0.75;
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-R - 30, top); g.lineTo(R + 30, top); g.stroke();
      if (phase === 'aim') {
        const hx = holderX(), h = sizeOf(holder.type), ap = holder.appear, s = 0.4 + 0.6 * (1 - Math.pow(1 - ap, 3));
        g.strokeStyle = '#ccc'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx, top); g.lineTo(hx, holderY - h * 0.5); g.stroke();
        g.fillStyle = '#ffd93d'; g.fillRect(hx - 9, top - 5, 18, 10);
        if (pass === 0) { g.save(); g.translate(hx, holderY); g.scale(s, s);
        drawUncle(g, { x: 0, y: 0, h, rot: Math.cos(ph * 1.7) * 0.14, type: holder.type, skin: holder.skin, expr: holder.type === 'giant' ? 'angry' : 'happy', t, flail: 0.25, seed: 3 });
        g.restore(); }
      }
    }

    // パーティクル
    if (pass !== 1) for (const p of parts) {
      const a = 1 - p.life / p.max; g.globalAlpha = Math.max(0, p.kind === 'conf' ? Math.min(1, a * 2) : a);
      g.fillStyle = p.color;
      if (p.kind === 'dust') { g.beginPath(); g.arc(p.x, p.y, p.size * (1 + p.life), 0, 7); g.fill(); }
      else { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore(); }
    }
    g.globalAlpha = 1;
    // 浮かぶ文字
    if (pass !== 1) for (const x of texts) {
      const a = 1 - x.life / x.max; g.globalAlpha = Math.min(1, a * 2);
      g.font = `900 ${x.size}px "Hiragino Sans",sans-serif`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#111'; g.strokeText(x.text, x.x, x.y); g.fillStyle = x.color; g.fillText(x.text, x.x, x.y);
    }
    g.globalAlpha = 1;
    g.restore();

    // 吹き出し（画面座標）
    if (pass !== 1) for (const b of bubbles) {
      const p = b.u.body.position, sx = cw / 2 + p.x * sc, sy = hy() + (p.y - holderY) * sc;
      const cy = Math.min(ch - 40, Math.max(150, sy - b.u.h * sc * 0.6)), cx = Math.min(cw - 50, Math.max(50, sx));
      g.globalAlpha = Math.min(1, (1.1 - b.life) * 3); drawBubble(g, b.text, cx, cy, 22); g.globalAlpha = 1;
    }
  }

  let exprR: Expr = 'idle', flailR = 0;
  function exprFor(u: Uncle, rank: number) {
    const b = u.body;
    let expr: Expr = 'idle', flail = 0;
    const wob = b.speed + Math.abs(b.angularVelocity) * 25;
    if (phase === 'over') { expr = u.seed % 2 < 1 ? 'dead' : 'cry'; flail = 1; }
    else if (!u.landed || u.lost) { expr = 'scared'; flail = 1; }
    else if (u.impact > 0.35) { expr = 'wow'; flail = 0.3; }
    else if (u.happyT > 0) { expr = 'happy'; }
    else if (wob > 0.5) { expr = 'scared'; flail = Math.min(0.8, wob * 0.3); }
    else if (rank >= 4) expr = 'sweat';
    exprR = expr; flailR = flail;
  }
  function drawOne(u: Uncle, rank: number) {
    const b = u.body, h = u.h;
    const px = b.position.x + Math.sin(b.angle) * 0.025 * h, py = b.position.y - Math.cos(b.angle) * 0.025 * h;
    exprFor(u, rank); const expr = exprR, flail = flailR;
    const sq = u.impact * 0.14;
    g.save(); g.translate(px, py); g.rotate(b.angle); g.scale(1 + sq, 1 - sq);
    drawUncle(g, { x: 0, y: 0, h, type: u.type, skin: u.skin, expr, flail, t: t + u.seed, seed: u.seed });
    g.restore();
  }

  function drawHud() {
    // 画面フラッシュ
    if (flash > 0.02) { g.fillStyle = `rgba(${flashColor},${Math.min(0.5, flash * 0.5)})`; g.fillRect(0, 0, cw, ch); }
    // スコア
    const n = Math.round(shownScore), pop = 1 + scorePop * 0.35;
    g.save(); g.translate(cw / 2, 54); g.scale(pop, pop);
    g.font = '900 64px "Hiragino Sans",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#1a0a33'; g.strokeText(String(n), -8, 0); g.fillStyle = '#fff'; g.fillText(String(n), -8, 0);
    const wd = g.measureText(String(n)).width;
    g.font = '900 24px "Hiragino Sans",sans-serif'; g.strokeText('人', wd / 2 + 6, 12); g.fillStyle = '#ffd93d'; g.fillText('人', wd / 2 + 6, 12);
    g.restore();
    g.font = '800 13px "Hiragino Sans",sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.65)';
    g.fillText(`BEST ${Math.max(ctx.best, 0)}`, cw / 2, 100);
    // ライフ
    g.textAlign = 'left'; g.font = '900 24px sans-serif';
    for (let i = 0; i < CFG.lives; i++) { g.fillStyle = i < lives ? '#ff3d81' : 'rgba(255,255,255,0.2)'; g.fillText('♥', 58 + i * 26, 36); }
    // バナー
    for (const b of banners) {
      const a = b.life / b.max, inn = Math.min(1, b.life * 6), out = Math.min(1, (b.max - b.life) * 4);
      const s = 0.6 + 0.4 * (1 - Math.pow(1 - inn, 3)) + (b.life < 0.2 ? 0.2 : 0);
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, out)); g.translate(cw / 2, ch * 0.3); g.scale(s, s); g.rotate(Math.sin(a * 20) * 0.02);
      g.font = `900 ${b.size}px "Hiragino Sans",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 9; g.strokeStyle = '#1a0a33'; g.strokeText(b.text, 0, 0); g.fillStyle = b.color; g.fillText(b.text, 0, 0);
      if (b.sub) { g.font = '900 22px "Hiragino Sans",sans-serif'; g.lineWidth = 6; g.strokeText(b.sub, 0, b.size * 0.8); g.fillStyle = '#fff'; g.fillText(b.sub, 0, b.size * 0.8); }
      g.restore();
    }
    // チュートリアル
    if (tutorial) {
      g.globalAlpha = 0.45 + 0.25 * Math.sin(performance.now() / 300); g.fillStyle = '#fff';
      g.font = '900 30px "Hiragino Sans",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('タップで落とす', cw / 2, ch * 0.44);
      g.font = '40px sans-serif'; g.fillText('👆', cw / 2, ch * 0.44 + 50 + Math.sin(performance.now() / 200) * 6);
      g.globalAlpha = 1;
    }
  }

  function render3d() {
    const st = stage!, sc = k * zoom;
    st.setView(sc, cw / 2 + shX, hy() + shY - holderY * sc, cw, ch);
    st.setPlatform(platFall.y, platFall.rot, phase !== 'over');
    st.beginFrame();
    const rank = standing().sort((a, b) => a.body.position.y - b.body.position.y);
    const ramp = phase === 'over' ? Math.min(1, overT * 1.5) : 0;
    for (const u of uncles) {
      const b = u.body, h = u.h;
      exprFor(u, rank.indexOf(u));
      const o = st.uncle(u.id, u.type, u.skin);
      o.pose(st.kit, exprR, flailR, t + u.seed, u.seed);
      // 崩壊時は少し奥行き方向にも散らす
      const zs = ramp ? (((u.seed * 7.31) % 1) - 0.4) * 140 * ramp : 0, ry = ramp ? Math.sin(u.seed * 3.7) * 0.9 * ramp : 0;
      o.place(b.position.x + Math.sin(b.angle) * 0.025 * h, -(b.position.y - Math.cos(b.angle) * 0.025 * h), zs, b.angle, h, u.impact * 0.14, ry);
    }
    if (phase === 'aim') {
      const hx = holderX(), h = sizeOf(holder.type), ap = holder.appear, s = 0.4 + 0.6 * (1 - Math.pow(1 - ap, 3));
      const o = st.uncle(-1, holder.type, holder.skin);
      o.pose(st.kit, holder.type === 'giant' ? 'angry' : 'happy', 0.25, t, 3);
      o.place(hx, -holderY, 0, Math.cos(ph * 1.7) * 0.14, h * s, 0, 0);
    }
    st.endFrame(); st.render();
  }
  function render() {
    shX = (rnd() - 0.5) * shake; shY = (rnd() - 0.5) * shake;
    if (use3d && stage && gBg) {
      g = gBg; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.textBaseline = 'alphabetic'; drawBg(); drawWorld(1);
      render3d();
      g = gTop; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.textBaseline = 'alphabetic'; drawWorld(2); drawHud();
      return;
    }
    g = gTop; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.textBaseline = 'alphabetic';
    drawBg(); drawWorld(); drawHud();
  }

  function resize() {
    const r = root.getBoundingClientRect();
    cw = Math.max(200, r.width || innerWidth); ch = Math.max(300, r.height || innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    if (bgCanvas) { bgCanvas.width = canvas.width; bgCanvas.height = canvas.height; }
    stage?.resize(cw, ch, dpr);
    k = Math.min(cw / 400, ch / 760);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);
  addEventListener('resize', resize);

  // 初期カメラ
  {
    const gs = Math.max(hy() + 220, ch - 100);
    zoom = Math.max(0.28, Math.min(CFG.zoomMax, (gs - hy()) / (k * 260)));
    holderY = -Math.max(260, (gs - hy()) / (k * zoom));
  }
  newHolder(false);

  let destroyed = false;
  function loop(now: number) {
    if (destroyed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(100, now - (last || now)); last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
    if (acc > STEP * 5) acc = 0;
    render();
  }
  raf = requestAnimationFrame(loop);

  if (location.pathname.includes('dev')) {
    (window as any).__stack = {
      get phase() { return phase; }, get lives() { return lives; }, get score() { return score(); },
      get hx() { return holderX(); }, get tc() { return towerCenter(); }, tap: onTap, get holder() { return holder.type; }, get use3d() { return use3d; },
      get bodies() { return uncles.map(u => ({ x: u.body.position.x, y: u.body.position.y, a: u.body.angle, vx: u.body.velocity.x, vy: u.body.velocity.y, sleeping: u.body.isSleeping, landed: u.landed, lost: u.lost, type: u.type })); },
    };
  }

  return {
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); clearTimeout(finishTimer);
      canvas.removeEventListener('pointerdown', onPointer);
      removeEventListener('keydown', onKey); removeEventListener('resize', resize); ro.disconnect();
      Events.off(engine, 'collisionStart'); Composite.clear(world, false); Engine.clear(engine);
      audio.stopBgm(); canvas.remove(); bgCanvas?.remove();
      if (stage) { stage.dispose(); stage = null; } use3d = false;
      if ((window as any).__stack) delete (window as any).__stack;
    },
  };
}

const mod: GameModule = { meta, start };
export default mod;

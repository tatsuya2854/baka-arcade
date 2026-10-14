import type { GameModule, GameContext, GameInstance, ResultArt } from '../../core/types';
import { drawUncle, drawBubble, type Expr } from '../../core/characters';
import { meta } from './meta';
import { loadImg, drawCover } from '../../core/images';
import { CFG } from './config';
import { Hair3D, type HairFrame } from './hair3d';

interface Gust { s: number; d: number; peak: number; dir: number }
interface Node { x: number; y: number; px: number; py: number }
type PKind = 'leaf' | 'trash' | 'line' | 'sweat' | 'hair' | 'spark';
interface Part { k: PKind; x: number; y: number; vx: number; vy: number; life: number; max: number; rot: number; vr: number; size: number; c: string }

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function artDraw(g: CanvasRenderingContext2D, w: number, h: number, t: number, v: string, dir: number, sec: number, mph: number, title: string, byDmg: boolean, ms: number) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#173a63'); gr.addColorStop(1, '#2e6f9e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = Math.max(1, w / 200);
  for (let i = 0; i < 12; i++) { const y = (i * 0.083 + 0.03) * h, x = ((t * 500 + i * 97) % (w + 200)) - 100, xx = dir > 0 ? x : w - x; g.beginPath(); g.moveTo(xx, y); g.lineTo(xx - dir * w * 0.15, y); g.stroke(); }
  const hh = Math.min(w * 1.25, h * 0.95), hr = 0.19 * hh, cx = w / 2, hcy = h * 0.5, ry = hcy - hr * 0.95;
  const expr = v === 'regrow' ? 'happy' : byDmg ? 'angry' : v === 'last' ? 'sweat' : 'cry';
  drawUncle(g, { x: cx, y: hcy + 0.31 * hh, h: hh, expr, t, bald: true, hairLen: 0, rot: dir * 0.03 });
  g.lineCap = 'round'; const col = '#3b2a20';
  const strand = (x0: number, len: number, bend: number, wid: number, lift = 1) => {
    g.strokeStyle = col; g.lineWidth = wid; g.beginPath(); g.moveTo(x0, ry);
    g.bezierCurveTo(x0 + bend * 0.3, ry - len * 0.4 * lift, x0 + bend * 0.8, ry - len * 0.6 * lift, x0 + bend, ry - len * 0.6 * lift + len * 0.4 * (1 - lift) + Math.sin(t * 8) * 2); g.stroke();
  };
  if (v === 'last') strand(cx, hr * 1.1, Math.sin(t * 4) * hr * 0.1, Math.max(2, hr * 0.05));
  else if (v === 'sideways') strand(cx, hr * 1.4, dir * hr * 1.3, Math.max(2, hr * 0.05), 0.35);
  else if (v === 'tangled') {
    g.strokeStyle = col; g.lineWidth = Math.max(2, hr * 0.045); g.beginPath(); g.moveTo(cx, ry);
    for (let i = 1; i <= 24; i++) g.lineTo(cx + Math.sin(i * 2.1) * hr * 0.5 + dir * i * 2, ry - Math.abs(Math.sin(i * 1.3)) * hr * 0.3 + Math.cos(i * 2.7) * hr * 0.1); g.stroke();
    g.fillStyle = 'rgba(255,60,60,.45)'; g.beginPath(); g.ellipse(cx, ry + hr * 0.1, hr * 0.7, hr * 0.3, 0, 0, 7); g.fill();
  } else if (v === 'flyaway') {
    g.fillStyle = 'rgba(255,100,100,.5)'; g.beginPath(); g.ellipse(cx, ry + 2, hr * 0.12, hr * 0.06, 0, 0, 7); g.fill();
    const k = (t * 0.6) % 1;
    for (let i = 0; i < 7; i++) { const f = i / 7, px = cx + dir * (hr * 0.4 + f * w * 0.4 + k * w * 0.2), py = ry - f * hr * 1.5 - k * hr * 0.5 + Math.sin(t * 5 + i) * hr * 0.15; g.save(); g.translate(px, py); g.rotate(t * 3 + i); g.strokeStyle = col; g.lineWidth = Math.max(2, hr * 0.04); g.beginPath(); g.moveTo(-hr * 0.2, 0); g.quadraticCurveTo(0, hr * 0.12, hr * 0.2, 0); g.stroke(); g.restore(); }
  } else if (v === 'regrow') {
    for (let i = -14; i <= 14; i++) { const a = i / 14, x0 = cx + a * hr * 0.9, y0 = hcy - Math.sqrt(Math.max(0, 1 - a * a * 0.8)) * hr * 0.97; g.strokeStyle = col; g.lineWidth = Math.max(2, hr * 0.035); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + a * hr * 0.3 + Math.sin(t * 3 + i) * 3, y0 - hr * 0.35, x0 + a * hr * 0.5 + dir * hr * 0.1, y0 - hr * (0.5 + 0.2 * Math.abs(Math.sin(i * 3.1)))); g.stroke(); }
    g.fillStyle = '#ffe97a'; for (let i = 0; i < 8; i++) { const a = t * 2 + i; g.fillText('✦', cx + Math.cos(a) * hr * 1.5, hcy + Math.sin(a * 1.3) * hr * 1.3); }
  }
  g.font = `900 ${Math.round(w * 0.075)}px "Hiragino Sans", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = w * 0.014; g.strokeStyle = '#000'; g.fillStyle = '#fff';
  const lab = `${sec.toFixed(1)}秒 / 風速${mph}m`; g.strokeText(lab, cx, h * 0.07); g.fillText(lab, cx, h * 0.07);
  g.font = `900 ${Math.round(w * 0.06)}px "Hiragino Sans", sans-serif`; g.fillStyle = '#ff4'; g.strokeText(title, cx, h * 0.93); g.fillText(title, cx, h * 0.93);
  void ms;
}

function start(ctx: GameContext): GameInstance {
  const root = ctx.root, audio = ctx.audio;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none';
  const gTop = cv.getContext('2d')!;
  let g = gTop;
  // 3D描画（WebGL）。失敗したら従来の2D描画。重ね順: 背景2D → three → 前景2D(cv: 演出+HUD、入力もここ)
  let st3: Hair3D | null = null, bgCv: HTMLCanvasElement | null = null, gBg: CanvasRenderingContext2D | null = null, use3d = false;
  function disable3d() { use3d = false; if (bgCv) bgCv.style.display = 'none'; if (st3) st3.canvas.style.display = 'none'; g = gTop; }
  try {
    st3 = new Hair3D(() => disable3d());
    bgCv = document.createElement('canvas'); bgCv.style.cssText = cv.style.cssText; gBg = bgCv.getContext('2d');
    st3.canvas.style.cssText = cv.style.cssText + ';pointer-events:none';
    if (!gBg) throw new Error('2d');
    root.append(bgCv, st3.canvas, cv); use3d = true;
  } catch { try { st3?.dispose(); } catch { /* ignore */ } st3 = null; bgCv = null; gBg = null; use3d = false; root.appendChild(cv); }
  let W = 390, H = 844, dpr = 1;
  // ---- 生成画像（bg=暗いスタジオ / hero=実写の頭部）。無ければ従来の3D/2D描画にフォールバック ----
  const SLUG = 'save-the-hair';
  let imgBg: HTMLImageElement | null = null, imgHero: HTMLImageElement | null = null;
  let bgOff: HTMLCanvasElement | null = null, heroOff: HTMLCanvasElement | null = null, heroS = 0, destroyedFlag = false;
  // 写真上の髪の根元(頭頂の見える部分)と画像サイズ。resize毎に作り直す。
  const ROOT_FX = 0.60, ROOT_FY = 0.13;
  const heroSize = () => Math.min(W * 1.3, H * 0.6);
  const buildOff = () => {
    if (imgBg) {
      const c = bgOff ?? (bgOff = document.createElement('canvas')); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      const q = c.getContext('2d')!; q.setTransform(dpr, 0, 0, dpr, 0, 0); drawCover(q, imgBg, W, H, 0.5, 0.5);
      const vg = q.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(0,0,0,.25)'); vg.addColorStop(0.5, 'rgba(0,0,0,.05)'); vg.addColorStop(1, 'rgba(0,0,0,.3)'); q.fillStyle = vg; q.fillRect(0, 0, W, H);
    }
    if (imgHero) {
      const S = heroSize(); heroS = S;
      const c = heroOff ?? (heroOff = document.createElement('canvas')); c.width = Math.round(S * dpr); c.height = Math.round(S * dpr);
      const q = c.getContext('2d')!; q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, c.width, c.height); q.globalCompositeOperation = 'source-over';
      // 切り抜き(alpha)が白シャツ部分で抜けているので、胴体の内側だけ元画像(白地合成)で裏打ちして穴を埋める。外形は元のalphaのまま。
      const k = c.width / 720;
      const poly = (pts: number[][]) => { q.beginPath(); pts.forEach(([x, y], i) => i ? q.lineTo(x * k, y * k) : q.moveTo(x * k, y * k)); q.closePath(); };
      const solid = document.createElement('canvas'); solid.width = c.width; solid.height = c.height;
      const sq = solid.getContext('2d')!; sq.fillStyle = '#fff'; sq.fillRect(0, 0, c.width, c.height); sq.drawImage(imgHero, 0, 0, c.width, c.height);
      q.save();
      poly([[0, 335], [75, 268], [125, 250], [195, 305], [130, 405], [150, 412], [150, 720], [0, 720]]); q.clip(); q.drawImage(solid, 0, 0); q.restore();
      q.save();
      poly([[150, 412], [240, 402], [300, 392], [345, 425], [420, 470], [515, 372], [585, 440], [720, 505], [720, 720], [150, 720]]); q.clip(); q.drawImage(solid, 0, 0); q.restore();
      q.drawImage(imgHero, 0, 0, c.width, c.height);
      // 腕と首の間に残った白い背景(不透明)を抜く
      q.globalCompositeOperation = 'destination-out'; poly([[192, 300], [238, 268], [262, 296], [276, 345], [296, 380], [312, 396], [240, 402], [150, 412], [130, 402], [160, 350]]); q.fill();
      q.globalCompositeOperation = 'source-over';
      // 暗いスタジオの光になじませる: 全体を冷たく落とし、右(逆光側)に青白いリム、左は暗く
      q.globalCompositeOperation = 'source-atop';
      q.fillStyle = 'rgba(30,42,70,.42)'; q.fillRect(0, 0, c.width, c.height);
      const rg = q.createLinearGradient(c.width * 0.55, 0, c.width, 0); rg.addColorStop(0, 'rgba(150,185,255,0)'); rg.addColorStop(1, 'rgba(150,185,255,.28)'); q.fillStyle = rg; q.fillRect(0, 0, c.width, c.height);
      const lg = q.createLinearGradient(0, 0, c.width * 0.45, 0); lg.addColorStop(0, 'rgba(0,0,0,.25)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = lg; q.fillRect(0, 0, c.width, c.height);
      // 下端は闇に溶かす（画像の切れ目を見せない）
      q.globalCompositeOperation = 'destination-out';
      const bg2 = q.createLinearGradient(0, c.height * 0.72, 0, c.height); bg2.addColorStop(0, 'rgba(0,0,0,0)'); bg2.addColorStop(1, 'rgba(0,0,0,1)'); q.fillStyle = bg2; q.fillRect(0, 0, c.width, c.height);
      q.globalCompositeOperation = 'source-over';
    }
  };
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (bgCv) { bgCv.width = cv.width; bgCv.height = cv.height; }
    st3?.resize(W, H, dpr);
    buildOff();
  };
  resize();
  Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero')]).then(([b, h]) => {
    if (destroyedFlag) return;
    imgBg = b; imgHero = use3d ? h : null; // 実写頭部は3D(髪のみ3D)モードでだけ使う。2Dフォールバックは従来のおじさん
    buildOff(); st3?.setPhoto(!!imgHero);
  });
  window.addEventListener('resize', resize);

  // ---- 状態 ----
  let phase: 'ready' | 'play' | 'over' = 'ready';
  let t = 0;                 // ゲーム内秒(スロー影響なし=生存秒)
  let real = 0;              // 総実時間
  let startMs = 0;
  let stress = 0, dmg = 0, fatigue = 0;
  let want = false, holdDur = 0, ramp = 0, relCd = 0, holding = false;
  let lastDir = 1, handT = 0, handShake = 0;
  let gusts: Gust[] = [];
  let nextEnd = 0;
  let warned = new Set<Gust>();
  let whooshAcc = 0, painAcc = 0;
  let shake = 0, flash = 0, zoom = 1;
  let overT = 0, overWhy = '', timeScale = 1, finished = false;
  let wind = 0;
  let holdTotal = 0, maxWind = 0, maxStress = 0, peakDmg = 0, slaps = 0, nearMiss = 0, danger = false;
  const parts: Part[] = [];
  let hint = '', hintT = 0;
  let raf = 0;

  const hairNodes: Node[] = [];
  let detached = false;

  // レイアウト
  const L = () => {
    const h = Math.min(W * 1.2, H * 0.58), hr = 0.19 * h;
    const hcy = H * 0.5, cx = W / 2;
    if (heroOff) { const S = heroS, rx = cx + (ROOT_FX - 0.52) * S, ry = H * 0.34; return { h, hr, hcy, cx, rx, ry, uy: hcy + 0.31 * h }; }
    return { h, hr, hcy, cx, rx: cx, ry: hcy - hr * 0.95, uy: hcy + 0.31 * h };
  };
  const segLen = () => L().hr * 0.11;
  const initHair = () => {
    hairNodes.length = 0; const l = L(), s = segLen();
    for (let i = 0; i < CFG.hairNodes; i++) hairNodes.push({ x: l.rx, y: l.ry - i * s, px: l.rx, py: l.ry - i * s });
  };
  initHair();

  // ---- 風 ----
  function genGusts(upTo: number) {
    while (nextEnd < upTo) {
      const prog = 1 - Math.exp(-nextEnd / CFG.rampTau);
      let s: number, peak: number;
      if (gusts.length === 0) { s = CFG.firstGustAt; peak = CFG.firstGustPeak; }
      else {
        s = nextEnd + lerp(CFG.gapStart, CFG.gapEnd, prog) * (0.8 + Math.random() * 0.5);
        peak = Math.random() < CFG.weakChance * (1 - prog * 0.5) ? 0.12 + Math.random() * 0.15
          : CFG.peakStart + (CFG.peakEnd - CFG.peakStart) * prog * (0.6 + Math.random() * 0.4);
      }
      const d = CFG.durMin + Math.random() * (CFG.durMax - CFG.durMin);
      const prev = gusts[gusts.length - 1];
      const dir = gusts.length === 0 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.6 ? -prev.dir : prev.dir);
      gusts.push({ s, d, peak: Math.min(1, peak), dir }); nextEnd = s + d;
    }
  }
  function windAt(tt: number) {
    let w = Math.sin(tt * 0.9) * CFG.breeze;
    for (const q of gusts) if (tt >= q.s && tt <= q.s + q.d) { const k = Math.sin(Math.PI * (tt - q.s) / q.d); w += q.dir * q.peak * k * k; }
    return clamp(w, -1, 1.1);
  }

  // ---- 入力 ----
  const press = () => {
    if (finished || phase === 'over') return;
    if (phase === 'ready') {
      audio.unlock(); ctx.started(); phase = 'play'; startMs = performance.now();
      audio.startBgm(CFG.bgmKind, CFG.bgmTempo);
      genGusts(8);
    }
    if (!want) { want = true; if (relCd <= 0) { slaps++; dmg += CFG.dmgSlap; audio.sfx('tap'); } }
  };
  const release = () => {
    if (!want) return; want = false;
    if (holding) { relCd = CFG.releaseCooldown; stress += CFG.releaseJerk * Math.abs(wind) * 4; audio.sfx('pop'); }
  };
  const pd = (e: PointerEvent) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch { /* */ } press(); };
  const pu = (e: PointerEvent) => { e.preventDefault(); release(); };
  const kd = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); press(); } };
  const ku = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); release(); } };
  const noCtx = (e: Event) => e.preventDefault();
  cv.addEventListener('pointerdown', pd); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', pu);
  cv.addEventListener('contextmenu', noCtx);
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  // ---- パーティクル ----
  const addP = (p: Partial<Part> & { k: PKind }) => { if (parts.length < 260) parts.push({ x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1, rot: 0, vr: 0, size: 6, c: '#fff', ...p }); };
  function spawnLeaf(w: number) {
    const dir = w >= 0 ? 1 : -1, trash = Math.random() < 0.3;
    addP({ k: trash ? 'trash' : 'leaf', x: dir > 0 ? -20 : W + 20, y: Math.random() * H * 0.85, vx: dir * (120 + Math.random() * 200), vy: (Math.random() - 0.5) * 60,
      life: 6, max: 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, size: 8 + Math.random() * 8, c: bgOff ? ['#8a8f99', '#a9a49a', '#6f747d'][Math.floor(Math.random() * 3)] : trash ? ['#ddd', '#9bd', '#fc8'][Math.floor(Math.random() * 3)] : ['#6c3', '#9c3', '#d83'][Math.floor(Math.random() * 3)] });
  }
  function spawnLine(w: number) {
    const dir = w >= 0 ? 1 : -1;
    addP({ k: 'line', x: dir > 0 ? -60 : W + 60, y: Math.random() * H, vx: dir * (700 + Math.abs(w) * 900), life: 1.2, max: 1.2, size: 40 + Math.abs(w) * 90, c: '#fff' });
  }
  function burstSweat(n: number, dir: number) {
    const l = L();
    for (let i = 0; i < n; i++) addP({ k: 'sweat', x: l.cx + (Math.random() - 0.5) * l.hr * 2, y: l.hcy - l.hr * 0.4 + Math.random() * l.hr * 0.6, vx: dir * (60 + Math.random() * 160) + (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 120, life: 0.8, max: 0.8, size: 3 + Math.random() * 3, c: '#9fe0ff' });
  }

  // ---- 更新 ----
  const wavePreview = () => windAt(t + 0.7);
  let leafAcc = 0, lineAcc = 0, sweatAcc = 0;

  function stepSim(dt: number) {
    // dt: スケール済み
    if (phase === 'play') {
      const rdt = dt; // 通常時 timeScale=1
      t += rdt; genGusts(t + 4);
      wind = windAt(t);
      if (Math.abs(wind) > 0.04) lastDir = wind > 0 ? 1 : -1;
      relCd = Math.max(0, relCd - rdt);
      maxWind = Math.max(maxWind, Math.abs(wind));
      holding = want && relCd <= 0;
      if (holding) { holdDur += rdt; ramp = Math.min(1, ramp + rdt / CFG.pressRamp); }
      else { holdDur = 0; ramp = Math.max(0, ramp - rdt * 8); }
      // 疲労
      fatigue = clamp(fatigue + (holding ? CFG.fatigueUp : -CFG.fatigueDown) * rdt);
      const eff = ramp * (1 - CFG.fatigueEffect * fatigue);
      const aw = Math.abs(wind);
      // 抜けゲージ
      let ds = CFG.windStress * Math.pow(aw, CFG.windPow) * (1 - CFG.holdBlock * eff);
      if (aw < CFG.calmLevel) ds -= CFG.calmRecover * (1 - aw / CFG.calmLevel * 0.5);
      if (holding) ds -= CFG.holdRelief * eff;
      stress = clamp(stress + ds * rdt);
      // 頭皮ダメージ
      if (holding) dmg += (CFG.dmgBase + CFG.dmgGrow * holdDur) * rdt * (0.4 + 0.6 * ramp);
      else dmg -= CFG.dmgRecover * rdt;
      dmg = clamp(dmg, 0, 1.2);
      // 風音間引き
      if (aw > 0.22) { whooshAcc -= rdt; if (whooshAcc <= 0) { audio.sfx('whoosh', Math.floor(aw * 4)); whooshAcc = lerp(1.1, 0.3, clamp(aw)); } }
      // 痛み声
      if (dmg > 0.6 && holding) { painAcc -= rdt; if (painAcc <= 0) { audio.sfx('squeak', 1); painAcc = 0.5; shake = Math.max(shake, 3); } }
      // 予兆
      for (const q of gusts) if (!warned.has(q) && t >= q.s - CFG.gustWarn && t < q.s + q.d * 0.5) {
        warned.add(q);
        if (q.peak > 0.55) audio.sfx('alarm');
        if (q.peak > 0.2) { hint = q.peak > 0.7 ? '大突風くる！' : '突風くる！'; hintT = 1.1; }
      }
      // 汗
      sweatAcc += rdt * Math.max(0, stress - 0.25) * 14;
      while (sweatAcc >= 1) { sweatAcc -= 1; burstSweat(1, -lastDir); }
      if (aw > 0.75 && Math.random() < rdt * 3) burstSweat(5, -wind / aw);
      if (holding) holdTotal += rdt;
      maxStress = Math.max(maxStress, stress); peakDmg = Math.max(peakDmg, dmg);
      if (stress > 0.88) danger = true; else if (danger && stress < 0.4) { danger = false; nearMiss++; }
      if (stress >= 1 || dmg >= 1) gameOver(stress >= 1 ? '抜けた！' : '頭皮が…！');
    }
    // 予兆パーティクル(時間はスローの影響を受ける)
    const pw = phase === 'play' ? windAt(t + 0.9) : wind * 0.6;
    leafAcc += dt * (1.2 + Math.abs(pw) * 9); lineAcc += dt * Math.abs(wind) * 26;
    while (leafAcc >= 1) { leafAcc -= 1; if (Math.abs(pw) > 0.12) spawnLeaf(pw); }
    while (lineAcc >= 1) { lineAcc -= 1; spawnLine(wind); }
    stepHair(dt);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0 || p.x < -80 || p.x > W + 80 || p.y > H + 60) { parts.splice(i, 1); continue; }
      if (p.k === 'sweat') p.vy += 700 * dt;
      if (p.k === 'hair') { p.vy += 260 * dt; p.vx += wind * 400 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.k === 'leaf' || p.k === 'trash') p.y += Math.sin(real * 6 + p.rot) * 30 * dt;
    }
  }

  function stepHair(dt: number) {
    const l = L(), s = segLen(), n = hairNodes.length;
    const steps = Math.max(1, Math.round(dt / (1 / 120))), h = dt / steps;
    const aw = Math.abs(wind);
    const eff = ramp * (1 - CFG.fatigueEffect * fatigue);
    // 根元の引っ張られ(ストレス)
    const jitter = phase === 'play' ? stress * 3 : 0;
    const rootX = l.rx + (Math.random() - 0.5) * jitter * stress, rootY = l.ry - stress * 3 + (Math.random() - 0.5) * jitter * stress;
    for (let it = 0; it < steps; it++) {
      for (let i = 0; i < n; i++) {
        const nd = hairNodes[i];
        if (i === 0 && !detached) { nd.x = rootX; nd.y = rootY; nd.px = nd.x; nd.py = nd.y; continue; }
        const vx = (nd.x - nd.px) * CFG.damping, vy = (nd.y - nd.py) * CFG.damping;
        nd.px = nd.x; nd.py = nd.y;
        const k = i / (n - 1);
        const flutter = Math.sin(real * 18 + i * 1.3) * 0.25 * aw;
        const ax = (wind * (0.5 + 0.9 * k) + flutter) * CFG.windForce * (l.hr / 80);
        const ay = 120 * (l.hr / 80) + Math.sin(real * 13 + i) * 200 * aw * (l.hr / 80);
        nd.x += vx + ax * h * h; nd.y += vy + ay * h * h;
        if (!detached) {
          // 立ち上がろうとする力
          const tx = l.rx, ty = l.ry - i * s;
          nd.x += (tx - nd.x) * CFG.hairStiff * (1 - k * 0.3); nd.y += (ty - nd.y) * CFG.hairStiff * (1 - k * 0.3);
          // 押さえ: 頭皮に沿って寝かせる
          if (eff > 0.02) {
            const dx = lastDir * i * s * 0.95, dy = i * s * 0.12;
            const pull = 0.35 * eff;
            nd.x += (l.rx + dx - nd.x) * pull; nd.y += (l.ry + dy - nd.y) * pull;
          }
        }
      }
      for (let r = 0; r < 6; r++) {
        for (let i = 0; i < n - 1; i++) {
          const a = hairNodes[i], b = hairNodes[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, diff = (d - s) / d;
          const pinned = i === 0 && !detached;
          if (pinned) { b.x -= dx * diff; b.y -= dy * diff; }
          else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
        }
      }
    }
  }

  function gameOver(why: string) {
    if (phase !== 'play') return;
    phase = 'over'; overWhy = why; overT = 0; want = false; holding = false;
    detached = true;
    const hn = hairNodes[0]; hn.px = hn.x + wind * 6 + (Math.random() - 0.5) * 3; hn.py = hn.y + 14;
    audio.stopBgm(); audio.sfx('scream', 2); audio.sfx('gameover');
    shake = 14; flash = 1;
    const l = L();
    for (let i = 0; i < 26; i++) addP({ k: 'hair', x: l.rx + (Math.random() - 0.5) * 20, y: l.ry, vx: (Math.random() - 0.5) * 200 + wind * 400, vy: -100 - Math.random() * 300, life: 2.5, max: 2.5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, size: 8 + Math.random() * 14, c: '#3b2a20' });
    burstSweat(30, wind >= 0 ? 1 : -1);
  }

  // ---- 描画 ----
  function drawBg() {
    if (bgOff) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bgOff, 0, 0); g.restore(); }
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#173a63'); gr.addColorStop(1, '#2e6f9e');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    // 雲
    g.fillStyle = 'rgba(255,255,255,.07)';
    if (!bgOff) for (let i = 0; i < 4; i++) { const x = ((real * (20 + i * 10) * (wind >= 0 ? 1 : -1) + i * 160) % (W + 200) + W + 200) % (W + 200) - 100; g.beginPath(); g.ellipse(x, 90 + i * 70, 90, 22, 0, 0, 7); g.fill(); }
    // 警告の縁
    const pw = phase === 'play' ? windAt(t + CFG.gustWarn) : 0;
    if (phase === 'play' && Math.abs(pw) > 0.35 && Math.abs(wind) < Math.abs(pw)) {
      const side = pw > 0 ? 0 : W, a = (0.25 + 0.2 * Math.sin(real * 18)) * clamp(Math.abs(pw));
      const gg = g.createLinearGradient(side, 0, side + (pw > 0 ? 1 : -1) * 140, 0);
      gg.addColorStop(0, `rgba(255,70,70,${a})`); gg.addColorStop(1, 'rgba(255,70,70,0)');
      g.fillStyle = gg; g.fillRect(0, 0, W, H);
    }
  }
  function drawParts() {
    for (const p of parts) {
      if (use3d && p.k === 'hair') continue;
      const a = clamp(p.life / p.max * 3);
      g.save(); g.globalAlpha = a; g.translate(p.x, p.y);
      if (p.k === 'line') { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.sign(p.vx) * p.size, 0); g.stroke(); }
      else if (p.k === 'leaf') { g.rotate(p.rot); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(-p.size, 0); g.lineTo(p.size, 0); g.stroke(); }
      else if (p.k === 'trash') { g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.size * 0.6, -p.size * 0.5, p.size * 1.2, p.size); g.strokeStyle = 'rgba(0,0,0,.4)'; g.strokeRect(-p.size * 0.6, -p.size * 0.5, p.size * 1.2, p.size); }
      else if (p.k === 'sweat') { g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, p.size * 0.7, p.size, 0, 0, 7); g.fill(); }
      else if (p.k === 'hair') { g.rotate(p.rot); g.strokeStyle = p.c; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-p.size, 0); g.quadraticCurveTo(0, p.size * 0.6, p.size, -2); g.stroke(); }
      g.restore();
    }
  }
  function drawHair() {
    const l = L(), n = hairNodes.length;
    const col = stress > 0.7 ? '#7a2a1a' : '#3b2a20';
    g.lineCap = 'round'; g.lineJoin = 'round';
    // 根元の皮膚が引っ張られる
    if (!detached && stress > 0.15) {
      g.fillStyle = 'rgba(255,120,110,' + (0.25 + stress * 0.5) + ')';
      g.beginPath(); g.ellipse(l.rx, l.ry + 2, 5 + stress * 8, 3 + stress * 4, 0, 0, 7); g.fill();
    }
    for (let i = 0; i < n - 1; i++) {
      const a = hairNodes[i], b = hairNodes[i + 1];
      g.strokeStyle = col; g.lineWidth = lerp(6, 2.5, i / (n - 1));
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    if (!detached) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(hairNodes[0].x + 1, hairNodes[0].y); for (let i = 1; i < n; i++) g.lineTo(hairNodes[i].x + 1, hairNodes[i].y); g.stroke(); }
  }
  function drawHand() {
    const l = L();
    const target = holding || (want && relCd <= 0) ? 1 : 0;
    handT += (target - handT) * 0.3;
    if (phase === 'over') handT *= 0.9;
    const restX = l.cx + lastDir * l.hr * 2.1, restY = l.ry + l.hr * 2.2;
    const shk = fatigue * fatigue * 5 + (dmg > 0.5 ? 2 : 0);
    const px = l.rx + lastDir * l.hr * 0.4 + (Math.random() - 0.5) * shk, py = l.ry - l.hr * 0.12 + (Math.random() - 0.5) * shk + handT * 0;
    const x = lerp(restX, px, handT), y = lerp(restY, py, handT);
    const sz = l.hr * 0.5;
    const hurt = clamp(dmg), tire = fatigue;
    g.save(); g.translate(x, y); g.rotate(lastDir * (0.25 - handT * 0.25)); g.globalAlpha = 0.55 + handT * 0.45;
    const skin = `rgb(${246},${Math.round(201 - hurt * 90 - tire * 20)},${Math.round(160 - hurt * 90)})`;
    g.fillStyle = skin; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2;
    for (let f = -2; f <= 1; f++) { g.beginPath(); g.ellipse(f * sz * 0.4 + sz * 0.2, -sz * 0.6, sz * 0.19, sz * 0.5, 0, 0, 7); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(0, 0, sz * 0.95, sz * 0.62, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(-lastDir * sz * 0.9, sz * 0.1, sz * 0.5, sz * 0.2, -lastDir * 0.5, 0, 7); g.fill(); g.stroke();
    g.restore();
  }
  function exprNow(): Expr {
    if (phase === 'over') return overT > 1.2 ? 'dead' : 'cry';
    const lv = Math.max(stress, dmg * 0.95);
    if (dmg > 0.45 && dmg >= stress) return 'angry';
    if (lv < 0.18) return 'happy';
    if (lv < 0.42) return 'sweat';
    if (lv < 0.72) return 'scared';
    return 'cry';
  }
  function drawGauge(x: number, y: number, w: number, h: number, v: number, label: string, c1: string, c2: string, icon: string) {
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    const fw = Math.max(h, w * clamp(v)); const warn = v > 0.75 && Math.sin(real * 20) > 0;
    const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = warn ? '#fff' : gr; g.beginPath(); g.roundRect(x, y, v > 0.005 ? fw : 0, h, h / 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.stroke();
    g.font = '900 13px "Hiragino Sans", sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3;
    g.strokeText(icon + ' ' + label, x + 10, y + h / 2); g.fillText(icon + ' ' + label, x + 10, y + h / 2);
  }
  function text(s: string, x: number, y: number, size: number, fill = '#fff', stroke = '#000') {
    g.font = `900 ${size}px "Hiragino Sans", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size / 6); g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y);
  }

  const fr: HairFrame = {
    W: 0, H: 0, cx: 0, uy: 0, h: 0, rx: 0, ry: 0, hr: 0, zoom: 1, zx: 0, zy: 0, shX: 0, shY: 0, wind: 0, expr: 'idle', flail: 0, stress: 0, dmg: 0, fatigue: 0, real: 0,
    detached: false, over: false, overT: 0, nodes: hairNodes, hand: { x: 0, y: 0, rot: 0, t: 0, dir: 1 }, flying: [], nFlying: 0,
  };
  function handPose(l: ReturnType<typeof L>) {
    const target = holding || (want && relCd <= 0) ? 1 : 0;
    handT += (target - handT) * 0.3;
    if (phase === 'over') handT *= 0.9;
    const restX = l.cx + lastDir * l.hr * 2.1, restY = l.ry + l.hr * 2.2;
    const shk = fatigue * fatigue * 5 + (dmg > 0.5 ? 2 : 0);
    const px = l.rx + lastDir * l.hr * 0.4 + (Math.random() - 0.5) * shk, py = l.ry - l.hr * 0.12 + (Math.random() - 0.5) * shk;
    return { x: lerp(restX, px, handT), y: lerp(restY, py, handT) };
  }
  /** 実写の頭部。3D側(髪)と同じズーム/揺れ変換を掛け、頭頂(髪の根元)を支点に風で傾ける。 */
  function drawPhoto(l: ReturnType<typeof L>, sx: number, sy: number) {
    if (!heroOff) return;
    const S = heroS, pain = clamp(dmg), over = phase === 'over' ? clamp(overT / 0.5) : 0;
    g.save();
    g.translate(sx, sy); g.translate(l.cx, l.hcy - l.hr * 0.3); g.scale(zoom, zoom); g.translate(-l.cx, -(l.hcy - l.hr * 0.3));
    g.translate(l.rx, l.ry + handT * 3);
    g.rotate(wind * 0.05 - pain * 0.02 + over * (0.08 + Math.sin(real * 9) * 0.02) + (fatigue * fatigue) * Math.sin(real * 40) * 0.004);
    g.drawImage(heroOff, -ROOT_FX * S, -ROOT_FY * S, S, S);
    // 頭皮の痛み/引っ張られの赤み（根元まわり）
    const red = clamp(Math.max(stress * 0.6, dmg));
    if (red > 0.05) {
      const rg = g.createRadialGradient(0, 8, 2, 0, 8, S * 0.11); rg.addColorStop(0, `rgba(255,70,60,${red * 0.5})`); rg.addColorStop(1, 'rgba(255,70,60,0)');
      g.fillStyle = rg; g.fillRect(-S * 0.12, -S * 0.08, S * 0.24, S * 0.24);
    }
    g.restore();
  }
  function render3d(l: ReturnType<typeof L>, sx: number, sy: number) {
    const hp = handPose(l);
    fr.W = W; fr.H = H; fr.cx = l.cx; fr.uy = l.uy; fr.h = l.h; fr.rx = l.rx; fr.ry = l.ry; fr.hr = l.hr;
    fr.zoom = zoom; fr.zx = l.cx; fr.zy = l.hcy - l.hr * 0.3; fr.shX = sx; fr.shY = sy;
    fr.wind = wind; fr.expr = exprNow(); fr.flail = phase === 'over' ? 0.8 : stress > 0.6 ? 0.25 : 0;
    fr.stress = stress; fr.dmg = dmg; fr.fatigue = fatigue; fr.real = real; fr.detached = detached; fr.over = phase === 'over'; fr.overT = overT;
    fr.hand.x = hp.x; fr.hand.y = hp.y; fr.hand.t = handT; fr.hand.dir = lastDir;
    let n = 0;
    for (const p of parts) if (p.k === 'hair' && n < 32) { let q = fr.flying[n]; if (!q) q = fr.flying[n] = { x: 0, y: 0, rot: 0, size: 0, a: 1 }; q.x = p.x; q.y = p.y; q.rot = p.rot; q.size = p.size; q.a = clamp(p.life / p.max * 3); n++; }
    fr.nFlying = n;
    st3!.render(fr);
  }

  function render() {
    const l = L();
    const sx = (Math.random() - 0.5) * shake * 2, sy = (Math.random() - 0.5) * shake * 2;
    if (use3d && st3 && gBg) {
      g = gBg; g.setTransform(dpr, 0, 0, dpr, 0, 0); drawBg();
      drawPhoto(l, sx, sy);
      render3d(l, sx, sy);
      g = gTop; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!use3d) {
      drawBg();
      g.save();
      g.translate(sx, sy);
      g.translate(l.cx, l.hcy - l.hr * 0.3); g.scale(zoom, zoom); g.translate(-l.cx, -(l.hcy - l.hr * 0.3));
      // 風に合わせて体をわずかに傾ける
      drawUncle(g, { x: l.cx, y: l.uy, h: l.h, rot: wind * 0.04, expr: exprNow(), t: real, bald: true, hairLen: 0, flail: phase === 'over' ? 0.8 : stress > 0.6 ? 0.25 : 0 });
      drawHair();
      drawHand();
      g.restore();
    }
    drawParts();
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.6})`; g.fillRect(0, 0, W, H); }
    // HUD
    const gw = W - 32;
    drawGauge(16, 14, gw, 24, stress, '抜けそう', '#ffb347', '#ff2e4d', '🌿');
    drawGauge(16, 44, gw, 24, dmg, '頭皮が痛い', '#c58bff', '#ff3df2', '✋');
    // 手の疲れ(細)
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(16, 74, gw, 6); g.fillStyle = fatigue > 0.7 ? '#ff8' : '#8fe3ff'; g.fillRect(16, 74, gw * fatigue, 6);
    g.font = '700 10px sans-serif'; g.textAlign = 'right'; g.fillStyle = '#cfe'; g.fillText('手の疲れ', W - 16, 90);
    const sec = phase === 'over' ? lastScore : t;
    text(sec.toFixed(1) + '秒', W / 2, 118, 34, '#fff');
    // 風表示
    if (phase !== 'ready') {
      const aw = Math.abs(wind), arrow = wind >= 0 ? '▶' : '◀';
      const pw = windAt(t + CFG.gustWarn);
      if (phase === 'play' && Math.abs(pw) > 0.3 && Math.abs(wind) < Math.abs(pw) - 0.1) {
        const blink = Math.sin(real * 16) > -0.3;
        if (blink) text('⚠ ' + (pw > 0 ? '▶▶' : '◀◀') + ' 突風', W / 2, H * 0.2, 26, '#ff5', '#a00');
      } else if (aw > 0.15) text(arrow.repeat(1 + Math.floor(aw * 3)), W / 2, H * 0.2, 24, '#bdf', '#036');
    }
    if (hintT > 0 && phase === 'play') { g.globalAlpha = clamp(hintT * 2); text(hint, W / 2, H * 0.27, 22, '#fff', '#c20'); g.globalAlpha = 1; }
    if (phase === 'play' && t < 4 && !want) text('長押しで髪を押さえろ！', W / 2, H * 0.78, 22, '#fff', '#036');
    if (phase === 'play' && dmg > 0.55 && holding) text('押さえすぎ！離して！', W / 2, H * 0.83, 22, '#fff', '#a0f');
    if (phase === 'play' && stress > 0.65 && !holding) text('抜ける！押さえて！', W / 2, H * 0.83, 22, '#ff0', '#a00');
    if (phase === 'ready') {
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H * 0.7, W, 120);
      text('タップで開始', W / 2, H * 0.74, 28);
      text('長押し＝押さえる ／ 離す＝引っ張られる', W / 2, H * 0.80, 14, '#fff', '#036');
    }
    if (phase === 'over') {
      if (overT > 0.15) drawBubble(g, 'ギャアアア！', l.cx + l.hr * 1.2, l.hcy - l.hr * 1.2, 26);
      if (overT > 0.6) text(overWhy, W / 2, H * 0.72, 40, '#ff4', '#a00');
    }
  }
  let lastScore = 0;

  function buildArt(sec: number): ResultArt {
    const byDmg = overWhy.startsWith('頭皮'), ratio = sec > 0 ? holdTotal / sec : 0, mph = Math.round(maxWind * 30);
    const endWind = wind, dir = endWind >= 0 ? 1 : -1, strong = Math.abs(endWind) > 0.7;
    let rare: string | undefined;
    if (sec >= 30 && peakDmg < 0.6 && ratio >= 0.3) rare = 'regrow';
    else if (sec >= 25 && maxWind >= 0.95) rare = 'windmaster';
    else if (nearMiss >= 2 && sec >= 15) rare = 'miracle';
    else if (!byDmg && strong && sec >= 8) rare = 'flyaway';
    type V = 'last' | 'sideways' | 'tangled' | 'flyaway' | 'regrow';
    const variant: V = rare === 'regrow' ? 'regrow' : byDmg ? 'tangled' : (rare === 'flyaway' || strong) ? 'flyaway' : sec < 6 ? 'last' : 'sideways';
    let title: string, comment: string;
    if (rare === 'regrow') { title = '奇跡の増毛おじさん'; comment = '押さえ続けたら、なぜか毛が増えた。'; }
    else if (rare === 'windmaster') { title = '風速30mに勝った頭'; comment = '台風級の突風を耐えた伝説の一本。'; }
    else if (rare === 'miracle') { title = '奇跡の一本毛'; comment = `ぎりぎりを${nearMiss}回くぐり抜けた。`; }
    else if (rare === 'flyaway') { title = '飛んでいった毛'; comment = '抜けた瞬間は、とても綺麗だった。'; }
    else if (byDmg && slaps >= 12) { title = '連打で頭皮炎上'; comment = 'ペチペチ叩きすぎです。'; }
    else if (byDmg && ratio > 0.8) { title = '押さえっぱなしの手'; comment = '守ろうとして、頭皮を壊した。'; }
    else if (byDmg) { title = '頭皮の拷問官'; comment = '愛が重すぎた。髪より頭皮が先に泣いた。'; }
    else if (ratio < 0.15) { title = '風まかせの男'; comment = '手を使おう。手は飾りじゃない。'; }
    else if (sec < 5) { title = '最後の一本を失った男'; comment = '別れは突然やってくる。'; }
    else if (sec < 12) { title = '毛根の見習い'; comment = '風に負けた。まだ伸びしろはある。'; }
    else if (sec < 20) { title = '毛根の戦士'; comment = '風と戦える頭になってきた。'; }
    else if (sec < 30) { title = '風を読む男'; comment = '予兆を見抜いている。'; }
    else { title = '毛根の守護神'; comment = '最後の一本、まだ誇らしく揺れている。'; }
    const s1 = sec.toFixed(1);
    const facts = [
      { label: '生存秒', value: s1 + '秒' }, { label: '最大風速', value: mph + 'm/s' },
      { label: '押さえ率', value: Math.round(ratio * 100) + '%' }, { label: '頭皮ダメージ最大', value: Math.round(Math.min(1, peakDmg) * 100) + '%' },
      { label: '抜け寸前', value: nearMiss + '回' }, { label: '終了原因', value: overWhy },
    ];
    const draw = (gg: CanvasRenderingContext2D, w: number, h: number, tt: number) => artDraw(gg, w, h, tt, variant, dir, sec, mph, title, byDmg, maxStress);
    return { title, comment, facts, rare, draw, postVariants: [
      `最後の一本を${s1}秒守りました！称号は「${title}」`, `風速${mph}mの突風の中、毛根が${s1}秒がんばった。「${title}」`, `${overWhy} ${s1}秒で散った…「${title}」 #ハゲを守れ`,
    ] };
  }

  // ---- ループ ----
  let last = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const rdt = Math.min(0.05, (now - last) / 1000); last = now; real += rdt;
    if (phase === 'over') {
      overT += rdt;
      timeScale = overT < 1.4 ? CFG.slowmoScale : lerp(CFG.slowmoScale, 0.6, clamp((overT - 1.4) / 0.6));
      zoom = lerp(1, 1.55, clamp(overT / 0.7));
      if (overT >= CFG.overDuration && !finished) {
        finished = true;
        const s = Math.round(lastScore * 10) / 10;
        const durationMs = Math.round(lastScore * 1000);
        ctx.finish({ score: s, scoreText: `${s.toFixed(1)}秒`, shareText: `最後の一本を${s.toFixed(1)}秒守りました！`, durationMs, detail: overWhy, art: buildArt(s) });
      }
    }
    if (phase === 'play') lastScore = t;
    shake = Math.max(0, shake - rdt * 20); flash = Math.max(0, flash - rdt * 2.5); hintT = Math.max(0, hintT - rdt);
    if (phase !== 'ready') stepSim(rdt * (phase === 'over' ? timeScale : 1));
    else { wind = Math.sin(real) * 0.05; stepHair(rdt); }
    if (phase === 'play') lastScore = t;
    render();
  };
  raf = requestAnimationFrame(loop);
  void startMs;

  if (location.pathname.includes('dev')) (window as unknown as Record<string, unknown>).__hair = { get use3d() { return use3d; }, get phase() { return phase; }, get stress() { return stress; }, get dmg() { return dmg; } };

  return {
    destroy() {
      cancelAnimationFrame(raf); audio.stopBgm();
      window.removeEventListener('resize', resize); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      cv.removeEventListener('pointerdown', pd); cv.removeEventListener('pointerup', pu); cv.removeEventListener('pointercancel', pu);
      cv.removeEventListener('contextmenu', noCtx);
      cv.remove(); bgCv?.remove(); parts.length = 0; destroyedFlag = true; bgOff = null; heroOff = null; imgBg = null; imgHero = null;
      if (st3) { st3.dispose(); st3 = null; } use3d = false;
      delete (window as unknown as Record<string, unknown>).__hair;
    },
  };
}

const mod: GameModule = { meta, start };
export default mod;

import type { GameModule, GameContext, ResultArt } from '../../core/types';
import { meta } from './meta';
import { loadImg, drawCover } from '../../core/images';

import { NoseStage3D, newFaceP } from './face3d';
import { stageCfg, JUDGE, POINTS, COMBO, STAGE_BONUS, SPECIAL_MULT, LIVES, MIN_PULL, REACT_MS, BGM, HAIR, TITLE, type StageCfg } from './config';

type Grade = 'PERFECT' | 'GREAT' | 'OK' | 'MISS';
type Phase = 'idle' | 'pull' | 'react' | 'over';
type Shape = 'normal' | 'long' | 'spiral' | 'rainbow' | 'earth';
interface Rec { stage: number; grade: Grade; cm: number; shape: Shape; special: boolean; combo: number }
const SHAPE_NAME: Record<Shape, string> = { normal: '普通', long: '異常に長い', spiral: '螺旋', rainbow: '虹色', earth: '地球一周' };
const fmtCm = (cm: number) => cm >= 1e8 ? `${Math.round(cm / 1e5).toLocaleString()}km` : cm >= 100 ? `${(cm / 100).toFixed(1)}m` : `${cm.toFixed(1)}cm`;
const RANK: Record<Grade, number> = { MISS: 0, OK: 1, GREAT: 2, PERFECT: 3 };
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; sz: number; rot: number; tear?: boolean }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const GRADE_COL: Record<Grade, string> = { PERFECT: '#ffe14d', GREAT: '#5dffb0', OK: '#6fc3ff', MISS: '#ff5470' };

/** 押下時間→ゲージ位置（決定論的） */
export function gaugeAt(c: StageCfg, holdT: number): number {
  const u = holdT * c.speed;
  if (c.pingpong) { const m = u % 2; return m <= 1 ? m : 2 - m; }
  return Math.pow(Math.min(u, 1.5), c.accel);
}
export function zoneAt(c: StageCfg, holdT: number): number {
  const z = c.zoneC + c.moveAmp * Math.sin(holdT * c.moveFreq);
  return clamp(z, c.zoneW + 0.03, 1 - c.zoneW - 0.02);
}

function drawStrand(c: CanvasRenderingContext2D, x: number, y: number, len: number, shape: Shape, t: number, lw: number) {
  c.save(); c.lineCap = 'round'; c.lineWidth = lw;
  const n = 36;
  const pt = (f: number): [number, number] => {
    if (shape === 'spiral') return [x + Math.sin(f * 22 + t * 2) * len * 0.05, y + f * len];
    if (shape === 'long' || shape === 'earth') return [x + Math.sin(f * 9 + t) * len * 0.03, y + f * len];
    return [x + Math.sin(f * 4 + t) * len * 0.04, y + f * len];
  };
  for (let i = 0; i < n; i++) {
    const a = pt(i / n), b = pt((i + 1) / n);
    c.strokeStyle = shape === 'rainbow' ? `hsl(${(i / n * 360 + t * 90) % 360},90%,55%)` : shape === 'earth' ? `hsl(${150 + i * 3},60%,45%)` : '#1e140e';
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  c.restore();
}
function drawSpecimens(c: CanvasRenderingContext2D, w: number, h: number, t: number, rs: Rec[], title: string) {
  c.save();
  const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a1a3a'); bg.addColorStop(1, '#0f0a1a'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
  const u = Math.min(w, h), pad = u * 0.04;
  c.fillStyle = '#f4e6c8'; c.strokeStyle = '#c9a25a'; c.lineWidth = u * 0.012;
  c.beginPath(); c.roundRect(pad, pad, w - pad * 2, h - pad * 2, u * 0.03); c.fill(); c.stroke();
  c.fillStyle = '#5a3a1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${u * 0.06}px sans-serif`;
  c.fillText('鼻毛標本コレクション', w / 2, pad + u * 0.06);
  const top = pad + u * 0.12, bot = h - pad - u * 0.1;
  if (!rs.length) { c.font = `900 ${u * 0.05}px sans-serif`; c.fillText('標本なし', w / 2, h / 2); }
  else {
    const sorted = rs.slice().sort((a, b) => b.cm - a.cm), big = sorted[0], rest = sorted.slice(1, 9);
    const bigH = (bot - top) * (rest.length ? 0.58 : 0.9);
    // 最長を大きく(長さは見た目で圧縮)
    drawCase(c, pad * 2, top, w - pad * 4, bigH, big, t, u, true);
    if (rest.length) {
      const cols = Math.min(4, rest.length), rowsN = Math.ceil(rest.length / cols), y0 = top + bigH + pad, cw = (w - pad * 2 - pad * (cols + 1)) / cols, rh = (bot - y0 - pad * (rowsN - 1)) / rowsN;
      rest.forEach((r, i) => drawCase(c, pad * 2 + (i % cols) * (cw + pad) - pad * 0.5, y0 + Math.floor(i / cols) * (rh + pad), cw, rh, r, t, u * 0.6, false));
    }
  }
  c.fillStyle = '#ff5470'; c.font = `900 ${u * 0.055}px sans-serif`; c.fillText(`「${title}」`, w / 2, h - pad - u * 0.04);
  c.restore();
}
function drawCase(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: Rec, t: number, u: number, big: boolean) {
  c.save();
  c.fillStyle = '#fffaf0'; c.strokeStyle = '#a88a55'; c.lineWidth = 2; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke();
  const lab = h * 0.2, len = (h - lab - 14) * (r.shape === 'long' ? 1 : r.shape === 'earth' ? 1 : 0.85);
  drawStrand(c, x + w / 2, y + 8, len, r.shape, t, big ? 4 : 2.5);
  c.fillStyle = '#5a3a1a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `900 ${Math.max(10, u * (big ? 0.045 : 0.045))}px sans-serif`; c.fillText(`${fmtCm(r.cm)} ${SHAPE_NAME[r.shape]}`, x + w / 2, y + h - lab * 0.65);
  c.fillStyle = r.grade === 'PERFECT' ? '#d9a400' : r.grade === 'GREAT' ? '#1fa86a' : '#3a86d8';
  c.font = `900 ${Math.max(9, u * (big ? 0.035 : 0.04))}px sans-serif`; c.fillText(r.grade, x + w / 2, y + h - lab * 0.25);
  c.restore();
}

const mod: GameModule = {
  meta,
  start(ctx: GameContext) {
    const root = ctx.root, audio = ctx.audio;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none';
    const gTop = cv.getContext('2d')!;
    let g = gTop;
    let W = 0, H = 0, dpr = 1;
    // 3D描画（WebGL）。失敗したら従来の2D描画。重ね順: 背景2D → three → 前景2D(演出+HUD)
    let stage3d: NoseStage3D | null = null, bgCv: HTMLCanvasElement | null = null, gBg: CanvasRenderingContext2D | null = null, use3d = false;
    const fp = newFaceP();
    const disable3d = () => { use3d = false; if (bgCv) bgCv.style.display = 'none'; if (stage3d) stage3d.canvas.style.display = 'none'; g = gTop; };
    try {
      stage3d = new NoseStage3D(() => disable3d());
      bgCv = document.createElement('canvas'); bgCv.style.cssText = cv.style.cssText; gBg = bgCv.getContext('2d');
      stage3d.canvas.style.cssText = cv.style.cssText + ';pointer-events:none';
      if (!gBg) throw new Error('2d');
      root.append(bgCv, stage3d.canvas, cv); use3d = true;
    } catch { try { stage3d?.dispose(); } catch { /* ignore */ } stage3d = null; bgCv = null; gBg = null; use3d = false; root.appendChild(cv); }
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (bgCv) { bgCv.width = cv.width; bgCv.height = cv.height; }
      stage3d?.resize(W, H, dpr);
    };
    // ---- 生成画像（bg=洗面所背景 / hero=ピンセット / item=毛）。無ければ従来描画にフォールバック ----
    const SLUG = 'nosehair-pull';
    let imgBg: HTMLImageElement | null = null, imgTw: HTMLImageElement | null = null, imgFace: HTMLImageElement | null = null, blobOff: HTMLCanvasElement | null = null;
    let bgOff: HTMLCanvasElement | null = null, twShadow: HTMLCanvasElement | null = null;
    const buildBgOff = () => {
      if (!imgBg || !W) return;
      const c = bgOff ?? (bgOff = document.createElement('canvas')); c.width = cv.width; c.height = cv.height;
      const q = c.getContext('2d')!; q.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCover(q, imgBg, W, H, 0.5, 0.5);
      // 洗面台の明るい冷白光に合わせる: 上から薄い白、周辺をわずかに落とす
      const lg = q.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(1, 'rgba(30,45,70,.22)'); q.fillStyle = lg; q.fillRect(0, 0, W, H);
      const vg = q.createRadialGradient(W / 2, H * 0.4, W * 0.4, W / 2, H * 0.4, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,30,50,.28)'); q.fillStyle = vg; q.fillRect(0, 0, W, H);
    };
    resize();
    const onResize = () => { resize(); buildBgOff(); };
    window.addEventListener('resize', onResize);
    Promise.all([loadImg(SLUG, 'bg'), loadImg(SLUG, 'hero'), loadImg(SLUG, 'hero_face')]).then(([b, t, f]) => {
      if (destroyed) return;
      imgBg = b; imgTw = t; imgFace = f; buildBgOff();
      if (f) { // 赤み用のぼかし円（1回だけ作る）
        const c = blobOff = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d')!;
        const rg = q.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(225,50,60,1)'); rg.addColorStop(1, 'rgba(225,50,60,0)'); q.fillStyle = rg; q.fillRect(0, 0, 64, 64);
      }
      if (t) { // ピンセットの接地影（シルエットを1回だけ作る）
        const c = twShadow = document.createElement('canvas'); c.width = t.width; c.height = t.height;
        const q = c.getContext('2d')!; q.drawImage(t, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#1a2538'; q.fillRect(0, 0, c.width, c.height);
      }
    });

    // ---- 状態 ----
    let phase: Phase = 'idle', stage = 1, lives = LIVES, score = 0, combo = 0, plucked = 0;
    let cfg = stageCfg(stage), holdT = 0, gauge = 0, zone = cfg.zoneC;
    let startedFlag = false, startTime = 0, finished = false, destroyed = false;
    let reactT = 0, reactOk = false, reactGrade: Grade = 'MISS', reactKind: 'pluck' | 'early' | 'snap' = 'pluck', reactG = 0, reactMsg = '';
    let gainedPts = 0, popT = 0, shakeT = 0, flash = 0, time = 0, hint = 1, lastShownGauge = 0;
    let stageIntro = 1.2;
    const parts: Part[] = [];
    let tip = { x: 0, y: 0, vx: 0, vy: 0, rot: 0 }; // 抜けた毛の飛行
    let overTimer = 0;
    const recs: Rec[] = [];

    const pressHold = () => {
      if (finished || destroyed) return;
      audio.unlock();
      if (!startedFlag) { startedFlag = true; startTime = performance.now(); ctx.started(); audio.startBgm(BGM.kind, BGM.tempo); }
      if (phase !== 'idle') return;
      phase = 'pull'; holdT = 0; hint = 0; audio.sfx('tap');
    };
    const release = () => {
      if (phase !== 'pull') return;
      judge(false);
    };

    function judge(snapped: boolean) {
      const gg = gaugeAt(cfg, holdT), z = zoneAt(cfg, holdT);
      reactG = gg; phase = 'react'; reactT = 0; popT = 0;
      let grade: Grade = 'MISS';
      if (!snapped && gg >= MIN_PULL) {
        const r = Math.abs(gg - z) / cfg.zoneW;
        grade = r <= JUDGE.perfect ? 'PERFECT' : r <= JUDGE.great ? 'GREAT' : r <= JUDGE.ok ? 'OK' : 'MISS';
      }
      reactGrade = grade;
      if (grade !== 'MISS') {
        reactOk = true; reactKind = 'pluck'; combo++; plucked++;
        const mult = 1 + Math.min(combo - 1, COMBO.cap) * COMBO.step;
        gainedPts = Math.round((POINTS[grade] * (cfg.special ? SPECIAL_MULT : 1) + stage * STAGE_BONUS) * mult);
        score += gainedPts; reactMsg = grade;
        const cmv = (HAIR.base + stage * HAIR.perStage + gg * HAIR.perGauge) * (cfg.special ? HAIR.specialMult : 1);
        const shape: Shape = cfg.special && grade === 'PERFECT' ? 'earth' : cfg.special ? 'long' : grade === 'PERFECT' && combo >= 3 ? 'rainbow' : grade === 'OK' ? 'spiral' : 'normal';
        recs.push({ stage, grade, cm: shape === 'earth' ? HAIR.earthCm : cmv, shape, special: cfg.special, combo });
        audio.sfx('pop'); setTimeout(() => !destroyed && audio.sfx(combo >= 3 || grade === 'PERFECT' ? 'combo' : 'ok'), 90);
        shakeT = 0.35; flash = grade === 'PERFECT' ? 1 : 0.6;
        const p = tipPos(reactG, 0);
        tip = { x: p.x, y: p.y, vx: -120, vy: -520, rot: 0 };
        confetti(p.x, p.y, grade === 'PERFECT' ? 70 : 40);
      } else {
        reactOk = false; combo = 0; lives--; gainedPts = 0;
        reactKind = snapped || gg > z ? 'snap' : 'early';
        if (gg < MIN_PULL) reactKind = 'early';
        reactMsg = snapped ? '切れた！' : gg < MIN_PULL ? 'すっぽ抜け' : gg < z ? '早すぎ！' : '遅すぎ！';
        audio.sfx('ng'); setTimeout(() => !destroyed && audio.sfx('boing'), 120);
        shakeT = 0.4;
      }
    }

    function nextStage() {
      if (lives <= 0) { phase = 'over'; overTimer = 0; audio.sfx('gameover'); audio.stopBgm(); return; }
      if (reactOk) stage++;
      cfg = stageCfg(stage); phase = 'idle'; holdT = 0; gauge = 0; zone = cfg.zoneC; stageIntro = 1.4;
    }

    function makeArt(): ResultArt {
      const rs = recs.slice();
      const longest = rs.reduce<Rec | null>((a, r) => (!a || r.cm > a.cm ? r : a), null);
      const best = rs.reduce<Grade>((a, r) => (RANK[r.grade] > RANK[a] ? r.grade : a), 'MISS');
      const nPerf = rs.filter(r => r.grade === 'PERFECT').length;
      const has = (sh: Shape) => rs.some(r => r.shape === sh);
      let title: string, comment: string, rare: string | undefined;
      if (has('earth')) { title = '鼻から出た世界遺産'; comment = '鼻毛が地球を一周しました。国連が調査に入ります。'; rare = 'earth'; }
      else if (longest && longest.cm >= 100) { title = 'もはやロープ'; comment = '登山に使えるレベルの鼻毛。'; rare = 'rope'; }
      else if (has('rainbow')) { title = '七色の鼻毛使い'; comment = '完璧を重ねた鼻毛は虹色に輝く。'; rare = 'rainbow'; }
      else if (has('spiral')) { title = 'くるくる鼻毛マイスター'; comment = 'きわどい引き際で螺旋の鼻毛を獲得。'; rare = 'spiral'; }
      else if (rs.length >= TITLE.legendPlucked && nPerf >= TITLE.legendPerfect) { title = '鼻毛界のレジェンド'; comment = '指先が鼻毛の声を聞いている。'; }
      else if (nPerf >= 3) { title = '鼻毛ソムリエ'; comment = '引き際を知る男。'; }
      else if (rs.length >= 8) { title = '鼻毛コレクター'; comment = '標本ケースが足りない。'; }
      else if (rs.length >= 5) { title = '鼻毛職人'; comment = 'もう痛みを感じていない。'; }
      else if (rs.length >= 3) { title = '鼻毛の見習い'; comment = '涙の数だけ強くなる。'; }
      else if (rs.length >= 1) { title = 'ちょい抜き初心者'; comment = '最初の一本は忘れられない痛み。'; }
      else { title = '鼻毛に愛された男'; comment = '1本も抜けず。鼻毛は守られた。'; }
      const bestPct: Record<Grade, string> = { PERFECT: 'PERFECT', GREAT: 'GREAT', OK: 'OK', MISS: '-' };
      const facts = [
        { label: '抜いた本数', value: `${rs.length}本` },
        { label: '最長の鼻毛', value: longest ? fmtCm(longest.cm) : '-' },
        { label: '最高精度', value: bestPct[best] },
      ];
      const sc = score;
      const draw = (c: CanvasRenderingContext2D, w: number, h: number, t: number) => drawSpecimens(c, w, h, t, rs, title);
      return { title, comment, facts, rare, draw, postVariants: [
        `鼻毛を${rs.length}本抜いて${sc}点！称号「${title}」 #鼻毛を抜け`,
        `最長${longest ? fmtCm(longest.cm) : '0cm'}の鼻毛を抜いた…「${title}」`,
        `${comment} 鼻毛標本${rs.length}本、${sc}点`,
      ] };
    }

    function endGame() {
      if (finished) return; finished = true;
      ctx.finish({ art: makeArt(), score, scoreText: `${score}点`, shareText: `鼻毛を${plucked}本抜いて${score}点！`, durationMs: Math.round(performance.now() - startTime), detail: `ステージ${stage} / ${plucked}本` });
    }

    // ---- 顔の幾何 ----
    const useFace = () => use3d && !!imgFace;
    // 実写顔画像(1024四方)上の位置（割合）。鼻の穴(左)・両目・頬は hero_face.png から読み取った値
    const FK = { nosX: 0.52, nosY: 0.604, nostrilX: 0.49, nostrilY: 0.605, eyeY: 0.462, eyeLX: 0.415, eyeRX: 0.61, cheekY: 0.56, scale: 3.3, pivY: 0.93 };
    /** 痛みの姿勢（傾き・つぶれ・拡大）。顔画像・鼻毛の根元・ピンセットで共通に使う */
    function pose() {
      let pain = 0, tilt = 0, sy = 1, sx = 1;
      if (phase === 'pull') { pain = gauge; tilt = gauge * 0.1 + Math.sin(time * 28) * 0.012 * gauge * gauge; sy = 1 + gauge * 0.04; sx = 1 - gauge * 0.03; }
      else if (phase === 'react') {
        if (reactOk) { pain = Math.max(0, 0.45 - reactT * 0.5); tilt = Math.sin(reactT * 14) * 0.06 * Math.max(0, 1 - reactT); sy = 1 + Math.max(0, 0.05 - reactT * 0.1); }
        else { const k = Math.max(0, 1 - reactT / 1.2); pain = 0.75 * k; tilt = Math.sin(reactT * 25) * 0.05 * k + 0.06 * k; sy = 1 - 0.03 * k; sx = 1 + 0.03 * k; }
      } else if (phase === 'over') { pain = 0.6; tilt = 0.05; sy = 0.98; sx = 1.02; }
      return { pain, tilt, sx, sy };
    }
    function geom() {
      const hx = W / 2, hy = H * 0.4, rx = Math.min(W * 0.46, H * 0.27), ry = rx * 1.15;
      const nr = rx * 0.24, nx = hx, ny = hy + ry * 0.2;
      if (useFace()) {
        const S = rx * FK.scale, ax = nx, ay = ny + nr * 0.5, ix = ax - FK.nosX * S, iy = ay - FK.nosY * S;
        const pv = { x: ax, y: iy + FK.pivY * S }, ps = pose();
        const px = ix + FK.nostrilX * S - pv.x, py = iy + FK.nostrilY * S - pv.y, sx = px * ps.sx, sy = py * ps.sy, c = Math.cos(ps.tilt), s = Math.sin(ps.tilt);
        return { hx, hy, rx, ry, nr, nx, ny, rootX: pv.x + sx * c - sy * s, rootY: pv.y + sx * s + sy * c, S, ix, iy, pvx: pv.x, pvy: pv.y };
      }
      return { hx, hy, rx, ry, nr, nx, ny, rootX: nx - nr * 0.3, rootY: ny + nr * 0.5, S: 0, ix: 0, iy: 0, pvx: 0, pvy: 0 };
    }
    /** 実写の顔を背景レイヤへ描く。痛みは傾き・つぶれ・赤み・涙で表現（ズーム変換済み前提） */
    function drawFaceImg(c: CanvasRenderingContext2D, G: ReturnType<typeof geom>) {
      const img = imgFace!, ps = pose(), S = G.S;
      c.save(); c.translate(G.pvx, G.pvy); c.rotate(ps.tilt); c.scale(ps.sx, ps.sy); c.translate(-G.pvx, -G.pvy);
      // 首の下に服（暗めの襟）。首の付け根を隠す
      const by = G.iy + 0.9 * S;
      c.fillStyle = '#26364d'; c.beginPath(); c.ellipse(G.hx, by + S * 0.14, S * 0.46, S * 0.17, 0, Math.PI, 0); c.rect(G.hx - S * 0.46, by + S * 0.14, S * 0.92, S * 0.6); c.fill();
      c.drawImage(img, G.ix, G.iy, S, S);
      // 首の下端を暗く落として服になじませる
      const ng = c.createLinearGradient(0, by - S * 0.04, 0, by + S * 0.05); ng.addColorStop(0, 'rgba(38,54,77,0)'); ng.addColorStop(1, 'rgba(38,54,77,.95)');
      c.fillStyle = ng; c.fillRect(G.ix + S * 0.1, by - S * 0.04, S * 0.8, S * 0.09); c.fillStyle = '#26364d'; c.fillRect(G.ix + S * 0.1, by + S * 0.05 - 0.5, S * 0.8, S * 0.12);
      // 赤み（目の周り・鼻・頬）
      const p = clamp(ps.pain, 0, 1);
      if (blobOff && p > 0.05) {
        const b = (fx: number, fy: number, rr: number, a: number) => { c.globalAlpha = clamp(a * p, 0, 0.7); c.drawImage(blobOff!, G.ix + fx * S - rr, G.iy + fy * S - rr, rr * 2, rr * 2); };
        b(FK.eyeLX, FK.eyeY + 0.01, S * 0.075, 0.55); b(FK.eyeRX, FK.eyeY + 0.01, S * 0.075, 0.55);
        b(FK.nosX, 0.585, S * 0.075, 0.8); b(0.33, FK.cheekY, S * 0.08, 0.45); b(0.71, FK.cheekY, S * 0.08, 0.45); b(0.5, 0.33, S * 0.12, 0.25);
        c.globalAlpha = 1;
      }
      // 涙・汗
      const cry = p > 0.55 || phase === 'over' || (phase === 'react' && !reactOk);
      if (cry) {
        c.fillStyle = 'rgba(150,215,255,.85)';
        for (const sx2 of [FK.eyeLX, FK.eyeRX]) for (let k = 0; k < 2; k++) {
          const f = (time * 1.1 + k * 0.5 + (sx2 > 0.5 ? 0.2 : 0)) % 1, x = G.ix + (sx2 + (sx2 > 0.5 ? 0.02 : -0.02)) * S, y = G.iy + (FK.eyeY + 0.03 + f * 0.09) * S;
          c.globalAlpha = 1 - f; c.beginPath(); c.ellipse(x, y, S * 0.007, S * 0.012, 0, 0, 7); c.fill();
        }
        c.globalAlpha = 1;
      }
      if (p > 0.3 && phase !== 'react') { const f = (time * 1.6) % 1; c.fillStyle = 'rgba(170,225,255,.9)'; c.globalAlpha = 1 - f * 0.6; c.beginPath(); c.ellipse(G.ix + 0.76 * S, G.iy + (0.22 + f * 0.1) * S, S * 0.009, S * 0.016, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
      c.restore();
    }
    /** 毛の先端(つまむ手)の位置。gg=ゲージ, back=戻りスプリング用の長さ補正 */
    function tipPos(gg: number, _t: number, lenOverride?: number) {
      const G = geom();
      const Lmin = G.ry * 0.5, Lmax = H * 0.5 - G.rootY + G.ry * 0.6 + (cfg.special ? 0 : 0);
      const L = lenOverride ?? (Lmin + (Lmax - Lmin) * gg);
      const sway = Math.sin(time * 3) * 4 * (1 - gg);
      return { x: G.rootX + gg * 14 + sway, y: G.rootY + L, L };
    }

    // ---- パーティクル ----
    function confetti(x: number, y: number, n: number) {
      const cols = ['#ff5470', '#ffe14d', '#5dffb0', '#6fc3ff', '#d58bff', '#ffb02e'];
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 150 + Math.random() * 450; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 250, life: 1.6, max: 1.6, col: cols[i % cols.length], sz: 5 + Math.random() * 6, rot: Math.random() * 6 }); }
    }

    // ---- 描画 ----
    function face(expr: number, shk: number, pullG: number, noseStretch: number, hair: { tx: number; ty: number; L: number } | null, nosePain: number, rel = 0) {
      const G = geom();
      g.save();
      const tilt = pullG * 0.06 * Math.sin(1) + (reactOk && phase === 'react' ? Math.sin(reactT * 14) * 0.05 * Math.max(0, 1 - reactT) : 0);
      g.translate(G.hx, G.hy); g.rotate(tilt); g.translate(-G.hx, -G.hy);
      // 首・肩
      g.fillStyle = '#e9a97a'; g.fillRect(G.hx - G.rx * 0.45, G.hy + G.ry * 0.7, G.rx * 0.9, G.ry * 0.9);
      g.fillStyle = '#4aa3ff'; g.beginPath(); g.ellipse(G.hx, G.hy + G.ry * 1.75, G.rx * 1.3, G.ry * 0.6, 0, Math.PI, 0); g.fill();
      // 頭
      const stretchY = 1 + pullG * 0.05 + (rel > 0 ? 0 : 0);
      g.save(); g.translate(G.hx, G.hy); g.scale(1 + pullG * 0.02, stretchY);
      const sg = g.createRadialGradient(-G.rx * 0.2, -G.ry * 0.3, G.rx * 0.2, 0, 0, G.rx * 1.1);
      const red = clamp(pullG * 0.6 + nosePain * 0.3, 0, 0.8);
      sg.addColorStop(0, `rgb(${246},${Math.round(201 - 70 * red)},${Math.round(160 - 90 * red)})`); sg.addColorStop(1, `rgb(${222},${Math.round(150 - 50 * red)},${Math.round(110 - 50 * red)})`);
      g.fillStyle = sg; g.strokeStyle = '#6b3b22'; g.lineWidth = 5;
      g.beginPath(); g.ellipse(0, 0, G.rx, G.ry, 0, 0, 7); g.fill(); g.stroke();
      // 耳
      for (const s of [-1, 1]) { g.fillStyle = '#eeb48a'; g.beginPath(); g.ellipse(s * G.rx * 0.99, G.ry * 0.02, G.rx * 0.1, G.ry * 0.16, 0, 0, 7); g.fill(); g.stroke(); }
      g.restore();
      // 薄い頭髪
      g.strokeStyle = '#3b2a20'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = -3; i <= 3; i++) { g.beginPath(); const x0 = G.hx + i * G.rx * 0.13; g.moveTo(x0, G.hy - G.ry * 0.97 + Math.abs(i) * 6); g.quadraticCurveTo(x0 + 6, G.hy - G.ry * 1.12, x0 + 14 * (i < 0 ? -1 : 1) * 0.5, G.hy - G.ry * 1.05 + Math.abs(i) * 4); g.stroke(); }
      // 眉
      const browY = G.hy - G.ry * 0.32 - (expr > 1 ? 8 : 0), ex = G.rx * 0.38, ey = G.hy - G.ry * 0.16;
      g.strokeStyle = '#3b2a20'; g.lineWidth = 9;
      for (const s of [-1, 1]) {
        g.beginPath();
        const tilt2 = expr === 0 ? 0 : expr === 1 ? -14 : expr === 2 ? -26 : -36;
        g.moveTo(G.hx + s * (ex + G.rx * 0.2), browY + tilt2 * 0.0 + (expr > 0 ? -tilt2 * 0.0 : 0) + (expr === 0 ? 0 : 0));
        g.lineTo(G.hx + s * (ex - G.rx * 0.2), browY + (expr === 0 ? -2 : -tilt2 * -0.0) + (expr === 0 ? 0 : (expr + 1) * 6));
        g.stroke();
      }
      // 目
      const closed = expr === 3 || (rel && reactOk), happy = reactOk && phase === 'react';
      for (const s of [-1, 1]) {
        const cx = G.hx + s * ex;
        if (happy) { g.strokeStyle = '#2b1a10'; g.lineWidth = 7; g.beginPath(); g.arc(cx, ey + 8, G.rx * 0.12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        else if (closed) { g.strokeStyle = '#2b1a10'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - G.rx * 0.14, ey - 6); g.lineTo(cx + G.rx * 0.1 * s, ey + 8); g.moveTo(cx - G.rx * 0.14, ey + 14); g.lineTo(cx + G.rx * 0.1 * s, ey + 2); g.stroke(); }
        else {
          const er = G.rx * (expr === 0 ? 0.13 : 0.15);
          g.fillStyle = '#fff'; g.strokeStyle = '#2b1a10'; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, ey, er, er * (expr >= 1 ? 1.15 : 0.8), 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#2b1a10'; const px = expr >= 2 ? 0 : (hair ? clamp((hair.tx - G.hx) * 0.02, -3, 3) : 0), py = expr === 0 ? 2 : er * 0.3;
          g.beginPath(); g.arc(cx + px, ey + py, er * (expr >= 1 ? 0.38 : 0.5), 0, 7); g.fill();
          if (expr >= 2) { g.fillStyle = 'rgba(120,200,255,.8)'; g.beginPath(); g.ellipse(cx, ey + er * 0.9, er * 0.9, er * 0.35, 0, 0, 7); g.fill(); }
        }
        // 涙
        if ((expr >= 2 && !happy) || (happy && reactGrade !== 'PERFECT' && reactT < 0.9)) {
          g.fillStyle = '#8fd3ff';
          for (let k = 0; k < 2; k++) { const f = ((time * 1.4 + k * 0.5 + (s > 0 ? 0.2 : 0)) % 1); g.beginPath(); g.ellipse(cx + s * 4, ey + 20 + f * G.ry * 0.5, 6, 10, 0, 0, 7); g.globalAlpha = 1 - f; g.fill(); g.globalAlpha = 1; }
        }
      }
      // 鼻（引っ張りで伸びる）
      const nox = noseStretch * G.nr * 0.0, noy = noseStretch * G.nr * 0.55;
      g.fillStyle = `rgb(${240},${Math.round(160 - 60 * red)},${Math.round(125 - 50 * red)})`; g.strokeStyle = '#6b3b22'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(G.nx + nox, G.ny + noy * 0.5, G.nr * (1 - noseStretch * 0.12), G.nr * (1.0 + noseStretch * 0.5), 0, 0, 7); g.fill(); g.stroke();
      // 鼻の穴
      g.fillStyle = '#4a1f12'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(G.nx + s * G.nr * 0.42 + nox, G.ny + G.nr * 0.5 + noy, G.nr * 0.2, G.nr * 0.26 * (1 + noseStretch * 0.4), 0, 0, 7); g.fill(); }
      // 頬の赤み
      if (red > 0.1) { g.fillStyle = `rgba(255,70,90,${red * 0.45})`; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(G.hx + s * G.rx * 0.6, G.hy + G.ry * 0.12, G.rx * 0.16, G.ry * 0.09, 0, 0, 7); g.fill(); } }
      // 口
      const my = G.hy + G.ry * 0.58, mw = G.rx * 0.34;
      g.strokeStyle = '#4a1f12'; g.fillStyle = '#6b1a1a'; g.lineWidth = 6;
      if (happy) { g.beginPath(); g.arc(G.hx, my - 14, mw, 0.1, Math.PI - 0.1); g.closePath(); g.fillStyle = '#7a1a22'; g.fill(); g.stroke(); g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(G.hx, my + mw * 0.55, mw * 0.5, mw * 0.25, 0, 0, Math.PI); g.fill(); }
      else if (expr === 0) { g.beginPath(); g.arc(G.hx, my - 10, mw * 0.8, 0.25, Math.PI - 0.25); g.stroke(); }
      else if (expr === 1) { g.beginPath(); g.moveTo(G.hx - mw * 0.8, my); g.quadraticCurveTo(G.hx, my - 14, G.hx + mw * 0.8, my); g.stroke(); }
      else { const o = expr === 3 ? 1.2 : 0.8; g.beginPath(); g.ellipse(G.hx, my + 4, mw * 0.5 * o, mw * (0.35 + (expr - 1) * 0.15) * o + Math.sin(time * 30) * 2 * (expr === 3 ? 1 : 0), 0, 0, 7); g.fill(); g.stroke(); }
      // 汗
      if (expr >= 1 && !happy) { g.fillStyle = '#8fd3ff'; g.beginPath(); g.ellipse(G.hx + G.rx * 0.8, G.hy - G.ry * 0.5 + (time * 60 % 30), 7, 12, 0, 0, 7); g.fill(); }
      g.restore();
    }

    function drawHair(gg: number, kind: 'hold' | 'spring' | 'snap' | 'none', sp = 0) {
      const G = geom();
      if (kind === 'none') { // 抜けた後: 穴のみ
        return;
      }
      let tp = tipPos(gg, 0);
      if (kind === 'spring') {
        // ビヨーンと弾んで元の長さへ（減衰振動）
        const base = tipPos(0, 0).L, from = tipPos(gg, 0).L, k = Math.exp(-5 * sp) * Math.cos(sp * 22);
        tp = tipPos(0, 0, base + (from - base) * k);
      }
      if (kind === 'snap') { const L0 = tipPos(0, 0).L; tp = tipPos(0, 0, L0 * 0.5); }
      const rx0 = G.rootX, ry0 = G.rootY, L = tp.y - ry0;
      const amp = (cfg.special ? 16 : 10) * (kind === 'hold' ? 1 - gg * 0.8 : kind === 'spring' ? 1 + Math.sin(sp * 30) * 0.5 : 1);
      const drawStrand = (yTo: number, xTo: number, width: number, col: string) => {
        g.strokeStyle = col; g.lineWidth = width; g.lineCap = 'round'; g.beginPath(); g.moveTo(rx0, ry0);
        const n = 40, Ls = yTo - ry0;
        for (let i = 1; i <= n; i++) { const f = i / n; const w = Math.sin(f * cfg.waves * Math.PI * 2 + time * 2) * amp * f * (1 - f * 0.2); g.lineTo(rx0 + (xTo - rx0) * f + w, ry0 + Ls * f); }
        g.stroke();
      };
      drawStrand(tp.y, tp.x, 5, '#1e140e');
      if (kind === 'hold') {
        // 指（つまむ手）
        g.fillStyle = '#f6c9a0'; g.strokeStyle = '#6b3b22'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(tp.x, tp.y + 18, 22, 34, 0, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(tp.x - 14, tp.y - 6, 9, 20, -0.3, 0, 7); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(tp.x + 14, tp.y - 6, 9, 20, 0.3, 0, 7); g.fill(); g.stroke();
      }
      void L;
    }

    function exprOf(gg: number): number { return gg < 0.3 ? 0 : gg < 0.6 ? 1 : gg < 0.85 ? 2 : 3; }

    function drawGauge(vis: number) {
      const bw = W * 0.86, bh = 38, bx = (W - bw) / 2, by = H - 120;
      g.save();
      g.fillStyle = 'rgba(255,255,255,.1)'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(bx, by, bw, bh, 19); g.fill(); g.stroke();
      // ゾーン
      if (vis > 0.01) {
        const zx = bx + zone * bw, zw = cfg.zoneW * bw;
        g.globalAlpha = vis;
        const gr = g.createLinearGradient(zx - zw, 0, zx + zw, 0); gr.addColorStop(0, 'rgba(93,255,176,.4)'); gr.addColorStop(0.5, 'rgba(255,225,77,.95)'); gr.addColorStop(1, 'rgba(93,255,176,.4)');
        g.fillStyle = gr; g.fillRect(zx - zw, by + 3, zw * 2, bh - 6);
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(zx, by); g.lineTo(zx, by + bh); g.stroke();
        g.globalAlpha = 1;
      } else if (cfg.hideAt !== null) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '900 20px sans-serif'; g.textAlign = 'center'; g.fillText('？？？', bx + bw / 2, by + 26); }
      // 針
      const mx = bx + lastShownGauge * bw;
      g.fillStyle = '#ff5470'; g.strokeStyle = '#fff'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(mx, by - 6); g.lineTo(mx - 10, by - 20); g.lineTo(mx + 10, by - 20); g.closePath(); g.fill(); g.stroke();
      g.fillRect(mx - 3, by - 4, 6, bh + 8);
      g.restore();
    }

    function text(s: string, x: number, y: number, size: number, col: string, a = 1, rot = 0) {
      g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a; g.font = `900 ${size}px "Hiragino Sans", "Noto Sans JP", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = size * 0.18; g.strokeStyle = '#1a1030'; g.lineJoin = 'round'; g.strokeText(s, 0, 0); g.fillStyle = col; g.fillText(s, 0, 0); g.restore();
    }

    /** 3D顔の状態を2D版と同じロジックから組み立てる（オブジェクト再利用） */
    function setup3d(G: ReturnType<typeof geom>, zoom: number, sx: number, sy: number) {
      const p = fp; p.W = W; p.H = H; p.hx = G.hx; p.hy = G.hy; p.rx = G.rx; p.ry = G.ry; p.nr = G.nr; p.nx = G.nx; p.ny = G.ny; p.time = time;
      p.zoom = zoom; p.ox = sx; p.oy = sy; p.hairKind = 0; p.fly = 0; p.hand = true; p.noHand = !!imgTw; p.waves = cfg.waves; p.tilt = 0; p.flick = 0; p.lookX = 0;
      p.img = useFace(); p.rootX = G.rootX; p.rootY = G.rootY;
      const tiltOf = (pg: number) => pg * 0.06 * Math.sin(1) + (reactOk && phase === 'react' ? Math.sin(reactT * 14) * 0.05 * Math.max(0, 1 - reactT) : 0);
      if (phase === 'pull') {
        const hh = tipPos(gauge, 0), ex = exprOf(gauge);
        p.expr = ex; p.pull = gauge; p.stretch = gauge; p.red = clamp(gauge * 0.6 + gauge * 0.3, 0, 0.8); p.happy = false; p.tears = ex >= 2; p.sweat = ex >= 1;
        p.tilt = tiltOf(gauge); p.lookX = clamp((hh.x - G.hx) * 0.02, -3, 3); p.flick = Math.sin(time * 30) * 2 * (ex === 3 ? 1 : 0);
        p.hairKind = 1; p.tipX = hh.x; p.tipY = hh.y; p.amp = (cfg.special ? 16 : 10) * (1 - gauge * 0.8);
      } else if (phase === 'react') {
        if (reactOk) {
          p.expr = 0; p.pull = 0; p.stretch = 0; p.red = clamp(0.24, 0, 0.8); p.happy = true; p.tears = reactGrade !== 'PERFECT' && reactT < 0.9; p.sweat = false; p.tilt = tiltOf(0);
          p.fly = 1; p.flyX = tip.x; p.flyY = tip.y; p.flyRot = tip.rot;
        } else {
          const ex = reactKind === 'snap' ? 3 : 2, st = Math.max(0, 0.6 - reactT);
          p.expr = ex; p.pull = 0; p.stretch = st; p.red = clamp(0.3, 0, 0.8); p.happy = false; p.tears = true; p.sweat = true; p.flick = Math.sin(time * 30) * 2 * (ex === 3 ? 1 : 0);
          let tp = tipPos(0, 0);
          if (reactKind === 'snap') { tp = tipPos(0, 0, tipPos(0, 0).L * 0.5); p.amp = 10; }
          else { const base = tipPos(0, 0).L, from = tipPos(reactG, 0).L, k = Math.exp(-5 * reactT) * Math.cos(reactT * 22); tp = tipPos(0, 0, base + (from - base) * k); p.amp = 10 * (1 + Math.sin(reactT * 30) * 0.5); }
          p.hairKind = 2; p.tipX = tp.x; p.tipY = tp.y;
          if (reactKind === 'snap') { const base = tipPos(0, 0).L * 0.5; p.fly = 2; p.flyX = G.rootX + 20 + reactT * 90; p.flyY = G.rootY + base + reactT * 260 + reactT * reactT * 300; p.flyRot = reactT * 6; }
        }
      } else {
        const over = phase === 'over';
        p.expr = over ? 3 : 0; p.pull = 0; p.stretch = 0; p.red = over ? 0.2 : 0; p.happy = false; p.tears = over; p.sweat = over; p.flick = 0;
        if (!over) { const tp = tipPos(0, 0); p.hairKind = 1; p.hand = false; p.tipX = tp.x; p.tipY = tp.y; p.amp = cfg.special ? 16 : 10; }
      }
    }

    /** ピンセット画像。先端を毛の先に合わせ、持ち手は毛の引かれる向きへ。前景2D(ズーム変換済み)に描く。 */
    function drawTweezers(G: ReturnType<typeof geom>) {
      const t = imgTw!; let x = 0, y = 0, rot = 0, open = 0, a = 1;
      if (phase === 'pull' || (phase === 'idle')) {
        const hh = tipPos(phase === 'pull' ? gauge : 0, 0); x = hh.x; y = hh.y;
        rot = Math.atan2(hh.y - G.rootY, hh.x - G.rootX);
        if (phase === 'idle') { const k = 36 + Math.sin(time * 3) * 4; x += Math.cos(rot) * k; y += Math.sin(rot) * k; a = 0.95; }
      } else if (phase === 'react' && reactOk) {
        x = tip.x; y = tip.y - 10; rot = tip.rot - Math.PI / 2; open = Math.min(1, reactT * 3);
      } else return;
      const sz = W * 0.5, s = sz / t.width, ax = 0.1 * t.width, ay = 0.857 * t.height;
      const draw = (img: CanvasImageSource, dx: number, dy: number, al: number) => {
        g.save(); g.globalAlpha = al; g.translate(x + dx, y + dy); g.rotate(rot + 0.714 + open * 0.0); g.scale(s, s); g.drawImage(img, -ax, -ay, t.width, t.height); g.restore();
      };
      if (twShadow) draw(twShadow, 7, 11, 0.22 * a);
      draw(t, 0, 0, a);
    }

    function render() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gb = use3d && gBg ? gBg : g;
      if (gb !== g) gb.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bgOff) { gb.save(); gb.setTransform(1, 0, 0, 1, 0, 0); gb.drawImage(bgOff, 0, 0); gb.restore(); }
      else {
        const bg = gb.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, H * 0.8);
        bg.addColorStop(0, '#ffcf8a'); bg.addColorStop(1, '#5a2a6a'); gb.fillStyle = bg; gb.fillRect(0, 0, W, H);
      }
      // 集中線
      const pullG = phase === 'pull' ? gauge : 0;
      if (pullG > 0.4) { gb.save(); gb.strokeStyle = bgOff ? `rgba(40,70,110,${(pullG - 0.4) * 0.35})` : `rgba(255,255,255,${(pullG - 0.4) * 0.5})`; gb.lineWidth = 3; const G = geom(); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283 + time * 0.2; gb.beginPath(); gb.moveTo(G.hx + Math.cos(a) * W * 0.6, G.hy + Math.sin(a) * W * 0.6); gb.lineTo(G.hx + Math.cos(a) * W * 1.1, G.hy + Math.sin(a) * W * 1.1); gb.stroke(); } gb.restore(); }
      if (use3d) g.clearRect(0, 0, W, H);
      // ズーム＆ぷるぷる
      const G = geom();
      const zoom = 1 + (phase === 'pull' ? gauge * 0.1 : 0) + (phase === 'react' && reactOk ? Math.max(0, 0.15 - reactT * 0.2) : 0);
      const shk = (phase === 'pull' ? gauge * gauge * 7 : 0) + shakeT * 14;
      const shx = (Math.random() - 0.5) * shk, shy = (Math.random() - 0.5) * shk;
      if (useFace() && gb !== g) { gb.save(); gb.translate(G.nx + shx, G.ny + shy); gb.scale(zoom, zoom); gb.translate(-G.nx, -G.ny); drawFaceImg(gb, G); gb.restore(); }
      g.save();
      g.translate(G.nx + shx, G.ny + shy); g.scale(zoom, zoom); g.translate(-G.nx, -G.ny);

      if (use3d && stage3d) {
        setup3d(G, zoom, shx, shy); stage3d.update(fp); stage3d.render();
        if (imgTw) drawTweezers(G);
        // スポッ！ 鼻から出る放射（前景2D）
        if (phase === 'react' && reactOk && reactT < 0.35) { g.strokeStyle = `rgba(255,255,255,${1 - reactT * 3})`; g.lineWidth = 6; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; g.beginPath(); g.moveTo(G.rootX + Math.cos(a) * 30, G.rootY + Math.sin(a) * 30); g.lineTo(G.rootX + Math.cos(a) * (60 + reactT * 300), G.rootY + Math.sin(a) * (60 + reactT * 300)); g.stroke(); } }
      } else if (phase === 'pull') {
        const hh = tipPos(gauge, 0);
        face(exprOf(gauge), shk, gauge, gauge, { tx: hh.x, ty: hh.y, L: hh.L }, gauge);
        drawHair(gauge, 'hold');
      } else if (phase === 'react') {
        if (reactOk) {
          face(0, shk, 0, 0, null, 0.8, 1);
          // 抜けた毛と手が飛ぶ
          g.save(); g.translate(tip.x, tip.y); g.rotate(tip.rot);
          g.strokeStyle = '#1e140e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); for (let i = 1; i <= 20; i++) g.lineTo(Math.sin(i * 0.8 + time * 8) * 8, i * 10); g.stroke();
          g.fillStyle = '#f6c9a0'; g.strokeStyle = '#6b3b22'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, -10, 24, 32, 0, 0, 7); g.fill(); g.stroke(); g.restore();
          // スポッ！ 鼻から出る放射
          if (reactT < 0.35) { g.strokeStyle = `rgba(255,255,255,${1 - reactT * 3})`; g.lineWidth = 6; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; g.beginPath(); g.moveTo(G.rootX + Math.cos(a) * 30, G.rootY + Math.sin(a) * 30); g.lineTo(G.rootX + Math.cos(a) * (60 + reactT * 300), G.rootY + Math.sin(a) * (60 + reactT * 300)); g.stroke(); } }
        } else {
          const ex = reactKind === 'snap' ? 3 : 2;
          face(ex, shk, 0, Math.max(0, 0.6 - reactT) , null, 1);
          if (reactKind === 'snap') drawHair(reactG, 'snap'); else drawHair(reactG, 'spring', reactT);
          if (reactKind === 'snap') { // 切れた毛の先がひらひら
            const base = tipPos(0, 0).L * 0.5; g.save(); g.translate(G.rootX + 20 + reactT * 90, G.rootY + base + reactT * 260 + reactT * reactT * 300); g.rotate(reactT * 6);
            g.strokeStyle = '#1e140e'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); for (let i = 1; i <= 16; i++) g.lineTo(Math.sin(i) * 7, i * 9); g.stroke(); g.restore();
          }
        }
      } else {
        // idle / over
        const lazy = phase === 'over' ? 3 : 0;
        face(phase === 'over' ? 3 : 0, 0, 0, 0, null, 0);
        if (phase !== 'over') drawHair(0, 'hold');
        void lazy;
      }
      g.restore();

      // パーティクル
      for (const p of parts) { g.save(); g.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.fillRect(-p.sz / 2, -p.sz / 3, p.sz, p.sz * 0.66); g.restore(); }
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.5})`; g.fillRect(0, 0, W, H); }

      // HUD
      text(`${score}点`, W / 2, 48, 42, '#fff');
      text(`STAGE ${stage}${cfg.special ? ' ★超ロング★' : ''}`, W / 2, 90, 22, cfg.special ? '#ffe14d' : '#ffe9c8');
      for (let i = 0; i < LIVES; i++) text(i < lives ? '❤' : '♡', 34 + i * 34, 40, 30, i < lives ? '#ff5470' : '#aaa');
      if (combo >= 2) text(`${combo} COMBO`, W - 76, 40, 24, '#5dffb0');

      // ゲージ
      let vis = 1;
      if (cfg.hideAt !== null && phase === 'pull') vis = clamp(1 - (gauge - cfg.hideAt) / 0.12, 0, 1);
      if (phase === 'react') vis = 1;
      if (phase === 'idle' && cfg.hideAt !== null) vis = 1;
      if (phase !== 'over') drawGauge(vis);
      // ステップ案内
      if (phase === 'idle') {
        const pulse = 1 + Math.sin(time * 6) * 0.05;
        text(hint ? '長押しで引っ張る！' : '長押し！', W / 2, H - 200, 34 * pulse, '#fff');
        text('黄色いゾーンで離せ！', W / 2, H - 164, 22, '#ffe14d');
        if (stageIntro > 0 && stage > 1) text(cfg.special ? '超ロング鼻毛！' : cfg.pingpong ? 'ゲージ往復！' : cfg.hideAt !== null ? 'ゾーンが消える！' : cfg.moveAmp > 0 ? 'ゾーンが動く！' : `STAGE ${stage}`, W / 2, H * 0.12 + 60, 36, '#ff9ae0');
      }
      // 結果テキスト
      if (phase === 'react') {
        const sc = 1 + Math.max(0, 0.6 - popT * 3), a = reactT < 0.9 ? 1 : 1 - (reactT - 0.9) * 5;
        const col = GRADE_COL[reactGrade];
        text(reactOk ? reactGrade + '!' : reactMsg, W / 2, H * 0.17, (reactOk ? 64 : 52) * sc, col, a, Math.sin(reactT * 10) * 0.05);
        if (reactOk) text(`+${gainedPts}`, W / 2, H * 0.17 + 56, 34, '#fff', a);
        else text('ミス…', W / 2, H * 0.17 + 56, 28, '#fff', a);
      }
      if (phase === 'over') {
        text('もう限界…！', W / 2, H * 0.17, 54, '#ff5470');
        text(`${plucked}本抜いた`, W / 2, H * 0.17 + 56, 30, '#fff');
      }
    }

    // ---- ループ ----
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt; popT += dt;
      shakeT = Math.max(0, shakeT - dt); flash = Math.max(0, flash - dt * 3); stageIntro = Math.max(0, stageIntro - dt);
      if (phase === 'pull') {
        holdT += dt; gauge = gaugeAt(cfg, holdT); zone = zoneAt(cfg, holdT); lastShownGauge = gauge;
        if ((!cfg.pingpong && holdT * cfg.speed >= 1) || (cfg.pingpong && holdT >= cfg.maxHold)) { gauge = gaugeAt(cfg, holdT); judge(true); }
      } else if (phase === 'idle') { lastShownGauge = 0; zone = cfg.zoneC; }
      else if (phase === 'react') {
        reactT += dt;
        if (reactOk) { tip.vy += 900 * dt; tip.x += tip.vx * dt; tip.y += tip.vy * dt; tip.rot += dt * 5; }
        if (reactT * 1000 >= REACT_MS) nextStage();
      } else if (phase === 'over') { overTimer += dt; if (overTimer > 1.3) endGame(); }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8; }
      render();
    };
    raf = requestAnimationFrame(loop);

    // ---- 入力 ----
    const onDown = (e: Event) => { e.preventDefault(); pressHold(); };
    const onUp = () => release();
    const onKeyD = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); pressHold(); } };
    const onKeyU = (e: KeyboardEvent) => { if (e.code === 'Space') release(); };
    cv.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyD);
    window.addEventListener('keyup', onKeyU);

    // テスト用フック（読み取りのみ）
    (window as any).__nose = { get: () => ({ phase, stage, lives, score, gauge, zone, holdT, zoneW: cfg.zoneW, cfg }) };

    return {
      destroy() {
        destroyed = true; cancelAnimationFrame(raf); audio.stopBgm();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('keydown', onKeyD); window.removeEventListener('keyup', onKeyU);
        cv.removeEventListener('pointerdown', onDown);
        delete (window as any).__nose;
        cv.remove(); bgCv?.remove(); bgOff = null; twShadow = null; imgBg = null; imgTw = null; imgFace = null; blobOff = null;
        if (stage3d) { stage3d.dispose(); stage3d = null; } use3d = false;
      },
    };
  },
};
export default mod;

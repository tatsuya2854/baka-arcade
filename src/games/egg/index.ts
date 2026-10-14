import type { GameModule, GameContext, GameInstance } from '../../core/types';
import { haptic } from '../../core/haptic';
import { meta } from './meta';
import { C, FONT } from './config';
import { type Drop, makeDrop, drawScene, geomFor, eggScreen, impactSpeed, releaseEggCaches, preloadEggImages } from './scene';
import { buildArt } from './art';

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function start(ctx: GameContext): GameInstance {
  const root = ctx.root, audio = ctx.audio;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none';
  root.appendChild(cv);
  const g = cv.getContext('2d')!;
  let W = 0, H = 0, dpr = 1, raf = 0, alive = true, finished = false;
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  resize(); window.addEventListener('resize', resize);

  // --- 状態 ---
  let round = 0, phase: 'swing' | 'fall' = 'swing', t0 = performance.now(), tRel = 0, landed = false;
  let firstTap = 0, started = false, verdictT = 0;
  let cur: Drop | null = null, ghost: { drop: Drop; t: number } | null = null;
  const drops: Drop[] = [];
  let noiseBuf: AudioBuffer | null = null;

  const pos = (now: number) => {
    const r = C.ROUNDS[round], tt = Math.min(14, Math.max(0, (now - t0) / 1000));
    const ph = (TAU / r.period) * (tt + r.ramp * tt * tt);
    return { X: -r.ampX * Math.cos(ph), Y: r.ampY * Math.sin(1.37 * ph + 1), z: C.BASE_Z + r.bobA * Math.sin(tt * 1.85) };
  };

  function sizzle(vol: number, dur: number) {
    const c = audio.ctx; if (!c || audio.muted) return;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
    const bp = c.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 6500; bp.gain.value = 6;
    const gn = c.createGain(), n = 80, cur2 = new Float32Array(n);
    for (let i = 0; i < n; i++) { const e = Math.pow(1 - i / n, 1.6); cur2[i] = vol * e * (0.35 + 0.65 * Math.random()); }
    const t = c.currentTime; gn.gain.setValueAtTime(0, t); gn.gain.setValueCurveAtTime(cur2, t + 0.005, dur);
    src.connect(hp); hp.connect(bp); bp.connect(gn); gn.connect(audio.master); src.start(t); src.stop(t + dur + 0.05);
  }

  function tap() {
    if (finished) return;
    audio.unlock();
    if (!started) { started = true; firstTap = performance.now(); ctx.started(); }
    const now = performance.now();
    if (phase !== 'swing' || now - t0 < C.READY_LOCK * 1000) return;
    const p = pos(now);
    cur = makeDrop(p.X, p.Y, p.z, round); drops.push(cur);
    phase = 'fall'; tRel = now; landed = false; verdictT = 0;
    audio.sfx('whoosh'); haptic(6);
  }
  const onDown = (e: PointerEvent) => { e.preventDefault(); tap(); };
  const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); tap(); } };
  cv.addEventListener('pointerdown', onDown); window.addEventListener('keydown', onKey);

  function onLand(d: Drop) {
    const v = impactSpeed(d);
    audio.sfx('thud', d.idx);
    if (d.miss) { audio.sfx('ng'); haptic([30, 40, 60]); }
    else {
      sizzle(clamp(0.35 + v / 3000, 0.3, 0.7), 1.3);
      if (d.burst) { audio.sfx('pop'); haptic([20, 30, 40]); }
      else if (d.rim) { audio.sfx('hit'); haptic(18); }
      else haptic(14);
      if (d.d < C.PERFECT_MM) audio.sfx('combo'); else if (d.score >= 850 && !d.burst) audio.sfx('ok');
    }
  }

  function finishGame() {
    if (finished) return; finished = true;
    const avg = Math.round(drops.reduce((a, d) => a + d.score, 0) / drops.length);
    const best = Math.min(...drops.map(d => d.d));
    const art = buildArt(drops, avg);
    ctx.finish({
      score: avg, scoreText: `${avg}点`,
      shareText: `目玉焼きを3個落として${avg}点。最小誤差${best.toFixed(1)}mm「${art.title}」`,
      durationMs: Math.max(3000, Math.round(performance.now() - firstTap)), art,
    });
  }

  // --- 描画 ---
  const text = (s: string, x: number, y: number, size: number, col: string, a = 1, stroke = true) => {
    g.save(); g.globalAlpha = a; g.font = `900 ${Math.round(size)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (stroke) { g.lineWidth = size * 0.2; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(s, x, y); }
    g.fillStyle = col; g.fillText(s, x, y); g.restore();
  };

  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now(), time = now / 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gm = geomFor(W, H), s = gm.s;
    const r = C.ROUNDS[round];
    if (phase === 'swing') {
      const p = pos(now);
      drawScene(g, W, H, time, { held: p, ghost: ghost ? { drop: ghost.drop, tau: ghost.drop.tFall + 4, alpha: clamp(1 - (now - ghost.t) / 500) } : undefined });
      if (ghost && now - ghost.t > 500) ghost = null;
      // 高さゲージ
      if (r.bobA > 0) {
        const gx = W - 22, y0 = H * 0.22, y1 = H * 0.5, zmin = 120, zmax = 300, ym = (z: number) => y1 - ((z - zmin) / (zmax - zmin)) * (y1 - y0);
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(gx - 2, y0, 4, y1 - y0);
        g.fillStyle = 'rgba(255,70,60,.8)'; g.fillRect(gx - 2, y0, 4, ym(C.BURST_Z) - y0);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(gx, ym(p.z), 6, 0, TAU); g.fill();
        g.textAlign = 'right'; g.font = `800 11px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('高いと割れる', W - 8, y0 - 10);
      }
      if (round === 0) {
        const pulse = 0.6 + 0.4 * Math.sin(time * 5);
        text('TAP で落とす', W / 2, H * 0.9, Math.min(W * 0.07, 30), '#ffd45a', pulse);
      }
    } else if (cur) {
      const tau = (now - tRel) / 1000;
      drawScene(g, W, H, time, { drop: cur, tau, ghost: undefined });
      const ts = tau - cur.tFall;
      if (ts >= 0 && !landed) { landed = true; onLand(cur); }
      if (ts > 0.3) {
        const a = clamp((ts - 0.3) / 0.2), pop = 1 + 0.25 * Math.exp(-(ts - 0.3) * 9), cy = H * 0.19;
        const big = Math.min(W * 0.1, 50) * pop;
        const [lx, ly] = eggScreen(gm, cur.X, cur.Y);
        if (cur.miss) text('フライパンの外！', W / 2, cy, big * 0.8, '#ff7a6a', a);
        else {
          text(`誤差 ${cur.d.toFixed(1)}mm`, W / 2, cy, big, cur.d < C.PERFECT_MM ? '#7dffb0' : '#ffd45a', a);
        }
        const tag = cur.miss ? '台に直撃' : cur.burst ? '黄身が割れた！ 勢いが強すぎ' : cur.rim ? 'フチに接触 -30%' : cur.d < C.PERFECT_MM ? 'ど真ん中！' : cur.score >= 850 ? 'ほぼ中央' : cur.score >= 500 ? 'まずまず' : 'ずれた';
        text(tag, W / 2, cy + big * 0.8, Math.min(W * 0.05, 22), cur.burst || cur.miss ? '#ff9a8a' : '#fff', a);
        text(`+${cur.score}`, lx, ly - 70 * s - (ts - 0.3) * 20, Math.min(W * 0.08, 34), '#fff', a * clamp(1.6 - ts));
      }
      if (ts > C.SETTLE) {
        if (round >= C.ROUNDS.length - 1) { if (!finished) finishGame(); }
        else { ghost = { drop: cur, t: now }; round++; phase = 'swing'; t0 = now; cur = null; }
      }
    }
    // HUD
    for (let i = 0; i < C.ROUNDS.length; i++) {
      const x = W / 2 + (i - 1) * 26, y = Math.max(28, H * 0.045);
      g.fillStyle = i < drops.length ? '#ffc83d' : i === round ? '#fff' : 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x, y, i === round ? 6 : 5, 0, TAU); g.fill();
    }
    if (drops.length) text(`平均 ${Math.round(drops.reduce((a, d) => a + d.score, 0) / drops.length)}点`, W / 2, Math.max(28, H * 0.045) + 24, 14, 'rgba(255,255,255,.75)', 1, false);
  }
  // 画像の先読みが終わってからループ開始(失敗時は従来描画)
  preloadEggImages().then(() => { if (alive) { t0 = performance.now(); raf = requestAnimationFrame(frame); } });

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize); window.removeEventListener('keydown', onKey); cv.removeEventListener('pointerdown', onDown);
      cv.remove(); releaseEggCaches(); noiseBuf = null; audio.stopBgm();
    },
  };
}

const mod: GameModule = { meta, start };
export default mod;

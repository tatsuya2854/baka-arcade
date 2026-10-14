import type { GameModule, GameContext } from '../../core/types';
import { haptic } from '../../core/haptic';
import { meta } from './meta';
import { CFG, flowQ, gPerUnit, scoreFromErr, targetVolume } from './config';
import { Sim } from './sim';
import { KetchupShader, buildBackdrop, drawBottle, drawDrop, drawStream, drawTarget, layoutFor, type Layout } from './scene';
import { KSound } from './sound';
import { buildArt, QSCALE, type Frame } from './art';

const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';
const FIXED = 1 / 60;

interface Drip { x: number; y: number; vy: number; vol: number; delay: number }
interface Part { x: number; y: number; vx: number; vy: number; r: number; landY: number; vol: number; pale: boolean; life: number }

const mod: GameModule = {
  meta,
  start(ctx: GameContext) {
    const { root, audio } = ctx;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none';
    root.appendChild(cv);
    const g = cv.getContext('2d')!;
    const sim = new Sim(), shader = new KetchupShader(), sound = new KSound(audio);
    const Vt = targetVolume(), gpu = gPerUnit(), N = CFG.N;
    let rngS = 1234567;
    const rng = () => { rngS = (rngS + 0x6d2b79f5) | 0; let t = Math.imul(rngS ^ (rngS >>> 15), 1 | rngS); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    let W = 0, H = 0, dpr = 1, L: Layout = layoutFor(390, 844), backdrop: HTMLCanvasElement | null = null;
    const resize = () => {
      const r = root.getBoundingClientRect(); const w = Math.max(2, r.width || 390), h = Math.max(2, r.height || 844);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === W && h === H && cv.width === Math.round(w * dpr)) return;
      W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      L = layoutFor(W, H); backdrop = buildBackdrop(L, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(root); window.addEventListener('resize', resize);

    // 状態
    let phase: 'ready' | 'play' | 'done' = 'ready';
    let holdIn = false, theta = 0, q = 0, elapsed = 0, idleT = 0, lastRel = 0, presses = 0, burstN = 0;
    let airDone = false, glopDone = false, surgeT = 99, dripAcc = 0, streamHold = 0, hapT = 0, burstAcc = 0, burstHapT = 0, shake = 0, clock = 0;
    let prevHold = false, acc = 0, last = performance.now(), raf = 0, frameN = 0, ringI = 0, ringN = 0;
    const drips: Drip[] = [], parts: Part[] = [];
    const ring: { data: Uint8Array; theta: number; q: number; t: number }[] = [];
    for (let i = 0; i < CFG.recMax; i++) ring.push({ data: new Uint8Array(N * N), theta: 0, q: 0, t: 0 });

    const press = () => {
      if (phase === 'done') return;
      audio.unlock();
      if (phase === 'ready') { phase = 'play'; ctx.started(); sound.start(); }
      if (!holdIn) presses++;
      holdIn = true;
    };
    const release = () => { holdIn = false; };
    const onDown = (e: PointerEvent) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch { /* */ } press(); };
    const onUp = (e: PointerEvent) => { e.preventDefault(); release(); };
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (e.type === 'keydown') { if (!e.repeat) press(); } else release(); } };
    const onBlur = () => release();
    const noCtx = (e: Event) => e.preventDefault();
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('lostpointercapture', onUp);
    cv.addEventListener('contextmenu', noCtx);
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', onBlur);

    const spawnDrip = (vol: number, delay = 0) => drips.push({ x: L.tipX, y: L.tipY - 4 * L.s, vy: 0, vol, delay });
    const landOn = (x: number, y: number, vol: number, sigma: number) => sim.splat(N / 2 + (x - L.cx) / L.kx, N / 2 + (y - L.cy) / L.ky, vol, sigma);

    const update = (dt: number) => {
      clock += dt;
      if (phase !== 'play') { sim.step(CFG.substeps); return; }
      elapsed += dt;
      const hold = holdIn && elapsed < CFG.limitSec;
      if (prevHold && !hold) {
        lastRel = elapsed; sound.cut(); haptic(8);
        if (q > 150) spawnDrip(Math.min(30, 6 + q * 0.02), 0.14);
      }
      prevHold = hold;
      // 傾き
      const th0 = theta;
      theta = hold ? Math.min(1, theta + CFG.thetaRise * dt) : Math.max(0, theta - CFG.thetaFall * dt);
      if (theta < 0.08) { airDone = false; glopDone = false; }
      if (hold && !airDone && theta >= CFG.airAt) {
        airDone = true; sound.air(); haptic(14);
        for (let i = 0; i < 6; i++) parts.push({ x: L.tipX, y: L.tipY, vx: (rng() - 0.5) * 120 * L.s, vy: (60 + rng() * 120) * L.s, r: (1 + rng() * 1.6) * L.s, landY: 0, vol: 0, pale: true, life: 0.35 });
      }
      if (th0 < CFG.theta0 && theta >= CFG.theta0 && !glopDone) { glopDone = true; surgeT = 0; sound.glop(); haptic(22); shake = Math.max(shake, 1.5 * L.s); }
      surgeT += dt;
      const surge = 0.65 * Math.exp(-surgeT / 0.22) * (0.65 + 0.35 * Math.cos(surgeT * 40));
      const qT = flowQ(theta) * (1 + surge);
      const k = qT > q ? 16 : 7;
      q += (qT - q) * (1 - Math.exp(-k * dt));
      if (q < 1.5 && qT === 0) q = 0;
      // 出る
      const dv = q * dt;
      if (q >= CFG.dripQ) {
        streamHold = 0.35;
        const sig = 1.3 + Math.sqrt(q) * 0.028;
        sim.splat(N / 2 + Math.sin(clock * 2.3) * 0.6, N / 2 + Math.cos(clock * 1.7) * 0.4, dv, sig);
        if (q > CFG.burstQ) {
          const f = Math.min(1, (q - CFG.burstQ) / (CFG.qMax * 1.3 - CFG.burstQ));
          burstAcc += dt * (14 + 46 * f);
          while (burstAcc >= 1) {
            burstAcc -= 1; burstN++;
            const ang = rng() * Math.PI * 2, sp = (80 + rng() * 260) * L.s;
            parts.push({ x: L.px, y: L.py - 3 * L.s, vx: Math.cos(ang) * sp * 0.9, vy: -(120 + rng() * 420) * L.s, r: (1.3 + rng() * 2.6) * L.s, landY: L.py + (rng() - 0.35) * L.ry * 0.7 + Math.sin(ang) * L.ry * 0.45, vol: 1.5 + rng() * 4, pale: false, life: 0 });
          }
          shake = Math.max(shake, (2 + 4 * f) * L.s); burstHapT -= dt;
          if (burstHapT <= 0) { burstHapT = 0.16; haptic([22, 12, 22]); sound.burst(); }
        }
      } else if (q > 3) {
        dripAcc += dv;
        while (dripAcc >= CFG.dripVol) { dripAcc -= CFG.dripVol; spawnDrip(CFG.dripVol); }
      }
      streamHold = Math.max(0, streamHold - dt);
      if (q > 100) { hapT -= dt; if (hapT <= 0) { hapT = 0.09; haptic(Math.min(16, 3 + q / 160)); } }
      sound.setFlow(q, clock);
      // 滴・飛沫
      const gr = 2600 * L.s, land = L.py - 2 * L.s;
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i]; if (d.delay > 0) { d.delay -= dt; continue; }
        d.vy += gr * dt; d.y += d.vy * dt;
        if (d.y >= land) { landOn(L.px, land, d.vol, 1.3); sound.drip(i); haptic(5); drips.splice(i, 1); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.pale) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) parts.splice(i, 1); continue; }
        p.vy += 1700 * L.s * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vy > 0 && p.y >= p.landY) { landOn(p.x, p.landY, p.vol, 1.35); parts.splice(i, 1); }
      }
      shake *= Math.exp(-9 * dt);
      sim.step(CFG.substeps);
      // 記録(リプレイ)
      frameN++;
      if (frameN % CFG.recEvery === 0) {
        const r = ring[ringI]; const h = sim.h, d = r.data;
        for (let i = 0; i < d.length; i++) { const v = h[i] * QSCALE; d[i] = v > 255 ? 255 : v; }
        r.theta = theta; r.q = q; r.t = elapsed; ringI = (ringI + 1) % ring.length; ringN = Math.min(ring.length, ringN + 1);
      }
      // 確定判定
      const quiet = !hold && q < 5 && drips.length === 0;
      idleT = quiet ? idleT + dt : 0;
      if ((idleT >= CFG.idleEndSec && sim.poured >= CFG.minPourFrac * Vt) || (elapsed >= CFG.limitSec + 0.6 && quiet)) finish();
    };

    const finish = () => {
      if (phase === 'done') return;
      phase = 'done'; sound.setFlow(0, clock);
      sim.step(70);
      const V = sim.poured, err = V / Vt - 1, score = scoreFromErr(err);
      const lr = lastRel || elapsed;
      const frames: Frame[] = [];
      for (let i = 0; i < ringN; i++) {
        const r = ring[(ringI - ringN + i + ring.length * 2) % ring.length];
        if (r.t >= lr - 1.3 && r.t <= lr + 1.1) frames.push({ data: r.data.slice(), theta: r.theta, q: r.q });
      }
      const field = sim.h.slice();
      const art = buildArt({ err, V, Vt, grams: V * gpu, targetG: CFG.targetG, score, burst: burstN, presses, elapsed }, field, frames);
      sound.fin(score >= 700);
      const gs = (V * gpu).toFixed(1), pct = (err >= 0 ? '+' : '−') + (Math.abs(err) * 100).toFixed(1) + '%';
      ctx.finish({
        score, scoreText: `${score}点`, shareText: `ケチャップ${gs}g（目標${CFG.targetG}gとの誤差${pct}）で${score}点！`,
        durationMs: Math.max(3100, Math.round(elapsed * 1000)), detail: `${gs}g / 誤差${pct}`, art,
      });
    };

    const text = (s: string, x: number, y: number, size: number, fill = '#4a3226', align: CanvasTextAlign = 'center', stroke = 'rgba(255,255,255,.85)') => {
      g.font = `900 ${Math.round(size)}px ${FONT}`; g.textAlign = align; g.lineJoin = 'round'; g.lineWidth = size * 0.22; g.strokeStyle = stroke; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y);
    };
    const render = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (backdrop) g.drawImage(backdrop, 0, 0, W, H);
      g.save();
      if (shake > 0.05) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shader.shade(sim.h); shader.draw(g, L);
      drawTarget(g, L, clock, 0.92, true);
      // ノズル下の影
      const cH = sim.h[(N >> 1) * N + (N >> 1)];
      const landY = L.py - Math.min(26, cH * 3.4) * L.s;
      if (streamHold > 0 || q >= 70) drawStream(g, L, Math.max(q, streamHold > 0 ? 9 : 0), landY, clock);
      for (const d of drips) if (d.delay <= 0) drawDrop(g, d.x, d.y, (2.4 + Math.sqrt(d.vol) * 0.7) * L.s);
      for (const p of parts) { if (p.pale) drawDrop(g, p.x, p.y, p.r, Math.max(0, p.life * 2) * 0.6); else drawDrop(g, p.x, p.y, p.r); }
      drawBottle(g, L, theta, Math.min(1, q / 1000) * 0.9 + (holdIn ? 0.1 : 0));
      g.restore();
      // HUD
      const s = L.s;
      if (phase === 'ready') {
        const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
        text('長押しで、出せ', W / 2, H * 0.1, Math.min(36, W * 0.09));
        text('傾けるほど、一気に出る', W / 2, H * 0.1 + Math.min(36, W * 0.09) * 1.1, Math.min(18, W * 0.045), '#7a5a46');
        g.save(); g.globalAlpha = 0.55 + 0.4 * pulse; g.fillStyle = 'rgba(255,255,255,.9)'; g.strokeStyle = 'rgba(74,50,38,.5)'; g.lineWidth = 2;
        g.beginPath(); g.arc(W / 2, H * 0.93, 26 * s + pulse * 4, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      } else if (phase === 'play') {
        const left = Math.max(0, CFG.limitSec - elapsed);
        text(left.toFixed(1), W / 2, H * 0.085, Math.min(40, W * 0.1), left < 3 ? '#b3151b' : '#4a3226');
        if (idleT > 0.05 && sim.poured >= CFG.minPourFrac * Vt) {
          const bw = W * 0.4, bx = (W - bw) / 2, by = H * 0.1; g.fillStyle = 'rgba(74,50,38,.2)'; g.fillRect(bx, by, bw, 4);
          g.fillStyle = '#c4161c'; g.fillRect(bx, by, bw * Math.min(1, idleT / CFG.idleEndSec), 4);
        } else if (elapsed < 2.5 && sim.poured < CFG.minPourFrac * Vt) text('離すと止まる。押すほど勢いが増す', W / 2, H * 0.115, Math.min(15, W * 0.04), '#7a5a46');
        // 傾きゲージ
        const gx = 14, gh = H * 0.2, gy = H * 0.36;
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.roundRect(gx, gy, 8, gh, 4); g.fill();
        g.fillStyle = 'rgba(179,21,27,.35)';
        const thBurst = CFG.theta0 + (1 - CFG.theta0) * Math.pow(CFG.burstQ / CFG.qMax, 1 / CFG.qExp);
        g.fillRect(gx, gy, 8, gh * (1 - thBurst)); // 上端(高θ)＝飛沫ゾーン
        g.fillStyle = 'rgba(74,50,38,.25)'; g.fillRect(gx - 2, gy + gh * (1 - CFG.theta0) - 1, 12, 2);
        g.fillStyle = '#c4161c'; g.beginPath(); g.roundRect(gx - 3, gy + gh * (1 - theta) - 3, 14, 6, 3); g.fill();
      }
      void s;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(0.05, (now - last) / 1000); last = now;
      while (acc >= FIXED) { update(FIXED); acc -= FIXED; if (phase === 'done') { acc = 0; break; } }
      render();
    };
    raf = requestAnimationFrame(loop);

    return {
      destroy() {
        cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur);
        cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('lostpointercapture', onUp); cv.removeEventListener('contextmenu', noCtx);
        sound.destroy(); audio.stopBgm(); cv.remove(); backdrop = null; drips.length = 0; parts.length = 0;
      },
    };
  },
};
export default mod;

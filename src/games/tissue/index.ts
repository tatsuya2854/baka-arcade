import type { GameModule, GameContext, GameInstance } from '../../core/types';
import type { AudioEngine } from '../../core/audio';
import { haptic } from '../../core/haptic';
import { meta } from './meta';
import { CFG } from './config';
import { Sim, newSnap, type Snap } from './sim';
import { drawScene, layout, ensureImgs, releaseHand } from './render';
import { makeArt, pickTitle, type Info } from './art';

/** 紙の擦れる音（ノイズ + バンドパス）。連続音 + 単発のくしゃ音 */
class Rub {
  private src?: AudioBufferSourceNode; private gain?: GainNode; private bp?: BiquadFilterNode;
  constructor(private a: AudioEngine) {
    const c = a.ctx; if (!c || !a.master) return;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < d.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = b; }
    this.src = c.createBufferSource(); this.src.buffer = buf; this.src.loop = true;
    this.bp = c.createBiquadFilter(); this.bp.type = 'bandpass'; this.bp.frequency.value = 2800; this.bp.Q.value = 0.6;
    this.gain = c.createGain(); this.gain.gain.value = 0;
    this.src.connect(this.bp); this.bp.connect(this.gain); this.gain.connect(a.master); this.src.start();
  }
  set(level: number, freq: number) {
    const c = this.a.ctx; if (!c || !this.gain || !this.bp) return;
    this.gain.gain.setTargetAtTime(this.a.muted ? 0 : level, c.currentTime, 0.03); this.bp.frequency.setTargetAtTime(freq, c.currentTime, 0.05);
  }
  burst(vol: number, hp: number, dur: number) {
    const c = this.a.ctx; if (!c || this.a.muted || !this.a.master) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (0.6 + 0.4 * Math.sin(i * 0.3));
    const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.a.master); s.start();
  }
  stop() { try { this.src?.stop(); } catch { /* */ } try { this.src?.disconnect(); this.bp?.disconnect(); this.gain?.disconnect(); } catch { /* */ } }
}

const mod: GameModule = {
  meta,
  start(ctx: GameContext): GameInstance {
    const root = ctx.root, audio = ctx.audio;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none;';
    root.appendChild(cv);
    const g = cv.getContext('2d')!;
    let W = 1, H = 1, dpr = 1;
    const resize = () => { W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(root);

    let rub: Rub | null = null;
    let startedAt = 0, initAt = performance.now(), finished = false, destroyed = false, raf = 0;
    let resultSfx = false, pop = 0, lastCount = 0, timeout = false;
    const sim = new Sim({
      onEngage: () => { rub?.burst(0.14, 3200, 0.07); haptic(12); },
      onTear: () => { rub?.burst(0.3, 1800, 0.28); haptic([18, 20, 28]); },
      onRelease: () => { haptic(8); },
    });
    const snap = newSnap(); const frames: Snap[] = [];
    // 入力
    let down = false, pid = -1, sx = 0, sy = 0, px = 0, py = 0, prevU = 0, prevLat = 0, grabAt = 0;
    const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onDown = (e: PointerEvent) => {
      if (down || sim.phase !== 'ready') return;
      e.preventDefault(); audio.unlock(); ctx.started(); startedAt = performance.now();
      try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
      down = true; pid = e.pointerId; [sx, sy] = pos(e); px = sx; py = sy; prevU = 0; prevLat = 0; grabAt = performance.now();
      sim.grab(); rub = new Rub(audio); haptic(6);
    };
    const onMove = (e: PointerEvent) => { if (!down || e.pointerId !== pid) return; e.preventDefault(); [px, py] = pos(e); };
    const onUp = (e: PointerEvent) => { if (!down || e.pointerId !== pid) return; down = false; sim.release(); };
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    const stopCtx = (e: Event) => e.preventDefault(); cv.addEventListener('contextmenu', stopCtx);

    const score = (): { score: number; info: Info } => {
      const n = sim.count, avgV = sim.movT > 0.05 ? sim.movDist / sim.movT : 0;
      const returned = sim.pulled && !sim.torn && n === 0;
      const travel = Math.max(0, sim.releasedY - CFG.peek);
      let sc = 0;
      if (sim.torn) sc = Math.round(120 + 160 * Math.min(1, sim.tornAt));
      else if (returned) sc = Math.round(Math.min(1, travel / 0.78) * 60);
      else if (n >= 1) {
        const angB = 1 - Math.min(1, sim.maxAng / CFG.angMax), spdB = Math.max(0, 1 - Math.abs(avgV - CFG.idealV) / CFG.idealV);
        if (n === 1) sc = Math.round(CFG.one + CFG.oneAng * angB + CFG.oneSpeed * spdB);
        else sc = Math.round(CFG.multi / Math.pow(n - 1, CFG.multiPow) * (0.85 + 0.15 * angB));
      }
      sc = Math.max(0, Math.min(1000, sc));
      return { score: sc, info: { n, torn: sim.torn, tornFrac: sim.tornAt, returned, timeout, score: sc, angDeg: sim.maxAng * 180 / Math.PI, avgV, peakV: sim.peakV, travel, snaps: frames.slice() } };
    };

    const doFinish = () => {
      if (finished) return; finished = true;
      if (!startedAt) { ctx.started(); }
      const { score: sc, info } = score(), art = makeArt(info), n = info.n;
      const dur = Math.max(3000, Math.round(timeout && !startedAt ? CFG.timeLimit * 1000 : performance.now() - startedAt));
      const t = pickTitle(info).title;
      ctx.finish({
        score: sc, scoreText: `${sc}点`, durationMs: dur, art,
        shareText: info.timeout ? 'ティッシュを前に10秒固まった' : info.torn ? 'ティッシュがちぎれた' : n === 1 ? `ティッシュをちょうど1枚取った(${sc}点)` : n === 0 ? 'ティッシュを取れなかった' : `ティッシュを${n}枚取った(${sc}点)`,
        detail: t,
      });
    };

    let acc = 0, last = performance.now(), stepN = 0;
    const frame = (now: number) => {
      if (destroyed) return; raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
      const lay = layout(W, H), D = CFG.dt, k = Math.floor(acc / D);
      if (sim.phase === 'pull' && now - grabAt > CFG.timeLimit * 1000) { down = false; sim.release(); }
      if (sim.phase === 'ready' && now - initAt > CFG.timeLimit * 1000 && !finished) { timeout = true; sim.pulled = false; doFinish(); }
      if (k > 0) {
        const curU = (sy - py) / lay.L, curLat = (px - sx) / lay.L;
        for (let i = 1; i <= k; i++) {
          if (sim.phase === 'pull') sim.stepHeld(D, prevU + (curU - prevU) * i / k, prevLat + (curLat - prevLat) * i / k);
          else if (sim.phase !== 'ready') sim.stepFree(D);
          if ((++stepN & 3) === 0 && sim.phase !== 'ready' && !(sim.phase === 'fall' && sim.fall > 0.25)) { frames.push(sim.snap({ ...snap }, 0, sim.clock)); if (frames.length > 72) frames.shift(); }
        }
        acc -= k * D; prevU = curU; prevLat = curLat;
      }
      if (sim.phase === 'fall' && !resultSfx) {
        resultSfx = true; rub?.set(0, 2000);
        const n = sim.count;
        if (sim.torn) { audio.sfx('ng'); haptic([20, 40, 20]); } else if (n === 1) { audio.sfx('ok'); haptic([10, 30, 10]); } else if (n >= 8) { audio.sfx('boom'); audio.sfx('combo'); haptic([30, 30, 60]); } else if (n >= 2) { audio.sfx('whoosh'); haptic(20); } else audio.sfx('tap');
      }
      // 音
      if (rub && sim.phase === 'pull') {
        const lvl = Math.min(0.32, sim.v * 0.09 + sim.fr * 0.018 * (sim.v > 0.05 ? 1 : 0)) * (0.75 + 0.25 * Math.sin(sim.clock * 61));
        rub.set(lvl, 1800 + Math.min(3, sim.v) * 900);
        if (sim.v > 0.3 && (stepN % 48) < 4) haptic(3);
      } else if (rub && sim.phase === 'fly') rub.set(Math.min(0.2, sim.v * 0.05), 3000);
      // 描画
      sim.snap(snap, sim.phase === 'ready' ? Math.min(1, (now - initAt) / 700) * 0.9 : 0, sim.clock + (sim.phase === 'ready' ? (now - initAt) / 1000 : 0));
      if (snap.count !== lastCount) { if (snap.count > lastCount) pop = 1; lastCount = snap.count; }
      pop = Math.max(0, pop - dt * 4);
      const elapsed = sim.phase === 'ready' ? (now - initAt) / 1000 : sim.phase === 'pull' ? (now - grabAt) / 1000 : 0;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(g, W, H, snap, snap.time, { hud: true, pop, timeFrac: sim.phase === 'ready' || sim.phase === 'pull' ? 1 - elapsed / CFG.timeLimit : 0 });
      if (sim.done && now - startedAt >= 3200) doFinish();
    };
    // 画像を先読みしてから開始（失敗/遅延は2.5秒で打ち切り旧描画へ）
    Promise.race([ensureImgs(), new Promise<void>(r => setTimeout(r, 2500))]).then(() => {
      if (destroyed) return; initAt = performance.now();
      raf = requestAnimationFrame((t) => { last = t; frame(t); });
    });

    return {
      destroy() {
        destroyed = true; releaseHand(); cancelAnimationFrame(raf); ro.disconnect(); rub?.stop(); audio.stopBgm();
        cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
        cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('contextmenu', stopCtx);
        cv.remove();
      },
    };
  },
};
export default mod;

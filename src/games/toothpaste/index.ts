import type { GameContext, GameModule } from '../../core/types';
import { haptic } from '../../core/haptic';
import { meta } from './meta';
import { REVEAL_SEC, ROUNDS, SETTLE_SEC, STAGES, TRANS_SEC, fmtCm, roundScore } from './config';
import { drawScene, newScene } from './draw';
import { newSim, resume, settled, step, type Sim } from './sim';
import { buildArt, sampleOf, judge, type RoundRes, type Sample } from './art';

const easeIn = (k: number) => k * k, easeOut = (k: number) => 1 - (1 - k) * (1 - k);

const mod: GameModule = {
  meta,
  start(ctx: GameContext) {
    const root = ctx.root, audio = ctx.audio;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;';
    root.appendChild(canvas);
    const g = canvas.getContext('2d')!;
    let W = 1, H = 1;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = root.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(root);
    window.addEventListener('resize', resize);

    // ---- 状態 ----
    type Phase = 'play' | 'reveal' | 'trans' | 'done';
    let phase: Phase = 'play', round = 0, sim: Sim = newSim(), down = false;
    let revT = 0, transT = 0, clock = 0, hapT = 0, firstAt = 0, begun = false, finished = false;
    const rounds: RoundRes[] = [];
    let trace: Sample[] = [], rt = 0, usedMm = 0, usedBase = 0;
    let oldShot: ReturnType<typeof newScene> | null = null;
    const sc = newScene(), snap = newScene();
    sc.target = STAGES[0].target;

    // ---- 音（握る摩擦音・ブシュッ・離す音） ----
    let nBuf: AudioBuffer | null = null;
    let sq: { src: AudioBufferSourceNode; bp: BiquadFilterNode; gn: GainNode; o: OscillatorNode; og: GainNode } | null = null;
    const noiseBuf = () => {
      const c = audio.ctx!;
      if (!nBuf) { nBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      return nBuf;
    };
    const squeezeStart = () => {
      if (!audio.ctx || sq) return;
      try {
        const c = audio.ctx;
        const src = c.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 5;
        const gn = c.createGain(); gn.gain.value = 0;
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 700;
        const og = c.createGain(); og.gain.value = 0;
        src.connect(bp); bp.connect(gn); gn.connect(audio.master); o.connect(og); og.connect(audio.master);
        src.start(); o.start();
        sq = { src, bp, gn, o, og };
      } catch { sq = null; }
    };
    const squeezeStop = () => {
      if (!sq || !audio.ctx) { sq = null; return; }
      const c = audio.ctx, t = c.currentTime, q = sq; sq = null;
      try { q.gn.gain.setTargetAtTime(0, t, 0.03); q.og.gain.setTargetAtTime(0, t, 0.03); q.src.stop(t + 0.25); q.o.stop(t + 0.25); } catch { /* */ }
    };
    const squeezeUpdate = () => {
      if (!sq || !audio.ctx) return;
      const t = audio.ctx.currentTime;
      sq.bp.frequency.setTargetAtTime(700 + sim.g * 1500 + sim.flow * 900, t, 0.03);
      sq.gn.gain.setTargetAtTime(0.02 + sim.g * 0.05 + sim.flow * 0.1, t, 0.04);
      sq.o.frequency.setTargetAtTime(620 + sim.g * 700 + Math.sin(clock * 9) * 40, t, 0.05);
      sq.og.gain.setTargetAtTime(sim.held < 0.35 ? 0.05 * (1 - sim.held / 0.35) : 0.004 + sim.flow * 0.01, t, 0.03);
    };
    const burp = () => {
      if (!audio.ctx || audio.muted) return;
      const c = audio.ctx, t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = noiseBuf();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
      const gn = c.createGain(); gn.gain.setValueAtTime(0.4, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      s.connect(lp); lp.connect(gn); gn.connect(audio.master); s.start(t); s.stop(t + 0.22);
      const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
      og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(og); og.connect(audio.master); o.start(t); o.stop(t + 0.2);
    };
    const snapSound = () => {
      if (!audio.ctx || audio.muted) return;
      const c = audio.ctx, t = c.currentTime, o = c.createOscillator(), og = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.09);
      og.gain.setValueAtTime(0.22, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(og); og.connect(audio.master); o.start(t); o.stop(t + 0.12);
    };

    // ---- 入力 ----
    const press = () => {
      if (finished || phase !== 'play') return;
      audio.unlock();
      if (!begun) { begun = true; firstAt = performance.now(); ctx.started(); }
      if (down) return;
      down = true;
      if (sim.released) resume(sim);
      if (!sim.released) { squeezeStart(); haptic(8); }
    };
    const release = () => {
      if (!down) return;
      down = false;
      if (phase === 'play' && sim.pressed) { squeezeStop(); snapSound(); haptic(12); }
    };
    const pd = (e: PointerEvent) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch { /* */ } press(); };
    const pu = () => release();
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointerup', pu);
    canvas.addEventListener('pointercancel', pu);
    window.addEventListener('pointerup', pu);
    window.addEventListener('blur', pu);
    const kd = (e: KeyboardEvent) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); press(); } };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') release(); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    const startRound = () => {
      sim = newSim(); down = false; revT = 0; trace = []; rt = 0;
      usedBase = usedMm;
    };

    const fillScene = () => {
      const st = STAGES[round];
      sc.L = sim.L; sc.target = st.target; sc.grip = sim.g; sc.flow = sim.flow; sc.amp = sim.amp; sc.spat = sim.spat;
      sc.used = Math.min(1, (usedBase + sim.L) / 600);
      if (phase !== 'reveal') {
        sc.lift = sim.released ? Math.min(1, sim.relT * 2.4) : 0;
        sc.thread = sim.released && sim.relFlow > 0.08 ? Math.max(0, 1 - sim.relT / 0.28) : 0;
        sc.taper = sim.released && sim.relFlow > 0.08 ? Math.min(1, sim.relT * 2) : 0;
        sc.reveal = 0;
      } else {
        sc.lift = Math.min(2.6, 1 + revT * 1.4); sc.thread = 0; sc.taper = sim.relFlow > 0.08 ? 1 : 0; sc.reveal = Math.min(1, revT / 0.4);
      }
      sc.hud = { round: round + 1, total: ROUNDS, hint: round === 0 && !sim.pressed ? '長押しでしぼる ／ 離すと止まる' : '', held: down && !sim.released };
    };

    const finishGame = () => {
      if (finished) return; finished = true; phase = 'done';
      const avg = rounds.reduce((a, r) => a + roundScore(r.err), 0) / rounds.length;
      const score = Math.round(avg), j = judge(rounds);
      const art = buildArt(rounds, trace);
      const dur = Math.max(3000, Math.round(performance.now() - (firstAt || performance.now())));
      ctx.finish({
        score, scoreText: `${score}点`, durationMs: dur, art,
        shareText: `歯磨き粉${fmtCm(rounds[0].target)}に挑戦。平均誤差${j.mean.toFixed(1)}mm『${art.title}』`,
        detail: rounds.map(r => `${fmtCm(r.L)}`).join(' / '),
      });
    };

    // ---- ループ ----
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000)); last = now; clock += dt;
      if (phase === 'play') {
        const n = 2, c = STAGES[round];
        for (let i = 0; i < n; i++) if (step(sim, c, down, dt / n)) { burp(); haptic([18]); }
        if (sim.released && sq) squeezeStop();
        squeezeUpdate();
        if (sim.flow > 0.04 && !sim.released) { hapT -= dt; if (hapT <= 0) { hapT = 0.09; haptic(4 + Math.round(sim.flow * 6)); } }
        if (settled(sim, SETTLE_SEC)) {
          const target = c.target, err = sim.L - target;
          rounds.push({ target, L: sim.L, err });
          usedMm += sim.L; phase = 'reveal'; revT = 0;
          const a = Math.abs(err);
          if (a <= 0.5) { audio.sfx('combo'); haptic([10, 30, 10, 30, 20]); }
          else if (a <= 3) { audio.sfx('ok'); haptic([10, 20, 10]); }
          else if (a > 25) { audio.sfx('ng'); haptic([30]); }
          else audio.sfx('tap');
        }
        if (sim.pressed) { rt += dt; fillScene(); trace.push({ t: rt, v: sampleOf(sc) }); }
      } else if (phase === 'reveal') {
        revT += dt; rt += dt; fillScene(); trace.push({ t: rt, v: sampleOf(sc) });
        if (revT >= REVEAL_SEC) {
          if (round < ROUNDS - 1) { oldShot = Object.assign(newScene(), sc); phase = 'trans'; transT = 0; }
          else finishGame();
        }
      } else if (phase === 'trans') {
        transT += dt;
        if (oldShot && transT >= TRANS_SEC / 2) { round++; startRound(); oldShot = null; }
        if (transT >= TRANS_SEC) phase = 'play';
      }
      // 描画
      if (phase === 'trans') {
        const k = transT / TRANS_SEC;
        if (oldShot) { Object.assign(snap, oldShot); snap.hud = undefined; drawScene(g, W, H, snap, clock, -easeIn(k * 2) * 460); }
        else { fillScene(); sc.reveal = 0; drawScene(g, W, H, sc, clock, (1 - easeOut((k - 0.5) * 2)) * 460); }
      } else {
        if (phase !== 'done') fillScene();
        drawScene(g, W, H, sc, clock);
      }
    };
    raf = requestAnimationFrame(loop);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        squeezeStop();
        canvas.removeEventListener('pointerdown', pd);
        canvas.removeEventListener('pointerup', pu);
        canvas.removeEventListener('pointercancel', pu);
        window.removeEventListener('pointerup', pu);
        window.removeEventListener('blur', pu);
        window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
        window.removeEventListener('resize', resize);
        ro?.disconnect();
        canvas.remove();
        nBuf = null;
      },
    };
  },
};
export default mod;

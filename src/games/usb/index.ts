import type { GameModule } from '../../core/types';
import { meta } from './meta';
import { CFG } from './config';
import { drawScene, mmOf, newScene, preloadUsbImages, releaseUsbCaches } from './scene';
import { makeArt, F, type UsbRun } from './art';
import { makeSound } from './sound';
import { haptic } from '../../core/haptic';

type Phase = 'idle' | 'hold' | 'fly' | 'bounce' | 'seat' | 'over';
const REC = 360;

const mod: GameModule = {
  meta,
  start(ctx) {
    const root = ctx.root, A = ctx.audio, snd = makeSound(A);
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none';
    root.appendChild(cv);
    const g = cv.getContext('2d')!;
    let W = 0, H = 0, dpr = 1;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    resize(); addEventListener('resize', resize);

    const S = newScene();
    let phase: Phase = 'idle', started = false, t0 = 0, now = 0, elapsed = 0, over = false;
    let flipTarget = 1, fails = 0, wrongSide = 0, errMm = 0, errDeg = 0, hitStop = 0, phaseT = 0, lastFlipBy = 0;
    let tremT = 0, spd = 0, rotFrozen = 0, forced = false, ok = false, failShowT = 0, hintT = 0, bumpText = '', bumpT = 0, subText = '', subT = 0;
    let pid = -1, downAt = 0, downX = 0, downY = 0, lastX = 0, lastY = 0, moved = 0;
    let bx = 0, by = 0, bz = 0, kx = 0, ky = 0; // bounce start/knock
    let frameNo = 0, releaseFrame = 0, recN = 0;
    const rec = new Float32Array(REC * F);
    let run: UsbRun | null = null;

    const m = () => mmOf(W, H);
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const ease = (a: number) => a * a * (3 - 2 * a);

    const down = (e: PointerEvent) => {
      if (over || pid !== -1) return; e.preventDefault();
      pid = e.pointerId; try { cv.setPointerCapture(pid); } catch { /* */ }
      A.unlock(); if (!started) { started = true; t0 = performance.now(); ctx.started(); }
      downAt = performance.now(); downX = lastX = e.clientX; downY = lastY = e.clientY; moved = 0;
      if (phase === 'idle') { phase = 'hold'; snd.grab(); }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return; e.preventDefault();
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; moved += Math.hypot(dx, dy);
      if (phase === 'hold') { S.x = clamp(S.x + dx / m(), -13, 13); S.y = clamp(S.y + dy / m(), -9, 24); spd = Math.max(spd, Math.hypot(dx, dy) / m() * 60); }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return; pid = -1; try { cv.releasePointerCapture(e.pointerId); } catch { /* */ }
      if (phase !== 'hold') return;
      if (moved < 10 && performance.now() - downAt < 380) { flipTarget = 1 - flipTarget; lastFlipBy = elapsed; snd.flip(); haptic(6); phase = 'idle'; return; }
      // 挿入試行
      rotFrozen = S.rot; phase = 'fly'; phaseT = 0; releaseFrame = frameNo; hintT = 99; snd.tick();
    };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const key = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); if (phase === 'idle' || phase === 'hold') { flipTarget = 1 - flipTarget; snd.flip(); } } };
    addEventListener('keydown', key);

    const finish = () => {
      if (over) return; over = true; phase = 'over';
      const timeSec = Math.max(3, (performance.now() - t0) / 1000);
      let score: number;
      if (ok) score = clamp(Math.round(1000 - fails * CFG.scorePerFail - Math.min(errMm, 1.4) * CFG.scorePerMm - errDeg * 4 - (forced ? CFG.forcePenalty : 0)), 40, 1000);
      else score = CFG.timeoutScore + Math.min(fails, 5) * 3;
      const n = Math.min(recN, REC), cnt = Math.min(n, frameNo - releaseFrame + 24);
      // 直近 cnt フレームを時系列順に抽出
      const out = new Float32Array(cnt * F);
      for (let i = 0; i < cnt; i++) { const src = ((frameNo - cnt + i) % REC + REC) % REC; out.set(rec.subarray(src * F, src * F + F), i * F); }
      run = { ok, forced, fails, wrongSide, errMm, errDeg, timeSec, score, scratches: S.scratches.slice(), frames: out, nFrames: cnt, light: [S.lx, S.ly] };
      ctx.finish({
        score, scoreText: `${score}点`, durationMs: Math.round(timeSec * 1000),
        shareText: ok ? `USBを${fails + 1}回目で挿した（${score}点）` : `USBが挿せなかった（${score}点）`,
        detail: `${fails}ミス / ずれ${errMm.toFixed(1)}mm`, art: makeArt(run),
      });
    };

    const evaluate = () => {
      const x = S.x, y = S.y, ang = Math.abs(rotFrozen) * 180 / Math.PI;
      const posOk = Math.abs(x) <= CFG.tolX && Math.abs(y) <= CFG.tolY, angOk = ang <= CFG.tolAng, sideOk = flipTarget === 0;
      errMm = Math.hypot(x, y * 1.2); errDeg = ang;
      if (posOk && angOk && sideOk) { ok = true; phase = 'seat'; phaseT = 0; return; }
      if (posOk && angOk && !sideOk && fails >= CFG.forceAfterFails) { ok = true; forced = true; wrongSide++; phase = 'seat'; phaseT = 0; return; }
      fails++; if (!sideOk) wrongSide++;
      bumpText = !sideOk ? 'ガツッ' : 'ゴツッ'; bumpT = 0.7;
      subText = !sideOk && wrongSide >= 3 ? '……裏だった。' : !sideOk ? '向きが逆' : !posOk ? 'ずれてる' : '傾いてる'; subT = 1.1;
      S.sparkAge = 0; S.sparkN = !sideOk ? 30 : 18; S.flash = 1; S.led = -1; hitStop = 0.07;
      const sx = clamp(x, -6.2, 6.2), sy = clamp(y, -2.6, 2.6);
      S.scratches.push({ x: sx + (Math.random() - 0.5), y: sy, a: Math.random() * 3.1 + 0.2, l: 0.8 + Math.random() * 1.2 }); if (S.scratches.length > 14) S.scratches.shift();
      snd.bump(fails); haptic([30, 20, 40]);
      bx = S.x; by = S.y; bz = 0; kx = clamp(x * 0.9, -4, 4) + (x >= 0 ? 1 : -1) * 0.5; ky = clamp(y * 0.9 + 3, -2, 5);
      phase = 'bounce'; phaseT = 0;
    };

    let raf = 0, last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const tn = performance.now(); let dt = Math.min(0.05, (tn - last) / 1000); last = tn; now += dt;
      if (!over) {
        if (started) elapsed = (tn - t0) / 1000;
        hintT += dt; subT = Math.max(0, subT - dt); bumpT = Math.max(0, bumpT - dt);
        if (hitStop > 0) { hitStop -= dt; dt = 0; }
        // ライト(暗がりでゆれる)
        S.lx = Math.sin(now * 0.85) * 5.5 + Math.sin(now * 2.3) * 0.8; S.ly = Math.sin(now * 1.25 + 1) * 2.8 - 0.4;
        // 反転アニメ
        const fd = flipTarget - S.flipT; S.flipT += Math.sign(fd) * Math.min(Math.abs(fd), dt * 5);
        // 手ブレ
        spd *= Math.pow(0.02, dt); tremT += dt;
        if (phase === 'idle' || phase === 'hold') {
          const amp = (CFG.tremorBase + CFG.tremorMove * clamp(spd / 40, 0, 1)) * Math.PI / 180;
          S.rot = amp * (0.6 * Math.sin(tremT * 7.3) + 0.4 * Math.sin(tremT * 11.7 + 1));
        }
        S.z = (phase === 'idle' || phase === 'hold') ? CFG.hover + Math.sin(tremT * 3) * 0.25 : S.z;
        S.shx *= Math.pow(0.001, dt); S.shy *= Math.pow(0.001, dt); S.flash = Math.max(0, S.flash - dt * 5);
        if (S.sparkAge >= 0) { S.sparkAge += dt; if (S.sparkAge > 0.8) S.sparkAge = -1; }
        phaseT += dt;
        if (phase === 'fly') {
          const u = Math.min(1, phaseT / CFG.flySec); S.z = CFG.hover * (1 - u * u); S.rot = rotFrozen;
          if (u >= 1) { S.z = 0; evaluate(); }
        } else if (phase === 'bounce') {
          const u = Math.min(1, phaseT / CFG.bounceSec), e = 1 - (1 - u) * (1 - u);
          S.z = CFG.hover * 0.8 * e; S.x = bx + kx * e * 0.5; S.y = by + ky * e * 0.6; S.rot = rotFrozen * (1 - e * 0.6) + Math.sin(phaseT * 40) * 0.06 * (1 - u);
          const sh = (1 - u) * 9 * m() / 20; S.shx = Math.sin(phaseT * 70) * sh; S.shy = Math.cos(phaseT * 61) * sh * 0.6;
          if (u >= 1) { phase = 'idle'; S.led = 0; }
          S.led = -Math.max(0, 1 - u * 1.5);
        } else if (phase === 'seat') {
          const u = Math.min(1, phaseT / 0.28); S.z = 0; S.insert = ease(u); S.x *= 0.85; S.y *= 0.85; S.rot = rotFrozen * (1 - u);
          if (!(S as any)._seated && u >= 0.7) { (S as any)._seated = true; if (forced) { snd.crunch(); haptic([60, 30, 80]); S.shx = 8; S.sparkAge = 0; S.sparkN = 36; S.flash = 1; S.led = -1; } else { snd.insert(); haptic([14, 30, 10]); S.led = 1; S.flash = 0.4; } }
          if (phaseT > CFG.seatSec) finish();
        }
        // タイムアップ
        if (started && elapsed >= CFG.limitSec && (phase === 'idle' || phase === 'hold')) { ok = false; if (fails === 0) { errMm = Math.hypot(S.x, S.y); errDeg = Math.abs(S.rot) * 180 / Math.PI; } failShowT += 0; finish(); }
        if (started) { const o = (frameNo % REC) * F; rec[o] = S.x; rec[o + 1] = S.y; rec[o + 2] = S.z; rec[o + 3] = S.rot; rec[o + 4] = S.flipT; rec[o + 5] = S.shx; rec[o + 6] = S.shy; rec[o + 7] = S.lx; rec[o + 8] = S.ly; rec[o + 9] = S.insert; rec[o + 10] = S.sparkAge; frameNo++; recN++; }
      }
      // 描画
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      drawScene(g, W, H, S);
      hud();
    };
    const hud = () => {
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
      // 明るい実写の上でも読めるよう黒縁を付ける
      const ft = (t: string, x: number, y: number) => { const f = g.fillStyle; g.save(); g.lineJoin = 'round'; g.lineWidth = Math.max(3, parseFloat(/([\d.]+)px/.exec(g.font)?.[1] ?? '16') * 0.18); g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, y); g.restore(); g.fillStyle = f; g.fillText(t, x, y); };
      const sz = Math.min(W, H);
      if (started) { // 時間バー
        const r = clamp(1 - elapsed / CFG.limitSec, 0, 1); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(W * 0.06, 14, W * 0.88, 4);
        g.fillStyle = r > 0.3 ? 'rgba(160,150,255,0.85)' : 'rgba(255,100,90,0.9)'; g.fillRect(W * 0.06, 14, W * 0.88 * r, 4);
        g.font = `900 ${sz * 0.07}px system-ui, sans-serif`; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.88)'; ft(`ミス ${fails}`, W * 0.06, 52);
        g.textAlign = 'right'; g.font = `800 ${sz * 0.045}px ui-monospace, monospace`; g.fillStyle = 'rgba(255,255,255,0.5)'; ft(`${Math.max(0, CFG.limitSec - elapsed).toFixed(1)}s`, W * 0.94, 52);
      }
      g.textAlign = 'center';
      if (bumpT > 0) { const a = Math.min(1, bumpT * 3), k = 1 + (0.7 - bumpT) * 0.5; g.save(); g.translate(W / 2, 112); g.rotate(-0.06); g.scale(k, k); g.font = `900 ${sz * 0.16}px system-ui, sans-serif`; g.lineWidth = sz * 0.02; g.strokeStyle = `rgba(0,0,0,${0.7 * a})`; g.fillStyle = `rgba(255,86,70,${a})`; g.strokeText(bumpText, 0, 0); ft(bumpText, 0, 0); g.restore(); }
      if (subT > 0) { g.font = `900 ${sz * 0.055}px system-ui, sans-serif`; g.fillStyle = `rgba(255,255,255,${Math.min(1, subT * 2)})`; ft(subText, W / 2, 112 + sz * 0.15); }
      if (fails > 0 || started) { g.font = `800 ${sz * 0.036}px system-ui, sans-serif`; g.fillStyle = 'rgba(255,255,255,0.38)'; ft('ドラッグで合わせて離す ／ タップで反転', W / 2, H * 0.955); }
      if (!started) {
        g.font = `900 ${sz * 0.075}px system-ui, sans-serif`; g.fillStyle = 'rgba(255,255,255,0.92)'; ft('USBを、一発で挿せ。', W / 2, 96);
        g.font = `800 ${sz * 0.04}px system-ui, sans-serif`; g.fillStyle = `rgba(255,255,255,${0.45 + 0.3 * Math.sin(now * 4)})`; ft('ドラッグで位置を合わせて、離す。タップで反転。', W / 2, 140);
      }
      g.restore();
    };
    // 画像の先読みが終わってからループ開始(失敗時は従来描画)
    preloadUsbImages().then(() => { if (!over) { last = performance.now(); raf = requestAnimationFrame(loop); } });
    (window as any).__usb = { S, get state() { return { phase, fails, wrongSide, flipTarget }; }, mm: m, setFlip: (v: number) => { flipTarget = v; }, setFails: (n: number) => { fails = n; } };

    return {
      destroy() {
        cancelAnimationFrame(raf); over = true;
        removeEventListener('resize', resize); removeEventListener('keydown', key);
        cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up);
        A.stopBgm(); releaseUsbCaches(); cv.remove(); delete (window as any).__usb;
      },
    };
  },
};
export default mod;

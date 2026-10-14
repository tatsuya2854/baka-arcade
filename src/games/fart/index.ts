import type { GameModule, GameContext } from '../../core/types';
import { drawUncle, drawBubble } from '../../core/characters';
import { meta } from './meta';
import { CFG } from './config';
import { buildArt } from './art';

type Kind = 'bird' | 'balloon' | 'storm' | 'plane' | 'ufo' | 'meteor';
interface Obs { near?: boolean; kind: Kind; x: number; y: number; vx: number; vy: number; rx: number; ry: number; ph: number; col: string; wrap: boolean; }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; k: number; }

const UPM = CFG.unitsPerMeter;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`; };
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function zoneColors(m: number): [string, string] {
  const z = CFG.zones; let i = 0;
  while (i < z.length - 1 && m >= z[i + 1][0]) i++;
  if (i >= z.length - 1) return [mix(z[i][1], z[i][1], 0), mix(z[i][2], z[i][2], 0)];
  const t = clamp((m - z[i][0]) / (z[i + 1][0] - z[i][0]), 0, 1);
  return [mix(z[i][1], z[i + 1][1], t), mix(z[i][2], z[i + 1][2], t)];
}

const mod: GameModule = {
  meta,
  start(ctx: GameContext) {
    const { root, audio } = ctx;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;';
    root.appendChild(canvas);
    const g = canvas.getContext('2d')!;
    let W = 390, H = 844, S = 1, OX = 0, CW = 0, CH = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      CW = root.clientWidth || window.innerWidth; CH = root.clientHeight || window.innerHeight;
      canvas.width = Math.round(CW * dpr); canvas.height = Math.round(CH * dpr);
      S = Math.min(CW / 390, CH / 640); W = Math.min(CW / S, 460); H = CH / S; OX = (CW - W * S) / 2;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- state ----
    type St = 'ready' | 'play' | 'dying' | 'done';
    let st: St = 'ready';
    let px = W / 2, py = CFG.playerH / 2, vx = 0, vy = 0, tx = W / 2;
    let camY = -90, t = 0, playT = 0, gas = 0, jet = 0, sinceTap = 9, tilt = 0;
    let obs: Obs[] = [], parts: Part[] = [];
    let spawnY = CFG.firstObstacleM * UPM + CFG.playerH / 2 + 700;
    let maxAlt = 0, shake = 0, flash = 0, flashCol = '#fff';
    let banner: { text: string; t: number } | null = null;
    let msIdx = 0, dyingT = 0, bounced = false, rot = 0, spin = 0, bubbleTxt = '', bubbleT = 0, expr: 'idle' | 'happy' | 'angry' | 'wow' | 'scared' = 'idle';
    let taps = 0, peakGas = 0, overheat = 0, birdNear = 0, killer = 'ground', startAt = 0, finished = false, gasWarnT = 0, raf = 0, last = 0, lastTapAt = 0;
    const timers: number[] = [];

    const alt = () => Math.max(0, (py - CFG.playerH / 2) / UPM);

    function puff(n: number, power = 1) {
      for (let i = 0; i < n && parts.length < 320; i++) {
        const a = Math.PI / 2 + rnd(-0.45, 0.45);
        const sp = rnd(120, 360) * power;
        parts.push({ x: px + rnd(-6, 6), y: py - CFG.playerH * 0.18, vx: Math.cos(a) * sp * 0.6 + vx * 0.2, vy: -Math.sin(a) * sp * 0.0 - sp, life: 0, max: rnd(0.4, 0.9), r: rnd(6, 15), k: Math.random() });
      }
    }

    function tap(clientX?: number) {
      if (finished || st === 'dying' || st === 'done') return;
      const now = performance.now();
      if (clientX !== undefined) tx = clamp((clientX - OX) / S, 36, W - 36);
      if (st === 'ready') {
        audio.unlock(); ctx.started(); audio.startBgm(1, 150);
        st = 'play'; startAt = now; vy = CFG.launchImpulse; py += 4; jet = 0.35; expr = 'angry'; sinceTap = 0; taps++;
        audio.sfx('fart', 2); puff(26, 1.3); shake = 6; lastTapAt = now; return;
      }
      lastTapAt = now; taps++;
      const easy = playT < CFG.easyTime ? CFG.easyGasScale : 1;
      const eff = 1 - (1 - CFG.minEff) * clamp(gas, 0, 1) * easy;
      vy = clamp(vy + CFG.tapImpulse * eff, -CFG.maxFall, CFG.maxUp);
      gas = clamp(gas + CFG.gasPerTap, 0, 1.05); peakGas = Math.max(peakGas, gas); if (gas > 0.85) overheat++;
      jet = 0.3; sinceTap = 0; expr = 'angry';
      audio.sfx('fart', Math.floor(Math.random() * 5));
      puff(Math.round(8 + 8 * eff), 0.6 + 0.5 * eff);
      if (gas > 0.85 && gasWarnT <= 0) { gasWarnT = 1.2; bubble('ガス欠ぎみ…', 0.9); }
    }
    function bubble(s: string, d = 1.2) { bubbleTxt = s; bubbleT = d; }

    const onDown = (e: PointerEvent) => { e.preventDefault(); tap(e.clientX - canvas.getBoundingClientRect().left); };
    const onKey = (e: KeyboardEvent) => { if (e.repeat) return; if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); tap(); } };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    function die(kind: 'hit' | 'ground', by = 'ground') {
      killer = by;
      if (st !== 'play') return;
      st = 'dying'; dyingT = 0; audio.stopBgm(); gas = 0;
      if (kind === 'hit') {
        vy = 260; spin = rnd(8, 12) * (Math.random() < 0.5 ? -1 : 1); expr = 'scared';
        audio.sfx('hit'); audio.sfx('boing'); bubble(['うわぁぁ！', 'ぎゃー！', 'おしりがーっ！'][Math.floor(Math.random() * 3)], 1.8);
        flash = 0.35; flashCol = '#fff'; shake = 16;
      } else {
        py = CFG.playerH / 2; vy = 420; spin = 7; expr = 'wow'; bounced = true;
        audio.sfx('thud', 1); audio.sfx('boing'); bubble('ぷすん…', 1.8); shake = 12;
      }
      for (let i = 0; i < 18; i++) parts.push({ x: px, y: py, vx: rnd(-260, 260), vy: rnd(-80, 320), life: 0, max: rnd(0.4, 0.8), r: rnd(4, 9), k: 2 });
      timers.push(window.setTimeout(() => audio.sfx('gameover'), 500));
    }

    function finish() {
      if (finished) return; finished = true; st = 'done';
      const m = Math.floor(maxAlt);
      const durationMs = Math.max(0, Math.round(performance.now() - startAt));
      ctx.finish({ score: m, scoreText: `${m}m`, shareText: `おならで${m}mまで飛びました！`, durationMs, art: buildArt({ m, taps, playSec: playT, peakGas, overheat, birdNear, death: killer === 'ground' ? 'ground' : 'hit', killer, maxVy: 0 }) });
    }

    // ---- obstacles ----
    function pickKind(m: number): Kind {
      const c: [Kind, number][] = [];
      if (m < 450) c.push(['bird', 5]);
      if (m > 30 && m < 600) c.push(['balloon', 4]);
      if (m > 200 && m < 900) c.push(['storm', 3]);
      if (m > 320 && m < 1500) c.push(['plane', 3]);
      if (m > 600) c.push(['ufo', 4]);
      if (m > 900) c.push(['meteor', 5]);
      if (m > 450 && m < 700) c.push(['bird', 1]);
      let tot = 0; c.forEach(a => tot += a[1]); let r = Math.random() * tot;
      for (const [k, w] of c) { if ((r -= w) <= 0) return k; }
      return c[0][0];
    }
    function spawn(y: number) {
      const m = (y - CFG.playerH / 2) / UPM;
      const ramp = clamp(m / CFG.speedRampM, 0, 1);
      const sm = lerp(1, CFG.speedMulMax, ramp) * (m < 120 ? CFG.easySpeedMul : 1);
      const kind = pickKind(m); const dir = Math.random() < 0.5 ? -1 : 1;
      const o: Obs = { kind, x: rnd(40, W - 40), y, vx: 0, vy: 0, rx: 20, ry: 14, ph: Math.random() * 6.28, col: '#fff', wrap: true };
      switch (kind) {
        case 'bird': o.rx = 22; o.ry = 15; o.vx = dir * rnd(90, 150) * sm; o.col = ['#3a3a4a', '#a0522d', '#e04a4a'][Math.floor(Math.random() * 3)]; o.x = dir > 0 ? -30 : W + 30; break;
        case 'balloon': o.rx = 24; o.ry = 30; o.vx = dir * rnd(25, 55) * sm; o.vy = 0; o.col = ['#ff5a7a', '#ffd23f', '#4aa3ff', '#7be07b'][Math.floor(Math.random() * 4)]; o.wrap = false; break;
        case 'storm': o.rx = 52; o.ry = 30; o.vx = dir * rnd(25, 50) * sm; o.wrap = false; break;
        case 'plane': o.rx = 50; o.ry = 14; o.vx = dir * rnd(190, 250) * sm; o.x = dir > 0 ? -60 : W + 60; break;
        case 'ufo': o.rx = 38; o.ry = 18; o.vx = dir * rnd(60, 110) * sm; o.wrap = false; break;
        case 'meteor': o.rx = 20; o.ry = 20; o.x = rnd(30, W - 30); o.vx = rnd(-70, 70); o.vy = -rnd(150, 230) * sm; o.wrap = false; break;
      }
      obs.push(o);
    }

    // ---- update ----
    function update(dt: number) {
      t += dt;
      if (shake > 0) shake = Math.max(0, shake - dt * 40);
      if (flash > 0) flash -= dt;
      if (bubbleT > 0) bubbleT -= dt;
      if (gasWarnT > 0) gasWarnT -= dt;
      if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.5; if (p.k < 2) p.vy *= 1 - dt * 1.2; else p.vy -= 700 * dt;
      }
      if (st === 'ready') { expr = 'idle'; sinceTap = 9; }
      if (st === 'play') {
        playT += dt; sinceTap += dt; jet = Math.max(0, jet - dt);
        gas = Math.max(0, gas - CFG.gasDecay * dt);
        vy = clamp(vy - CFG.gravity * dt, -CFG.maxFall, CFG.maxUp);
        py += vy * dt;
        const dx = tx - px; px += clamp(dx, -CFG.steerSpeed * dt, CFG.steerSpeed * dt);
        tilt = lerp(tilt, clamp(dx / 120, -1, 1) * 0.25, 0.15);
        expr = sinceTap < 0.22 ? 'angry' : sinceTap < 0.9 ? 'happy' : (vy < -300 ? 'wow' : 'idle');
        if (jet > 0 && Math.random() < 0.8) puff(1, 0.5);
        if (py <= CFG.playerH / 2 && vy < 0) { px = clamp(px, 36, W - 36); die('ground'); }
        // altitude progress
        const a = alt(); if (a > maxAlt) maxAlt = a;
        while (msIdx < CFG.milestones.length && maxAlt >= CFG.milestones[msIdx]) {
          const ms = CFG.milestones[msIdx++]; banner = { text: `${ms}m 突破！`, t: 1.6 }; flash = 0.25;
          flashCol = ms >= 1000 ? '#ffd0ff' : '#e8ffe8'; audio.sfx('combo'); if (ms >= 500) audio.sfx('coin');
        }
        // spawn
        const top = camY + H;
        while (spawnY < top + 120) {
          spawn(spawnY);
          const m = (spawnY - CFG.playerH / 2) / UPM;
          spawnY += lerp(CFG.gapStart, CFG.gapMin, clamp(m / CFG.gapRampM, 0, 1)) * rnd(0.85, 1.2);
        }
      }
      if (st === 'dying') {
        dyingT += dt; vy = Math.max(-CFG.maxFall * 1.2, vy - CFG.gravity * 1.3 * dt); py += vy * dt; rot += spin * dt;
        if (py <= CFG.playerH / 2 && vy < 0) {
          py = CFG.playerH / 2;
          if (!bounced) { bounced = true; vy = 380; audio.sfx('boing'); audio.sfx('thud', 3); shake = 12; } else vy = 0;
        }
        if (dyingT > CFG.deathFinishSec) finish();
      }
      // obstacles
      const easyMul = 1;
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i]; o.ph += dt;
        o.x += o.vx * dt * easyMul; o.y += o.vy * dt;
        if (o.kind === 'balloon') o.y += Math.sin(o.ph * 2) * 18 * dt;
        if (o.kind === 'ufo') o.y += Math.sin(o.ph * 3) * 40 * dt;
        if (o.wrap) { if (o.vx > 0 && o.x > W + 70) o.x = -70; else if (o.vx < 0 && o.x < -70) o.x = W + 70; }
        else if (o.kind !== 'meteor') { if ((o.x < o.rx && o.vx < 0) || (o.x > W - o.rx && o.vx > 0)) o.vx = -o.vx; }
        if (o.y < camY - 200 || (o.kind === 'meteor' && (o.x < -80 || o.x > W + 80))) { obs.splice(i, 1); continue; }
        if (st === 'play') {
          const sh = CFG.hitShrink;
          const ex = (px - o.x) / (o.rx * sh + CFG.playerR), ey = (py - o.y) / (o.ry * sh + CFG.playerR);
          let hit = ex * ex + ey * ey < 1;
          if (!hit && o.kind === 'storm') {
            const c = o.ph % 3.2; // 2.4-2.7 予兆, 2.7-3.0 落雷
            if (c > 2.7 && c < 3.0 && Math.abs(px - o.x) < 14 + CFG.playerR * 0.5 && py < o.y && py > o.y - 220) hit = true;
          }
          if (hit) die('hit', o.kind);
          else if (o.kind === 'bird' && !o.near && Math.hypot(px - o.x, py - o.y) < 85) { o.near = true; birdNear++; }
        }
      }
      // camera
      const target = py - H * 0.4;
      camY = Math.max(-90, lerp(camY, target, 1 - Math.pow(0.0008, dt)));
      if (st === 'ready') camY = -90;
    }

    // ---- draw ----
    function ell(x: number, y: number, rx: number, ry: number, fill: string) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
    function sy(wy: number) { return H - (wy - camY); }
    function cloud(x: number, y: number, s: number, a: number, col = '#fff') {
      g.globalAlpha = a; g.fillStyle = col;
      g.beginPath(); g.arc(x, y, 22 * s, 0, 6.3); g.arc(x + 24 * s, y - 8 * s, 28 * s, 0, 6.3); g.arc(x + 54 * s, y, 22 * s, 0, 6.3); g.arc(x + 26 * s, y + 8 * s, 24 * s, 0, 6.3); g.fill(); g.globalAlpha = 1;
    }

    function drawBg() {
      const m = Math.max(0, (camY + H * 0.5) / UPM);
      const [c1, c2] = zoneColors(m);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.fillRect(-OX / S - 2, 0, CW / S + 4, H);
      // stars
      const sa = clamp((m - 280) / 450, 0, 1);
      if (sa > 0) {
        g.fillStyle = '#fff';
        for (let i = 0; i < 60; i++) {
          const fx = hash(i) * W, par = 0.15 + hash(i + 50) * 0.3, fy = ((hash(i + 9) * H * 3 - camY * par) % (H * 1.0) + H) % H;
          g.globalAlpha = sa * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))); g.fillRect(fx, fy, 1.6, 1.6);
        }
        g.globalAlpha = 1;
      }
      // nebula glow
      const na = clamp((m - 1000) / 500, 0, 1);
      if (na > 0) {
        for (let i = 0; i < 3; i++) {
          const cx = [W * 0.2, W * 0.8, W * 0.5][i], cy = ((i * 300 - camY * 0.2) % (H + 400) + H + 400) % (H + 400) - 200;
          const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 190); const col = ['255,80,200', '90,160,255', '180,90,255'][i];
          rg.addColorStop(0, `rgba(${col},${0.35 * na})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(cx - 200, cy - 200, 400, 400);
        }
      }
      // clouds (hash band)
      const ca = clamp(1 - (m - 380) / 250, 0, 1) * clamp((m + 20) / 100, 0.35, 1);
      if (ca > 0) {
        const band = 150; const i0 = Math.floor((camY - 80) / band), i1 = Math.floor((camY + H + 80) / band);
        for (let i = Math.max(1, i0); i <= i1; i++) {
          const dens = clamp((i * band / UPM - 60) / 80, 0.25, 1);
          if (hash(i * 3.3) > dens) continue;
          const x = hash(i) * (W + 80) - 40 + Math.sin(t * 0.15 + i) * 10;
          cloud(x, sy(i * band + hash(i + 4) * 60), 0.9 + hash(i + 7) * 0.8, 0.85 * ca);
        }
      }
      // decor: ISS, moon, planet
      const decor = (ay: number, draw: (x: number, y: number) => void, par: number) => { const y = H - (ay * UPM - camY * par) ; if (y > -200 && y < H + 200) draw(0, y); };
      decor(780, (_, y) => { // 宇宙ステーション
        g.save(); g.translate(W * 0.25 + Math.sin(t * 0.3) * 20, y); g.rotate(-0.2);
        g.fillStyle = '#b8c0d0'; g.fillRect(-26, -7, 52, 14); g.fillStyle = '#2a60c0'; g.fillRect(-70, -4, 36, 8); g.fillRect(34, -4, 36, 8);
        g.fillStyle = '#e8eef5'; g.fillRect(-10, -14, 20, 28); g.restore();
      }, 0.85);
      decor(950, (_, y) => { // 月
        const x = W * 0.75; const rg = g.createRadialGradient(x - 20, y - 20, 10, x, y, 100); rg.addColorStop(0, '#fffbe6'); rg.addColorStop(1, '#bdb89a');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, 90, 0, 6.3); g.fill(); g.fillStyle = 'rgba(120,110,80,0.35)';
        [[-30, -20, 18], [25, 15, 24], [-10, 40, 12], [40, -35, 10]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 6.3); g.fill(); });
        g.fillStyle = '#111'; g.beginPath(); g.arc(x - 22, y - 5, 4, 0, 6.3); g.arc(x + 12, y - 5, 4, 0, 6.3); g.fill(); g.fillRect(x - 14, y + 18, 28, 3); // ムーンの顔
      }, 0.7);
      decor(1450, (_, y) => { // 惑星
        const x = W * 0.3; const rg = g.createRadialGradient(x - 30, y - 30, 10, x, y, 130); rg.addColorStop(0, '#ffb86b'); rg.addColorStop(1, '#a8325e');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, 110, 0, 6.3); g.fill();
        g.strokeStyle = 'rgba(255,230,180,0.7)'; g.lineWidth = 8; g.beginPath(); g.ellipse(x, y, 190, 36, -0.35, 0, 6.3); g.stroke();
      }, 0.6);
      // city + ground
      const gy = sy(0);
      if (gy < H + 400) {
        g.fillStyle = '#6a7a9a';
        for (let i = 0; i < 9; i++) {
          const bw = 38 + hash(i) * 26, bx = i * 46 - 8, bh = 80 + hash(i + 3) * 160, by = H - (0 - camY * 0.8) ;
          g.fillStyle = i % 2 ? '#5b6a8c' : '#7083a6'; g.fillRect(bx, by - bh, bw, bh + 40);
          g.fillStyle = 'rgba(255,240,150,0.7)';
          for (let wy = by - bh + 10; wy < by - 6; wy += 20) for (let wx = bx + 6; wx < bx + bw - 8; wx += 14) if (hash(i * 31 + wx + wy) > 0.45) g.fillRect(wx, wy, 6, 8);
        }
        g.fillStyle = '#4fb04f'; g.fillRect(-OX / S - 2, gy, CW / S + 4, H); g.fillStyle = '#3a8f3a'; g.fillRect(-OX / S - 2, gy, CW / S + 4, 8);
      }
    }

    function drawObs(o: Obs) {
      const x = o.x, y = sy(o.y);
      if (y < -80 || y > H + 80) return;
      g.save(); g.translate(x, y);
      const f = o.vx >= 0 ? 1 : -1;
      switch (o.kind) {
        case 'bird': {
          g.scale(f, 1); const fl = Math.sin(o.ph * 14) * 14;
          ell(0, 0, 20, 12, o.col); ell(14, -4, 9, 8, o.col);
          g.fillStyle = '#ffb02e'; g.beginPath(); g.moveTo(21, -4); g.lineTo(31, -1); g.lineTo(21, 2); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(16, -6, 3, 0, 6.3); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(17, -6, 1.6, 0, 6.3); g.fill();
          g.fillStyle = o.col; g.beginPath(); g.moveTo(-4, -2); g.lineTo(-14, -22 + fl); g.lineTo(6, -4); g.fill();
          g.beginPath(); g.moveTo(-18, 0); g.lineTo(-30, -6); g.lineTo(-20, 6); g.fill(); break;
        }
        case 'balloon': {
          g.rotate(Math.sin(o.ph * 2) * 0.08);
          g.strokeStyle = '#555'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, 46); g.stroke(); g.fillStyle = '#8a5a2b'; g.fillRect(-7, 44, 14, 9);
          ell(0, 0, 24, 30, o.col); ell(-8, -10, 5, 9, 'rgba(255,255,255,0.45)');
          g.fillStyle = o.col; g.beginPath(); g.moveTo(0, 28); g.lineTo(-5, 36); g.lineTo(5, 36); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(-8, 2, 2.5, 0, 6.3); g.arc(8, 2, 2.5, 0, 6.3); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(0, 8, 6, 0.2, 2.9); g.stroke(); break;
        }
        case 'storm': {
          const c = o.ph % 3.2, warn = c > 2.2 && c < 2.7, bolt = c >= 2.7 && c < 3.0;
          cloud(-26, 0, 1.15, 1, bolt || warn ? '#8c8c9c' : '#585868');
          g.fillStyle = bolt ? '#ffef60' : '#111'; g.beginPath(); g.arc(-12, 0, 4, 0, 6.3); g.arc(14, 0, 4, 0, 6.3); g.fill();
          g.strokeStyle = g.fillStyle; g.lineWidth = 3; g.beginPath(); g.moveTo(-18, -8); g.lineTo(-6, -4); g.moveTo(20, -8); g.lineTo(8, -4); g.stroke();
          if (warn) { g.globalAlpha = 0.5 + 0.5 * Math.sin(c * 40); g.fillStyle = '#ffef60'; g.fillRect(-2, 14, 4, 40); g.globalAlpha = 1; }
          if (bolt) {
            g.strokeStyle = '#fff6a0'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 14); g.lineTo(-10, 60); g.lineTo(6, 90); g.lineTo(-8, 140); g.lineTo(0, 220); g.stroke();
            g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
          } break;
        }
        case 'plane': {
          g.scale(f, 1);
          ell(0, 0, 46, 11, '#f2f4f8'); g.fillStyle = '#e04a4a'; g.beginPath(); g.moveTo(-36, -4); g.lineTo(-52, -22); g.lineTo(-44, -22); g.lineTo(-22, -4); g.fill();
          g.fillStyle = '#c8d0e0'; g.beginPath(); g.moveTo(-6, 4); g.lineTo(-22, 22); g.lineTo(-10, 22); g.lineTo(14, 4); g.fill();
          g.fillStyle = '#4aa3ff'; for (let i = 0; i < 5; i++) g.fillRect(-16 + i * 9, -4, 5, 5);
          g.fillStyle = '#222'; g.beginPath(); g.arc(36, -2, 4, 0, 6.3); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(-52, 0); g.lineTo(-90, 0); g.stroke(); g.globalAlpha = 1; break;
        }
        case 'ufo': {
          g.rotate(Math.sin(o.ph * 3) * 0.1);
          ell(0, -8, 17, 15, 'rgba(150,230,255,0.85)'); ell(0, 2, 38, 11, '#9aa4b8'); ell(0, 0, 38, 7, '#c9d2e4');
          for (let i = -2; i <= 2; i++) { g.fillStyle = (Math.floor(o.ph * 6) + i) % 2 ? '#ffe35a' : '#ff5a8a'; g.beginPath(); g.arc(i * 14, 4, 3, 0, 6.3); g.fill(); }
          g.fillStyle = '#6f6'; g.beginPath(); g.arc(0, -10, 5, 0, 6.3); g.fill(); g.fillStyle = '#000'; g.fillRect(-3, -11, 2, 3); g.fillRect(1, -11, 2, 3); break;
        }
        case 'meteor': {
          const ang = Math.atan2(-o.vy, o.vx); g.rotate(ang + Math.PI / 2 * 0);
          const tg = g.createLinearGradient(0, 0, -70, 0); tg.addColorStop(0, 'rgba(255,170,60,0.9)'); tg.addColorStop(1, 'rgba(255,60,0,0)');
          g.fillStyle = tg; g.beginPath(); g.moveTo(0, -16); g.lineTo(-80, 0); g.lineTo(0, 16); g.fill();
          g.rotate(o.ph * 3); ell(0, 0, 20, 18, '#7a5a48'); g.fillStyle = '#5a3f30'; g.beginPath(); g.arc(-5, -4, 5, 0, 6.3); g.arc(7, 6, 4, 0, 6.3); g.fill(); break;
        }
      }
      g.restore();
    }

    function drawPlayer() {
      const sx = px, sY = sy(py);
      // jet
      const jp = st === 'play' ? clamp(jet / 0.3, 0, 1) : 0;
      const fy = sY + CFG.playerH * 0.2;
      if (jp > 0) {
        const len = 40 + 60 * jp + Math.random() * 14;
        const gr = g.createLinearGradient(0, fy, 0, fy + len); gr.addColorStop(0, 'rgba(255,255,140,0.95)'); gr.addColorStop(0.45, 'rgba(120,255,110,0.75)'); gr.addColorStop(1, 'rgba(60,200,80,0)');
        g.save(); g.translate(sx, 0); g.fillStyle = gr; g.beginPath(); g.moveTo(-9, fy); g.quadraticCurveTo(-18 - jp * 6, fy + len * 0.5, 0, fy + len); g.quadraticCurveTo(18 + jp * 6, fy + len * 0.5, 9, fy); g.fill(); g.restore();
      }
      const e = st === 'dying' ? expr : expr;
      drawUncle(g, { x: sx, y: sY, h: CFG.playerH, rot: st === 'dying' ? rot : tilt, expr: e === 'angry' ? 'angry' : e, flail: st === 'play' ? clamp(Math.abs(vy) / 500, 0.2, 1) : st === 'dying' ? 1 : 0, t, type: 'normal', skin: ctx.unlockedSkins.includes('skin_normal') ? 'skin_normal' : undefined });
      if (bubbleT > 0) drawBubble(g, bubbleTxt, clamp(sx, 70, W - 70), sY - CFG.playerH * 0.7, 20);
    }

    function drawParts() {
      for (const p of parts) {
        const k = p.life / p.max, y = sy(p.y);
        if (p.k >= 2) { g.fillStyle = `rgba(255,230,90,${1 - k})`; g.beginPath(); g.arc(p.x, y, p.r * (1 - k * 0.5), 0, 6.3); g.fill(); continue; }
        const r = p.r * (1 + k * 1.2);
        g.fillStyle = k < 0.3 ? `rgba(${Math.round(lerp(255, 150, k / 0.3))},255,${Math.round(lerp(120, 100, k / 0.3))},${0.8 - k})` : `rgba(${Math.round(lerp(150, 110, k))},${Math.round(lerp(220, 150, k))},90,${(1 - k) * 0.55})`;
        g.beginPath(); g.arc(p.x, y, r, 0, 6.3); g.fill();
      }
    }

    function drawHud() {
      const a = Math.floor(alt()), best = Math.max(ctx.best, Math.floor(maxAlt));
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.font = '900 54px "Hiragino Sans", sans-serif'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.fillStyle = '#fff';
      g.strokeText(`${a}m`, W / 2, 58); g.fillText(`${a}m`, W / 2, 58);
      g.font = '800 14px "Hiragino Sans", sans-serif'; g.lineWidth = 4;
      const bt = ctx.best > 0 ? (maxAlt > ctx.best ? 'NEW RECORD!' : `BEST ${ctx.best}m`) : `最高 ${best}m`;
      g.fillStyle = maxAlt > ctx.best && ctx.best > 0 ? '#ffd93d' : '#e8ffe8'; g.strokeText(bt, W / 2, 96); g.fillText(bt, W / 2, 96);
      // ガスゲージ
      const gx = 16, gy0 = H * 0.3, gh = 160; g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(gx, gy0, 12, gh);
      const gv = clamp(gas, 0, 1); g.fillStyle = gv > 0.8 ? '#ff4d4d' : gv > 0.5 ? '#ffd93d' : '#6aff7a'; g.fillRect(gx, gy0 + gh * (1 - gv), 12, gh * gv);
      g.font = '800 11px "Hiragino Sans", sans-serif'; g.fillStyle = '#fff'; g.fillText('ガス', gx + 6, gy0 - 8);
      if (banner) {
        const k = banner.t / 1.6, sc = 1 + Math.max(0, k - 0.8) * 1.2;
        g.save(); g.translate(W / 2, H * 0.28); g.scale(sc, sc); g.globalAlpha = Math.min(1, banner.t * 2);
        g.font = '900 40px "Hiragino Sans", sans-serif'; g.lineWidth = 8; g.strokeStyle = '#1a6a2a'; g.fillStyle = '#ffee55'; g.strokeText(banner.text, 0, 0); g.fillText(banner.text, 0, 0); g.restore();
      }
      if (st === 'ready') {
        const p = 1 + Math.sin(t * 5) * 0.06;
        g.save(); g.translate(W / 2, H * 0.38); g.scale(p, p);
        g.font = '900 28px "Hiragino Sans", sans-serif'; g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.fillStyle = '#fff';
        g.strokeText('タップでおなら発射！', 0, 0); g.fillText('タップでおなら発射！', 0, 0); g.restore();
        g.font = '700 14px "Hiragino Sans", sans-serif'; g.lineWidth = 4; g.strokeText('連打しすぎるとガス欠。リズムよく！', W / 2, H * 0.38 + 34); g.fillText('連打しすぎるとガス欠。リズムよく！', W / 2, H * 0.38 + 34);
      }
    }

    function render() {
      g.save(); g.clearRect(0, 0, CW, CH);
      g.translate(OX, 0); g.scale(S, S);
      if (shake > 0) g.translate(rnd(-shake, shake), rnd(-shake, shake));
      drawBg();
      // speed lines
      if (st === 'play' && vy > 380) { g.strokeStyle = `rgba(255,255,255,${(vy - 380) / 600})`; g.lineWidth = 2; for (let i = 0; i < 8; i++) { const x = hash(i + Math.floor(t * 12)) * W, y = hash(i * 7 + Math.floor(t * 12)) * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40 + vy * 0.05); g.stroke(); } }
      for (const o of obs) drawObs(o);
      drawParts();
      drawPlayer();
      if (flash > 0) { g.globalAlpha = clamp(flash * 2, 0, 0.6); g.fillStyle = flashCol; g.fillRect(-OX / S - 4, -4, CW / S + 8, H + 8); g.globalAlpha = 1; }
      drawHud();
      g.restore();
    }

    function frame(ts: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.033, last ? (ts - last) / 1000 : 0.016); last = ts;
      update(dt); render();
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf); timers.forEach(clearTimeout);
        canvas.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize);
        audio.stopBgm(); canvas.remove(); finished = true; void lastTapAt;
      },
    };
  },
};
export default mod;

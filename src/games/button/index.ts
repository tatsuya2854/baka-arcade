import type { GameModule } from '../../core/types';
import { meta } from './meta';
import { CONFIG as C } from './config';
import { EVENTS, drawBtn, txt } from './events';
import type { Fx, FxInit, Game, GameEvent, Mod, Scr, BurstOpt } from './events';
import { drawBubble } from '../../core/characters';
import { load, mutate } from '../../core/storage';
import { buildArt } from './news';
import { View3D } from './view3d';
import { loadImg, drawCover } from '../../core/images';

interface Saved { total: number; found: string[]; ending: boolean }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number; rect: boolean }
const REGULAR = EVENTS.filter(e => e.weight > 0);
const PRESS_SFX = ['tap', 'pop', 'squeak', 'boing', 'tap'] as const;

const mod: GameModule = {
  meta,
  start(ctx) {
    const root = ctx.root, audio = ctx.audio;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;';
    const gTop = canvas.getContext('2d')!;
    let g = gTop;
    // 3D描画（WebGL）。失敗したら従来の2D描画のまま。重ね順: 背景2D → three → 前景2D(canvas: 演出+HUD)
    let view: View3D | null = null, bgCanvas: HTMLCanvasElement | null = null, gBg: CanvasRenderingContext2D | null = null, use3d = false;
    function disable3d() { use3d = false; G.use3d = false; if (bgCanvas) bgCanvas.style.display = 'none'; if (view) view.canvas.style.display = 'none'; g = gTop; }
    try {
      view = new View3D(() => disable3d());
      bgCanvas = document.createElement('canvas'); bgCanvas.style.cssText = canvas.style.cssText; gBg = bgCanvas.getContext('2d');
      view.canvas.style.cssText = canvas.style.cssText + ';pointer-events:none';
      if (!gBg) throw new Error('2d');
      root.append(bgCanvas, view.canvas, canvas); use3d = true;
    } catch { try { view?.dispose(); } catch { /* ignore */ } view = null; bgCanvas = null; gBg = null; use3d = false; root.appendChild(canvas); }
    // 生成画像（無い/失敗は null → 旧描画にフォールバック）。先読み完了までループを始めない
    const imgs: { bg: HTMLImageElement | null; hero: HTMLImageElement | null; item: HTMLImageElement | null } = { bg: null, hero: null, item: null };
    let destroyed = false, bgImgC: HTMLCanvasElement | null = null, bgImgKey = '';
    const useImg = () => !!(imgs.hero && imgs.item);
    const raw = (load().extra['button'] ?? {}) as Partial<Saved>;
    const data: Saved = { total: raw.total ?? 0, found: Array.isArray(raw.found) ? raw.found.filter(x => EVENTS.some(e => e.id === x)) : [], ending: !!raw.ending };
    const found = new Set(data.found);
    const roundSeen = new Set<string>();
    const log: Record<string, number> = {}, stats: Record<string, number> = {};
    let newCount = 0, pressesRound = 0;
    let fxs: Fx[] = [], parts: Part[] = [], recent: string[] = [];
    let started = false, startMs = 0, lastEv = 0, finished = false, finishAt = 0, dexOpen = false, pressAnim = 0, raf = 0, last = performance.now();
    let titleText = '', titleUntil = 0, lastRot = 0, sinceSave = 0, dpr = 1, endedByEnding = false;
    const newMod = (): Mod => ({ dx: 0, dy: 0, s: 1, sx: 1, sy: 1, rot: 0, hue: null, alpha: 1, label: null, hide: false });
    let m: Mod = newMod(), S: Scr = { rot: 0, shake: 0, dim: 0 };

    const G: Game = {
      use3d, W: 390, H: 844, cx: 195, cy: 422, R: 100, time: 0, btn: { x: 195, y: 422, r: 100 }, audio,
      add(f: FxInit) { const fx: Fx = { t: 0, ...f }; fxs.push(fx); return fx; },
      has(tag) { return fxs.some(f => f.tag === tag); },
      say(text, dur = 1.5) {
        for (const f of fxs) if (f.tag === 'say') f.t = f.dur;
        G.add({ dur, tag: 'say', draw(gg, p) {
          const k = Math.min(1, p * dur / 0.15); gg.save();
          const x = Math.min(G.W - 100, Math.max(100, G.btn.x)), y = Math.max(90, G.btn.y - G.btn.r - 16);
          gg.translate(x, y); gg.scale(k, k); gg.translate(-x, -y); drawBubble(gg, text, x, y, 22); gg.restore();
        } });
      },
      title(text, dur = 2.5) { titleText = text; titleUntil = G.time + dur; },
      burst(x, y, n, o: BurstOpt = {}) {
        const cols = o.colors ?? ['#fff'];
        for (let i = 0; i < n && parts.length < C.maxParticles; i++) {
          const a = (o.angle ?? 0) + (o.angle === undefined ? Math.random() * 7 : (Math.random() - 0.5) * (o.spread ?? 1)), sp = (o.speed ?? 200) * (0.4 + Math.random() * 0.6), life = (o.life ?? 1) * (0.6 + Math.random() * 0.4);
          parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, size: (o.size ?? 6) * (0.6 + Math.random() * 0.6), color: cols[i % cols.length], grav: o.grav ?? 0, rect: !!o.rect });
        }
      },
      sfx(n, v = 0) { audio.sfx(n, v); },
      tempo(t) { audio.setBgmTempo(t); },
      rnd(a, b) { return a + Math.random() * (b - a); },
      pick<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; },
      stat(k, n = 1) { stats[k] = (stats[k] ?? 0) + n; },
      finishNow() { endedByEnding = true; endRound(); },
    };

    function resize() {
      const W = root.clientWidth || 390, H = root.clientHeight || 844; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (bgCanvas) { bgCanvas.width = canvas.width; bgCanvas.height = canvas.height; }
      view?.resize(W, H, dpr);
      G.W = W; G.H = H; G.cx = W / 2; G.cy = H * 0.5; G.R = Math.min(W, H) * C.btnRadiusRatio;
    }
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(root);
    window.addEventListener('resize', resize);

    function saveNow() { data.found = [...found]; mutate(s => { s.extra['button'] = { total: data.total, found: data.found, ending: data.ending } satisfies Saved; }); }

    function discover(ev: GameEvent) {
      roundSeen.add(ev.id); log[ev.id] = (log[ev.id] ?? 0) + 1;
      if (ev.id === 'ending') data.ending = true;
      if (!found.has(ev.id)) {
        found.add(ev.id); newCount++; saveNow(); audio.sfx('coin');
        G.add({ dur: 2.2, drawHud(gg, p) { gg.save(); gg.globalAlpha = Math.min(1, (1 - p) * 4, p * 10); txt(gg, `図鑑 NEW! ${ev.name}`, G.W / 2, 118, 17, '#7be07b'); gg.restore(); } });
      }
    }
    function pick(): GameEvent | undefined {
      const ok = (e: GameEvent) => e.weight > 0 && e.unlock <= data.total && (!e.can || e.can(G));
      let c = REGULAR.filter(e => ok(e) && !recent.includes(e.id));
      if (!c.length) c = REGULAR.filter(ok);
      const ws = c.map(e => e.weight * (found.has(e.id) ? 1 : C.undiscoveredWeight)); let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      for (let i = 0; i < c.length; i++) { r -= ws[i]; if (r <= 0) return c[i]; }
      return c[c.length - 1];
    }
    function run(ev: GameEvent) { recent.push(ev.id); if (recent.length > C.recentExclude) recent.shift(); lastEv = performance.now(); discover(ev); ev.run(G); }

    function press() {
      if (!started) { started = true; startMs = performance.now(); audio.unlock(); ctx.started(); audio.startBgm(C.bgmKind, C.bgmTempo); }
      data.total++; pressesRound++; pressAnim = 1;
      audio.sfx(PRESS_SFX[Math.floor(Math.random() * PRESS_SFX.length)], data.total);
      if (++sinceSave >= C.saveEvery) { sinceSave = 0; saveNow(); }
      const now = performance.now(); let ev: GameEvent | undefined;
      const allFound = REGULAR.every(e => found.has(e.id));
      if (C.milestones.includes(data.total)) ev = EVENTS.find(e => e.id === 'sp' + data.total);
      else if (!data.ending && (data.total >= C.endingTotal || allFound)) ev = EVENTS.find(e => e.id === 'ending');
      else if (now - lastEv >= C.eventCooldownMs && fxs.length < C.maxFx) ev = pick();
      if (ev) run(ev);
    }

    function endRound() {
      if (finished) return; finished = true; finishAt = performance.now() + C.endingHoldMs; saveNow();
    }
    function emit() {
      const durMs = Math.max(1, Math.round(performance.now() - startMs - C.endingHoldMs)), durSec = durMs / 1000;
      const distinct = roundSeen.size;
      const score = Math.max(0, Math.min(meta.limits.maxScore, distinct + newCount * C.newBonus, Math.floor(durSec * meta.limits.maxPerSec)));
      const art = buildArt({ presses: pressesRound, total: data.total, durSec, log, found: found.size, newCount, distinct, spawn: stats.spawn ?? 0, mini: stats.mini ?? 0, score });
      ctx.finish({ score, scoreText: `${score}種`, shareText: `「絶対に押すな」を押して${score}種の珍事を発見！`, durationMs: durMs, detail: `発見${distinct}種 新規${newCount} 押下${pressesRound}`, art });
    }

    function pt(e: PointerEvent) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (G.W / r.width), y: (e.clientY - r.top) * (G.H / r.height) }; }
    function onDown(e: PointerEvent) {
      e.preventDefault(); if (finished) return;
      const { x, y } = pt(e);
      if (dexOpen) { dexOpen = false; return; }
      if (x > G.W / 2 - 60 && x < G.W / 2 + 60 && y > G.H - 66 && y < G.H - 22) { dexOpen = true; return; }
      const a = -lastRot, dx = x - G.W / 2, dy = y - G.H / 2, wx = G.W / 2 + dx * Math.cos(a) - dy * Math.sin(a), wy = G.H / 2 + dx * Math.sin(a) + dy * Math.cos(a);
      for (let i = fxs.length - 1; i >= 0; i--) { const f = fxs[i]; if (f.tap && f.tap(wx, wy)) return; }
      if (fxs.some(f => f.block)) return;
      if (!m.hide && Math.hypot(wx - G.btn.x, wy - G.btn.y) <= G.btn.r * (useImg() ? 1.3 : 1.05)) press();
    }
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.code !== 'Enter') return; e.preventDefault(); if (finished || e.repeat) return;
      if (dexOpen) { dexOpen = false; return; }
      for (let i = fxs.length - 1; i >= 0; i--) { const f = fxs[i]; if (f.tap && f.tap(G.btn.x, G.btn.y)) return; }
      if (!fxs.some(f => f.block)) press();
    }
    canvas.addEventListener('pointerdown', onDown); window.addEventListener('keydown', onKey);

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; G.time += dt;
      m = newMod(); S = { rot: 0, shake: 0, dim: 0 };
      const cur = fxs; fxs = [];
      for (const f of cur) {
        f.t += dt; const p = Math.min(1, f.t / f.dur); f.update?.(p, dt, m, S);
        if (f.t >= f.dur) f.end?.(); else fxs.push(f);
      }
      // 上のループ中に add された新規演出は fxs に先に入っているので順序を保つ
      fxs = fxs.filter((f, i, a) => a.indexOf(f) === i);
      lastRot = S.rot; pressAnim = Math.max(0, pressAnim - dt * 8);
      for (const q of parts) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      parts = parts.filter(q => q.life > 0);
      G.btn.x = G.cx + m.dx; G.btn.y = G.cy + m.dy; G.btn.r = G.R * m.s * Math.max(0.05, (m.sx + m.sy) / 2);
      if (started && !finished) { const el = (performance.now() - startMs) / 1000; if (el >= C.roundSec && !fxs.some(f => f.block)) endRound(); }
      if (finished && performance.now() >= finishAt) { finishAt = Infinity; emit(); }
      draw();
    }

    function paintBg(W: number, H: number) {
      if (imgs.bg) {
        const key = `${W}x${H}@${dpr}`;
        if (!bgImgC || bgImgKey !== key) {
          bgImgC ??= document.createElement('canvas'); bgImgC.width = Math.round(W * dpr); bgImgC.height = Math.round(H * dpr); bgImgKey = key;
          const c = bgImgC.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); drawCover(c, imgs.bg, W, H, 0.5, 0.5);
          const dg = c.createLinearGradient(0, 0, 0, H); dg.addColorStop(0, 'rgba(10,12,20,0.55)'); dg.addColorStop(0.3, 'rgba(10,12,20,0.18)'); dg.addColorStop(0.75, 'rgba(10,12,20,0.1)'); dg.addColorStop(1, 'rgba(10,12,20,0.4)');
          c.fillStyle = dg; c.fillRect(0, 0, W, H);
        }
        g.save(); g.translate(W / 2, H / 2); g.rotate(S.rot); const k = 1.06 + Math.abs(S.rot) * 1.3 + S.shake * 0.004; g.scale(k, k); g.drawImage(bgImgC, -W / 2, -H / 2, W, H); g.restore();
        return;
      }
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16121f'); bg.addColorStop(1, '#2a0d12'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2); g.rotate(S.rot); g.translate(-W / 2 + Math.sin(G.time * 57) * S.shake, -H / 2 + Math.cos(G.time * 61) * S.shake);
      g.fillStyle = 'rgba(255,60,60,.05)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W / 2, H / 2, G.R * (1.6 + i * 0.5 + Math.sin(G.time * 1.5 + i) * 0.05), 0, 7); g.fill(); }
      g.restore();
    }
    /** ボタン画像（hero=押す前 / item=押下中）。押下・つぶれ・回転・色相(hue)・透明度は既存の演出パラメータで変形 */
    function drawBtnImg(c: CanvasRenderingContext2D, inRot: boolean) {
      if (m.hide) return;
      const R = G.R * m.s, Hs = R * 2.6, pressed = pressAnim > 0.15, img = (pressed ? imgs.item : imgs.hero)!, idle = started ? 1 : 1 + Math.sin(G.time * 4) * 0.03;
      c.save();
      if (inRot) { c.translate(G.W / 2, G.H / 2); c.rotate(S.rot); c.translate(-G.W / 2 + Math.sin(G.time * 57) * S.shake, -G.H / 2 + Math.cos(G.time * 61) * S.shake); }
      c.globalAlpha = Math.max(0, Math.min(1, m.alpha)); c.translate(G.btn.x, G.btn.y); c.rotate(m.rot); c.scale(m.sx * idle, m.sy * idle);
      const bot = Hs * 0.44;
      c.save(); c.translate(R * 0.1, bot - Hs * 0.1); c.scale(1, 0.2);
      const sg = c.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.45); sg.addColorStop(0, 'rgba(20,24,34,0.7)'); sg.addColorStop(1, 'rgba(20,24,34,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, R * 1.45, 0, Math.PI * 2); c.fill(); c.restore();
      if (m.hue) c.filter = `hue-rotate(${m.hue}deg)`;
      c.drawImage(img, -Hs / 2, bot - (pressed ? 0.83 : 0.97) * Hs, Hs, Hs);
      c.restore();
    }
    function draw() {
      const W = G.W, H = G.H;
      if (use3d && view && gBg) {
        g = gBg; g.setTransform(dpr, 0, 0, dpr, 0, 0); paintBg(W, H); if (useImg()) drawBtnImg(g, true);
        view.beginFrame(-Math.sin(G.time * 57) * S.shake, Math.cos(G.time * 61) * S.shake, S.rot);
        const idle = started ? 1 : 1 + Math.sin(G.time * 4) * 0.03;
        view.main(G.btn.x, G.btn.y, G.R * m.s, m.sx * idle, m.sy * idle, m.rot, m.hue ?? 0, m.alpha, pressAnim, !m.hide && !useImg());
        for (const f of fxs) f.r3?.(view, Math.min(1, f.t / f.dur));
        view.render();
        g = gTop; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
        g.setTransform(dpr, 0, 0, dpr, 0, 0); paintFg(W, H, true); return;
      }
      g = gTop; g.setTransform(dpr, 0, 0, dpr, 0, 0); paintBg(W, H); paintFg(W, H, false);
    }
    function paintFg(W: number, H: number, is3d: boolean) {
      g.save(); g.translate(W / 2, H / 2); g.rotate(S.rot); g.translate(-W / 2 + Math.sin(G.time * 57) * S.shake, -H / 2 + Math.cos(G.time * 61) * S.shake);
      const ttl = G.time < titleUntil ? titleText : '絶対に押すな';
      txt(g, ttl, W / 2, H * 0.17 + Math.sin(G.time * 3) * 3, Math.min(40, W / (ttl.length * 0.9 + 1)), '#ffe14d', '#300');
      if (!started) txt(g, 'ボタンを押すと60秒スタート', W / 2, H * 0.17 + 40, 15, '#fff');
      if (!is3d && useImg()) drawBtnImg(g, false);
      if ((is3d || useImg()) && !m.hide && m.alpha > 0.02) {
        const r = G.R * m.s, p3 = Math.max(0, Math.min(1, pressAnim)), depth = 0.3 * p3 * Math.cos((1 - p3) * 6), idle = started ? 1 : 1 + Math.sin(G.time * 4) * 0.03;
        const lab = m.label ?? 'PUSH';
        g.save(); g.globalAlpha = Math.max(0, Math.min(1, m.alpha)); g.translate(G.btn.x, G.btn.y); g.rotate(m.rot); g.scale(m.sx * idle, m.sy * idle);
        txt(g, lab, 0, useImg() ? (pressAnim > 0.15 ? 0.33 : -0.5) * r : -r * (0.26 - depth * 0.5), Math.max(10, r * (lab.length > 3 ? 0.24 : 0.32)), '#fff', 'rgba(90,0,0,.7)'); g.restore();
      }
      for (const f of fxs) if (f.draw && f.tag !== 'say') f.draw(g, Math.min(1, f.t / f.dur));
      if (!is3d && !m.hide && !useImg()) {
        g.save(); g.globalAlpha = Math.max(0, Math.min(1, m.alpha)); g.translate(G.btn.x, G.btn.y); g.rotate(m.rot);
        const idle = started ? 1 : 1 + Math.sin(G.time * 4) * 0.03; g.scale(m.sx * idle, m.sy * idle);
        drawBtn(g, 0, 0, G.R * m.s, m.hue ?? 0, m.label ?? 'PUSH', pressAnim, true); g.restore();
      }
      for (const q of parts) { g.globalAlpha = Math.max(0, q.life / q.max); g.fillStyle = q.color; if (q.rect) g.fillRect(q.x, q.y, q.size, q.size * 0.6); else { g.beginPath(); g.arc(q.x, q.y, q.size, 0, 7); g.fill(); } }
      g.globalAlpha = 1;
      for (const f of fxs) if (f.draw && f.tag === 'say') f.draw(g, Math.min(1, f.t / f.dur));
      if (S.dim > 0) { const sp = g.createRadialGradient(G.btn.x, G.btn.y, G.btn.r * 1.2, G.btn.x, G.btn.y, G.btn.r * 2.4); sp.addColorStop(0, 'rgba(0,0,0,0)'); sp.addColorStop(1, `rgba(0,0,0,${S.dim})`); g.fillStyle = sp; g.fillRect(-W, -H, W * 3, H * 3); }
      g.restore();
      const rem = started ? Math.max(0, Math.ceil(C.roundSec - (performance.now() - startMs) / 1000)) : C.roundSec;
      txt(g, `押下 ${data.total}`, 14, 22, 18, '#fff', '#000', 'left'); txt(g, `発見 ${found.size}/${EVENTS.length}`, 14, 46, 15, '#9ef', '#000', 'left');
      txt(g, `⏱ ${rem}`, W - 14, 22, 22, rem <= 10 ? '#ff6b6b' : '#fff', '#000', 'right'); txt(g, `今回 +${newCount}`, W - 14, 46, 14, '#7be07b', '#000', 'right');
      for (const f of fxs) f.drawHud?.(g, Math.min(1, f.t / f.dur));
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(W / 2 - 60, H - 66, 120, 44); g.strokeStyle = 'rgba(255,255,255,.5)'; g.strokeRect(W / 2 - 60, H - 66, 120, 44); txt(g, '図鑑', W / 2, H - 44, 18, '#fff', '');
      if (finished) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H); txt(g, endedByEnding ? 'THE END' : 'TIME UP!', W / 2, H / 2, 54, '#ffd93d'); }
      if (dexOpen) drawDex();
    }
    function drawDex() {
      const W = G.W, H = G.H; g.fillStyle = 'rgba(8,8,18,.95)'; g.fillRect(0, 0, W, H);
      txt(g, `図鑑 ${found.size}/${EVENTS.length}`, W / 2, 34, 24, '#ffd93d'); txt(g, 'タップで閉じる', W / 2, 60, 12, '#aaa', '');
      const rows = Math.ceil(EVENTS.length / 2), rh = Math.min(30, (H - 130) / rows);
      EVENTS.forEach((e, i) => {
        const col = i % 2, row = Math.floor(i / 2), x = 12 + col * (W / 2), y = 84 + row * rh;
        const f = found.has(e.id), lock = e.id !== 'ending' && data.total < e.unlock;
        txt(g, f ? `✓ ${e.name}` : lock ? `${e.unlock}回で解放` : '？？？', x, y, 12.5, f ? '#7be07b' : '#888', '', 'left');
      });
    }

    Promise.race([Promise.all([loadImg('dont-press', 'bg'), loadImg('dont-press', 'hero'), loadImg('dont-press', 'item')]), new Promise<null[]>(r => setTimeout(() => r([null, null, null]), 2500))]).then(([b, h, i]) => {
      if (destroyed) return; imgs.bg = b; imgs.hero = h; imgs.item = i; last = performance.now(); raf = requestAnimationFrame(frame);
    });

    return {
      destroy() {
        destroyed = true; cancelAnimationFrame(raf); bgImgC = null; imgs.bg = imgs.hero = imgs.item = null; window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize); ro?.disconnect();
        canvas.removeEventListener('pointerdown', onDown); audio.stopBgm(); saveNow(); fxs = []; parts = []; canvas.remove(); bgCanvas?.remove();
        if (view) { view.dispose(); view = null; } use3d = false;
      },
    };
  },
};
export default mod;

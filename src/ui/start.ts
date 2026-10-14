// 開始画面: 命令文1つ＋操作を見せるループアニメ＋大きなSTART。説明文は置かない。
import { drawUncle } from '../core/characters';
import type { GameMeta } from '../core/types';
import { pic, hasImg } from '../core/images';
import { ICON } from './icons';

import { demo as demo_egg } from '../games/egg/demo';
import { demo as demo_toothpaste } from '../games/toothpaste/demo';
import { demo as demo_usb } from '../games/usb/demo';
import { demo as demo_ketchup } from '../games/ketchup/demo';
import { demo as demo_tissue } from '../games/tissue/demo';
type Demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
const ease = (x: number) => x * x * (3 - 2 * x);
const finger = (g: CanvasRenderingContext2D, x: number, y: number, down: number, s = 1) => {
  g.save(); g.translate(x, y + down * 10 * s); g.scale(s, s); g.globalAlpha = 0.95;
  if (down > 0.2) { g.strokeStyle = `rgba(255,255,255,${0.7 * down})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 18 + (1 - down) * 26, 0, 7); g.stroke(); }
  g.fillStyle = '#ffe0c2'; g.strokeStyle = '#222'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(-9, -4, 18, 46, 9); g.fill(); g.stroke(); g.beginPath(); g.roundRect(-16, 26, 32, 34, 12); g.fill(); g.stroke(); g.restore();
};
const floor = (g: CanvasRenderingContext2D, w: number, h: number, c: string) => { g.fillStyle = c; g.beginPath(); g.roundRect(w * 0.18, h * 0.82, w * 0.64, 16, 8); g.fill(); };

const DEMOS: Record<string, Demo> = {
  egg: demo_egg,
  toothpaste: demo_toothpaste,
  usb: demo_usb,
  ketchup: demo_ketchup,
  tissue: demo_tissue,
  stack: (g, w, h, t) => { // おじさんが左右に動き、タップで落ちて積まれる
    const c = (t % 3) / 3, sw = Math.sin(t * 2.4) * w * 0.2; floor(g, w, h, '#ff8a3d');
    drawUncle(g, { x: w / 2, y: h * 0.76, h: h * 0.3, type: 'normal', expr: 'sweat', t });
    const tap = c > 0.55 && c < 0.7, fall = c > 0.62 ? ease(Math.min(1, (c - 0.62) / 0.2)) : 0;
    const x = c < 0.62 ? w / 2 + sw : w / 2 + Math.sin((0.62 * 3) * 2.4) * w * 0.2 * (1 - fall * 0.9);
    if (c < 0.82) drawUncle(g, { x, y: h * 0.18 + fall * h * 0.37, h: h * 0.28, type: 'fat', expr: fall > 0 ? 'scared' : 'idle', flail: fall, t, rot: fall * 0.2 });
    else drawUncle(g, { x: w / 2 + 6, y: h * 0.5, h: h * 0.28, type: 'fat', expr: 'happy', t });
    finger(g, w * 0.78, h * 0.62, tap ? 1 : 0.1);
  },
  fart: (g, w, h, t) => { // タップのたびに上昇する
    const c = (t % 2.4) / 2.4, up = Math.sin(c * Math.PI) * h * 0.38;
    for (let i = 0; i < 14; i++) { const p = (t * 0.9 + i / 14) % 1; g.fillStyle = `rgba(160,255,120,${(1 - p) * 0.5})`; g.beginPath(); g.arc(w / 2 - 6 + Math.sin(i * 7) * 12, h * 0.62 - up + p * 60, 8 + p * 16, 0, 7); g.fill(); }
    drawUncle(g, { x: w / 2, y: h * 0.5 - up, h: h * 0.3, type: 'normal', expr: 'wow', flail: 0.7, t, rot: Math.sin(t * 5) * 0.12 });
    finger(g, w * 0.8, h * 0.72, Math.max(0, Math.sin(t * Math.PI * 2 / 0.8)) > 0.5 ? 1 : 0.1);
  },
  hair: (g, w, h, t) => { // 長押しで髪を押さえる／離すと風で引っ張られる
    const hold = (t % 3) < 1.6, wind = Math.sin(t * 5) * 0.5 + 0.5;
    for (let i = 0; i < 8; i++) { const x = ((t * 300 + i * 90) % (w + 100)) - 50; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, h * (0.2 + i * 0.08)); g.lineTo(x + 50, h * (0.2 + i * 0.08)); g.stroke(); }
    drawUncle(g, { x: w / 2, y: h * 0.62, h: h * 0.62, type: 'normal', expr: hold ? 'happy' : 'sweat', bald: true, hairLen: hold ? 0.2 : 1 + wind, t, rot: hold ? 0 : 0.04 });
    finger(g, w / 2 + 6, h * 0.2, hold ? 1 : 0.05, 0.9);
  },
  nose: (g, w, h, t) => { // 長押しで引っ張って、ちょうどで離す
    const c = (t % 3) / 3, pull = c < 0.6 ? ease(c / 0.6) : 0, out = c > 0.62 && c < 0.8;
    drawUncle(g, { x: w / 2, y: h * 0.6, h: h * 0.62, type: 'normal', expr: pull > 0.7 ? 'cry' : pull > 0.3 ? 'scared' : 'idle', t, flail: pull * 0.3 });
    g.strokeStyle = '#2b2118'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2 + 6, h * 0.5); g.quadraticCurveTo(w / 2 + 30, h * (0.5 + pull * 0.3), w / 2 + 30 + pull * 40, h * (0.52 + pull * 0.34)); g.stroke();
    if (out) { g.fillStyle = '#ffd93d'; g.font = '900 28px sans-serif'; g.textAlign = 'center'; g.fillText('PERFECT', w / 2, h * 0.16); }
    finger(g, w * 0.78, h * 0.72, c < 0.6 ? 1 : 0.05, 0.9);
  },
  button: (g, w, h, t) => { // 絶対に押すな → 押す
    const c = (t % 2.4) / 2.4, press = c > 0.55 && c < 0.7 ? 1 : 0, shake = c > 0.75 ? Math.sin(t * 60) * 5 : 0;
    const cx = w / 2 + shake, cy = h * 0.6; g.fillStyle = '#444'; g.beginPath(); g.ellipse(cx, cy + 26, w * 0.26, 22, 0, 0, 7); g.fill();
    const grd = g.createRadialGradient(cx - 20, cy - 30 + press * 14, 8, cx, cy, w * 0.26); grd.addColorStop(0, '#ff7b7b'); grd.addColorStop(1, '#b01010');
    g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy + press * 14, w * 0.24, 46 - press * 10, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = '900 22px sans-serif'; g.textAlign = 'center'; g.fillText('PUSH', cx, cy + 8 + press * 14);
    if (c > 0.75) { g.fillStyle = '#fff'; g.font = '900 34px sans-serif'; g.fillText('!?', cx + 60, cy - 70); }
    finger(g, w * 0.7, cy - 70 + press * 70 - 20, press * 0.9 + 0.1, 0.9);
  },
};

export function renderStart(layer: HTMLElement, meta: GameMeta, o: { muted: boolean; challenge?: string; onStart: () => void }): () => void {
  layer.innerHTML = `<div class="start ${hasImg(meta.slug, 'key') ? 'haskey' : ''}" style="--c:${meta.color}">
    ${hasImg(meta.slug, 'key') ? `<div class="keybg">${pic(meta.slug, 'key', 'keyimg', meta.title)}</div>` : ''}
    ${o.challenge ? `<div class="chip bp chal">${o.challenge}</div>` : ''}
    <div class="stitle">${meta.title}</div>
    <div class="demowrap"><canvas class="demo"></canvas>${hasImg(meta.slug, 'key') ? '' : '<span class="phtag">キービジュアル未生成</span>'}</div>
    <div class="cmd">${meta.command}</div>
    <button class="cta startbtn" id="start">START</button>
    <div class="muted">${o.muted ? ICON.mute + ' ミュート中' : ''}</div></div>`;
  const cv = layer.querySelector<HTMLCanvasElement>('.demo')!, g = cv.getContext('2d')!;
  const dpr = Math.min(2, devicePixelRatio || 1); let raf = 0, alive = true, t0 = performance.now();
  const size = () => { const r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); };
  size();
  const loop = () => {
    if (!alive) return; const w = cv.width / dpr, h = cv.height / dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    try { DEMOS[meta.id]?.(g, w, h, (performance.now() - t0) / 1000); } catch { /* */ }
    raf = requestAnimationFrame(loop);
  };
  loop();
  layer.querySelector('#start')!.addEventListener('click', () => o.onStart());
  return () => { alive = false; cancelAnimationFrame(raf); };
}

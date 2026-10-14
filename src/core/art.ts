// 結果アート → 投稿画像（X 1200x675 / IG 1080x1350 / Story 1080x1920）・動画。Canvasのみ、API課金なし。
import type { GameMeta, GameResult } from './types';
export type Fmt = 'x' | 'ig' | 'story';
export const FMT: Record<Fmt, { w: number; h: number; label: string }> = { x: { w: 1200, h: 675, label: 'X用 16:9' }, ig: { w: 1080, h: 1350, label: 'Instagram 4:5' }, story: { w: 1080, h: 1920, label: 'ストーリーズ 9:16' } };
const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP","Meiryo",sans-serif';
export const font = (w: number, px: number) => `${w} ${px}px ${FONT}`;

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 4) {
  let line = '', n = 0; const lines: string[] = [];
  for (const ch of text) { if (ch === '\n' || g.measureText(line + ch).width > maxW) { lines.push(line); line = ch === '\n' ? '' : ch; } else line += ch; }
  lines.push(line);
  for (const l of lines.slice(0, maxLines)) { g.fillText(l, x, y + n * lh); n++; }
  return n * lh;
}
export interface PosterOpts { rank?: string; rateText?: string; fmt: Fmt; isBest: boolean; bp: number; rareName?: string; url: string; challenge?: string; t?: number }
/** 投稿用ポスター。ゲーム画面のスクショではなく、artの描画を主役に再構成する */
export function drawPoster(g: CanvasRenderingContext2D, meta: GameMeta, r: GameResult, o: PosterOpts) {
  const { w: W, h: H } = FMT[o.fmt], art = r.art, wide = o.fmt === 'x', S = W / 1080 * (wide ? 0.9 : 1);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2a0b4d'); bg.addColorStop(1, '#07060f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = meta.color + '2a'; g.lineWidth = 2; for (let x = -W; x < W * 2; x += 90 * S) { g.beginPath(); g.moveTo(W / 2, H * 0.55); g.lineTo(x, H); g.stroke(); }
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ff3d81'; g.font = font(900, 40 * S); g.fillText('BAKA ARCADE', 36 * S, 62 * S);
  g.fillStyle = meta.color; g.font = font(900, 38 * S); g.textAlign = 'right'; g.fillText(`${meta.emoji} ${meta.title}`, W - 36 * S, 62 * S); g.textAlign = 'left';
  // アート領域
  const pad = 36 * S, top = 90 * S;
  const artW = wide ? W * 0.5 : W - pad * 2, artH = wide ? H - top - 70 * S : o.fmt === 'ig' ? H * 0.5 : H * 0.46;
  g.save(); g.beginPath(); g.roundRect(pad, top, artW, artH, 28 * S); g.clip(); g.translate(pad, top);
  g.fillStyle = '#0b0a1c'; g.fillRect(0, 0, artW, artH);
  try { art?.draw(g, artW, artH, o.t ?? 0); } catch (e) { console.warn(e); }
  g.restore(); g.strokeStyle = meta.color; g.lineWidth = 5 * S; g.beginPath(); g.roundRect(pad, top, artW, artH, 28 * S); g.stroke();
  // テキスト領域
  const tx = wide ? pad + artW + 36 * S : pad, tw = wide ? W - tx - pad : W - pad * 2; let ty = wide ? top + 40 * S : top + artH + 70 * S;
  if (o.rareName) { g.fillStyle = '#ffd93d'; g.font = font(900, 34 * S); g.fillText(`✨ レア発見：${o.rareName}${o.rateText ? '  ' + o.rateText : ''}`.slice(0, 34), tx, ty); ty += 56 * S; }
  if (o.rank) { g.fillStyle = '#ff3d81'; g.font = font(900, 40 * S); g.textAlign = 'right'; g.fillText(`RANK ${o.rank}`, W - pad, top + artH + (wide ? -16 * S : 56 * S)); g.textAlign = 'left'; }
  g.fillStyle = '#9a93c4'; g.font = font(700, 30 * S); g.fillText('称号', tx, ty); ty += 62 * S;
  let fs = 66 * S; g.font = font(900, fs); while (g.measureText(art?.title ?? '').width > tw && fs > 30) { fs -= 3; g.font = font(900, fs); }
  g.fillStyle = '#fff'; g.shadowColor = meta.color; g.shadowBlur = 24 * S; g.fillText(art?.title ?? r.scoreText, tx, ty); g.shadowBlur = 0; ty += 36 * S + fs * 0.2;
  g.fillStyle = '#ffd93d'; g.font = font(900, 84 * S); g.fillText(r.scoreText, tx, ty + 56 * S); ty += 100 * S;
  g.fillStyle = '#d9d4ff'; g.font = font(600, 32 * S); ty += wrap(g, art?.comment ?? r.shareText, tx, ty, tw, 46 * S, wide ? 3 : 3) + 8 * S;
  g.font = font(700, 28 * S); g.fillStyle = '#9a93c4';
  for (const f of (art?.facts ?? []).slice(0, wide ? 3 : 4)) { g.fillText(`${f.label}：${f.value}`, tx, ty + 30 * S); ty += 44 * S; }
  if (o.isBest) { g.fillStyle = '#39ff88'; g.font = font(900, 34 * S); g.fillText('🎉 自己ベスト更新！', tx, ty + 44 * S); }
  // フッター
  g.fillStyle = '#ff3d81'; g.font = font(800, 30 * S); g.textAlign = 'center';
  if (o.challenge) g.fillText(o.challenge, W / 2, H - 92 * S);
  g.fillStyle = '#c9c3f0'; g.font = font(700, 28 * S); g.fillText(`${o.url.replace(/^https?:\/\//, '')}　くだらない。でも、やめられない。`, W / 2, H - 40 * S);
  g.textAlign = 'left';
}
export async function posterBlob(meta: GameMeta, r: GameResult, o: PosterOpts): Promise<Blob> {
  try { await document.fonts?.ready; } catch { /* */ }
  const { w, h } = FMT[o.fmt], c = document.createElement('canvas'); c.width = w; c.height = h;
  drawPoster(c.getContext('2d')!, meta, r, o);
  return await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

/** リプレイ動画（縦9:16）。MediaRecorder が使えない/mime非対応なら null → 静止画へフォールバック */
export function pickVideoMime(): string | null {
  const MR = (window as any).MediaRecorder; if (!MR) return null;
  for (const m of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MR.isTypeSupported?.(m)) return m;
  return null;
}
export async function recordReplay(meta: GameMeta, r: GameResult, o: PosterOpts, slow = 0.5): Promise<{ blob: Blob; ext: string } | null> {
  const mime = pickVideoMime(), rp = r.art?.replay; if (!mime || !rp) return null;
  const c = document.createElement('canvas'); c.width = 540; c.height = 960; const g = c.getContext('2d')!;
  const stream = (c as any).captureStream?.(30) as MediaStream | undefined; if (!stream) return null;
  const rec = new (window as any).MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 }) as MediaRecorder, parts: Blob[] = [];
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const done = new Promise<void>(res => { rec.onstop = () => res(); });
  rec.start(); const t0 = performance.now(), total = rp.durationSec / slow * 1000 + 1200;
  await new Promise<void>(res => {
    const f = () => {
      const el = performance.now() - t0, t = Math.min(rp.durationSec, el / 1000 * slow);
      g.fillStyle = '#0b0a1c'; g.fillRect(0, 0, 540, 960);
      g.save(); g.translate(0, 110); g.beginPath(); g.rect(0, 0, 540, 640); g.clip(); try { rp.draw(g, 540, 640, t); } catch { /* */ } g.restore();
      g.fillStyle = '#ff3d81'; g.font = font(900, 30); g.textAlign = 'center'; g.fillText('BAKA ARCADE', 270, 56);
      g.fillStyle = '#fff'; g.font = font(900, 34); g.fillText(r.art?.title ?? '', 270, 820); g.fillStyle = '#ffd93d'; g.font = font(900, 44); g.fillText(r.scoreText, 270, 880);
      g.fillStyle = '#c9c3f0'; g.font = font(700, 22); g.fillText(o.url.replace(/^https?:\/\//, ''), 270, 930);
      if (el < total) requestAnimationFrame(f); else res();
    }; f();
  });
  rec.stop(); await done;
  return { blob: new Blob(parts, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}

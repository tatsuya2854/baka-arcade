// 結果画像(9:16, 1080x1920)をCanvasで生成。TikTok/IG/Stories にそのまま使える縦型。
import type { GameMeta, GameResult } from './types';
import { drawUncle } from './characters';
export const SITE_URL = () => location.origin;

export function shareText(meta: GameMeta, r: GameResult, isBest: boolean) {
  return `${r.shareText}${isBest ? '\n世界一くだらない挑戦で自己ベスト更新！' : ''}\n#BAKAARCADE #バカゲー`;
}
export async function makeImage(meta: GameMeta, r: GameResult, isBest: boolean, bp: number): Promise<Blob> {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2a0b4d'); bg.addColorStop(1, '#07060f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = meta.color + '33'; g.lineWidth = 2; for (let y = 1100; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = -W; x < W * 2; x += 120) { g.beginPath(); g.moveTo(W / 2, 1000); g.lineTo(x, H); g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '900 64px "Hiragino Sans",sans-serif'; g.fillText('BAKA ARCADE', W / 2, 150);
  g.fillStyle = '#39ff88'; g.font = '800 40px "Hiragino Sans",sans-serif'; g.fillText('くだらない。でも、やめられない。', W / 2, 215);
  g.fillStyle = meta.color; g.shadowColor = meta.color; g.shadowBlur = 40; g.font = '900 96px "Hiragino Sans",sans-serif'; g.fillText(meta.title, W / 2, 520); g.shadowBlur = 0;
  drawUncle(g, { x: W / 2, y: 920, h: 420, expr: isBest ? 'happy' : 'sweat', type: 'normal', flail: 0.6, t: 1 });
  g.fillStyle = '#fff'; g.font = '900 220px "Hiragino Sans",sans-serif'; g.strokeStyle = '#000'; g.lineWidth = 14; g.strokeText(r.scoreText, W / 2, 1380); g.fillText(r.scoreText, W / 2, 1380);
  if (isBest) { g.fillStyle = '#ffd93d'; g.font = '900 72px "Hiragino Sans",sans-serif'; g.fillText('🎉 自己ベスト更新！', W / 2, 1490); }
  g.fillStyle = '#fff'; g.font = '700 46px "Hiragino Sans",sans-serif'; wrap(g, r.shareText, W / 2, 1590, 900, 62);
  if (bp > 0) { g.fillStyle = '#ff3d81'; g.font = '900 52px "Hiragino Sans",sans-serif'; g.fillText(`+${bp} バカポイント`, W / 2, 1750); }
  g.fillStyle = '#aaa'; g.font = '600 38px sans-serif'; g.fillText(location.host, W / 2, 1850);
  return await new Promise(res => c.toBlob(b => res(b!), 'image/png'));
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = '', yy = y; for (const ch of text) { if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, yy); line = ch; yy += lh; } else line += ch; } g.fillText(line, x, yy);
}
export function openX(text: string) { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL())}`, '_blank', 'noopener'); }
export function openLine(text: string) { window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(SITE_URL())}&text=${encodeURIComponent(text)}`, '_blank', 'noopener'); }
export async function webShare(text: string, img?: Blob): Promise<boolean> {
  try {
    const data: ShareData = { text, url: SITE_URL() };
    if (img) { const f = new File([img], 'baka-arcade.png', { type: 'image/png' }); if ((navigator as any).canShare?.({ files: [f] })) data.files = [f]; }
    await navigator.share(data); return true;
  } catch { return false; }
}
export function saveImage(img: Blob, name = 'baka-arcade.png') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(img); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

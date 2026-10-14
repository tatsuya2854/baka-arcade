// 共有キャラクター「おじさん」の Canvas 描画。ゲーム1・3・4 などで再利用する。
// 中心(x,y)・基準サイズ h(身長)で描く。rot はラジアン。t は経過秒（アニメ用）。
export type UncleType = 'normal' | 'fat' | 'thin' | 'muscle' | 'giant' | 'special';
export type Expr = 'idle' | 'happy' | 'scared' | 'wow' | 'angry' | 'dead' | 'sweat' | 'cry';
export interface UncleOpts {
  x: number; y: number; h: number; rot?: number; type?: UncleType; expr?: Expr; skin?: string; t?: number;
  /** 手足の動き: 0=ぶら下がり 1=ばたばた */
  flail?: number; bald?: boolean; hairLen?: number; seed?: number; flip?: boolean;
}
export const TYPE_DIM: Record<UncleType, { w: number; mass: number; shirt: string }> = {
  normal: { w: 0.62, mass: 1, shirt: '#4aa3ff' }, fat: { w: 0.98, mass: 1.9, shirt: '#ff8a3d' }, thin: { w: 0.42, mass: 0.6, shirt: '#7be07b' },
  muscle: { w: 0.8, mass: 1.5, shirt: '#ff4d6d' }, giant: { w: 1.1, mass: 3.2, shirt: '#b66dff' }, special: { w: 0.7, mass: 1.2, shirt: '#ffd93d' },
};
const SKIN_STYLE: Record<string, { hair: string; skinTone: string; shirt?: string; helmet?: boolean; aura?: boolean }> = {
  skin_normal: { hair: '#3b2a20', skinTone: '#f6c9a0' }, skin_blond: { hair: '#ffd23f', skinTone: '#f6c9a0' },
  skin_muscle: { hair: '#2b2b2b', skinTone: '#e0a070', shirt: '#222' }, skin_space: { hair: '#3b2a20', skinTone: '#f6c9a0', shirt: '#e8eef5', helmet: true },
  skin_legend: { hair: '#fff2a8', skinTone: '#ffe0b8', shirt: '#ffd700', aura: true },
};
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function drawUncle(g: CanvasRenderingContext2D, o: UncleOpts) {
  const type = o.type ?? 'normal', d = TYPE_DIM[type], sk = SKIN_STYLE[o.skin ?? 'skin_normal'] ?? SKIN_STYLE.skin_normal;
  const h = o.h, bw = d.w * h, t = o.t ?? 0, fl = o.flail ?? 0, expr = o.expr ?? 'idle', sd = o.seed ?? 0;
  const headR = h * (type === 'giant' ? 0.21 : 0.19), torsoH = h * 0.36, legH = h * 0.3;
  const wob = Math.sin(t * 8 + sd) * fl;
  g.save(); g.translate(o.x, o.y); g.rotate(o.rot ?? 0); if (o.flip) g.scale(-1, 1);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (sk.aura) { const gr = g.createRadialGradient(0, 0, h * 0.1, 0, 0, h * 0.8); gr.addColorStop(0, 'rgba(255,230,120,0.55)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gr; g.fillRect(-h, -h, h * 2, h * 2); }
  const topY = -h / 2, headCy = topY + headR, torsoTop = headCy + headR * 0.85, torsoBot = torsoTop + torsoH, shirt = sk.shirt ?? d.shirt;
  // 脚
  g.strokeStyle = '#2b3a67'; g.lineWidth = Math.max(4, bw * 0.2);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * bw * 0.2, torsoBot - 4); g.lineTo(s * bw * 0.24 + s * wob * h * 0.12, torsoBot + legH + Math.abs(wob) * h * 0.05); g.stroke(); }
  // 靴
  g.fillStyle = '#222'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * bw * 0.26 + s * wob * h * 0.12, torsoBot + legH + 2 + Math.abs(wob) * h * 0.05, bw * 0.16, h * 0.035, 0, 0, 7); g.fill(); }
  // 腕
  g.strokeStyle = sk.skinTone; g.lineWidth = Math.max(4, bw * (type === 'muscle' ? 0.24 : 0.14));
  const armUp = expr === 'scared' || expr === 'wow' || fl > 0.4 ? 1 : 0;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * bw * 0.46, torsoTop + torsoH * 0.15); g.lineTo(s * (bw * 0.62 + (armUp ? 6 : 0)) + s * wob * 6, torsoTop + torsoH * (armUp ? -0.35 - Math.abs(wob) * 0.4 : 0.7)); g.stroke(); }
  // 胴体
  g.fillStyle = shirt; rr(g, -bw / 2, torsoTop, bw, torsoH, bw * 0.28); g.fill();
  if (type === 'fat') { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(0, torsoTop + torsoH * 0.62, bw * 0.12, bw * 0.12, 0, 0, 7); g.fill(); }
  if (type === 'muscle') { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, torsoTop + 6); g.lineTo(0, torsoBot - 6); g.stroke(); }
  if (type === 'special') { g.fillStyle = '#fff'; g.font = `bold ${bw * 0.5}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', 0, torsoTop + torsoH / 2); }
  // ネクタイ
  if (type === 'normal' || type === 'thin') { g.fillStyle = '#e63946'; g.beginPath(); g.moveTo(-4, torsoTop + 2); g.lineTo(4, torsoTop + 2); g.lineTo(6, torsoTop + torsoH * 0.6); g.lineTo(0, torsoTop + torsoH * 0.72); g.lineTo(-6, torsoTop + torsoH * 0.6); g.closePath(); g.fill(); }
  // 頭
  const hr = headR * (type === 'fat' ? 1.12 : 1);
  g.fillStyle = sk.skinTone; g.beginPath(); g.ellipse(0, headCy, hr * 1.05, hr, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke();
  // 髪
  if (!o.bald) {
    g.fillStyle = sk.hair; g.beginPath(); g.ellipse(0, headCy - hr * 0.55, hr * 0.95, hr * 0.5, 0, Math.PI, 0); g.fill();
  } else {
    g.strokeStyle = sk.hair; g.lineWidth = 3; const hl = (o.hairLen ?? 1) * hr * 0.6;
    g.beginPath(); g.moveTo(0, headCy - hr * 0.95); g.quadraticCurveTo(Math.sin(t * 6) * hl * 0.5, headCy - hr * 0.95 - hl * 0.6, Math.sin(t * 6 + 1) * hl * 0.7, headCy - hr * 0.95 - hl); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-hr * 0.3, headCy - hr * 0.55, hr * 0.22, hr * 0.12, -0.5, 0, 7); g.fill();
  }
  // 目
  const ey = headCy - hr * 0.08, ex = hr * 0.42;
  g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 2;
  if (expr === 'dead') { g.strokeStyle = '#222'; g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - 6, ey - 6); g.lineTo(s * ex + 6, ey + 6); g.moveTo(s * ex + 6, ey - 6); g.lineTo(s * ex - 6, ey + 6); g.stroke(); } }
  else if (expr === 'happy') { g.lineWidth = 3; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, ey + 3, 7, Math.PI, 0); g.stroke(); } }
  else {
    const big = expr === 'scared' || expr === 'wow' ? 1.5 : 1;
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, ey, 7 * big, 8 * big, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#111'; g.beginPath(); g.arc(s * ex + Math.sin(t * 5) * (expr === 'scared' ? 2 : 0.5), ey, 3 * (expr === 'scared' ? 0.7 : 1), 0, 7); g.fill(); g.fillStyle = '#fff'; }
  }
  // 眉
  g.strokeStyle = '#222'; g.lineWidth = 3;
  for (const s of [-1, 1]) { g.beginPath(); const a = expr === 'angry' ? -s * 6 : expr === 'scared' || expr === 'sweat' || expr === 'cry' ? s * 5 : 0; g.moveTo(s * ex - 8, ey - 14 + (a > 0 ? a : 0)); g.lineTo(s * ex + 8, ey - 14 + (a < 0 ? -a : 0) - (expr === 'wow' ? 4 : 0)); g.stroke(); }
  // ひげ
  g.fillStyle = '#2b2118'; g.beginPath(); g.ellipse(0, headCy + hr * 0.32, hr * 0.5, hr * 0.12, 0, 0, 7); g.fill();
  // 口
  const my = headCy + hr * 0.55; g.strokeStyle = '#7a1f1f'; g.fillStyle = '#7a1f1f'; g.lineWidth = 3;
  if (expr === 'scared' || expr === 'wow') { g.beginPath(); g.ellipse(0, my + 2, 8, 11 + Math.sin(t * 14) * 2, 0, 0, 7); g.fill(); }
  else if (expr === 'happy') { g.beginPath(); g.arc(0, my - 4, 11, 0.1, Math.PI - 0.1); g.fill(); }
  else if (expr === 'angry' || expr === 'cry') { g.beginPath(); g.arc(0, my + 8, 10, Math.PI + 0.3, -0.3); g.stroke(); }
  else if (expr === 'dead') { g.beginPath(); g.moveTo(-8, my + 4); g.lineTo(8, my + 4); g.stroke(); }
  else { g.beginPath(); g.moveTo(-8, my + 2); g.quadraticCurveTo(0, my + 7, 8, my + 2); g.stroke(); }
  if (expr === 'sweat' || expr === 'scared') { g.fillStyle = '#8fd3ff'; g.beginPath(); g.ellipse(hr * 0.95, headCy - hr * 0.2 + (t * 40 % 14), 4, 7, 0, 0, 7); g.fill(); }
  if (expr === 'cry') { g.fillStyle = '#8fd3ff'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, ey + 12 + (t * 50 % 18), 3, 6, 0, 0, 7); g.fill(); } }
  if (sk.helmet) { g.strokeStyle = 'rgba(180,220,255,.9)'; g.lineWidth = 4; g.fillStyle = 'rgba(160,210,255,.18)'; g.beginPath(); g.arc(0, headCy, hr * 1.25, 0, 7); g.fill(); g.stroke(); }
  g.restore();
}
/** 吹き出し（叫びなど）。画面に軽く出す用 */
export function drawBubble(g: CanvasRenderingContext2D, text: string, x: number, y: number, size = 22) {
  g.save(); g.font = `900 ${size}px "Hiragino Sans", sans-serif`; const w = g.measureText(text).width + 22, h = size + 16;
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 3; rr(g, x - w / 2, y - h, w, h, 12); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y - h / 2); g.restore();
}

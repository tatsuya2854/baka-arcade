import type { ResultArt } from '../../core/types';
import { CFG } from './config';
import { drawScene, newScene, type SceneState, type Scratch } from './scene';

const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,sans-serif';
export interface UsbRun {
  ok: boolean; forced: boolean; fails: number; wrongSide: number; errMm: number; errDeg: number; timeSec: number; score: number;
  scratches: Scratch[]; frames: Float32Array; nFrames: number; light: [number, number];
}
export const F = 11; // x,y,z,rot,flipT,shx,shy,lx,ly,insert,sparkAge
export const rareOf = (r: UsbRun): string | undefined => {
  if (r.ok && r.fails === 0 && r.errMm <= CFG.perfectMm && r.errDeg <= CFG.perfectDeg) return 'perfect';
  if (r.ok && r.fails === 0) return 'first';
  if (r.forced) return 'force';
  if (r.wrongSide >= 2) return 'curse';
  return undefined;
};
export const titleOf = (r: UsbRun): string => {
  if (r.ok) {
    if (r.forced) return '無理やり挿した男';
    if (r.fails === 0) return rareOf(r) === 'perfect' ? 'ミリ単位の神' : r.errMm < 0.7 ? 'USB神' : '一発の運だけ男';
    if (r.wrongSide >= 3) return '裏表の呪い';
    if (r.timeSec > 15) return '日が暮れるまで挿してた';
    if (r.fails === 1) return '二度目の正直';
    if (r.fails === 2) return r.wrongSide >= 2 ? '裏表の確認が甘い人' : '三度目の正直';
    if (r.fails >= 5) return 'ポートに嫌われた人';
    return '接触不良の予感';
  }
  if (r.fails === 0) return '構えただけの人';
  if (r.wrongSide >= 3) return '裏表の呪い';
  if (r.fails >= 5) return 'ポート破壊の疑い';
  if (r.fails <= 2) return '挿す前に時間切れ';
  return '暗闇に負けた人';
};
const commentOf = (r: UsbRun) => r.ok
  ? (r.forced ? '向きは無視した。ポートは黙った。' : r.fails === 0 ? 'ポートが、迎え入れた。' : r.wrongSide >= 3 ? '最初から、反対側が正解だった。' : `${r.fails}回弾かれて、やっと入った。`)
  : (r.fails === 0 ? '暗すぎて、挿す勇気が出なかった。' : r.wrongSide >= 3 ? '何度やっても、裏は裏だった。' : '20秒では、ポートは心を開かない。');

export function makeArt(r: UsbRun): ResultArt {
  const mkScene = (t: number): SceneState => {
    const S = newScene(); S.dark = 0.28; S.desk = false; S.finger = !r.ok; S.zoom = 0.82; S.cy = 0.4; S.scratches = r.scratches; S.lx = Math.sin(t * 0.8) * 2.5; S.ly = -0.5 + Math.sin(t * 1.1) * 1.2;
    if (r.ok) { S.x = 0; S.y = 0; S.z = 0; S.flipT = 0; S.insert = 1; S.led = 1; S.rot = 0; S.finger = true; }
    else {
      const cyc = (t % 1.8); S.x = Math.max(-4, Math.min(4, r.errMm > 0 ? r.errMm * 0.8 : 0.8)); S.y = 0.3; S.z = 2.6 + Math.sin(t * 2) * 0.1; S.flipT = r.wrongSide > 0 ? 1 : 0; S.rot = Math.max(-0.15, Math.min(0.15, r.errDeg * Math.PI / 180)); S.led = -0.8;
      S.sparkAge = r.fails > 0 ? cyc * 0.5 : -1; S.sparkN = 26; if (r.fails === 0) { S.x = 0; S.z = 5; S.led = 0; } S.flash = Math.max(0, 1 - cyc * 4);
    }
    return S;
  };
  const draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const S0 = mkScene(t); if (w / h > 1.2) { S0.zoom = 0.58; S0.cy = 0.4; }
    drawScene(g, w, h, S0);
    const u = Math.min(w, h * 0.9);
    const gr = g.createLinearGradient(0, h * 0.7, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = gr; g.fillRect(0, h * 0.7, w, h * 0.3);
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const tx = (txt: string, y: number, px: number, col: string) => { g.font = `900 ${Math.round(px)}px ${FONT}`; g.lineWidth = px * 0.18; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(txt, w / 2, y, w * 0.94); g.fillStyle = col; g.fillText(txt, w / 2, y, w * 0.94); };
    tx(r.ok ? 'INSERTED' : 'REJECTED', h * 0.84, u * 0.1, r.ok ? '#7dffa8' : '#ff6a5e');
    tx(r.ok ? `${r.fails + 1}回目で成功　ずれ${r.errMm.toFixed(1)}mm` : `${r.fails}回弾かれた　${r.wrongSide}回裏表ミス`, h * 0.92, u * 0.05, '#fff');
    g.restore();
  };
  const n = r.nFrames, durSec = Math.max(2, Math.min(5, n / 60 * 2.5));
  const replay = n > 4 ? {
    durationSec: durSec,
    draw(g: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const f = Math.max(0, Math.min(n - 1, t / durSec * (n - 1))), i = Math.floor(f), j = Math.min(n - 1, i + 1), u = f - i, a = r.frames, v = (k: number) => a[i * F + k] * (1 - u) + a[j * F + k] * u;
      const S = newScene(); S.x = v(0); S.y = v(1); S.z = v(2); S.rot = v(3); S.flipT = v(4); S.shx = v(5) * w / 400; S.shy = v(6) * w / 400; S.lx = v(7); S.ly = v(8); S.insert = v(9); S.dark = 0.5; S.scratches = r.scratches;
      S.sparkAge = a[i * F + 10]; S.sparkN = 26; S.led = r.ok && S.insert > 0.9 ? 1 : 0; S.zoom = 1.05; S.cy = 0.42; S.desk = false;
      drawScene(g, w, h, S);
    },
  } : undefined;
  const rare = rareOf(r), pt = Math.round(r.score);
  return {
    title: titleOf(r), comment: commentOf(r), rare, draw, replay,
    facts: [
      { label: '試行回数', value: r.ok ? `${r.fails + 1}回目で成功` : `${r.fails}回弾かれた` },
      { label: '位置ずれ', value: `${r.errMm.toFixed(1)}mm` },
      { label: '角度ずれ', value: `${r.errDeg.toFixed(1)}°` },
      { label: '裏表ミス', value: `${r.wrongSide}回` },
      { label: '所要時間', value: `${r.timeSec.toFixed(1)}秒` },
    ],
    postVariants: r.ok ? [
      r.fails === 0 ? `USBを一発で挿せた。ずれ${r.errMm.toFixed(1)}mm。${pt}点。` : `USBを挿すのに${r.fails + 1}回かかった。${r.wrongSide ? '裏表は' + r.wrongSide + '回間違えた。' : ''}${pt}点。`,
      `USBの向き、${r.wrongSide}回間違えた。${r.forced ? '最後は無理やり挿した。' : '人類の永遠の課題。'}`,
      `「${titleOf(r)}」になった。USB1本に${r.timeSec.toFixed(0)}秒。`,
    ] : [
      `USBが挿せなかった。${r.fails}回弾かれて時間切れ。`,
      `暗いポートに${r.timeSec.toFixed(0)}秒挑んで負けた。「${titleOf(r)}」`,
      `USB、裏表を${r.wrongSide}回間違えた。もう信じない。`,
    ],
  };
}

// 開始画面のループ: チューブを長押し→歯磨き粉が伸びる→離す
import { STAGES } from './config';
import { drawScene, newScene, loadToothpasteImgs } from './draw';
import { newSim, step } from './sim';

const CYCLE = 4.6, PRESS0 = 0.5, PRESS1 = 2.0;
const sc = newScene();
export const demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  void loadToothpasteImgs();
  const c = STAGES[0], s = newSim(), tt = t % CYCLE, dt = 1 / 60;
  for (let x = 0; x < tt; x += dt) step(s, c, x >= PRESS0 && x < PRESS1, dt);
  sc.L = s.L; sc.grip = s.g; sc.flow = s.flow; sc.amp = s.amp; sc.target = c.target; sc.spat = s.spat;
  sc.lift = s.released ? Math.min(1, s.relT * 2.4) : 0;
  sc.thread = s.released ? Math.max(0, 1 - s.relT / 0.28) : 0;
  sc.taper = s.released ? Math.min(1, s.relT * 2) : 0;
  sc.reveal = 0; sc.used = 0; sc.hud = undefined;
  drawScene(g, w, h, sc, t);
  const held = tt >= PRESS0 && tt < PRESS1, S = Math.min(w / 390, h / 620);
  g.save(); g.translate(w / 2, h * 0.5 + 250 * S); g.scale(S, S);
  g.globalAlpha = 0.9; g.fillStyle = held ? 'rgba(31,111,224,0.28)' : 'rgba(31,111,224,0.12)';
  g.beginPath(); g.arc(0, 0, held ? 26 : 20, 0, Math.PI * 2); g.fill();
  g.font = '34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👆', 0, held ? 8 : 0);
  g.restore();
};

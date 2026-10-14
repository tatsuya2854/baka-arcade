import { AUTO_RELEASE_SEC, MAX_MM, type Stage } from './config';

/** 歯磨き粉の押し出しシミュレーション（握力→内圧→流量。溜め・空気のブシュッ・離した後の余韻） */
export interface Sim {
  L: number; g: number; p: number; held: number; heldTotal: number; flow: number;
  burst: number; burstDone: boolean; pressed: boolean; released: boolean;
  relT: number; relFlow: number; amp: number; spat: number;
}
export const newSim = (): Sim => ({ L: 0, g: 0, p: 0, held: 0, heldTotal: 0, flow: 0, burst: 0, burstDone: false, pressed: false, released: false, relT: 0, relFlow: 0, amp: 0, spat: -1 });

/** 1ステップ進める。ブシュッが起きたら true */
export function step(s: Sim, c: Stage, down: boolean, dt: number): boolean {
  let fired = false;
  const holding = down && !s.released && s.held < AUTO_RELEASE_SEC && s.L < MAX_MM;
  if (holding) {
    s.pressed = true; s.held += dt; s.heldTotal += dt;
    const gt = 1 - Math.exp(-s.held / c.gripTau);
    s.g += (gt - s.g) * Math.min(1, dt * 20);
  } else {
    if (s.pressed && !s.released) { s.released = true; s.relT = 0; s.relFlow = s.flow; }
    s.g -= s.g * Math.min(1, dt * c.gripRel);
  }
  s.p += (s.g - s.p) * Math.min(1, dt * (s.g > s.p ? c.pUp : c.pDown));
  if (s.p < 0.002) s.p = 0;
  const n = Math.max(0, Math.min(1, (s.p - c.thresh) / (1 - c.thresh)));
  const f = Math.pow(n, c.expo);
  const q = c.qmax * f * (1 + c.ripple * Math.sin(s.heldTotal * 38) * f);
  if (!s.burstDone && holding && s.p > c.burstAt) { s.burstDone = true; s.burst = c.burstMm; s.spat = 0; fired = true; }
  let bm = 0;
  if (s.burst > 0) { bm = Math.min(s.burst, c.burstRate * dt); s.burst -= bm; }
  let dL = q * dt + bm;
  if (s.released) { s.relT += dt; dL += c.sag * s.relFlow * Math.exp(-s.relT * 4) * dt; }
  s.L = Math.min(MAX_MM, s.L + dL);
  s.flow += (f - s.flow) * Math.min(1, dt * 20);
  const at = f * 4.5 + (s.burst > 0 ? 3 : 0);
  s.amp += (at - s.amp) * Math.min(1, dt * (at > s.amp ? 10 : 4));
  if (s.spat >= 0) { s.spat += dt; if (s.spat > 0.7) s.spat = -1; }
  return fired;
}

export const settled = (s: Sim, settleSec: number) => s.released && s.relT > settleSec && s.p < 0.005 && s.flow < 0.01;
/** 少ししか出ていなければ押し直しを許す */
export const resume = (s: Sim) => { if (s.released && s.L < 20) { s.released = false; s.relT = 0; } };

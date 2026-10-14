import { CFG } from './config';

export interface Snap {
  y0: number; m: number; dx: number; sw: number; v: number; nextY: number;
  torn: boolean; tornAt: number; fall: number; held: boolean; press: number;
  ret: boolean; shx: number; shy: number; count: number; hint: number; time: number;
}
export const newSnap = (): Snap => ({ y0: CFG.peek, m: 0, dx: 0, sw: 0, v: 0, nextY: 0.2, torn: false, tornAt: 0, fall: 0, held: false, press: 0, ret: false, shx: 0, shy: 0, count: 0, hint: 0, time: 0 });

export type Phase = 'ready' | 'pull' | 'fly' | 'ret' | 'fall';
export interface Events { onEngage?(m: number): void; onTear?(): void; onRelease?(): void }

export class Sim {
  phase: Phase = 'ready';
  y0 = CFG.peek; v = 0; a = 0; vPrev = 0; dx = 0; sw = 0; swv = 0;
  evx = 0; evy = 0; ang = 0; maxAng = 0;
  strain = 0; hook = 0; m = 0; closed = false; torn = false; tornAt = 0;
  fr = 0; press = 0; fall = 0; resultT = 0; flyT = 0; pullT = 0; movT = 0; movDist = 0; peakV = 0;
  pulled = false; clock = 0; shake = 0; releasedY = 0;
  constructor(public ev: Events = {}) {}

  grab() { this.phase = 'pull'; this.pulled = true; }

  /** 保持中の1ステップ。uT: 指の上昇量(L), latT: 指の横移動(L) */
  stepHeld(dt: number, uT: number, latT: number) {
    this.clock += dt; this.pullT += dt;
    const yT = Math.max(this.y0, CFG.peek + uT);
    const yn = this.y0 + (yT - this.y0) * Math.min(1, CFG.followRate * dt);
    const vi = (yn - this.y0) / dt; this.y0 = yn;
    this.v += (vi - this.v) * Math.min(1, dt * 30);
    this.a += ((this.v - this.vPrev) / dt - this.a) * Math.min(1, dt * 20); this.vPrev = this.v;
    const vx = (latT - this.dx) / dt; this.dx = latT;
    this.evx += (vx - this.evx) * Math.min(1, dt * 15); this.evy += (vi - this.evy) * Math.min(1, dt * 15);
    const sp = Math.hypot(this.evx, this.evy);
    if (sp > 0.25) this.ang = Math.atan2(Math.abs(this.evx), Math.max(this.evy, 0.01));
    if (sp > 0.4 && this.y0 < 1.3) this.maxAng = Math.max(this.maxAng, this.ang);
    if (this.v > 0.05) { this.movT += dt; this.movDist += this.v * dt; }
    this.peakV = Math.max(this.peakV, this.v);
    this.swing(dt, this.dx);
    if (!this.torn && this.y0 < 1) {
      const s2 = Math.sin(this.ang) ** 2;
      const snag = CFG.snagAmp * Math.exp(-(((this.y0 - CFG.snagAt) / CFG.snagW) ** 2));
      this.fr = (CFG.muK + (CFG.muS - CFG.muK) * Math.exp(-this.v / CFG.stribeckV)) * (1 + CFG.angleFric * s2) + snag;
      const ex = this.fr - CFG.tearFric;
      if (ex > 0 && this.v > CFG.slowV) this.strain += ex * dt; else this.strain = Math.max(0, this.strain - CFG.strainRecover * dt);
      if (this.strain > CFG.tearStrain) this.doTear();
    } else this.fr = 0;
    this.press += (Math.min(1, Math.max(0, (this.fr - 0.8) / 1.8)) - this.press) * Math.min(1, dt * 15);
    this.chain(dt);
    this.shake *= Math.exp(-dt * 12);
  }

  private swing(dt: number, target: number) {
    this.swv += (-60 * (this.sw - target) - 9 * this.swv) * dt; this.sw += this.swv * dt;
  }

  private doTear() {
    this.torn = true; this.tornAt = Math.max(0.3, Math.min(1, this.y0)); this.strain = 0; this.shake = 1; this.ev.onTear?.();
  }

  private chain(dt: number) {
    if (this.torn || this.closed) return;
    const ym = this.y0 - CFG.overlap * this.m;
    if (ym >= CFG.winEnd) { this.closed = true; return; }
    if (this.v > 0.02 && ym >= CFG.winStart && this.m + 1 < CFG.maxSheets) {
      let T = CFG.tv * this.v * this.v + CFG.ta * Math.max(0, this.a);
      T *= 1 + CFG.angleTension * Math.sin(this.ang) ** 2;
      const G = CFG.gripBase + CFG.gripStep * this.m + CFG.gripVar * Math.sin(2.7 * this.m + 0.9);
      this.hook += Math.max(0, T - G) * dt;
      if (this.hook > CFG.hookNeed) { this.m++; this.hook = 0; this.shake = Math.max(this.shake, 0.4); this.ev.onEngage?.(this.m); }
    }
  }

  release() {
    if (this.phase !== 'pull') return;
    this.releasedY = this.y0; this.ev.onRelease?.();
    if (this.torn) this.phase = 'fly';
    else if (this.y0 < CFG.minReturn) { this.phase = 'ret'; }
    else this.phase = 'fly';
  }

  stepFree(dt: number) {
    this.clock += dt;
    this.swing(dt, this.dx * 0.5);
    this.shake *= Math.exp(-dt * 12);
    this.press += (0 - this.press) * Math.min(1, dt * 10);
    if (this.phase === 'fly') {
      this.flyT += dt;
      this.v = Math.max(0, this.v - (CFG.decel + CFG.airDrag * this.v) * dt);
      this.a = -CFG.decel;
      this.y0 += this.v * dt;
      this.chain(dt);
      if (this.v < 0.03 || this.flyT > CFG.flyMax) { this.phase = 'fall'; this.v = 0; this.closed = true; }
    } else if (this.phase === 'ret') {
      this.y0 += (CFG.peek - this.y0) * Math.min(1, dt * 9); this.v = 0;
      this.flyT += dt; if (this.flyT > 0.5) this.phase = 'fall';
    } else if (this.phase === 'fall') {
      this.fall = Math.min(1, this.fall + dt / 1.1); this.resultT += dt;
    }
  }

  /** 取れた枚数（0なら引き抜けず/戻った） */
  get count() { return this.torn || this.releasedY < 1 ? 0 : this.m + 1; }
  get done() { return this.phase === 'fall' && this.fall >= 1 && this.resultT >= 1.5; }

  snap(out: Snap, hint = 0, time = 0): Snap {
    const ym = this.y0 - CFG.overlap * this.m;
    out.y0 = this.y0; out.m = this.m; out.dx = this.dx; out.sw = this.sw; out.v = this.v;
    out.nextY = this.closed ? 0.3 : Math.min(0.35, Math.max(0.2, ym - CFG.overlap));
    out.torn = this.torn; out.tornAt = this.tornAt; out.fall = this.fall; out.held = this.phase === 'pull';
    out.press = this.press; out.ret = this.phase === 'ret';
    out.shx = Math.sin(this.clock * 83) * this.shake * 2.5; out.shy = Math.cos(this.clock * 71) * this.shake * 2.5 + this.press * 2;
    out.count = (this.torn ? 0 : (this.y0 >= 1 && this.phase !== 'ret') ? this.m + 1 : 0);
    out.hint = hint; out.time = time; return out;
  }
}

import { CFG } from './config';

/** ケチャップの高さマップ。降伏応力つきの拡散で「ドロッ」と広がり盛り上がる */
export class Sim {
  readonly N = CFG.N;
  h = new Float32Array(CFG.N * CFG.N);
  poured = 0;
  private outside: Int32Array;
  constructor() {
    const N = CFG.N, c = N / 2, list: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const d = Math.hypot(i + 0.5 - c, j + 0.5 - c);
      if (d > CFG.plateR || i === 0 || j === 0 || i === N - 1 || j === N - 1) list.push(j * N + i);
    }
    this.outside = Int32Array.from(list);
  }
  /** vol を (cx,cy) 付近にガウス状に置く（保存） */
  splat(cx: number, cy: number, vol: number, sigma = 1.8) {
    const N = this.N, r = Math.ceil(sigma * 2.6), x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(N - 2, Math.ceil(cx + r));
    const y0 = Math.max(1, Math.floor(cy - r)), y1 = Math.min(N - 2, Math.ceil(cy + r));
    let sum = 0; const k = -1 / (2 * sigma * sigma);
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) sum += Math.exp(k * ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2));
    if (sum <= 0) return;
    const s = vol / sum;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) this.h[j * N + i] += s * Math.exp(k * ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2));
    this.poured += vol;
  }
  step(iters = 1) {
    const N = this.N, h = this.h, y = CFG.yieldSlope, K = CFG.spreadK, Kd = K * 0.62, S = CFG.surface, fl = CFG.yieldFall, fx = CFG.yieldFloor;
    for (let it = 0; it < iters; it++) {
      for (let j = 1; j < N - 2; j++) {
        let a = j * N + 1;
        for (let i = 1; i < N - 1; i++, a++) {
          const ha = h[a];
          // 厚いところほど降伏勾配が小さい → 天井がなだらかな「ドーム」になる
          let b = a + 1, hb = h[b], d = ha - hb, ad = d < 0 ? -d : d, yy = y * (fx + fl / (1 + 0.5 * (ha + hb)));
          let m = d * S; if (ad > yy) m += (d > 0 ? 1 : -1) * (ad - yy) * K; h[a] -= m; h[b] += m;
          b = a + N; hb = h[b]; d = h[a] - hb; ad = d < 0 ? -d : d; yy = y * (fx + fl / (1 + 0.5 * (h[a] + hb)));
          m = d * S; if (ad > yy) m += (d > 0 ? 1 : -1) * (ad - yy) * K; h[a] -= m; h[b] += m;
          b = a + N + 1; hb = h[b]; d = h[a] - hb; ad = d < 0 ? -d : d; yy = y * 1.4142 * (fx + fl / (1 + 0.5 * (h[a] + hb)));
          if (ad > yy) { m = (ad - yy) * Kd; if (d > 0) { h[a] -= m; h[b] += m; } else { h[a] += m; h[b] -= m; } }
          if (i > 1) { b = a + N - 1; hb = h[b]; d = h[a] - hb; ad = d < 0 ? -d : d; yy = y * 1.4142 * (fx + fl / (1 + 0.5 * (h[a] + hb))); if (ad > yy) { m = (ad - yy) * Kd; if (d > 0) { h[a] -= m; h[b] += m; } else { h[a] += m; h[b] -= m; } } }
        }
      }
      const o = this.outside; for (let k = 0; k < o.length; k++) h[o[k]] = 0;
    }
  }
  /** 皿の上に残っている量 */
  onPlate() { let s = 0; for (let i = 0; i < this.h.length; i++) s += this.h[i]; return s; }
}

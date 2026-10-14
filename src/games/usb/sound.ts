import type { AudioEngine } from '../../core/audio';
// 自前の短い合成音（ミュート尊重）
export function makeSound(A: AudioEngine) {
  const ok = () => !!A.ctx && !A.muted;
  const osc = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) => {
    if (!ok()) return; const c = A.ctx!, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.02);
  };
  const noise = (dur: number, vol: number, lp: number, hp = 0, delay = 0) => {
    if (!ok()) return; const c = A.ctx!, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); let l: AudioNode = f;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; f.connect(h); l = h; } l.connect(g); g.connect(A.master); s.start(t);
  };
  return {
    /** 金属の接触: ガツッ */
    bump(v = 0) { noise(0.07, 0.5, 3200, 400); osc('sine', 150, 55, 0.16, 0.55); [2300, 3350, 4900].forEach((f, i) => osc('sine', f + v * 40, f * 0.98, 0.14 - i * 0.03, 0.09, i * 0.004)); },
    /** スッ(滑り込み) + カチッ */
    insert() { noise(0.16, 0.16, 6000, 1800); osc('sine', 700, 1100, 0.12, 0.05); osc('square', 2600, 2000, 0.025, 0.2, 0.17); noise(0.03, 0.35, 8000, 2500, 0.17); osc('sine', 320, 140, 0.12, 0.35, 0.18); [3100, 4600].forEach((f, i) => osc('sine', f, f, 0.2, 0.06, 0.18 + i * 0.004)); },
    /** ミシミシ → 無理やり */
    crunch() { noise(0.45, 0.4, 2600, 300); osc('sawtooth', 90, 40, 0.4, 0.3); noise(0.05, 0.5, 6000, 1500, 0.25); osc('sine', 120, 45, 0.2, 0.5, 0.42); },
    flip() { noise(0.1, 0.12, 5000, 1500); osc('triangle', 600, 900, 0.07, 0.06); },
    grab() { osc('sine', 420, 520, 0.04, 0.07); },
    tick() { osc('square', 1800, 1800, 0.02, 0.05); },
  };
}

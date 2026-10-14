import type { AudioEngine } from '../../core/audio';

/** ケチャップの合成音。流れ中は低域ノイズ+うねり、ブッ/ドロッ/ぽた は単発 */
export class KSound {
  private c: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private srcs: (AudioScheduledSourceNode)[] = [];
  private gain: GainNode | null = null; private bp: BiquadFilterNode | null = null; private sub: OscillatorNode | null = null; private subG: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  constructor(private audio: AudioEngine) {}
  private get ok() { return !!this.audio.ctx && !this.audio.muted; }
  start() {
    const a = this.audio; if (!a.ctx || this.c) return; const c = this.c = a.ctx;
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = this.bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 300; bp.Q.value = 4;
    const g = this.gain = c.createGain(); g.gain.value = 0;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 11; lg.gain.value = 140; lfo.connect(lg); lg.connect(bp.frequency);
    src.connect(bp); bp.connect(g); g.connect(a.master);
    const sub = this.sub = c.createOscillator(), sg = this.subG = c.createGain(); sub.type = 'sine'; sub.frequency.value = 80; sg.gain.value = 0; sub.connect(sg); sg.connect(a.master);
    src.start(); lfo.start(); sub.start();
    this.srcs.push(src, lfo, sub); this.nodes.push(bp, g, lg, sg);
  }
  setFlow(q: number, t: number) {
    if (!this.c || !this.gain) return;
    const on = this.ok ? 1 : 0, k = Math.min(1, q / 1000);
    const now = this.c.currentTime;
    this.gain.gain.setTargetAtTime(on * Math.min(0.5, k * 0.7 + (q > 10 ? 0.04 : 0)), now, 0.03);
    this.bp!.frequency.setTargetAtTime(220 + q * 0.5 + Math.sin(t * 30) * 30, now, 0.04);
    this.sub!.frequency.setTargetAtTime(62 + k * 70 + Math.sin(t * 9) * 8, now, 0.05);
    this.subG!.gain.setTargetAtTime(on * k * 0.22, now, 0.05);
  }
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    if (!this.ok) return; const c = this.audio.ctx!, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.audio.master); o.start(t); o.stop(t + dur + 0.02);
  }
  private puff(dur: number, vol: number, lp: number, hp = 0, delay = 0) {
    if (!this.ok || !this.noiseBuf) return; const c = this.audio.ctx!, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); let last: AudioNode = f; if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; f.connect(h); last = h; }
    last.connect(g); g.connect(this.audio.master); s.start(t, Math.random() * 0.5, dur + 0.05);
  }
  /** 空気だけ「ブッ」 */
  air() { this.tone('sawtooth', 130, 55, 0.13, 0.22); this.puff(0.1, 0.3, 2500, 500); this.tone('square', 90, 45, 0.08, 0.1, 0.05); }
  /** 「ドロッ」 */
  glop() { this.tone('sine', 190, 52, 0.26, 0.5); this.puff(0.22, 0.28, 700); this.tone('sine', 120, 70, 0.18, 0.3, 0.1); }
  /** 離したときの「ぷちゅ」 */
  cut() { this.tone('sine', 360, 130, 0.07, 0.26); this.puff(0.05, 0.12, 1800, 400); }
  /** 粒が着地「ぽた」 */
  drip(v = 0) { this.tone('sine', 420 + (v % 5) * 40, 180, 0.07, 0.2); }
  /** 勢いが強すぎる「ブシャッ」 */
  burst() { this.puff(0.25, 0.5, 5000, 700); this.tone('sawtooth', 160, 60, 0.18, 0.2); }
  /** 結果 */
  fin(good: boolean) { if (good) { this.tone('triangle', 660, 660, 0.12, 0.2); this.tone('triangle', 990, 990, 0.25, 0.2, 0.1); } else this.tone('sine', 200, 90, 0.3, 0.25); }
  destroy() {
    for (const s of this.srcs) { try { s.stop(); } catch { /* */ } try { s.disconnect(); } catch { /* */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* */ } }
    this.srcs = []; this.nodes = []; this.c = null;
  }
}

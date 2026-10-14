// 無料・外部素材なし。WebAudio で全て合成する。ユーザー操作後に resume。
type Sfx = 'tap' | 'ok' | 'ng' | 'hit' | 'thud' | 'pop' | 'boom' | 'fart' | 'scream' | 'gameover' | 'unlock' | 'coin' | 'whoosh' | 'boing' | 'squeak' | 'combo' | 'alarm';

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  private bgmTimer = 0;
  private bgmStep = 0;
  private bgmOn = false;
  private bgmTempo = 140;
  private bgmKind = 0;
  muted = localStorage.getItem('baka.mute') === '1';

  /** 最初のユーザー操作で呼ぶ */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }
  setMuted(m: boolean) {
    this.muted = m; localStorage.setItem('baka.mute', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }
  private get ok() { return !!this.ctx && !this.muted; }

  private osc(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.3, delay = 0) {
    const c = this.ctx!, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  private noise(dur: number, vol = 0.3, lp = 4000, delay = 0, hp = 0) {
    const c = this.ctx!, t = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); let last: AudioNode = f;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; f.connect(h); last = h; }
    last.connect(g); g.connect(this.master); s.start(t);
  }

  /** variant: 任意の整数。同じ名前でも毎回少し変わる */
  sfx(name: Sfx, variant = 0) {
    if (!this.ok) return;
    const r = () => Math.random();
    switch (name) {
      case 'tap': this.osc('square', 520, 780, 0.07, 0.15); break;
      case 'ok': this.osc('square', 520, 520, 0.08, 0.2); this.osc('square', 780, 780, 0.12, 0.2, 0.08); this.osc('square', 1040, 1040, 0.18, 0.2, 0.16); break;
      case 'ng': this.osc('sawtooth', 300, 90, 0.35, 0.3); this.osc('square', 200, 60, 0.4, 0.2, 0.05); break;
      case 'hit': this.noise(0.12, 0.35, 1800); this.osc('sine', 160 + r() * 60, 60, 0.15, 0.4); break;
      case 'thud': this.osc('sine', 110 + variant % 5 * 12, 40, 0.22, 0.6); this.noise(0.08, 0.2, 600); break;
      case 'pop': this.osc('sine', 300, 900 + r() * 400, 0.09, 0.3); break;
      case 'boom': this.noise(0.8, 0.7, 900); this.osc('sine', 90, 25, 0.8, 0.7); break;
      case 'boing': this.osc('sine', 200, 700, 0.18, 0.35); this.osc('sine', 700, 200, 0.22, 0.3, 0.16); break;
      case 'squeak': this.osc('triangle', 900 + r() * 500, 1500 + r() * 600, 0.1, 0.25); break;
      case 'whoosh': this.noise(0.35, 0.25, 3000, 0, 800); break;
      case 'coin': this.osc('square', 988, 988, 0.07, 0.2); this.osc('square', 1319, 1319, 0.25, 0.2, 0.07); break;
      case 'combo': { const n = [523, 659, 784, 1047, 1319]; n.forEach((f, i) => this.osc('square', f, f, 0.1, 0.18, i * 0.06)); break; }
      case 'alarm': for (let i = 0; i < 3; i++) { this.osc('square', 880, 880, 0.1, 0.2, i * 0.2); this.osc('square', 660, 660, 0.1, 0.2, i * 0.2 + 0.1); } break;
      case 'unlock': [523, 659, 784, 1047, 784, 1047, 1568].forEach((f, i) => this.osc('square', f, f, 0.14, 0.2, i * 0.09)); break;
      case 'gameover': [392, 330, 262, 196].forEach((f, i) => this.osc('sawtooth', f, f * 0.95, 0.28, 0.25, i * 0.2)); break;
      case 'scream': {
        // 叫び声: のこぎり波＋フォルマント風バンドパス＋ビブラート
        const c = this.ctx!, t = c.currentTime, base = 380 + (variant % 4) * 70 + r() * 80, dur = 0.55 + r() * 0.3;
        const o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 1.6, t + dur * 0.3); o.frequency.linearRampToValueAtTime(base * 0.5, t + dur);
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 9; lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency);
        bp.type = 'bandpass'; bp.frequency.setValueAtTime(800, t); bp.frequency.linearRampToValueAtTime(1800, t + dur * 0.4); bp.Q.value = 3;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(bp); bp.connect(g); g.connect(this.master); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05); break;
      }
      case 'fart': {
        // おなら: 低いのこぎり波＋ゆらぎ＋ノイズ。variant で長さ・音程が変わる
        const c = this.ctx!, t = c.currentTime, k = variant % 5;
        const dur = [0.25, 0.4, 0.6, 0.32, 0.8][k], f0 = [140, 90, 70, 180, 60][k];
        const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
        o.type = k === 3 ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (k === 3 ? 2.2 : 0.55), t + dur);
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 22 + r() * 30; lg.gain.value = f0 * 0.35; lfo.connect(lg); lg.connect(o.frequency);
        lp.type = 'lowpass'; lp.frequency.value = 700 + r() * 500;
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
        this.noise(dur * 0.8, 0.18, 1200); break;
      }
    }
  }

  /** 簡易BGM。kind 0..4 でゲームごとにコード進行・テンポが変わる */
  startBgm(kind = 0, tempo = 140) {
    this.stopBgm(); this.bgmKind = kind; this.bgmTempo = tempo; this.bgmOn = true; this.bgmStep = 0;
    const tick = () => {
      if (!this.bgmOn) return;
      if (this.ok) this.bgmNote();
      this.bgmStep++;
      this.bgmTimer = window.setTimeout(tick, 60000 / this.bgmTempo / 2);
    };
    tick();
  }
  stopBgm() { this.bgmOn = false; clearTimeout(this.bgmTimer); }
  setBgmTempo(t: number) { this.bgmTempo = t; }
  private bgmNote() {
    const scales = [[0, 3, 5, 7, 10], [0, 2, 4, 7, 9], [0, 3, 7, 8, 10], [0, 2, 3, 7, 8], [0, 4, 5, 7, 11]];
    const sc = scales[this.bgmKind % 5], root = [110, 98, 123.5, 87.3, 130.8][this.bgmKind % 5];
    const s = this.bgmStep, hz = (semi: number, oct = 1) => root * oct * Math.pow(2, semi / 12);
    if (s % 2 === 0) this.osc('triangle', hz(sc[[0, 0, 3, 2][(s >> 3) % 4]], 1), hz(sc[0], 1), 0.22, 0.12);
    const m = sc[(s * 7 + (s >> 2) * 3) % sc.length];
    if (s % 4 !== 3) this.osc('square', hz(m, 4), hz(m, 4), 0.1, 0.035);
    if (s % 4 === 2) this.noise(0.04, 0.05, 9000, 0, 5000);
  }
}

// The noise gate and tail stage (see voice.ts), as an AudioWorklet module.
// A file of its own so it loads from this site under the security policy,
// which refuses worklets made from blob: URLs.
class Clean extends AudioWorkletProcessor {
  constructor() {
    super();
    this.mode = 1; this.tail = false;
    this.msF = 0; this.msS = 0; this.msM = 0; this.lift = 1; this.g = 1; this.hold = 0;
    this.blk = 0; this.blkN = 0; this.smooth = 0; this.winMin = 1; this.prevMin = 1; this.winN = 0; this.noise = 0.003;
    this.fast = 0; this.slow = 0; this.tg = 1;
    this.port.onmessage = (e) => { this.mode = e.data.mode; this.tail = e.data.tail; };
  }
  process(inputs, outputs) {
    const main = inputs[0], side = inputs[1], out = outputs[0];
    if (!main || !main[0]) return true;
    const x = main[0], sc = side && side[0] ? side[0] : x, n = x.length, sr = sampleRate;
    const tc = (s) => 1 - Math.exp(-1 / (sr * s));
    const blockN = Math.round(sr * 0.01), winBlocks = 150, holdN = sr * 0.2;
    const strong = this.mode === 2;
    const open = strong ? 3.2 : 2.5, expo = strong ? 4 : 3, floor = strong ? 0.06 : 0.18;
    const fUp = tc(0.002), fDown = tc(0.06), sym = tc(0.025), liftK = tc(0.3), gUp = tc(0.002), gDown = tc(0.05), tUp = tc(0.005), tDown = tc(0.03);
    const fastFall = Math.exp(-1 / (sr * 0.006)), slowRise = tc(0.01), slowFall = Math.exp(-1 / (sr * 0.35));
    for (let i = 0; i < n; i++) {
      const v = sc[i], p = v * v, a = v < 0 ? -v : v, m = x[i] * x[i];
      this.msF += (p - this.msF) * (p > this.msF ? fUp : fDown); // quick to notice a voice
      this.msS += (p - this.msS) * sym; // the level itself
      this.msM += (m - this.msM) * sym; // the same, after the tone
      this.blk += p;
      if (++this.blkN >= blockN) {
        const r = Math.sqrt(this.blk / this.blkN);
        this.blk = 0; this.blkN = 0;
        this.smooth = this.smooth ? this.smooth * 0.7 + r * 0.3 : r;
        if (this.smooth < this.winMin) this.winMin = this.smooth;
        if (++this.winN >= winBlocks) { this.prevMin = this.winMin; this.winMin = 1; this.winN = 0; }
        // the quietest stretch sits a little under the floor's average
        const target = Math.min(this.winMin, this.prevMin) * 1.3;
        if (target < 1) this.noise += (target - this.noise) * 0.1;
      }
      let target = 1;
      if (this.mode > 0) {
        const th = Math.min(0.04, Math.max(0.0008, this.noise * open));
        const lvl = Math.sqrt(this.msS);
        if (Math.sqrt(this.msF) > th) this.hold = holdN; else if (this.hold > 0) this.hold--;
        if (this.hold <= 0) {
          if (lvl > 0) this.lift += (Math.min(16, Math.max(0.25, Math.sqrt(this.msM) / lvl)) - this.lift) * liftK;
          target = Math.max(floor / Math.max(1, this.lift), Math.pow(Math.min(1, lvl / th), expo));
        }
      }
      this.g += (target - this.g) * (target > this.g ? gUp : gDown);
      let t2 = 1;
      if (this.tail) {
        this.fast = a > this.fast ? a : this.fast * fastFall;
        this.slow = a > this.slow ? this.slow + (a - this.slow) * slowRise : this.slow * slowFall;
        const ref = this.slow * 0.35;
        if (this.fast < ref && ref > 0) { const q = this.fast / ref; t2 = Math.max(0.25, q * Math.sqrt(q)); }
      }
      this.tg += (t2 - this.tg) * (t2 > this.tg ? tUp : tDown);
      const gain = this.g * this.tg;
      for (let c = 0; c < out.length; c++) out[c][i] = (main[c] || x)[i] * gain;
    }
    return true;
  }
}
registerProcessor('qng-clean', Clean);

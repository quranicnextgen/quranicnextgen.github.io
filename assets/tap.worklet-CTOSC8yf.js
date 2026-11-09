// The AI ear's tap (see ear.ts), as an AudioWorklet module: it hands the
// microphone's samples to the page in blocks. A file of its own so it loads from
// this site under the security policy, which refuses worklets made from blob:
// or data: URLs. Made from a blob, it stopped the ear from ever listening.
class Tap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(2048);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch)
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) {
          this.port.postMessage(this.buf.slice(0));
          this.n = 0;
        }
      }
    return true;
  }
}
registerProcessor('qng-tap', Tap);

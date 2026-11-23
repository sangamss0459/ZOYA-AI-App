class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 2048;
    this._buffer = new Float32Array(this._bufferSize);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._offset++] = channelData[i];
      if (this._offset >= this._bufferSize) {
        const pcm16 = new Int16Array(this._bufferSize);
        let sumSquares = 0;
        for (let j = 0; j < this._bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this._buffer[j]));
          sumSquares += s * s;
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const rms = Math.sqrt(sumSquares / this._bufferSize);
        this.port.postMessage({ pcm16: pcm16.buffer, rms }, [pcm16.buffer]);
        this._offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function float32ToInt16Buffer(float32: Float32Array): {
  buffer: ArrayBuffer;
  rms: number;
} {
  const int16 = new Int16Array(float32.length);
  let sumSquares = 0;
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    sumSquares += s * s;
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return {
    buffer: int16.buffer,
    rms: Math.sqrt(sumSquares / float32.length),
  };
}

export function pcm16Base64ToAudioBuffer(
  ctx: AudioContext,
  base64Pcm: string,
  sampleRate = 24000
): AudioBuffer {
  const bytes = base64ToUint8Array(base64Pcm);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const audioBuffer = ctx.createBuffer(1, sampleCount, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let i = 0; i < sampleCount; i++) {
    const intSample = view.getInt16(i * 2, true);
    channel[i] = intSample / 32768;
  }
  return audioBuffer;
}

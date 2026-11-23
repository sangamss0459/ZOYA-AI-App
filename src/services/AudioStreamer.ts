import {
  arrayBufferToBase64,
  float32ToInt16Buffer,
  pcm16Base64ToAudioBuffer,
} from "../utils/audioUtils";

export interface AudioStreamerCallbacks {
  onMicPcmBase64: (base64: string, rms: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onError?: (err: Error) => void;
}

export class AudioStreamer {
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private outputGain: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;

  private activeSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private isMuted = false;
  private micLevel = 0;
  private analyserBins = new Uint8Array(64);
  private callbacks: AudioStreamerCallbacks;

  constructor(callbacks: AudioStreamerCallbacks) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone capture is not supported in this browser or context.");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 16kHz input AudioContext for Gemini Live API
    this.inputCtx = new AudioContext({ sampleRate: 16000 });
    if (this.inputCtx.state === "suspended") {
      await this.inputCtx.resume();
    }

    // 24kHz output AudioContext for Gemini Live 24kHz PCM responses
    this.outputCtx = new AudioContext({ sampleRate: 24000 });
    if (this.outputCtx.state === "suspended") {
      await this.outputCtx.resume();
    }

    this.outputAnalyser = this.outputCtx.createAnalyser();
    this.outputAnalyser.fftSize = 128;
    this.outputAnalyser.smoothingTimeConstant = 0.78;
    this.analyserBins = new Uint8Array(this.outputAnalyser.frequencyBinCount);

    this.outputGain = this.outputCtx.createGain();
    this.outputGain.gain.value = 1;
    this.outputGain.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.outputCtx.destination);

    this.sourceNode = this.inputCtx.createMediaStreamSource(this.mediaStream);
    this.silentGain = this.inputCtx.createGain();
    this.silentGain.gain.value = 0;

    let workletReady = false;
    if (this.inputCtx.audioWorklet) {
      try {
        await this.inputCtx.audioWorklet.addModule("/worklets/pcm-capture-processor.js");
        this.workletNode = new AudioWorkletNode(this.inputCtx, "pcm-capture-processor");
        this.workletNode.port.onmessage = (event: MessageEvent<{ pcm16: ArrayBuffer; rms: number }>) => {
          if (this.isMuted) {
            this.micLevel = 0;
            return;
          }
          const { pcm16, rms } = event.data;
          this.micLevel = rms;
          const b64 = arrayBufferToBase64(pcm16);
          this.callbacks.onMicPcmBase64(b64, rms);
        };
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.silentGain);
        this.silentGain.connect(this.inputCtx.destination);
        workletReady = true;
      } catch {
        workletReady = false;
      }
    }

    // Fallback to ScriptProcessorNode if AudioWorklet is blocked in older Android WebView
    if (!workletReady) {
      this.scriptProcessor = this.inputCtx.createScriptProcessor(2048, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        if (this.isMuted) {
          this.micLevel = 0;
          return;
        }
        const floatData = e.inputBuffer.getChannelData(0);
        const { buffer, rms } = float32ToInt16Buffer(floatData);
        this.micLevel = rms;
        const b64 = arrayBufferToBase64(buffer);
        this.callbacks.onMicPcmBase64(b64, rms);
      };
      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.silentGain);
      this.silentGain.connect(this.inputCtx.destination);
    }
  }

  playPcmChunk(base64Pcm: string): void {
    if (!this.outputCtx || !this.outputGain) return;
    if (this.outputCtx.state === "suspended") {
      void this.outputCtx.resume();
    }

    const audioBuffer = pcm16Base64ToAudioBuffer(this.outputCtx, base64Pcm, 24000);
    const source = this.outputCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputGain);

    const now = this.outputCtx.currentTime;
    if (this.nextStartTime < now + 0.015) {
      this.nextStartTime = now + 0.025;
    }

    const scheduledStart = this.nextStartTime;
    this.nextStartTime += audioBuffer.duration;

    const wasEmpty = this.activeSources.size === 0;
    this.activeSources.add(source);
    if (wasEmpty) {
      this.callbacks.onPlaybackStateChange?.(true);
    }

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.callbacks.onPlaybackStateChange?.(false);
      }
    };

    source.start(scheduledStart);
  }

  clearPlaybackQueue(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    if (this.outputCtx) {
      this.nextStartTime = this.outputCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
    this.callbacks.onPlaybackStateChange?.(false);
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      for (const track of this.mediaStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    if (muted) {
      this.micLevel = 0;
    }
  }

  getAudioMetrics(): { micLevel: number; outputLevel: number } {
    let outputLevel = 0;
    if (this.outputAnalyser && this.activeSources.size > 0) {
      this.outputAnalyser.getByteFrequencyData(this.analyserBins);
      let sum = 0;
      const count = Math.min(24, this.analyserBins.length);
      for (let i = 0; i < count; i++) {
        sum += this.analyserBins[i];
      }
      outputLevel = sum / (count * 255);
    }
    return {
      micLevel: Math.min(1, this.micLevel * 5.5),
      outputLevel: Math.min(1, outputLevel * 1.4),
    };
  }

  async stop(): Promise<void> {
    this.clearPlaybackQueue();

    try {
      this.workletNode?.port.close();
      this.workletNode?.disconnect();
    } catch {
      // ignore
    }
    try {
      this.scriptProcessor?.disconnect();
    } catch {
      // ignore
    }
    try {
      this.sourceNode?.disconnect();
      this.silentGain?.disconnect();
    } catch {
      // ignore
    }

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
    }

    if (this.inputCtx && this.inputCtx.state !== "closed") {
      await this.inputCtx.close().catch(() => undefined);
    }
    if (this.outputCtx && this.outputCtx.state !== "closed") {
      await this.outputCtx.close().catch(() => undefined);
    }

    this.workletNode = null;
    this.scriptProcessor = null;
    this.sourceNode = null;
    this.silentGain = null;
    this.mediaStream = null;
    this.inputCtx = null;
    this.outputCtx = null;
    this.outputAnalyser = null;
    this.outputGain = null;
    this.micLevel = 0;
  }
}

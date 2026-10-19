export class RetroAudioProcessor {
  private audioCtx: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processedDestination: MediaStreamAudioDestinationNode | null = null;
  private tapeHumSource: AudioBufferSourceNode | null = null;
  private tapeHumGain: GainNode | null = null;
  private isHumming = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Create distortion/saturation curve for 2000s electret mic overdriven response
  private makeSaturationCurve(amount = 20): Float32Array {
    const k = typeof amount === 'number' ? amount : 20;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Set up the full retro audio DSP pipeline
  connectMicStream(inputStream: MediaStream): MediaStream {
    if (!inputStream.getAudioTracks().length) return inputStream;

    try {
      const ctx = this.getAudioContext();

      if (this.micSource) {
        this.micSource.disconnect();
      }

      this.micSource = ctx.createMediaStreamSource(inputStream);
      this.processedDestination = ctx.createMediaStreamDestination();

      // 1. High-pass filter at 250 Hz (cuts modern smartphone sub-bass rumble)
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(250, ctx.currentTime);
      highpass.Q.setValueAtTime(0.7, ctx.currentTime);

      // 2. Low-pass filter at 4200 Hz (cuts modern high fidelity brilliance)
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(4200, ctx.currentTime);
      lowpass.Q.setValueAtTime(0.7, ctx.currentTime);

      // 3. Peaking filter at 1800 Hz for vintage tinny mic resonance
      const midPeaking = ctx.createBiquadFilter();
      midPeaking.type = 'peaking';
      midPeaking.frequency.setValueAtTime(1800, ctx.currentTime);
      midPeaking.gain.setValueAtTime(5.0, ctx.currentTime); // +5dB
      midPeaking.Q.setValueAtTime(1.6, ctx.currentTime);

      // 4. WaveShaperNode for subtle harmonic saturation
      const waveShaper = ctx.createWaveShaper();
      waveShaper.curve = this.makeSaturationCurve(15) as unknown as Float32Array<ArrayBuffer>;
      waveShaper.oversample = '2x';

      // 5. Aggressive DynamicsCompressorNode (camcorder auto-gain pump)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-28, ctx.currentTime);
      compressor.knee.setValueAtTime(6, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.18, ctx.currentTime);

      // Connect pipeline
      this.micSource.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(midPeaking);
      midPeaking.connect(waveShaper);
      waveShaper.connect(compressor);
      compressor.connect(this.processedDestination);

      return this.processedDestination.stream;
    } catch (err) {
      console.warn('Audio processing fallback to raw stream:', err);
      return inputStream;
    }
  }

  getProcessedAudioTrack(): MediaStreamTrack | null {
    if (this.processedDestination && this.processedDestination.stream.getAudioTracks().length) {
      return this.processedDestination.stream.getAudioTracks()[0];
    }
    return null;
  }

  // Vintage piezo beep on click
  playBeep(freq = 1900, duration = 0.05, type: OscillatorType = 'sine'): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  // Double beep when REC starts
  playRecStart(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(1550, now);
      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(2200, now + 0.1);
      gain2.gain.setValueAtTime(0.14, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.19);
    } catch {}
  }

  // Double beep when REC stops
  playRecStop(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(2200, now);
      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(1380, now + 0.1);
      gain2.gain.setValueAtTime(0.14, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.2);
    } catch {}
  }

  // Zoom motor servo whir
  playZoomWhir(pitch = 380): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(pitch * 1.15, ctx.currentTime + 0.12);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, ctx.currentTime);
      filter.Q.setValueAtTime(2.5, ctx.currentTime);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // Continuous subtle MiniDV spinning drum motor hum
  startTapeHum(): void {
    if (this.isHumming) return;
    try {
      const ctx = this.getAudioContext();
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.15;
        data[i] = (b0 + b1 + b2) * 0.09;
      }

      this.tapeHumSource = ctx.createBufferSource();
      this.tapeHumSource.buffer = noiseBuffer;
      this.tapeHumSource.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(800, ctx.currentTime);
      bandpass.Q.setValueAtTime(1.8, ctx.currentTime);

      this.tapeHumGain = ctx.createGain();
      this.tapeHumGain.gain.setValueAtTime(0.02, ctx.currentTime);

      this.tapeHumSource.connect(bandpass);
      bandpass.connect(this.tapeHumGain);
      this.tapeHumGain.connect(ctx.destination);

      this.tapeHumSource.start();
      this.isHumming = true;
    } catch {}
  }

  stopTapeHum(): void {
    if (!this.isHumming) return;
    try {
      if (this.tapeHumSource) {
        this.tapeHumSource.stop();
        this.tapeHumSource.disconnect();
        this.tapeHumSource = null;
      }
      this.isHumming = false;
    } catch {}
  }
}

export const retroAudioProcessor = new RetroAudioProcessor();

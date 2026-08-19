// audio.js - Web Audio API Sound Engine for Sky Jet 3D

class FlightAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

    // Nodes
    this.masterGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineNoiseNode = null;
    this.engineFilter = null;

    this.boostGain = null;
    this.boostFilter = null;

    this.windGain = null;
    this.windFilter = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this._setupEngineSound();
      this._setupBoostSound();
      this._setupWindSound();

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio not supported or blocked:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  _createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _setupEngineSound() {
    // Jet Turbine: Low humming oscillators + Bandpass filtered noise
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = "sawtooth";
    this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "triangle";
    this.engineOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.engineOsc1.connect(oscGain);
    this.engineOsc2.connect(oscGain);

    // Jet roar noise
    const noiseBuffer = this._createNoiseBuffer();
    this.engineNoiseNode = this.ctx.createBufferSource();
    this.engineNoiseNode.buffer = noiseBuffer;
    this.engineNoiseNode.loop = true;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.engineNoiseNode.connect(this.engineFilter);
    this.engineFilter.connect(noiseGain);

    oscGain.connect(this.engineGain);
    noiseGain.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineNoiseNode.start();
  }

  _setupBoostSound() {
    this.boostGain = this.ctx.createGain();
    this.boostGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const boostNoise = this.ctx.createBufferSource();
    boostNoise.buffer = noiseBuffer;
    boostNoise.loop = true;

    this.boostFilter = this.ctx.createBiquadFilter();
    this.boostFilter.type = "bandpass";
    this.boostFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.boostFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    boostNoise.connect(this.boostFilter);
    this.boostFilter.connect(this.boostGain);
    this.boostGain.connect(this.masterGain);

    boostNoise.start();
  }

  _setupWindSound() {
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windNoise.start();
  }

  update(throttle, speedKmH, isBoosting) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Pitch & Volume based on throttle and speed
    const baseFreq = 50 + throttle * 120 + (speedKmH / 900) * 80;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.1, t, 0.08);

    const filterFreq = 300 + throttle * 1200 + (speedKmH / 900) * 800;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

    const targetEngineVol = 0.2 + throttle * 0.45;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, t, 0.08);

    // Wind speed sound
    const windVol = Math.min(0.6, (speedKmH / 900) * 0.5);
    const windCutoff = 200 + (speedKmH / 900) * 1400;
    this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(windCutoff, t, 0.1);

    // Boost effect
    const boostVol = isBoosting ? 0.65 : 0.0;
    this.boostGain.gain.setTargetAtTime(boostVol, t, 0.06);
    if (isBoosting) {
      this.boostFilter.frequency.setTargetAtTime(1200 + Math.random() * 200, t, 0.05);
    }
  }

  playCollectSound() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Futuristic synth chime (2 harmonious tones)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(587.33, t); // D5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, t + 0.18); // D6

    osc2.frequency.setValueAtTime(880, t); // A5
    osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.25); // A6

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  playTakeoffAlert() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1200, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  playWarningBeep() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(950, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playCrashSound() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const noiseBuffer = this._createNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 1.4);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const flightAudio = new FlightAudioEngine();

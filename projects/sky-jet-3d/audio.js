// audio.js - Web Audio API Sound Engine (Turbines, Sonic Booms, Stunts, Radios, Alarms & Ring Chimes)

class FlightAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

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
    this.boostFilter.frequency.setValueAtTime(850, this.ctx.currentTime);
    this.boostFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

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

    const baseFreq = 50 + throttle * 120 + (speedKmH / 1400) * 90;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.1, t, 0.08);

    const filterFreq = 300 + throttle * 1400 + (speedKmH / 1400) * 900;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

    const targetEngineVol = 0.2 + throttle * 0.45;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, t, 0.08);

    const windVol = Math.min(0.65, (speedKmH / 1400) * 0.55);
    const windCutoff = 200 + (speedKmH / 1400) * 1600;
    this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(windCutoff, t, 0.1);

    const boostVol = isBoosting ? 0.7 : 0.0;
    this.boostGain.gain.setTargetAtTime(boostVol, t, 0.06);
    if (isBoosting) {
      this.boostFilter.frequency.setTargetAtTime(1300 + Math.random() * 200, t, 0.05);
    }
  }

  // 💥 Thunderous Sonic Boom when breaking Mach 1 (1235 km/h)
  playSonicBoom() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.6);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.95);

    // Boom sub-noise transient
    const noiseBuffer = this._createNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(30, t + 0.7);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.9, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.85);
  }

  // ⭕ Holographic Ring Pass Chime
  playRingChime() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, t + 0.2); // C6

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  // 🎯 Stunt Recognition Fanfare
  playStuntFanfare() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C Arpeggio
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.25, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.3);
    });
  }

  // ⚠️ Pull Up / Stall Warning
  playPullUpAlert() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(600, t + 0.1);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCollectSound(type = "normal") {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === "gold") {
      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(659.25, t);
      osc1.frequency.exponentialRampToValueAtTime(1318.51, t + 0.3);
      osc2.frequency.setValueAtTime(1046.50, t);
      osc2.frequency.exponentialRampToValueAtTime(2093.00, t + 0.4);
    } else if (type === "plasma") {
      osc1.type = "sawtooth";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(300, t);
      osc1.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
      osc2.frequency.setValueAtTime(600, t);
      osc2.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
    } else {
      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(587.33, t);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, t + 0.18);
      osc2.frequency.setValueAtTime(880, t);
      osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.25);
    }

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.55);
    osc2.stop(t + 0.55);
  }

  playRadioChatter() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(900, t + 0.06);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playShieldDeflect() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
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

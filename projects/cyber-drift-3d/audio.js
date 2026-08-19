// audio.js - Cyber Drift 3D Sound Engine (Engine RPM, Turbo, Screech, Police Sirens, Takedown Smashes, Helicopters & Road Grinds)

class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

    this.masterGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineOsc3 = null;
    this.engineFilter = null;

    this.turboGain = null;
    this.turboOsc = null;

    this.screechGain = null;
    this.screechFilter = null;

    this.nitroGain = null;
    this.sirenGain = null;
    this.sirenOsc = null;

    this.heliGain = null;
    this.heliOsc = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this._setupEngineSound();
      this._setupTurboSound();
      this._setupTireScreech();
      this._setupNitroSound();
      this._setupPoliceSiren();
      this._setupHelicopterSound();

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
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "square";
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc3 = this.ctx.createOscillator();
    this.engineOsc3.type = "triangle";
    this.engineOsc3.frequency.setValueAtTime(135, this.ctx.currentTime);

    const mixGain = this.ctx.createGain();
    mixGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.engineOsc1.connect(mixGain);
    this.engineOsc2.connect(mixGain);
    this.engineOsc3.connect(mixGain);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.8, this.ctx.currentTime);

    mixGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineOsc3.start();
  }

  _setupTurboSound() {
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = "sine";
    this.turboOsc.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();
  }

  _setupTireScreech() {
    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = "bandpass";
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    noiseSource.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    noiseSource.start();
  }

  _setupNitroSound() {
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const nitroNoise = this.ctx.createBufferSource();
    nitroNoise.buffer = noiseBuffer;
    nitroNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    nitroNoise.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    nitroNoise.start();
  }

  _setupPoliceSiren() {
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = "sawtooth";
    this.sirenOsc.frequency.setValueAtTime(750, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.sirenOsc.connect(filter);
    filter.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);

    this.sirenOsc.start();
  }

  _setupHelicopterSound() {
    this.heliGain = this.ctx.createGain();
    this.heliGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.heliOsc = this.ctx.createOscillator();
    this.heliOsc.type = "square";
    this.heliOsc.frequency.setValueAtTime(24, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, this.ctx.currentTime);

    this.heliOsc.connect(filter);
    filter.connect(this.heliGain);
    this.heliGain.connect(this.masterGain);

    this.heliOsc.start();
  }

  update(rpmRatio, speedKmH, driftRatio, isNitro, isPoliceNearby, isHeliNearby) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const baseFreq = 42 + rpmRatio * 190 + (speedKmH / 300) * 35;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.05);
    this.engineOsc3.frequency.setTargetAtTime(baseFreq * 3.02, t, 0.05);

    const cutoff = 300 + rpmRatio * 2400;
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);
    this.engineGain.gain.setTargetAtTime(0.35 + rpmRatio * 0.45, t, 0.05);

    const turboVol = Math.min(0.28, rpmRatio * 0.28);
    this.turboGain.gain.setTargetAtTime(turboVol, t, 0.08);
    this.turboOsc.frequency.setTargetAtTime(1000 + rpmRatio * 2400, t, 0.08);

    const targetScreech = Math.min(0.68, driftRatio * 0.75);
    this.screechGain.gain.setTargetAtTime(targetScreech, t, 0.06);
    this.screechFilter.frequency.setTargetAtTime(1100 + driftRatio * 800, t, 0.06);

    const targetNitro = isNitro ? 0.55 : 0.0;
    this.nitroGain.gain.setTargetAtTime(targetNitro, t, 0.05);

    if (isPoliceNearby) {
      const sirenFreq = 650 + Math.sin(t * 4.5) * 350;
      this.sirenOsc.frequency.setValueAtTime(sirenFreq, t);
      this.sirenGain.gain.setTargetAtTime(0.32, t, 0.1);
    } else {
      this.sirenGain.gain.setTargetAtTime(0.0, t, 0.15);
    }

    if (isHeliNearby) {
      this.heliGain.gain.setTargetAtTime(0.28, t, 0.1);
    } else {
      this.heliGain.gain.setTargetAtTime(0.0, t, 0.2);
    }
  }

  // 💥 Metal Crunch & Explosion when Takedowning Police Interceptor
  playTakedownCrunch() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Sub Bass Boom
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(160, t);
    boomOsc.frequency.exponentialRampToValueAtTime(25, t + 0.6);
    boomGain.gain.setValueAtTime(0.9, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(t);
    boomOsc.stop(t + 0.7);

    // 2. Metal Crumple Noise
    const noiseBuffer = this._createNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.8);
  }

  playBackfire() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playScoreChime() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const freqs = [587.33, 880.0, 1174.66]; // D-A-D Chord
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.25, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.28);
    });
  }

  playCrash() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const noiseBuffer = this._createNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.9);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const cyberAudio = new CyberAudioEngine();

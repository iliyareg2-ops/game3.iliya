// audio.js - Cyber Drift 3D Sound Engine (Engine RPM Synthesizer, Turbo Blow-Off, Tire Screech, Exhaust Pops, Police Sirens & Nitro)

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
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this._setupEngineSound();
      this._setupTurboSound();
      this._setupTireScreech();
      this._setupNitroSound();
      this._setupPoliceSiren();

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
    // V8 / Twin-Turbo Engine Tone: 3 Oscillators with rich low-end harmonics
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
    mixGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    this.engineOsc1.connect(mixGain);
    this.engineOsc2.connect(mixGain);
    this.engineOsc3.connect(mixGain);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    mixGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineOsc3.start();
  }

  _setupTurboSound() {
    // High-pitched turbo spooling whistle
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
    // Bandpass filtered noise for screeching rubber
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

  update(rpmRatio, speedKmH, driftRatio, isNitro, isPoliceNearby) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Engine RPM sound
    const baseFreq = 42 + rpmRatio * 180 + (speedKmH / 300) * 35;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.05);
    this.engineOsc3.frequency.setTargetAtTime(baseFreq * 3.02, t, 0.05);

    const cutoff = 300 + rpmRatio * 2200;
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);
    this.engineGain.gain.setTargetAtTime(0.3 + rpmRatio * 0.45, t, 0.05);

    // 2. Turbo whistle
    const turboVol = Math.min(0.25, rpmRatio * 0.25);
    this.turboGain.gain.setTargetAtTime(turboVol, t, 0.08);
    this.turboOsc.frequency.setTargetAtTime(1000 + rpmRatio * 2400, t, 0.08);

    // 3. Tire Screech on Drift
    const targetScreech = Math.min(0.65, driftRatio * 0.7);
    this.screechGain.gain.setTargetAtTime(targetScreech, t, 0.06);
    this.screechFilter.frequency.setTargetAtTime(1100 + driftRatio * 800, t, 0.06);

    // 4. Nitro
    const targetNitro = isNitro ? 0.5 : 0.0;
    this.nitroGain.gain.setTargetAtTime(targetNitro, t, 0.05);

    // 5. Police Siren
    if (isPoliceNearby) {
      const sirenFreq = 650 + Math.sin(t * 4.5) * 350;
      this.sirenOsc.frequency.setValueAtTime(sirenFreq, t);
      this.sirenGain.gain.setTargetAtTime(0.28, t, 0.1);
    } else {
      this.sirenGain.gain.setTargetAtTime(0.0, t, 0.15);
    }
  }

  // 💥 Turbo Blow-Off Valve Sound on Throttle Drop / Gear Shift
  playBlowOff() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const noiseBuffer = this._createNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.28);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.35);
  }

  // 🔥 Exhaust Pop & Backfire Crackle
  playBackfire() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 🏁 Drift Score Cash-in Chime
  playScoreChime() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  // 💥 Crash / Scraping Sound
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const cyberAudio = new CyberAudioEngine();

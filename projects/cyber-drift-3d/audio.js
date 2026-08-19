// audio.js - Warm, Deep & Realistic Supercar Sound Engine (No Harsh Frequencies, Zero Piercing Noise)
class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;
    this.isRadioPlaying = false; // Off by default for pure clean engine sound
    this.radioStation = 0;

    this.masterGain = null;
    this.bulletTimeFilter = null;

    // V8 Engine Rumble Oscillators
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    // Soft Tire Road Friction
    this.tireGain = null;
    this.tireFilter = null;

    // Subtle Turbo / Wind
    this.windGain = null;
    this.windFilter = null;

    this.nitroGain = null;
    this.sirenGain = null;
    this.sirenOsc = null;

    this.rainGain = null;
    this.radioGain = null;
    this.radioStep = 0;
    this.radioInterval = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain - Gentle, comfortable volume level
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

      this.bulletTimeFilter = this.ctx.createBiquadFilter();
      this.bulletTimeFilter.type = "lowpass";
      this.bulletTimeFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);

      this.masterGain.connect(this.bulletTimeFilter);
      this.bulletTimeFilter.connect(this.ctx.destination);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.radioGain.connect(this.masterGain);

      this._setupDeepEngineSound();
      this._setupSoftTireFriction();
      this._setupWindAcoustics();
      this._setupNitroSound();
      this._setupMellowSiren();
      this._setupRainSound();

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

  // 🏎️ Deep, Smooth V8 Engine Growl (Pure Lows & Warm Mids, No Piercing Buzz)
  _setupDeepEngineSound() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    // Warm Low Rumble (Triangle wave)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = "triangle";
    this.engineOsc1.frequency.setValueAtTime(32, this.ctx.currentTime);

    // Sub-Bass Foundation (Sine wave)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "sine";
    this.engineOsc2.frequency.setValueAtTime(64, this.ctx.currentTime);

    const mixGain = this.ctx.createGain();
    mixGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    this.engineOsc1.connect(mixGain);
    this.engineOsc2.connect(mixGain);

    // Warm 24dB Low-Pass Filter (Cuts all sharp highs)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(0.7, this.ctx.currentTime); // No harsh resonance

    mixGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  // 🚗 Soft Asphalt Friction (Low-passed brown noise instead of harsh squeal)
  _setupSoftTireFriction() {
    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = "lowpass";
    this.tireFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(0.6, this.ctx.currentTime);

    noiseSource.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    noiseSource.start();
  }

  // 💨 Smooth Highway Aerodynamics Wind
  _setupWindAcoustics() {
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windNoise.start();
  }

  _setupNitroSound() {
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const nitroNoise = this.ctx.createBufferSource();
    nitroNoise.buffer = noiseBuffer;
    nitroNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);

    nitroNoise.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    nitroNoise.start();
  }

  // 🚨 Mellow, Realistic Distant Police Siren
  _setupMellowSiren() {
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = "sine"; // Soft sine wave instead of harsh sawtooth
    this.sirenOsc.frequency.setValueAtTime(450, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.sirenOsc.connect(filter);
    filter.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);

    this.sirenOsc.start();
  }

  _setupRainSound() {
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer();
    const rainNoise = this.ctx.createBufferSource();
    rainNoise.buffer = noiseBuffer;
    rainNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);

    rainNoise.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    rainNoise.start();
  }

  setRainActive(isRaining) {
    if (!this.rainGain || !this.ctx) return;
    this.rainGain.gain.setTargetAtTime(isRaining ? 0.25 : 0.0, this.ctx.currentTime, 0.5);
  }

  setBulletTime(isActive) {
    if (!this.bulletTimeFilter || !this.ctx) return;
    this.bulletTimeFilter.frequency.setTargetAtTime(isActive ? 350 : 14000, this.ctx.currentTime, 0.1);
  }

  nextRadioStation() {
    this.radioStation = (this.radioStation + 1) % 3;
    const names = ["📻 NIGHT DRIVE", "📻 HIGH-OCTANE", "📻 DEEP GROOVE"];
    return names[this.radioStation];
  }

  toggleRadio() {
    this.isRadioPlaying = !this.isRadioPlaying;
    if (this.radioGain) {
      this.radioGain.gain.setValueAtTime(this.isRadioPlaying ? 0.25 : 0, this.ctx.currentTime);
    }
    return this.isRadioPlaying;
  }

  // 🎛️ Real-Time Audio Update (Soft, Rich & Smooth Transitions)
  update(rpmRatio, speedKmH, driftRatio, isNitro, isPoliceNearby) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Smooth engine pitch (Deep 28Hz idle to 110Hz max RPM)
    const baseFreq = 28 + (rpmRatio * 48) + (speedKmH / 360) * 22;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.08);

    // Warm Low-Pass Cutoff (No high-pitch screeching)
    const cutoff = 180 + (rpmRatio * 320);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.28 + (rpmRatio * 0.22), t, 0.08);

    // Tire road friction in drift
    const targetTire = Math.min(0.35, driftRatio * 0.38);
    this.tireGain.gain.setTargetAtTime(targetTire, t, 0.08);

    // Wind rush at high speeds
    const windVol = Math.min(0.22, (speedKmH / 300) * 0.22);
    this.windGain.gain.setTargetAtTime(windVol, t, 0.12);

    // Nitro sound
    const targetNitro = isNitro ? 0.28 : 0.0;
    this.nitroGain.gain.setTargetAtTime(targetNitro, t, 0.08);

    // Distant mellow police siren
    if (isPoliceNearby) {
      const sirenFreq = 420 + Math.sin(t * 3.5) * 160;
      this.sirenOsc.frequency.setValueAtTime(sirenFreq, t);
      this.sirenGain.gain.setTargetAtTime(0.18, t, 0.15);
    } else {
      this.sirenGain.gain.setTargetAtTime(0.0, t, 0.25);
    }
  }

  playCameraFlash() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.08);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playNitroPickupSound() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const freqs = [440.0, 554.37, 659.25];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.18, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.22);
    });
  }

  playTakedownCrunch() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(95, t);
    boomOsc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    boomGain.gain.setValueAtTime(0.5, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(t);
    boomOsc.stop(t + 0.5);
  }

  playScoreChime() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playCrash() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(80, t);
    boomOsc.frequency.exponentialRampToValueAtTime(20, t + 0.35);
    boomGain.gain.setValueAtTime(0.4, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomOsc.start(t);
    boomOsc.stop(t + 0.45);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.38, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const cyberAudio = new CyberAudioEngine();

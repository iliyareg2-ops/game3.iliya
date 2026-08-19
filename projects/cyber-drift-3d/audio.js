// audio.js - 100% Realistic Automotive Internal Combustion & Mechanical Acoustic Engine (ZERO Arcade Beeps / Pure Realism)
class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

    this.masterGain = null;
    this.bulletTimeFilter = null;

    // Granular Combustion Engine
    this.engineGain = null;
    this.combustionNoiseNode = null;
    this.combustionFilter = null;
    this.combustionPulseOsc = null;
    this.combustionPulseGain = null;

    // Exhaust Pipe Resonator
    this.exhaustResonator = null;
    this.exhaustGain = null;

    // Asphalt Tire Grip Scrubbing
    this.tireNoiseNode = null;
    this.tireFilter = null;
    this.tireGain = null;

    // Aerodynamic Airflow Rush
    this.windNoiseNode = null;
    this.windFilter = null;
    this.windGain = null;

    // Nitro Pressurized Gas Jet
    this.nitroNoiseNode = null;
    this.nitroFilter = null;
    this.nitroGain = null;

    // Rain
    this.rainNoiseNode = null;
    this.rainFilter = null;
    this.rainGain = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

      this.bulletTimeFilter = this.ctx.createBiquadFilter();
      this.bulletTimeFilter.type = "lowpass";
      this.bulletTimeFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);

      this.masterGain.connect(this.bulletTimeFilter);
      this.bulletTimeFilter.connect(this.ctx.destination);

      this._setupRealisticEngine();
      this._setupTireScrubbing();
      this._setupAerodynamicWind();
      this._setupPressurizedNitroJet();
      this._setupRainAcoustics();

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

  _createNoiseBuffer(seconds = 3) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 🏎️ Real Internal Combustion Engine (Exhaust pulses + Granular gas expansion)
  _setupRealisticEngine() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    // 1. Granular Combustion Noise
    this.combustionNoiseNode = this.ctx.createBufferSource();
    this.combustionNoiseNode.buffer = this._createNoiseBuffer(4);
    this.combustionNoiseNode.loop = true;

    this.combustionFilter = this.ctx.createBiquadFilter();
    this.combustionFilter.type = "bandpass";
    this.combustionFilter.frequency.setValueAtTime(110, this.ctx.currentTime);
    this.combustionFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.combustionNoiseNode.connect(this.combustionFilter);

    // 2. Cylinder Stroke Pulse Modulator (Low-frequency combustion cycles)
    this.combustionPulseOsc = this.ctx.createOscillator();
    this.combustionPulseOsc.type = "sawtooth";
    this.combustionPulseOsc.frequency.setValueAtTime(32, this.ctx.currentTime);

    const pulseFilter = this.ctx.createBiquadFilter();
    pulseFilter.type = "lowpass";
    pulseFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.combustionPulseOsc.connect(pulseFilter);

    // 3. Exhaust Chamber Resonator
    this.exhaustResonator = this.ctx.createBiquadFilter();
    this.exhaustResonator.type = "peaking";
    this.exhaustResonator.frequency.setValueAtTime(75, this.ctx.currentTime);
    this.exhaustResonator.gain.setValueAtTime(12, this.ctx.currentTime);
    this.exhaustResonator.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.combustionFilter.connect(this.exhaustResonator);
    pulseFilter.connect(this.exhaustResonator);

    this.exhaustResonator.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.combustionNoiseNode.start();
    this.combustionPulseOsc.start();
  }

  // 🚗 Realistic Tire Asphalt Friction & Scrubbing (Brownian noise)
  _setupTireScrubbing() {
    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = this._createNoiseBuffer(3);
    this.tireNoiseNode.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = "bandpass";
    this.tireFilter.frequency.setValueAtTime(550, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.tireNoiseNode.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    this.tireNoiseNode.start();
  }

  // 💨 Natural High-Speed Aerodynamic Wind Resistance
  _setupAerodynamicWind() {
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.windNoiseNode = this.ctx.createBufferSource();
    this.windNoiseNode.buffer = this._createNoiseBuffer(3);
    this.windNoiseNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.windNoiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.windNoiseNode.start();
  }

  // ⚡ Pressurized Liquid Gas Jet (Real N2O Injector Rush, No Sci-Fi Beep)
  _setupPressurizedNitroJet() {
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.nitroNoiseNode = this.ctx.createBufferSource();
    this.nitroNoiseNode.buffer = this._createNoiseBuffer(3);
    this.nitroNoiseNode.loop = true;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = "bandpass";
    this.nitroFilter.frequency.setValueAtTime(850, this.ctx.currentTime);
    this.nitroFilter.Q.setValueAtTime(1.1, this.ctx.currentTime);

    this.nitroNoiseNode.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    this.nitroNoiseNode.start();
  }

  // 🌧️ Rain Acoustics
  _setupRainSound() {
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.rainNoiseNode = this.ctx.createBufferSource();
    this.rainNoiseNode.buffer = this._createNoiseBuffer(3);
    this.rainNoiseNode.loop = true;

    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = "lowpass";
    this.rainFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.rainNoiseNode.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    this.rainNoiseNode.start();
  }

  setRainActive(isRaining) {
    if (!this.rainGain || !this.ctx) return;
    this.rainGain.gain.setTargetAtTime(isRaining ? 0.3 : 0.0, this.ctx.currentTime, 0.4);
  }

  setBulletTime(isActive) {
    if (!this.bulletTimeFilter || !this.ctx) return;
    this.bulletTimeFilter.frequency.setTargetAtTime(isActive ? 320 : 14000, this.ctx.currentTime, 0.08);
  }

  // 🎛️ Dynamic Realistic Engine Physics Audio
  update(rpmRatio, speedKmH, driftRatio, isNitro) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Engine Cylinder Pulse Frequency (Real V8 RPM cycles: 24Hz idle to 125Hz at redline)
    const engineFreq = 24 + (rpmRatio * 85) + (speedKmH / 360) * 16;
    this.combustionPulseOsc.frequency.setTargetAtTime(engineFreq, t, 0.06);

    // 2. Combustion Filter & Resonator sweep
    const filterFreq = 90 + (rpmRatio * 320);
    this.combustionFilter.frequency.setTargetAtTime(filterFreq, t, 0.06);
    this.exhaustResonator.frequency.setTargetAtTime(65 + (rpmRatio * 180), t, 0.06);

    const targetEngineVol = 0.45 + (rpmRatio * 0.45);
    this.engineGain.gain.setTargetAtTime(targetEngineVol, t, 0.06);

    // 3. Tire Asphalt Friction
    const targetTire = Math.min(0.55, driftRatio * 0.6);
    this.tireGain.gain.setTargetAtTime(targetTire, t, 0.08);
    this.tireFilter.frequency.setTargetAtTime(400 + (driftRatio * 450), t, 0.08);

    // 4. Wind Rush
    const windVol = Math.min(0.35, (speedKmH / 320) * 0.35);
    this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(200 + (speedKmH / 320) * 350, t, 0.1);

    // 5. N2O Gas Jet Hiss
    const targetNitro = isNitro ? 0.45 : 0.0;
    this.nitroGain.gain.setTargetAtTime(targetNitro, t, 0.06);
  }

  // 💥 Realistic Metal & Body Impact Crunch (Zero Sine Drops)
  playCrash() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const noiseBuffer = this._createNoiseBuffer(0.6);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.exponentialRampToValueAtTime(30, t + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.6);
  }

  playTakedownCrunch() {
    this.playCrash();
  }

  playScoreChime() {
    // Zero arcade bleeps - silent score increment
  }

  playNitroPickupSound() {
    // Soft mechanical canister latch sound
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.15);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  playCameraFlash() {
    // Mechanical camera click
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2500, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.08);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const cyberAudio = new CyberAudioEngine();

// audio.js - Realistic Automotive & Motorsport Sound Engine (Combustion, Exhaust Backfires, Slipstream, Sirens, Helicopter)
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
    this.exhaustResonator = null;

    // Asphalt Tire Grip Scrubbing
    this.tireNoiseNode = null;
    this.tireFilter = null;
    this.tireGain = null;

    // Aerodynamic Airflow Rush
    this.windNoiseNode = null;
    this.windFilter = null;
    this.windGain = null;

    // Slipstream Aerodynamic Suction Whoosh
    this.slipstreamGain = null;
    this.slipstreamFilter = null;

    // Nitro Pressurized Gas Jet
    this.nitroNoiseNode = null;
    this.nitroFilter = null;
    this.nitroGain = null;

    // Police Siren
    this.sirenGain = null;
    this.sirenOsc1 = null;
    this.sirenFilter = null;

    // Police Helicopter
    this.heliGain = null;
    this.heliOsc = null;

    // Traffic Passing Whoosh
    this.flybyGain = null;
    this.flybyFilter = null;

    // Rain
    this.rainGain = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.bulletTimeFilter = this.ctx.createBiquadFilter();
      this.bulletTimeFilter.type = "lowpass";
      this.bulletTimeFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);

      this.masterGain.connect(this.bulletTimeFilter);
      this.bulletTimeFilter.connect(this.ctx.destination);

      this._setupRealisticEngine();
      this._setupTireScrubbing();
      this._setupAerodynamicWind();
      this._setupSlipstreamSuction();
      this._setupPressurizedNitroJet();
      this._setupAudiblePoliceSiren();
      this._setupHelicopterRotor();
      this._setupTrafficFlyby();
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

  _setupRealisticEngine() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    this.combustionNoiseNode = this.ctx.createBufferSource();
    this.combustionNoiseNode.buffer = this._createNoiseBuffer(4);
    this.combustionNoiseNode.loop = true;

    this.combustionFilter = this.ctx.createBiquadFilter();
    this.combustionFilter.type = "bandpass";
    this.combustionFilter.frequency.setValueAtTime(110, this.ctx.currentTime);
    this.combustionFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.combustionNoiseNode.connect(this.combustionFilter);

    this.combustionPulseOsc = this.ctx.createOscillator();
    this.combustionPulseOsc.type = "sawtooth";
    this.combustionPulseOsc.frequency.setValueAtTime(32, this.ctx.currentTime);

    const pulseFilter = this.ctx.createBiquadFilter();
    pulseFilter.type = "lowpass";
    pulseFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.combustionPulseOsc.connect(pulseFilter);

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

  _setupTireScrubbing() {
    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer(3);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = "bandpass";
    this.tireFilter.frequency.setValueAtTime(550, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    noiseSource.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    noiseSource.start();
  }

  _setupAerodynamicWind() {
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer(3);
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = noiseBuffer;
    windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windNoise.start();
  }

  // 💨 SLIPSTREAM AERODYNAMIC SUCTION
  _setupSlipstreamSuction() {
    this.slipstreamGain = this.ctx.createGain();
    this.slipstreamGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer(2);
    const slipNoise = this.ctx.createBufferSource();
    slipNoise.buffer = noiseBuffer;
    slipNoise.loop = true;

    this.slipstreamFilter = this.ctx.createBiquadFilter();
    this.slipstreamFilter.type = "bandpass";
    this.slipstreamFilter.frequency.setValueAtTime(620, this.ctx.currentTime);
    this.slipstreamFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    slipNoise.connect(this.slipstreamFilter);
    this.slipstreamFilter.connect(this.slipstreamGain);
    this.slipstreamGain.connect(this.masterGain);

    slipNoise.start();
  }

  setSlipstreamActive(isActive) {
    if (!this.slipstreamGain || !this.ctx) return;
    this.slipstreamGain.gain.setTargetAtTime(isActive ? 0.45 : 0.0, this.ctx.currentTime, 0.1);
  }

  // 🔥 EXHAUST BACKFIRE POPS & BANGS (Unburnt fuel combustion crackles)
  playExhaustBackfire() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    const noiseBuffer = this._createNoiseBuffer(0.12);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(220 + Math.random() * 180, t);
    filter.Q.setValueAtTime(1.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.12);
  }

  _setupPressurizedNitroJet() {
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseBuffer = this._createNoiseBuffer(3);
    const nitroNoise = this.ctx.createBufferSource();
    nitroNoise.buffer = noiseBuffer;
    nitroNoise.loop = true;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = "bandpass";
    this.nitroFilter.frequency.setValueAtTime(850, this.ctx.currentTime);

    nitroNoise.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    nitroNoise.start();
  }

  _setupAudiblePoliceSiren() {
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.sirenOsc1 = this.ctx.createOscillator();
    this.sirenOsc1.type = "sawtooth";
    this.sirenOsc1.frequency.setValueAtTime(600, this.ctx.currentTime);

    this.sirenFilter = this.ctx.createBiquadFilter();
    this.sirenFilter.type = "lowpass";
    this.sirenFilter.frequency.setValueAtTime(1600, this.ctx.currentTime);
    this.sirenFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.sirenOsc1.connect(this.sirenFilter);
    this.sirenFilter.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);

    this.sirenOsc1.start();
  }

  _setupHelicopterRotor() {
    this.heliGain = this.ctx.createGain();
    this.heliGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.heliOsc = this.ctx.createOscillator();
    this.heliOsc.type = "square";
    this.heliOsc.frequency.setValueAtTime(26, this.ctx.currentTime);

    const heliFilter = this.ctx.createBiquadFilter();
    heliFilter.type = "lowpass";
    heliFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.heliOsc.connect(heliFilter);
    heliFilter.connect(this.heliGain);
    this.heliGain.connect(this.masterGain);

    this.heliOsc.start();
  }

  _setupTrafficFlyby() {
    this.flybyGain = this.ctx.createGain();
    this.flybyGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this._createNoiseBuffer(2);
    noiseNode.loop = true;

    this.flybyFilter = this.ctx.createBiquadFilter();
    this.flybyFilter.type = "bandpass";
    this.flybyFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    noiseNode.connect(this.flybyFilter);
    this.flybyFilter.connect(this.flybyGain);
    this.flybyGain.connect(this.masterGain);

    noiseNode.start();
  }

  _setupRainAcoustics() {
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this._createNoiseBuffer(3);
    noiseNode.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "lowpass";
    rainFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    noiseNode.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    noiseNode.start();
  }

  setRainActive(isRaining) {
    if (!this.rainGain || !this.ctx) return;
    this.rainGain.gain.setTargetAtTime(isRaining ? 0.35 : 0.0, this.ctx.currentTime, 0.4);
  }

  setBulletTime(isActive) {
    if (!this.bulletTimeFilter || !this.ctx) return;
    this.bulletTimeFilter.frequency.setTargetAtTime(isActive ? 320 : 14000, this.ctx.currentTime, 0.08);
  }

  playTrafficFlyby() {
    if (!this.flybyGain || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this.flybyGain.gain.cancelScheduledValues(t);
    this.flybyGain.gain.setValueAtTime(0.0, t);
    this.flybyGain.gain.linearRampToValueAtTime(0.4, t + 0.12);
    this.flybyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  }

  update(rpmRatio, speedKmH, driftRatio, isNitro, policeDist, isHeliActive) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const engineFreq = 24 + (rpmRatio * 85) + (speedKmH / 360) * 16;
    this.combustionPulseOsc.frequency.setTargetAtTime(engineFreq, t, 0.06);

    const filterFreq = 90 + (rpmRatio * 320);
    this.combustionFilter.frequency.setTargetAtTime(filterFreq, t, 0.06);
    this.exhaustResonator.frequency.setTargetAtTime(65 + (rpmRatio * 180), t, 0.06);

    const targetEngineVol = 0.42 + (rpmRatio * 0.42);
    this.engineGain.gain.setTargetAtTime(targetEngineVol, t, 0.06);

    const targetTire = Math.min(0.55, driftRatio * 0.6);
    this.tireGain.gain.setTargetAtTime(targetTire, t, 0.08);
    this.tireFilter.frequency.setTargetAtTime(400 + (driftRatio * 450), t, 0.08);

    const windVol = Math.min(0.35, (speedKmH / 320) * 0.35);
    this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(200 + (speedKmH / 320) * 350, t, 0.1);

    const targetNitro = isNitro ? 0.45 : 0.0;
    this.nitroGain.gain.setTargetAtTime(targetNitro, t, 0.06);

    if (policeDist < 350) {
      const distRatio = Math.max(0, 1.0 - (policeDist / 350));
      const sirenFreq = 620 + Math.sin(t * 5.2) * 260;
      this.sirenOsc1.frequency.setValueAtTime(sirenFreq, t);
      this.sirenGain.gain.setTargetAtTime(distRatio * 0.42, t, 0.08);
    } else {
      this.sirenGain.gain.setTargetAtTime(0.0, t, 0.2);
    }

    if (isHeliActive) {
      this.heliGain.gain.setTargetAtTime(0.35, t, 0.15);
    } else {
      this.heliGain.gain.setTargetAtTime(0.0, t, 0.25);
    }
  }

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

  playScoreChime() {}

  playNitroPickupSound() {
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const cyberAudio = new CyberAudioEngine();

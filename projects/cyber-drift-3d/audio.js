// audio.js - Realistic Automotive Sound Engine (Granular Combustion, Turbo Spool, Crowd Cheer, Blow-Off Valve, Rewind, Kerb Rumble, Backfires, Slipstream, Rain)
class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

    this.masterGain = null;

    // Granular Combustion Engine
    this.engineGain = null;
    this.combustionNoiseNode = null;
    this.combustionFilter = null;
    this.combustionPulseOsc = null;
    this.exhaustResonator = null;

    // Turbo Spool Whine
    this.turboGain = null;
    this.turboOsc = null;

    // Grandstand Crowd Cheering
    this.crowdGain = null;
    this.crowdFilter = null;
    this.crowdNoiseNode = null;

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

    // Traffic Passing Whoosh
    this.flybyGain = null;
    this.flybyFilter = null;

    // Rain
    this.rainGain = null;

    // Rewind Audio
    this.rewindGain = null;
    this.rewindOsc = null;

    // Kerb Rumble Strips
    this.kerbGain = null;
    this.kerbOsc = null;
    this.lastKerbTime = 0;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this._setupRealisticEngine();
      this._setupTurboSpoolWhine();
      this._setupGrandstandCrowd();
      this._setupTireScrubbing();
      this._setupAerodynamicWind();
      this._setupSlipstreamSuction();
      this._setupPressurizedNitroJet();
      this._setupTrafficFlyby();
      this._setupRainAcoustics();
      this._setupRewindAudio();
      this._setupKerbRumbleAudio();
      this._setupOceanWaveAmbience();

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

  _setupTurboSpoolWhine() {
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
  }

  _setupGrandstandCrowd() {
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.crowdNoiseNode = this.ctx.createBufferSource();
    this.crowdNoiseNode.buffer = this._createNoiseBuffer(4);
    this.crowdNoiseNode.loop = true;

    this.crowdFilter = this.ctx.createBiquadFilter();
    this.crowdFilter.type = "bandpass";
    this.crowdFilter.frequency.setValueAtTime(850, this.ctx.currentTime);
    this.crowdFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.crowdNoiseNode.connect(this.crowdFilter);
    this.crowdFilter.connect(this.crowdGain);
    this.crowdGain.connect(this.masterGain);

    this.crowdNoiseNode.start();
  }

  playCrowdCheer(intensity = 0.5) {
    if (!this.crowdGain || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this.crowdGain.gain.cancelScheduledValues(t);
    this.crowdGain.gain.setValueAtTime(0.0, t);
    this.crowdGain.gain.linearRampToValueAtTime(Math.min(0.45, intensity * 0.45), t + 0.3);
    this.crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
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

  // 💥 REALISTIC TURBO BLOW-OFF VALVE
  playBlowOffValve() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    const noiseBuffer = this._createNoiseBuffer(0.38);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1900, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.35);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.38);

    const flutterOsc = this.ctx.createOscillator();
    flutterOsc.type = "triangle";
    flutterOsc.frequency.setValueAtTime(240, t);
    flutterOsc.frequency.exponentialRampToValueAtTime(140, t + 0.35);

    const flutterGain = this.ctx.createGain();
    flutterGain.gain.setValueAtTime(0.0, t);
    flutterGain.gain.linearRampToValueAtTime(0.3, t + 0.05);

    flutterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    flutterOsc.connect(flutterGain);
    flutterGain.connect(this.masterGain);

    flutterOsc.start(t);
    flutterOsc.stop(t + 0.35);
  }

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

  _setupRewindAudio() {
    this.rewindGain = this.ctx.createGain();
    this.rewindGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.rewindOsc = this.ctx.createOscillator();
    this.rewindOsc.type = "sawtooth";
    this.rewindOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.rewindOsc.connect(filter);
    filter.connect(this.rewindGain);
    this.rewindGain.connect(this.masterGain);

    this.rewindOsc.start();
  }

  playRewindSound() {
    if (!this.rewindGain || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this.rewindOsc.frequency.setValueAtTime(60, t);
    this.rewindOsc.frequency.linearRampToValueAtTime(260, t + 0.3);
    this.rewindGain.gain.setTargetAtTime(0.45, t, 0.05);
  }

  stopRewindSound() {
    if (!this.rewindGain || !this.ctx) return;
    this.rewindGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.08);
  }

  _setupKerbRumbleAudio() {
    this.kerbGain = this.ctx.createGain();
    this.kerbGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.kerbOsc = this.ctx.createOscillator();
    this.kerbOsc.type = "triangle";
    this.kerbOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, this.ctx.currentTime);

    this.kerbOsc.connect(filter);
    filter.connect(this.kerbGain);
    this.kerbGain.connect(this.masterGain);

    this.kerbOsc.start();
  }

  playKerbRumble(speedKmH) {
    if (!this.kerbGain || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const freq = 35 + (speedKmH / 300) * 45;
    this.kerbOsc.frequency.setValueAtTime(freq, t);
    this.kerbGain.gain.cancelScheduledValues(t);
    this.kerbGain.gain.setValueAtTime(0.35, t);
    this.kerbGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  }

  setRainActive(isRaining) {
    if (!this.rainGain || !this.ctx) return;
    this.rainGain.gain.setTargetAtTime(isRaining ? 0.35 : 0.0, this.ctx.currentTime, 0.4);
  }

  playTrafficFlyby() {
    if (!this.flybyGain || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this.flybyGain.gain.cancelScheduledValues(t);
    this.flybyGain.gain.setValueAtTime(0.0, t);
    this.flybyGain.gain.linearRampToValueAtTime(0.4, t + 0.12);
    this.flybyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  }

  update(rpmRatio, speedKmH, driftRatio, isNitro, throttle = 1) {
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

  playScoreChime() {}

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

  _setupOceanWaveAmbience() {
    this.oceanWaveGain = this.ctx.createGain();
    this.oceanWaveGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const oceanNoise = this.ctx.createBufferSource();
    oceanNoise.buffer = this._createNoiseBuffer(5);
    oceanNoise.loop = true;

    const oceanFilter = this.ctx.createBiquadFilter();
    oceanFilter.type = "lowpass";
    oceanFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    oceanFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const waveLFO = this.ctx.createOscillator();
    waveLFO.type = "sine";
    waveLFO.frequency.setValueAtTime(0.22, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    waveLFO.connect(lfoGain);
    lfoGain.connect(oceanFilter.frequency);

    oceanNoise.connect(oceanFilter);
    oceanFilter.connect(this.oceanWaveGain);
    this.oceanWaveGain.connect(this.masterGain);

    oceanNoise.start();
    waveLFO.start();
  }

  setOceanAmbience(enabled) {
    if (!this.isInitialized || !this.oceanWaveGain) return;
    const t = this.ctx.currentTime;
    this.oceanWaveGain.gain.cancelScheduledValues(t);
    this.oceanWaveGain.gain.linearRampToValueAtTime(enabled ? 0.4 : 0.0, t + 1.2);
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

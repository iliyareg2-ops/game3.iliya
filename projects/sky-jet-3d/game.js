// game.js - Main Game Loop, Day/Night Lighting, Stunt Engine, Target Lock-On Avionics & HUD
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { WorldManager } from "./world.js";
import { Airplane } from "./airplane.js";
import { SupplyCrateManager } from "./crates.js";
import { flightAudio } from "./audio.js";

export class SkyJetGame {
  constructor() {
    this.container = document.getElementById("canvas-container");
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.worldManager = null;
    this.airplane = null;
    this.crateManager = null;

    this.clock = new THREE.Clock();
    this.cameraMode = "THIRD_PERSON";
    this.gameState = "READY";

    this.keys = {
      pitchUp: false,
      pitchDown: false,
      rollLeft: false,
      rollRight: false,
      yawLeft: false,
      yawRight: false,
      boost: false,
      brake: false,
    };

    this.radarCanvas = document.getElementById("radar-canvas");
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext("2d") : null;

    this.initThree();
    this.initWorld();
    this.initInputs();
    this.initUI();

    window.addEventListener("resize", () => this.onWindowResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcbe0f5);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 9000);
    this.camera.position.set(0, 10, -490);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initWorld() {
    this.worldManager = new WorldManager(this.scene);
    this.airplane = new Airplane(this.scene);
    this.crateManager = new SupplyCrateManager(this.scene, this.worldManager);

    this.worldManager.onBiomeChangeCallback = (newBiome) => {
      this.handleBiomeChange(newBiome);
    };

    // Stunt callback hook
    this.airplane.onStuntCallback = (stuntName, bonusScore) => {
      this.crateManager.score += bonusScore;
      this.showBanner(`${stuntName} +${bonusScore} ОЧКОВ! 🔥`, 2800);
    };
  }

  initInputs() {
    window.addEventListener("keydown", (e) => {
      flightAudio.init();
      flightAudio.resume();

      if (e.code === "KeyW" || e.code === "ArrowDown") this.keys.pitchUp = true;
      if (e.code === "KeyS" || e.code === "ArrowUp") this.keys.pitchDown = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.rollLeft = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.rollRight = true;
      if (e.code === "KeyQ") this.keys.yawLeft = true;
      if (e.code === "KeyE") this.keys.yawRight = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.boost = true;
      if (e.code === "Space" || e.code === "KeyB") this.keys.brake = true;

      if (e.code === "KeyC") this.toggleCamera();
      if (e.code === "KeyT") this.cycleTimeOfDay();
      if (e.code === "KeyR") this.restartMission();

      if (this.gameState === "READY") this.startFlight();
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW" || e.code === "ArrowDown") this.keys.pitchUp = false;
      if (e.code === "KeyS" || e.code === "ArrowUp") this.keys.pitchDown = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.rollLeft = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.rollRight = false;
      if (e.code === "KeyQ") this.keys.yawLeft = false;
      if (e.code === "KeyE") this.keys.yawRight = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.boost = false;
      if (e.code === "Space" || e.code === "KeyB") this.keys.brake = false;
    });

    const bindBtn = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        flightAudio.init();
        if (this.gameState === "READY") this.startFlight();
        this.keys[keyName] = true;
      });
      el.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
      });
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        flightAudio.init();
        if (this.gameState === "READY") this.startFlight();
        this.keys[keyName] = true;
      });
      el.addEventListener("mouseup", (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
      });
    };

    bindBtn("btn-pitch-up", "pitchUp");
    bindBtn("btn-pitch-down", "pitchDown");
    bindBtn("btn-roll-left", "rollLeft");
    bindBtn("btn-roll-right", "rollRight");
    bindBtn("btn-boost", "boost");
    bindBtn("btn-brake", "brake");

    const camBtn = document.getElementById("btn-cam-switch");
    if (camBtn) camBtn.addEventListener("click", () => this.toggleCamera());

    const timeBtn = document.getElementById("btn-time-toggle");
    if (timeBtn) timeBtn.addEventListener("click", () => this.cycleTimeOfDay());

    const soundBtn = document.getElementById("btn-sound-toggle");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        const isMuted = flightAudio.toggleMute();
        soundBtn.textContent = isMuted ? "🔇" : "🔊";
      });
    }
  }

  initUI() {
    this.speedEl = document.getElementById("hud-speed");
    this.altEl = document.getElementById("hud-altitude");
    this.scoreEl = document.getElementById("hud-score");
    this.cratesEl = document.getElementById("hud-crates");
    this.distanceEl = document.getElementById("hud-distance");
    this.biomeEl = document.getElementById("hud-biome");
    this.gforceEl = document.getElementById("hud-gforce");
    this.machEl = document.getElementById("hud-mach");
    this.targetDistEl = document.getElementById("hud-target-dist");
    this.targetBoxEl = document.getElementById("hud-target-box");
    this.shieldPillEl = document.getElementById("hud-shield-pill");
    this.shieldBarEl = document.getElementById("hud-shield-bar");
    this.nitroBarEl = document.getElementById("hud-nitro-bar");
    this.camModeEl = document.getElementById("hud-cam-mode");
    this.timeModeEl = document.getElementById("hud-time-mode");
    this.bannerEl = document.getElementById("hud-banner");

    const startBtn = document.getElementById("btn-start-game");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        flightAudio.init();
        this.startFlight();
      });
    }

    const restartBtn = document.getElementById("btn-restart-game");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => this.restartMission());
    }
  }

  cycleTimeOfDay() {
    const modes = ["DAY", "SUNSET", "NIGHT", "AUTO"];
    const curIdx = modes.indexOf(this.worldManager.timeOfDay);
    const nextMode = modes[(curIdx + 1) % modes.length];
    this.worldManager.setTimeOfDay(nextMode);

    let label = "☀️ ДЕНЬ";
    if (nextMode === "SUNSET") label = "🌅 ЗАКАТ";
    if (nextMode === "NIGHT") label = "🌙 НОЧЬ";
    if (nextMode === "AUTO") label = "⚡ АВТО-ЦИКЛ";

    if (this.timeModeEl) this.timeModeEl.textContent = label;
    this.showBanner(`ОСВЕЩЕНИЕ: ${label}`, 2200);
  }

  startFlight() {
    this.gameState = "PLAYING";
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("game-over-screen").style.display = "none";
    this.airplane.throttle = 1.0;
    flightAudio.playTakeoffAlert();
    this.showBanner("🛫 ВЗЛЁТ! НАБЕРИТЕ СКОРОСТЬ 170 КМ/Ч И ТЯНИТЕ ШТУРВАЛ (W / ↓)");
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === "THIRD_PERSON" ? "COCKPIT" : "THIRD_PERSON";
    if (this.camModeEl) {
      this.camModeEl.textContent = this.cameraMode === "COCKPIT" ? "КАБИНА (1P)" : "ОБЗОР (3P)";
    }
  }

  handleBiomeChange(biome) {
    flightAudio.playRadioChatter();
    let name = "🏔️ АЛЬПИЙСКИЕ ГОРЫ";
    if (biome === "CITY") name = "🏙️ МЕГАПОЛИС НЕОН-СИТИ";
    if (biome === "FLOWERS") name = "🌸 ДОЛИНА ЦВЕТОЧНЫХ ЛУГОВ";
    if (biome === "OCEAN") name = "🌊 ТРОПИЧЕСКИЙ ОКЕАН И ОСТРОВА";
    if (biome === "AIRPORT") name = "🛫 ГЛАВНЫЙ АЭРОПОРТ";

    if (this.biomeEl) this.biomeEl.textContent = name;
    this.showBanner(`📻 ДИСПЕТЧЕР: ВХОД В ЗОНУ [${name}]`, 3500);
  }

  showBanner(text, duration = 3000) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.style.opacity = "1";
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      if (this.bannerEl) this.bannerEl.style.opacity = "0";
    }, duration);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateCamera(delta) {
    const isBoosting = this.airplane.isBoosting && this.airplane.boostFuel > 0;
    const targetFov = isBoosting ? 78 : (this.cameraMode === "COCKPIT" ? 72 : 60);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 3.5);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === "COCKPIT") {
      const mountPos = new THREE.Vector3();
      this.airplane.cockpitPoint.getWorldPosition(mountPos);
      this.camera.position.copy(mountPos);
      this.camera.quaternion.copy(this.airplane.mesh.quaternion);
      if (this.airplane.hudRing) this.airplane.hudRing.visible = true;
    } else {
      if (this.airplane.hudRing) this.airplane.hudRing.visible = false;
      const chaseDist = isBoosting ? 27 : 22;
      const chaseHeight = 5.2;

      const offset = new THREE.Vector3(0, chaseHeight, -chaseDist);
      offset.applyQuaternion(this.airplane.mesh.quaternion);

      const targetCamPos = this.airplane.mesh.position.clone().add(offset);
      this.camera.position.lerp(targetCamPos, delta * 8.0);

      const lookTarget = this.airplane.mesh.position.clone().add(
        new THREE.Vector3(0, 1.2, 18).applyQuaternion(this.airplane.mesh.quaternion)
      );
      this.camera.lookAt(lookTarget);
      this.camera.up.set(0, 1, 0).applyQuaternion(this.airplane.mesh.quaternion);
    }
  }

  drawRadar() {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.08;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, (cx - 4) * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const planePos = this.airplane.mesh.position;
    const planeForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.airplane.mesh.quaternion);
    const planeAngle = Math.atan2(planeForward.x, planeForward.z);

    // Draw Crates on radar
    for (const crate of this.crateManager.crates) {
      if (!crate.active) continue;
      const dx = (crate.group.position.x - planePos.x) * scale;
      const dz = (crate.group.position.z - planePos.z) * scale;

      const rx = dx * Math.cos(-planeAngle) - dz * Math.sin(-planeAngle);
      const ry = -(dx * Math.sin(-planeAngle) + dz * Math.cos(-planeAngle));

      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist < cx - 6) {
        let color = "#ff7700";
        if (crate.type === "gold") color = "#ffd700";
        if (crate.type === "plasma") color = "#00f0ff";

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx + rx, cy + ry, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Player arrow
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx - 5, cy + 6);
    ctx.lineTo(cx + 5, cy + 6);
    ctx.closePath();
    ctx.fill();
  }

  // Updates Target Lock-on Bracket pointing to closest crate
  updateTargetLockOn() {
    if (!this.targetBoxEl || !this.targetDistEl) return;

    let nearestCrate = null;
    let minDist = Infinity;
    for (const c of this.crateManager.crates) {
      if (!c.active) continue;
      const d = c.group.position.distanceTo(this.airplane.mesh.position);
      if (d < minDist) {
        minDist = d;
        nearestCrate = c;
      }
    }

    if (nearestCrate && minDist < 1500) {
      const cratePos = nearestCrate.group.position.clone();
      cratePos.project(this.camera);

      // Check if crate is in front of camera
      if (cratePos.z < 1) {
        const screenX = (cratePos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-cratePos.y * 0.5 + 0.5) * window.innerHeight;

        this.targetBoxEl.style.display = "block";
        this.targetBoxEl.style.left = `${screenX}px`;
        this.targetBoxEl.style.top = `${screenY}px`;
        this.targetDistEl.textContent = `${Math.round(minDist)}M`;
        return;
      }
    }
    this.targetBoxEl.style.display = "none";
  }

  onCrateCollected(type, points, count, score) {
    flightAudio.playCollectSound(type);

    if (type === "gold") {
      this.airplane.addBoost(100);
      this.showBanner(`🌟 ЗОЛОТОЙ СУПЕР-ЯЩИК! +${points} ОЧКОВ | 100% НИТРО!`);
    } else if (type === "plasma") {
      this.airplane.activateShield(12);
      this.showBanner(`🛡️ ПЛАЗМЕННЫЙ ЩИТ АКТИВИРОВАН (12 СЕК) | +${points} ОЧКОВ`);
    } else {
      this.airplane.addBoost(40);
      this.showBanner(`📦 ТУРБО-ПРИПАСЫ! +${points} ОЧКОВ | НИТРО +40%`);
    }
  }

  triggerCrash() {
    this.gameState = "CRASHED";
    flightAudio.playCrashSound();
    const overScreen = document.getElementById("game-over-screen");
    if (overScreen) {
      document.getElementById("game-over-score").textContent = this.crateManager.score;
      document.getElementById("game-over-distance").textContent = (this.airplane.distanceFlownMeters / 1000).toFixed(1);
      overScreen.style.display = "grid";
    }
  }

  restartMission() {
    this.airplane.reset();
    this.crateManager.reset();
    this.gameState = "PLAYING";
    this.airplane.throttle = 1.0;
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("game-over-screen").style.display = "none";
    this.showBanner("🛫 ПОВТОРНЫЙ ВЗЛЁТ! ТЯНИТЕ ШТУРВАЛ (W / ↓)");
  }

  updateHUD() {
    if (this.speedEl) this.speedEl.textContent = Math.round(this.airplane.speed);
    if (this.altEl) this.altEl.textContent = Math.max(0, Math.round(this.airplane.mesh.position.y));
    if (this.scoreEl) this.scoreEl.textContent = this.crateManager.score;
    if (this.cratesEl) this.cratesEl.textContent = this.crateManager.collectedCount;
    if (this.distanceEl) this.distanceEl.textContent = (this.airplane.distanceFlownMeters / 1000).toFixed(1);
    if (this.gforceEl) this.gforceEl.textContent = `${this.airplane.gForce.toFixed(1)}G`;
    if (this.machEl) this.machEl.textContent = `MACH ${(this.airplane.speed / 1235).toFixed(2)}`;
    if (this.nitroBarEl) this.nitroBarEl.style.width = `${Math.round(this.airplane.boostFuel)}%`;

    if (this.shieldPillEl) {
      if (this.airplane.shieldTime > 0) {
        this.shieldPillEl.style.display = "flex";
        if (this.shieldBarEl) {
          const pct = Math.min(100, (this.airplane.shieldTime / 12) * 100);
          this.shieldBarEl.style.width = `${pct}%`;
        }
      } else {
        this.shieldPillEl.style.display = "none";
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.gameState === "PLAYING" || this.gameState === "READY") {
      this.airplane.pitchInput = (this.keys.pitchUp ? 1 : 0) - (this.keys.pitchDown ? 1 : 0);
      this.airplane.rollInput = (this.keys.rollRight ? 1 : 0) - (this.keys.rollLeft ? 1 : 0);
      this.airplane.yawInput = (this.keys.yawRight ? 1 : 0) - (this.keys.yawLeft ? 1 : 0);
      this.airplane.isBoosting = this.keys.boost;
      this.airplane.isBraking = this.keys.brake;

      this.airplane.updatePhysics(delta, this.worldManager);
      this.worldManager.update(delta, this.airplane.mesh.position, () => {
        this.crateManager.score += 300;
        this.airplane.addBoost(30);
        this.showBanner("⭕ ТРЮКОВОЕ КОЛЬЦО ПРОЙДЕНО! +300 PTS | БУСТ +30%", 2400);
      });

      this.crateManager.update(delta, this.airplane, (type, pts, count, score) =>
        this.onCrateCollected(type, pts, count, score)
      );

      flightAudio.update(
        this.airplane.throttle,
        this.airplane.speed,
        this.airplane.isBoosting && this.airplane.boostFuel > 0
      );

      if (this.airplane.isCrashed && this.gameState === "PLAYING") {
        this.triggerCrash();
      }

      this.updateCamera(delta);
      this.drawRadar();
      this.updateTargetLockOn();
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new SkyJetGame();
});

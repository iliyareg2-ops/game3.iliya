// game.js - Cyber Drift 3D Main Director, Space=Drift, Shift=Nitro
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { CyberCar } from "./car.js";
import { CityTrackManager } from "./city.js";
import { cyberAudio } from "./audio.js";

export class CyberDriftGame {
  constructor() {
    this.container = document.getElementById("canvas-container");
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.trackManager = null;
    this.car = null;

    this.clock = new THREE.Clock();
    this.cameraMode = "CHASE"; // 'CHASE', 'HOOD', 'COCKPIT'
    this.gameState = "GARAGE"; // 'GARAGE', 'RACING', 'BUSTED'
    this.garageOrbitAngle = 0;
    this.screenShake = 0;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,
      nitro: false,
    };

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
    this.scene.background = new THREE.Color(0x141f33);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 5000);
    this.camera.position.set(0, 4, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initWorld() {
    this.trackManager = new CityTrackManager(this.scene);
    this.car = new CyberCar(this.scene, 0);

    this.trackManager.onTakedownCallback = (bannerText) => {
      this.screenShake = 1.4;
      this.showBanner(bannerText, 3200);
    };

    this.trackManager.onBustedCallback = () => {
      this.triggerBusted();
    };
  }

  initInputs() {
    window.addEventListener("keydown", (e) => {
      cyberAudio.init();
      cyberAudio.resume();

      if (e.code === "KeyW" || e.code === "ArrowUp") this.keys.forward = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.backward = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = true;
      if (e.code === "Space") this.keys.drift = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.nitro = true;

      if (e.code === "KeyC") this.toggleCamera();
      if (e.code === "KeyR") this.resetCar();

      if (this.gameState === "GARAGE" && (e.code === "Enter" || e.code === "Space")) {
        this.startRace();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") this.keys.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.backward = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = false;
      if (e.code === "Space") this.keys.drift = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.nitro = false;
    });

    const bindBtn = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        cyberAudio.init();
        if (this.gameState === "GARAGE") this.startRace();
        this.keys[keyName] = true;
      });
      el.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
      });
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        cyberAudio.init();
        if (this.gameState === "GARAGE") this.startRace();
        this.keys[keyName] = true;
      });
      el.addEventListener("mouseup", (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
      });
    };

    bindBtn("btn-gas", "forward");
    bindBtn("btn-brake", "backward");
    bindBtn("btn-steer-left", "left");
    bindBtn("btn-steer-right", "right");
    bindBtn("btn-handbrake", "drift");
    bindBtn("btn-nitro", "nitro");

    const camBtn = document.getElementById("btn-cam-switch");
    if (camBtn) camBtn.addEventListener("click", () => this.toggleCamera());

    const soundBtn = document.getElementById("btn-sound-toggle");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        const isMuted = cyberAudio.toggleMute();
        soundBtn.textContent = isMuted ? "🔇" : "🔊";
      });
    }
  }

  initUI() {
    this.speedEl = document.getElementById("hud-speed");
    this.gearEl = document.getElementById("hud-gear");
    this.scoreEl = document.getElementById("hud-score");
    this.driftBoxEl = document.getElementById("hud-drift-box");
    this.driftPtsEl = document.getElementById("hud-drift-pts");
    this.driftMultEl = document.getElementById("hud-drift-mult");
    this.nitroBarEl = document.getElementById("hud-nitro-bar");
    this.rpmBarEl = document.getElementById("hud-rpm-bar");
    this.wantedEl = document.getElementById("hud-wanted");
    this.camModeEl = document.getElementById("hud-cam-mode");
    this.bannerEl = document.getElementById("hud-banner");

    document.querySelectorAll(".car-select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".car-select-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const type = parseInt(btn.dataset.car);
        this.car.setCarType(type);
      });
    });

    document.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        const hex = parseInt(swatch.dataset.color, 16);
        this.car.setBodyColor(hex);
      });
    });

    document.querySelectorAll(".neon-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        document.querySelectorAll(".neon-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        const hex = parseInt(swatch.dataset.neon, 16);
        this.car.setUnderglowColor(hex);
      });
    });

    const startBtn = document.getElementById("btn-start-race");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        cyberAudio.init();
        this.startRace();
      });
    }

    const restartBtn = document.getElementById("btn-restart-busted");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => this.resetCar());
    }

    const resetBtn = document.getElementById("btn-reset-car");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetCar());
    }
  }

  startRace() {
    this.gameState = "RACING";
    document.getElementById("garage-screen").style.display = "none";
    document.getElementById("busted-screen").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    this.showBanner("🔥 СТАРТ! ДРИФТ = ПРОБЕЛ, НИТРО = SHIFT");
  }

  triggerBusted() {
    this.gameState = "BUSTED";
    cyberAudio.playCrash();
    document.getElementById("busted-score").textContent = this.car.totalScore;
    document.getElementById("busted-screen").style.display = "grid";
  }

  toggleCamera() {
    const modes = ["CHASE", "HOOD", "COCKPIT"];
    const curIdx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(curIdx + 1) % modes.length];

    let label = "ОБЗОР (3P)";
    if (this.cameraMode === "HOOD") label = "КАПОТ (HOOD)";
    if (this.cameraMode === "COCKPIT") label = "САЛОН (1P)";

    if (this.camModeEl) this.camModeEl.textContent = label;
  }

  resetCar() {
    this.car.reset();
    this.gameState = "RACING";
    this.trackManager.bustedTimer = 0;
    document.getElementById("busted-screen").style.display = "none";
    document.getElementById("garage-screen").style.display = "none";
    document.getElementById("hud").style.display = "flex";
    this.showBanner("🔄 РЕСТАРТ! ДАВИ НА ГАЗ");
  }

  showBanner(text, duration = 2800) {
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
    if (this.gameState === "GARAGE") {
      this.garageOrbitAngle += delta * 0.65;
      const radius = 12.5;
      const camX = Math.sin(this.garageOrbitAngle) * radius;
      const camZ = Math.cos(this.garageOrbitAngle) * radius;
      this.camera.position.set(camX, 3.2, camZ);
      this.camera.lookAt(0, 0.8, 0);
      return;
    }

    const isNitro = this.car.nitroActive && this.car.nitroFuel > 0;
    const targetFov = isNitro ? 78 : 60;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 4);
    this.camera.updateProjectionMatrix();

    const carPos = this.car.mesh.position;
    const carHeading = this.car.heading;

    if (this.cameraMode === "CHASE") {
      const chaseDist = isNitro ? 16.0 : 14.0;
      const chaseHeight = 4.2;

      const targetCamPos = new THREE.Vector3(
        carPos.x - Math.sin(carHeading) * chaseDist,
        carPos.y + chaseHeight,
        carPos.z - Math.cos(carHeading) * chaseDist
      );

      if (this.screenShake > 0) {
        targetCamPos.x += (Math.random() - 0.5) * this.screenShake;
        targetCamPos.y += (Math.random() - 0.5) * this.screenShake;
        this.screenShake = Math.max(0, this.screenShake - delta * 4);
      }

      this.camera.position.lerp(targetCamPos, delta * 9.0);

      const lookTarget = new THREE.Vector3(
        carPos.x + Math.sin(carHeading) * 12,
        carPos.y + 1.2,
        carPos.z + Math.cos(carHeading) * 12
      );
      this.camera.lookAt(lookTarget);
    } else if (this.cameraMode === "HOOD") {
      const hoodPos = new THREE.Vector3(
        carPos.x + Math.sin(carHeading) * 1.8,
        carPos.y + 1.2,
        carPos.z + Math.cos(carHeading) * 1.8
      );
      this.camera.position.copy(hoodPos);

      const lookTarget = new THREE.Vector3(
        carPos.x + Math.sin(carHeading) * 35,
        carPos.y + 1.2,
        carPos.z + Math.cos(carHeading) * 35
      );
      this.camera.lookAt(lookTarget);
    } else {
      const cockpitPos = new THREE.Vector3(
        carPos.x + Math.sin(carHeading + 0.3) * 0.5,
        carPos.y + 1.35,
        carPos.z - Math.cos(carHeading) * 0.4
      );
      this.camera.position.copy(cockpitPos);

      const lookTarget = new THREE.Vector3(
        carPos.x + Math.sin(carHeading) * 25,
        carPos.y + 1.3,
        carPos.z + Math.cos(carHeading) * 25
      );
      this.camera.lookAt(lookTarget);
    }
  }

  updateHUD() {
    const spd = Math.round(Math.abs(this.car.speed));
    if (this.speedEl) this.speedEl.textContent = spd;

    let gear = "1";
    if (this.car.speed < -0.5) gear = "R";
    else if (spd < 5) gear = "N";
    else if (spd < 65) gear = "1";
    else if (spd < 115) gear = "2";
    else if (spd < 165) gear = "3";
    else if (spd < 225) gear = "4";
    else gear = "5";

    if (this.gearEl) this.gearEl.textContent = gear;
    if (this.scoreEl) this.scoreEl.textContent = this.car.totalScore;
    if (this.nitroBarEl) this.nitroBarEl.style.width = `${Math.round(this.car.nitroFuel)}%`;

    const rpmRatio = Math.min(100, ((this.car.rpm - 800) / 7500) * 100);
    if (this.rpmBarEl) this.rpmBarEl.style.width = `${rpmRatio}%`;

    if (this.driftBoxEl && this.driftPtsEl && this.driftMultEl) {
      if (this.car.isDrifting && this.car.currentDriftScore > 50) {
        this.driftBoxEl.style.display = "flex";
        this.driftPtsEl.textContent = `+${Math.round(this.car.currentDriftScore)}`;
        this.driftMultEl.textContent = `x${this.car.driftMultiplier.toFixed(1)}`;
      } else {
        this.driftBoxEl.style.display = "none";
      }
    }

    if (this.wantedEl) {
      let stars = "☆☆☆☆☆";
      if (this.car.totalScore > 10000 || spd > 220) stars = "★★★★★";
      else if (this.car.totalScore > 6000 || spd > 180) stars = "★★★★☆";
      else if (this.car.totalScore > 3500 || spd > 140) stars = "★★★☆☆";
      else if (this.car.totalScore > 1500 || spd > 100) stars = "★★☆☆☆";
      else if (this.car.totalScore > 400 || spd > 70) stars = "★☆☆☆☆";
      this.wantedEl.textContent = stars;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.gameState === "RACING") {
      this.car.throttleInput = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0);
      // Inverted steering as user explicitly configured:
      this.car.steerInput = (this.keys.left ? 1 : 0) - (this.keys.right ? 1 : 0);
      // Space = Drift
      this.car.driftActive = this.keys.drift;
      // Shift = Nitro
      this.car.nitroActive = this.keys.nitro;

      this.car.updatePhysics(delta, this.trackManager);
      this.trackManager.update(delta, this.car);

      this.updateHUD();
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new CyberDriftGame();
});

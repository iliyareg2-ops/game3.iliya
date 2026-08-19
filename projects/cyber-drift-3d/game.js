// game.js - Cyber Drift 3D: Formula 1 Autodrome, Touge Mountain & Miami Coast with Forza Horizon 5 Studio, Rewind System & GTA Wanted Stars
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
    this.cameraMode = "CHASE";
    this.gameState = "GARAGE"; // "GARAGE", "COUNTDOWN", "RACING", "BUSTED", "FINISHED"
    this.isRewinding = false;
    this.garageOrbitAngle = 0.5;
    this.isDraggingGarage = false;
    this.prevMouseX = 0;
    this.screenShake = 0;

    this.countdownTimer = 3.0;
    this.playerLapsCompleted = 0;
    this.maxLaps = 3;
    this.prevPlayerU = 0.002;
    this.finalRacePosition = 4;

    // Skill Chain tracking
    this.lastNearMissTime = 0;
    this.lastSpeedDemonTime = 0;
    this.lastUltimateDriftTime = 0;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,
      nitro: false,
      rewind: false,
    };

    this.initThree();
    this.initWorld();
    this.initInputs();
    this.initUI();
    this.initMinimapCanvas();

    window.addEventListener("resize", () => this.onWindowResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.2, 5000);
    this.camera.position.set(7, 2.5, 9);

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
    this.trackManager = new CityTrackManager(this.scene, 0, "DAY");
    this.car = new CyberCar(this.scene, 0);

    this.car.position.set(0, 0.12, 0);
    this.car.mesh.position.copy(this.car.position);

    // Showroom Studio Turntable Pod
    const turntableGeom = new THREE.CylinderGeometry(7.5, 8.0, 0.1, 32);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      metalness: 0.9,
      roughness: 0.25,
    });
    this.turntable = new THREE.Mesh(turntableGeom, turntableMat);
    this.turntable.position.set(0, 0.06, 0);
    this.turntable.receiveShadow = true;
    this.scene.add(this.turntable);

    // Showroom Studio Softbox Spots
    this.studioSpotL = new THREE.SpotLight(0xffffff, 3.5, 40, Math.PI / 4, 0.4);
    this.studioSpotL.position.set(6, 12, 6);
    this.studioSpotL.target = this.car.mesh;
    this.scene.add(this.studioSpotL);

    this.studioSpotR = new THREE.SpotLight(0xe2e8f0, 3.0, 40, Math.PI / 4, 0.4);
    this.studioSpotR.position.set(-6, 10, -6);
    this.studioSpotR.target = this.car.mesh;
    this.scene.add(this.studioSpotR);

    this.trackManager.onSpeedTrapCallback = (speedKmH, pts) => {
      this.showBanner(`📸 РАДАР СКОРОСТИ: ${speedKmH} КМ/Ч! +${pts} PTS`, 2800);
    };

    this.trackManager.onNitroPickupCallback = (bannerText) => {
      this.showBanner(bannerText, 2400);
      this.showSkillBadge("⚡ N2O NITRO BOTTLE REFILL +100%");
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

      // ⏪ FORZA REWIND KEY
      if (e.code === "KeyE" && this.gameState === "RACING") {
        if (!this.keys.rewind) {
          this.keys.rewind = true;
          this.startRewind();
        }
      }

      if (e.code === "KeyC") this.toggleCamera();
      if (e.code === "KeyR") this.resetCar();
      if (e.code === "KeyV") this.toggleWeather();
      if (e.code === "KeyM") this.nextRadioStation();

      if (this.gameState === "GARAGE" && (e.code === "Enter" || e.code === "Space")) {
        this.startCountdown();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") this.keys.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.keys.backward = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.keys.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.keys.right = false;
      if (e.code === "Space") this.keys.drift = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.nitro = false;

      if (e.code === "KeyE") {
        this.keys.rewind = false;
        this.stopRewind();
      }
    });

    window.addEventListener("mousedown", (e) => {
      if (this.gameState === "GARAGE" && e.clientX > 440) {
        this.isDraggingGarage = true;
        this.prevMouseX = e.clientX;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isDraggingGarage && this.gameState === "GARAGE") {
        const dx = e.clientX - this.prevMouseX;
        this.garageOrbitAngle += dx * 0.008;
        this.prevMouseX = e.clientX;
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDraggingGarage = false;
    });

    const camBtn = document.getElementById("btn-cam-switch");
    if (camBtn) camBtn.addEventListener("click", () => this.toggleCamera());

    const resetBtn = document.getElementById("btn-reset-car");
    if (resetBtn) resetBtn.addEventListener("click", () => this.resetCar());

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
    this.positionEl = document.getElementById("hud-position");
    this.lapEl = document.getElementById("hud-lap");
    this.driftBoxEl = document.getElementById("hud-drift-box");
    this.driftPtsEl = document.getElementById("hud-drift-pts");
    this.driftMultEl = document.getElementById("hud-drift-mult");
    this.nitroBarEl = document.getElementById("hud-nitro-bar");
    this.bannerEl = document.getElementById("hud-banner");
    this.countdownEl = document.getElementById("countdown-overlay");
    this.rewindOverlayEl = document.getElementById("rewind-overlay");
    this.skillBadgeEl = document.getElementById("hud-skill-badge");

    this.svgRpmArc = document.getElementById("svg-rpm-arc");
    this.svgNitroArc = document.getElementById("svg-nitro-arc");
    this.hudPosBadge = document.getElementById("hud-pos-badge");
    this.rpmValEl = document.getElementById("hud-rpm-val");
    this.shiftFlashEl = document.getElementById("hud-shift-flash");
    this.speedVignetteEl = document.getElementById("speed-vignette");
    this.deltaEl = document.getElementById("hud-delta");

    // 🗺️ 1. Track Location Switch
    document.querySelectorAll("[data-track]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-track]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.trackManager.setTrack(parseInt(btn.dataset.track));
      });
    });

    // 🌅 2. Atmosphere / Time-of-Day Switch
    document.querySelectorAll("[data-atmosphere]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-atmosphere]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.trackManager.applyAtmosphere(btn.dataset.atmosphere);
      });
    });

    // 3. Car Model Switch
    document.querySelectorAll("[data-cartype]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-cartype]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.car.setCarType(parseInt(btn.dataset.cartype));
      });
    });

    // 4. Body Color
    document.querySelectorAll("[data-color]").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        document.querySelectorAll("[data-color]").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        const hex = parseInt(swatch.dataset.color, 16);
        this.car.setBodyColor(hex);
      });
    });

    // 5. Custom Rims
    document.querySelectorAll("[data-rim]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-rim]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const hex = parseInt(btn.dataset.rim, 16);
        this.car.setRimColor(hex);
      });
    });

    // 7. Window Tint
    document.querySelectorAll("[data-tint]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-tint]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.car.setWindowTint(btn.dataset.tint);
      });
    });

    // 8. Spoiler Wing
    document.querySelectorAll("[data-spoiler]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-spoiler]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.car.setSpoilerType(parseInt(btn.dataset.spoiler));
      });
    });

    const startBtn = document.getElementById("btn-start-race");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        cyberAudio.init();
        this.startCountdown();
      });
    }

    const finishRestartBtn = document.getElementById("btn-restart-finish");
    if (finishRestartBtn) {
      finishRestartBtn.addEventListener("click", () => this.resetCar());
    }
  }

  showSkillBadge(text) {
    if (!this.skillBadgeEl) return;
    this.skillBadgeEl.textContent = text;
    this.skillBadgeEl.classList.add("show");
    clearTimeout(this.skillBadgeTimer);
    this.skillBadgeTimer = setTimeout(() => {
      if (this.skillBadgeEl) this.skillBadgeEl.classList.remove("show");
    }, 1800);
  }

  startRewind() {
    this.isRewinding = true;
    if (this.rewindOverlayEl) this.rewindOverlayEl.style.display = "block";
    cyberAudio.playRewindSound();
  }

  stopRewind() {
    this.isRewinding = false;
    if (this.rewindOverlayEl) this.rewindOverlayEl.style.display = "none";
    cyberAudio.stopRewindSound();
  }

  initMinimapCanvas() {
    this.minimapCanvas = document.getElementById("hud-minimap-canvas");
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext("2d");
    }
  }

  renderMinimap() {
    if (!this.minimapCtx || !this.trackManager) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cxCenter = w / 2;
    const cyCenter = h / 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Radar Glass Background
    ctx.fillStyle = "#070a14";
    ctx.beginPath();
    ctx.arc(cxCenter, cyCenter, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Concentric Radar Grid Rings
    ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    ctx.lineWidth = 1.5;
    [0.3, 0.6, 0.9].forEach((rRatio) => {
      ctx.beginPath();
      ctx.arc(cxCenter, cyCenter, (w / 2 - 4) * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    const mapX = (wx) => ((wx + 650) / 1300) * (w - 36) + 18;
    const mapZ = (wz) => ((wz + 650) / 1300) * (h - 36) + 18;

    // 3. Track Asphalt Glow Background
    ctx.strokeStyle = "rgba(30, 41, 59, 0.95)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    const samplePts = this.trackManager.trackSamplePoints;
    for (let i = 0; i < samplePts.length; i++) {
      const p = samplePts[i];
      const cx = mapX(p.x);
      const cz = mapZ(p.z);
      if (i === 0) ctx.moveTo(cx, cz);
      else ctx.lineTo(cx, cz);
    }
    ctx.closePath();
    ctx.stroke();

    // 4. Glowing Neon Circuit Line
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Start/Finish Line Indicator
    const startX = mapX(0);
    const startZ = mapZ(0);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(startX - 6, startZ - 3, 12, 6);

    // 6. AI Rivals Blips
    const rivalColors = ["#38bdf8", "#ec4899", "#22c55e"];
    this.trackManager.aiRivals.forEach((rival, idx) => {
      const rx = mapX(rival.mesh.position.x);
      const rz = mapZ(rival.mesh.position.z);
      ctx.fillStyle = rivalColors[idx % rivalColors.length];
      ctx.shadowColor = rivalColors[idx % rivalColors.length];
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(rx, rz, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 7. Player Car Arrow with Orientation & Halo Glow
    const px = mapX(this.car.position.x);
    const pz = mapZ(this.car.position.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-this.car.heading + Math.PI);

    // Player Halo
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Player Arrow
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  toggleWeather() {
    const label = this.trackManager.toggleWeather();
    this.showBanner(`ПОГОДА: ${label}`, 2000);
  }

  nextRadioStation() {
    cyberAudio.init();
    const stationName = cyberAudio.nextRadioStation();
    this.showBanner(`РАДИО: ${stationName}`, 2000);
  }

  startCountdown() {
    this.gameState = "COUNTDOWN";
    this.countdownTimer = 3.2;
    this.playerLapsCompleted = 0;
    this.prevPlayerU = 0.002;
    this.finalRacePosition = 4;
    this.isRewinding = false;

    document.getElementById("garage-screen").style.display = "none";
    document.getElementById("finish-screen").style.display = "none";
    document.getElementById("hud").style.display = "flex";

    if (this.turntable) this.turntable.visible = false;
    if (this.studioSpotL) this.studioSpotL.intensity = 0;
    if (this.studioSpotR) this.studioSpotR.intensity = 0;

    this.car.position.set(5.5, 0.15, 8);
    this.car.speed = 0;
    this.car.heading = 0;
    this.car.mesh.position.copy(this.car.position);
    this.car.mesh.rotation.set(0, 0, 0);

    if (this.trackManager.aiRivals.length >= 3) {
      this.trackManager.aiRivals[0].u = 0.008;
      this.trackManager.aiRivals[1].u = 0.008;
      this.trackManager.aiRivals[2].u = 0.0025;
      this.trackManager.aiRivals.forEach((r) => {
        r.lapsCompleted = 0;
        r.currentSpeedU = 0.0;
        const pt = this.trackManager.trackCurve.getPointAt(r.u);
        r.mesh.position.set(pt.x + r.laneOffset, 0.15, pt.z);
        r.mesh.lookAt(pt.x + r.laneOffset, 0.15, pt.z + 10);
      });
    }

    if (this.countdownEl) {
      this.countdownEl.style.display = "block";
      this.countdownEl.textContent = "3";
    }
  }

  triggerFinish(finalPos) {
    this.gameState = "FINISHED";
    this.isRewinding = false;
    this.stopRewind();
    this.finalRacePosition = finalPos;

    const titles = {
      1: "🏆 ПОБЕДА! 1-Е МЕСТО (ЗОЛОТО)",
      2: "🥈 2-Е МЕСТО (СЕРЕБРО)",
      3: "🥉 3-Е МЕСТО (БРОНЗА)",
      4: "🏁 4-Е МЕСТО (ФИНИШ)",
    };

    const titleEl = document.getElementById("finish-title");
    if (titleEl) {
      titleEl.textContent = titles[finalPos] || "🏁 ФИНИШ ГОНКИ!";
      titleEl.style.color = finalPos === 1 ? "#22c55e" : (finalPos <= 3 ? "#38bdf8" : "#f59e0b");
    }

    const rankEl = document.getElementById("finish-rank");
    if (rankEl) {
      rankEl.textContent = `${finalPos} / 4`;
      rankEl.style.color = finalPos === 1 ? "#22c55e" : (finalPos <= 3 ? "#38bdf8" : "#ef4444");
    }

    const scoreEl = document.getElementById("finish-score");
    if (scoreEl) {
      scoreEl.textContent = this.car.totalScore;
    }

    document.getElementById("finish-screen").style.display = "grid";
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
    this.startCountdown();
    this.showBanner("🔄 РЕСТАРТ ГОНКИ! НА СТАРТ");
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
      if (!this.isDraggingGarage) {
        this.garageOrbitAngle += delta * 0.3;
      }

      const radius = 10.8;
      const targetLookAt = new THREE.Vector3(0, 0.9, 0);

      const camX = targetLookAt.x + Math.sin(this.garageOrbitAngle) * radius;
      const camZ = targetLookAt.z + Math.cos(this.garageOrbitAngle) * radius;
      const camY = 2.6;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(targetLookAt);

      if (this.turntable) this.turntable.rotation.y = -this.garageOrbitAngle * 0.5;
      return;
    }

    const isNitro = this.car.nitroActive && this.car.nitroFuel > 0;
    const targetFov = isNitro ? 78 : (this.car.isDrafting ? 68 : 60);
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

  checkSkillChains() {
    const now = Date.now();
    const speedKmH = Math.abs(this.car.speed);

    // 1. Speed Demon (255+ km/h)
    if (speedKmH > 255 && now - this.lastSpeedDemonTime > 6000) {
      this.lastSpeedDemonTime = now;
      this.car.totalScore += 400;
      this.showSkillBadge("⚡ SPEED DEMON! +400 PTS");
    }

    // 2. Ultimate Drift (Drift Score > 2500)
    if (this.car.currentDriftScore > 2500 && now - this.lastUltimateDriftTime > 8000) {
      this.lastUltimateDriftTime = now;
      this.showSkillBadge("🔥 ULTIMATE DRIFT! +1000 PTS");
    }

    // 3. Near Miss with Traffic
    if (speedKmH > 130 && now - this.lastNearMissTime > 3000) {
      let isNear = false;
      for (const car of this.trackManager.trafficCars) {
        const d = this.car.position.distanceTo(car.mesh.position);
        if (d < 5.8 && d > 2.8) {
          isNear = true;
          break;
        }
      }
      if (isNear) {
        this.lastNearMissTime = now;
        this.car.totalScore += 350;
        this.showSkillBadge("🏎️ ОПАСНОЕ СБЛИЖЕНИЕ (NEAR MISS)! +350 PTS");
      }
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

    // 🔘 SVG CIRCULAR TACHOMETER & NITRO GAUGE (Forza Horizon 5 Style)
    const rpm = Math.floor(1200 + ((spd % 65) / 65) * 7200 + (this.car.throttleInput > 0 ? 800 : 0));
    const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 1000) / 8000));
    if (this.svgRpmArc) {
      // Stroke dasharray 376: 376 (empty) -> 125 (full)
      const targetRpmOffset = 376 - (rpmRatio * 251);
      this.svgRpmArc.style.strokeDashoffset = targetRpmOffset;
    }
    if (this.rpmValEl) this.rpmValEl.textContent = `${rpm} RPM`;

    // Nitro Gauge: stroke dasharray 424: 284 (empty) -> 140 (full)
    const nitroRatio = Math.max(0, Math.min(1, this.car.nitroFuel / 100));
    if (this.svgNitroArc) {
      const targetNitroOffset = 284 - (nitroRatio * 144);
      this.svgNitroArc.style.strokeDashoffset = targetNitroOffset;
    }

    if (this.shiftFlashEl) {
      this.shiftFlashEl.style.opacity = (rpmRatio > 0.88 && spd > 30) ? "0.9" : "0.0";
    }

    // 🌪️ HIGH-SPEED MOTION BLUR VIGNETTE
    if (this.speedVignetteEl) {
      let targetVig = 0.0;
      if (spd > 180 || (this.car.nitroActive && this.car.nitroFuel > 0)) {
        targetVig = Math.min(0.75, (spd - 160) / 180 + (this.car.nitroActive ? 0.35 : 0));
      }
      this.speedVignetteEl.style.opacity = targetVig.toFixed(2);
    }

    if (this.trackManager) {
      let rawPlayerU = this.trackManager.getClosestU(this.car.position);

      if (this.playerLapsCompleted === 0 && rawPlayerU > 0.9 && this.car.position.z < 80) {
        rawPlayerU = 0.002;
      }

      if (this.prevPlayerU > 0.85 && rawPlayerU < 0.15 && this.gameState === "RACING") {
        this.playerLapsCompleted++;

        if (this.playerLapsCompleted >= this.maxLaps) {
          let finalPos = 1;
          for (const rival of this.trackManager.aiRivals) {
            const rivalTotal = rival.lapsCompleted + rival.u;
            if (rivalTotal >= this.maxLaps) {
              finalPos++;
            }
          }
          this.triggerFinish(finalPos);
        } else {
          this.showBanner(`🏁 КРУГ ${this.playerLapsCompleted + 1} / ${this.maxLaps}!`, 3000);
        }
      }
      this.prevPlayerU = rawPlayerU;

      const playerTotalProgress = this.playerLapsCompleted + rawPlayerU;

      let position = 1;
      for (const rival of this.trackManager.aiRivals) {
        const rivalTotalProgress = rival.lapsCompleted + rival.u;
        if (rivalTotalProgress > playerTotalProgress) {
          position++;
        }
      }

      if (this.positionEl) {
        this.positionEl.textContent = `P${position}`;
      }

      if (this.hudPosBadge) {
        if (position === 1) this.hudPosBadge.style.background = "linear-gradient(135deg, #eab308, #ca8a04)";
        else if (position <= 3) this.hudPosBadge.style.background = "linear-gradient(135deg, #0284c7, #2563eb)";
        else this.hudPosBadge.style.background = "linear-gradient(135deg, #475569, #334155)";
      }

      if (this.lapEl) {
        const displayLap = Math.min(this.playerLapsCompleted + 1, this.maxLaps);
        this.lapEl.textContent = `${displayLap} / ${this.maxLaps}`;
      }

      if (this.deltaEl) {
        const deltaSec = ((1 - rawPlayerU) * 1.4 - 0.7).toFixed(2);
        this.deltaEl.textContent = `${deltaSec > 0 ? '+' : ''}${deltaSec}s`;
        this.deltaEl.style.color = deltaSec <= 0 ? "#22c55e" : "#ef4444";
      }
    }

    if (this.driftBoxEl && this.driftPtsEl && this.driftMultEl) {
      if (this.car.isDrifting && this.car.currentDriftScore > 50) {
        this.driftBoxEl.style.display = "flex";
        this.driftPtsEl.textContent = `+${Math.round(this.car.currentDriftScore)}`;
        this.driftMultEl.textContent = `x${this.car.driftMultiplier.toFixed(1)}`;
      } else {
        this.driftBoxEl.style.display = "none";
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.gameState === "COUNTDOWN") {
      this.countdownTimer -= delta;
      if (this.countdownEl) {
        if (this.countdownTimer > 2.0) this.countdownEl.textContent = "3";
        else if (this.countdownTimer > 1.0) this.countdownEl.textContent = "2";
        else if (this.countdownTimer > 0.0) this.countdownEl.textContent = "1";
        else {
          this.countdownEl.textContent = "GO!";
          setTimeout(() => {
            if (this.countdownEl) this.countdownEl.style.display = "none";
          }, 600);
          this.gameState = "RACING";
          this.showBanner("🔥 СТАРТ! ОБГОНИ AKIRA, GHOST И RAZOR");
        }
      }

      this.trackManager.update(delta, this.car, false);
      this.updateHUD();
      this.renderMinimap();
    } else if (this.gameState === "RACING") {
      if (this.isRewinding) {
        for (let step = 0; step < 2; step++) {
          const hasMore = this.car.stepRewind();
          this.trackManager.stepRewindAIRivals();
          if (!hasMore) {
            this.stopRewind();
            break;
          }
        }
      } else {
        this.car.throttleInput = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0);
        this.car.steerInput = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
        this.car.driftActive = this.keys.drift;
        this.car.nitroActive = this.keys.nitro;

        this.car.updatePhysics(delta, this.trackManager);
        this.trackManager.update(delta, this.car, true);
        this.checkSkillChains();
      }

      this.updateHUD();
      this.renderMinimap();
    } else if (this.gameState === "FINISHED") {
      this.car.throttleInput = 0;
      this.car.steerInput = 0;
      this.car.speed = Math.max(0, this.car.speed - delta * 60);
      this.car.updatePhysics(delta, this.trackManager);
      this.trackManager.update(delta, this.car, false);

      this.updateHUD();
      this.renderMinimap();
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new CyberDriftGame();
});

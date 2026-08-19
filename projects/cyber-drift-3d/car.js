// car.js - Grand Prix Supercars: Suspension Pitch/Roll, Rain Spray Rooster Tails, Forza Rewind, Blow-Off Valve & Tire Thermals
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CyberCar {
  constructor(scene, carTypeIndex = 0) {
    this.scene = scene;
    this.carTypeIndex = carTypeIndex; // 0: GT-R Skyline, 1: 911 Turbo, 2: Venom Hypercar

    this.position = new THREE.Vector3(0, 0.12, 0);
    this.heading = 0;
    this.speed = 0;
    this.angularVelocity = 0;
    this.driftAngle = 0;
    this.verticalVelocity = 0;

    // Suspension Dynamic Pitch & Roll
    this.bodyRoll = 0.0;
    this.bodyPitch = 0.0;

    this.totalScore = 0;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.isDrifting = false;

    this.nitroFuel = 100;
    this.nitroActive = false;

    this.isDrafting = false;
    this.brakeHeat = 0.0;
    this.tireTemp = 0.0;
    this.prevThrottle = 0;
    this.boostCharge = 0.0;

    // Forza Rewind History Buffer (240 frames ~ 4 seconds)
    this.historyBuffer = [];
    this.maxHistoryFrames = 240;

    // Customization Settings
    this.bodyColorHex = 0xdc2626;
    this.spoilerType = 0;
    this.finishType = "metallic";
    this.neonColorHex = 0x38bdf8;
    this.isNeonEnabled = true;
    this.windowTint = "limo";
    this.rimColorHex = 0xd4d4d8;

    this.throttleInput = 0;
    this.steerInput = 0;
    this.driftActive = false;

    this.mesh = new THREE.Group();
    this.bodyGroup = new THREE.Group(); // Inner group for suspension pitch & roll
    this.mesh.add(this.bodyGroup);
    this.scene.add(this.mesh);

    this.wheels = [];
    this.brakeDiscs = [];
    this.spoilerMesh = null;
    this.underglowMesh = null;
    this.underglowLight = null;

    this.initCarModel();
    this.initParticleSystems();
  }

  initCarModel() {
    while (this.bodyGroup.children.length > 0) {
      this.bodyGroup.remove(this.bodyGroup.children[0]);
    }
    this.wheels = [];
    this.brakeDiscs = [];

    const bodyMat = this._getPaintMaterial();
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.45, metalness: 0.4 });
    const glassMat = this._getGlassMaterial();

    if (this.carTypeIndex === 0) {
      // 🚗 1. GT-R SKYLINE R34 SPEC
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.75, 9.2), bodyMat);
      chassis.position.y = 0.58;
      chassis.castShadow = true;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.7, 4.8), glassMat);
      cabin.position.set(0, 1.25, -0.2);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 3.8), carbonMat);
      roof.position.set(0, 1.6, -0.2);
      const hoodVents = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.8), carbonMat);
      hoodVents.position.set(0, 0.98, 2.5);

      const splitter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 1.2), carbonMat);
      splitter.position.set(0, 0.22, 4.6);

      const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
      const tlL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), tlMat);
      tlL1.rotateX(Math.PI / 2);
      tlL1.position.set(1.4, 0.65, -4.61);
      const tlL2 = tlL1.clone();
      tlL2.position.x = 0.8;
      const tlR1 = tlL1.clone();
      tlR1.position.x = -1.4;
      const tlR2 = tlL1.clone();
      tlR2.position.x = -0.8;

      this.bodyGroup.add(chassis, cabin, roof, hoodVents, splitter, tlL1, tlL2, tlR1, tlR2);
    } else if (this.carTypeIndex === 1) {
      // 🏎️ 2. PHANTOM 911 TURBO SPEC
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.7, 9.0), bodyMat);
      chassis.position.y = 0.55;
      chassis.castShadow = true;

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.68, 4.6), glassMat);
      cabin.position.set(0, 1.2, -0.4);
      cabin.rotation.x = 0.06;

      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.4), carbonMat);
      roof.position.set(0, 1.54, -0.4);

      const flareL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 3.2), bodyMat);
      flareL.position.set(2.25, 0.6, -2.2);
      const flareR = flareL.clone();
      flareR.position.x = -2.25;

      const tlGeom = new THREE.BoxGeometry(4.0, 0.12, 0.1);
      const tl = new THREE.Mesh(tlGeom, new THREE.MeshBasicMaterial({ color: 0xff0033 }));
      tl.position.set(0, 0.65, -4.51);

      this.bodyGroup.add(chassis, cabin, roof, flareL, flareR, tl);
    } else {
      // 🚀 3. VENOM HYPERCAR SPEC
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.62, 9.6), bodyMat);
      chassis.position.y = 0.5;
      chassis.castShadow = true;

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 4.0), glassMat);
      cabin.position.set(0, 1.08, -0.2);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 3.2), carbonMat);
      roof.position.set(0, 1.38, -0.2);

      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 1.4), carbonMat);
      diffuser.position.set(0, 0.3, -4.8);
      diffuser.rotation.x = -0.15;

      const tl = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      tl.position.set(0, 0.58, -4.81);

      this.bodyGroup.add(chassis, cabin, roof, diffuser, tl);
    }

    // Exhausts
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222630, metalness: 0.95 });
    const pipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), pipeMat);
    pipeL.rotateX(Math.PI / 2);
    pipeL.position.set(0.9, 0.35, -4.8);
    const pipeR = pipeL.clone();
    pipeR.position.x = -0.9;
    this.bodyGroup.add(pipeL, pipeR);

    // Xenon Headlights
    const hlGeom = new THREE.BoxGeometry(0.9, 0.25, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(hlGeom, hlMat);
    hlL.position.set(1.45, 0.65, 4.65);
    const hlR = hlL.clone();
    hlR.position.x = -1.45;
    this.bodyGroup.add(hlL, hlR);

    const beamGeom = new THREE.ConeGeometry(8.5, 55, 16, 1, true);
    beamGeom.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfffae6, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const beamL = new THREE.Mesh(beamGeom, beamMat);
    beamL.position.set(1.45, 0.65, 28);
    const beamR = new THREE.Mesh(beamGeom, beamMat);
    beamR.position.set(-1.45, 0.65, 28);
    this.bodyGroup.add(beamL, beamR);

    this._buildUnderglowNeon();
    this._buildSpoiler(carbonMat);
    this._buildWheels();

    this.mesh.position.copy(this.position);
  }

  _getPaintMaterial() {
    let roughness = 0.15;
    let metalness = 0.85;
    let clearcoat = 1.0;

    if (this.finishType === "matte") {
      roughness = 0.65;
      metalness = 0.1;
      clearcoat = 0.0;
    } else if (this.finishType === "pearlescent") {
      roughness = 0.22;
      metalness = 0.95;
      clearcoat = 1.0;
    }

    return new THREE.MeshPhysicalMaterial({
      color: this.bodyColorHex || 0xdc2626,
      metalness: metalness,
      roughness: roughness,
      clearcoat: clearcoat,
      clearcoatRoughness: 0.1,
    });
  }

  _getGlassMaterial() {
    let opacity = 0.85;
    let color = 0x0f172a;

    if (this.windowTint === "clear") {
      opacity = 0.35;
      color = 0x38bdf8;
    } else if (this.windowTint === "smoke") {
      opacity = 0.65;
      color = 0x1e293b;
    } else {
      opacity = 0.95;
      color = 0x050811;
    }

    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.05,
      metalness: 0.9,
      transmission: 0.5,
      transparent: true,
      opacity: opacity,
    });
  }

  _buildUnderglowNeon() {
    if (this.underglowMesh) this.bodyGroup.remove(this.underglowMesh);
    if (this.underglowLight) this.bodyGroup.remove(this.underglowLight);

    if (!this.isNeonEnabled || this.neonColorHex === 0x000000) return;

    const neonMat = new THREE.MeshBasicMaterial({
      color: this.neonColorHex,
      transparent: true,
      opacity: 0.85,
    });

    const g = new THREE.Group();
    const tubeSideL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.2, 8), neonMat);
    tubeSideL.rotateZ(Math.PI / 2);
    tubeSideL.position.set(1.9, 0.15, 0);
    const tubeSideR = tubeSideL.clone();
    tubeSideR.position.x = -1.9;

    const tubeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), neonMat);
    tubeFront.rotateX(Math.PI / 2);
    tubeFront.position.set(0, 0.15, 3.2);
    const tubeRear = tubeFront.clone();
    tubeRear.position.z = -3.2;

    g.add(tubeSideL, tubeSideR, tubeFront, tubeRear);
    this.underglowMesh = g;
    this.bodyGroup.add(g);

    this.underglowLight = new THREE.PointLight(this.neonColorHex, 2.8, 14);
    this.underglowLight.position.set(0, 0.25, 0);
    this.bodyGroup.add(this.underglowLight);
  }

  _buildSpoiler(carbonMat) {
    if (this.spoilerMesh) this.bodyGroup.remove(this.spoilerMesh);

    const g = new THREE.Group();
    if (this.spoilerType === 0) {
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.3), carbonMat);
      postL.position.set(1.4, 1.15, -4.2);
      const postR = postL.clone();
      postR.position.x = -1.4;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.2), carbonMat);
      blade.position.set(0, 1.45, -4.2);
      g.add(postL, postR, blade);
    } else if (this.spoilerType === 1) {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 0.6), carbonMat);
      lip.position.set(0, 0.98, -4.6);
      lip.rotation.x = -0.35;
      g.add(lip);
    } else {
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), carbonMat);
      post1.position.set(1.1, 1.2, -4.3);
      const post2 = post1.clone();
      post2.position.x = -1.1;
      const foil = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 1.4), carbonMat);
      foil.position.set(0, 1.65, -4.3);
      foil.rotation.x = 0.1;
      g.add(post1, post2, foil);
    }

    this.spoilerMesh = g;
    this.bodyGroup.add(g);
  }

  _buildWheels() {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({
      color: this.rimColorHex,
      metalness: 0.95,
      roughness: 0.15,
    });

    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.45, 18);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.47, 14);
    rimGeom.rotateZ(Math.PI / 2);

    const brakeGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.42, 14);
    brakeGeom.rotateZ(Math.PI / 2);

    const makeWheel = (x, z) => {
      const g = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);

      const brakeMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
      });
      const brakeDisc = new THREE.Mesh(brakeGeom, brakeMat);

      g.add(tire, rim, brakeDisc);
      g.position.set(x, 0.52, z);
      g.castShadow = true;
      this.mesh.add(g);
      this.brakeDiscs.push(brakeDisc);
      return g;
    };

    this.wFL = makeWheel(1.95, 2.7);
    this.wFR = makeWheel(-1.95, 2.7);
    this.wRL = makeWheel(1.95, -2.7);
    this.wRR = makeWheel(-1.95, -2.7);
    this.wheels = [this.wFL, this.wFR, this.wRL, this.wRR];
  }

  _createSmokeTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(235, 240, 248, 0.65)");
    grad.addColorStop(0.4, "rgba(200, 210, 225, 0.35)");
    grad.addColorStop(1, "rgba(160, 175, 195, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(c);
  }

  _createWaterSprayTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(200, 230, 255, 0.5)");
    grad.addColorStop(0.5, "rgba(180, 210, 240, 0.2)");
    grad.addColorStop(1, "rgba(150, 180, 220, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(c);
  }

  _createNitroFlameTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    grad.addColorStop(0.4, "rgba(56, 189, 248, 0.45)");
    grad.addColorStop(1, "rgba(2, 132, 199, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(c);
  }

  _createBackfireTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.3, "rgba(249, 115, 22, 0.9)");
    grad.addColorStop(0.7, "rgba(239, 68, 68, 0.5)");
    grad.addColorStop(1, "rgba(220, 38, 38, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(c);
  }

  initParticleSystems() {
    const smokeTex = this._createSmokeTexture();
    const sprayTex = this._createWaterSprayTexture();
    const nitroTex = this._createNitroFlameTexture();
    const backfireTex = this._createBackfireTexture();

    const smokeCount = 220;
    const smokeGeom = new THREE.BufferGeometry();
    const sPos = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount; i++) {
      sPos[i * 3] = 0;
      sPos[i * 3 + 1] = -9999;
      sPos[i * 3 + 2] = 0;
    }
    smokeGeom.setAttribute("position", new THREE.BufferAttribute(sPos, 3));

    const smokeMat = new THREE.PointsMaterial({
      map: smokeTex,
      size: 3.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.smokePoints = new THREE.Points(smokeGeom, smokeMat);
    this.smokePoints.frustumCulled = false;
    this.scene.add(this.smokePoints);

    this.smokePool = [];
    for (let i = 0; i < smokeCount; i++) {
      this.smokePool.push({
        pos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.75,
      });
    }

    // 💧 Water Spray Particle System (Rooster Tails in rain)
    const sprayCount = 180;
    const sprayGeom = new THREE.BufferGeometry();
    const spPos = new Float32Array(sprayCount * 3);
    for (let i = 0; i < sprayCount; i++) {
      spPos[i * 3] = 0;
      spPos[i * 3 + 1] = -9999;
      spPos[i * 3 + 2] = 0;
    }
    sprayGeom.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    const sprayMat = new THREE.PointsMaterial({
      map: sprayTex,
      size: 4.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.sprayPoints = new THREE.Points(sprayGeom, sprayMat);
    this.sprayPoints.frustumCulled = false;
    this.scene.add(this.sprayPoints);

    this.sprayPool = [];
    for (let i = 0; i < sprayCount; i++) {
      this.sprayPool.push({
        pos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(),
        life: 0,
      });
    }

    const nitroCount = 100;
    const nitroGeom = new THREE.BufferGeometry();
    const nPos = new Float32Array(nitroCount * 3);
    for (let i = 0; i < nitroCount; i++) {
      nPos[i * 3] = 0;
      nPos[i * 3 + 1] = -9999;
      nPos[i * 3 + 2] = 0;
    }
    nitroGeom.setAttribute("position", new THREE.BufferAttribute(nPos, 3));

    const nitroMat = new THREE.PointsMaterial({
      map: nitroTex,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.nitroPoints = new THREE.Points(nitroGeom, nitroMat);
    this.nitroPoints.frustumCulled = false;
    this.scene.add(this.nitroPoints);

    this.nitroPool = [];
    for (let i = 0; i < nitroCount; i++) {
      this.nitroPool.push({
        pos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.25,
      });
    }

    const backfireCount = 40;
    const bfGeom = new THREE.BufferGeometry();
    const bfPos = new Float32Array(backfireCount * 3);
    for (let i = 0; i < backfireCount; i++) {
      bfPos[i * 3] = 0;
      bfPos[i * 3 + 1] = -9999;
      bfPos[i * 3 + 2] = 0;
    }
    bfGeom.setAttribute("position", new THREE.BufferAttribute(bfPos, 3));
    const bfMat = new THREE.PointsMaterial({
      map: backfireTex,
      size: 2.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.backfirePoints = new THREE.Points(bfGeom, bfMat);
    this.backfirePoints.frustumCulled = false;
    this.scene.add(this.backfirePoints);
    this.backfirePool = [];
    for (let i = 0; i < backfireCount; i++) {
      this.backfirePool.push({ pos: new THREE.Vector3(0, -9999, 0), life: 0, vel: new THREE.Vector3() });
    }

    const sparkCount = 60;
    const sparkGeom = new THREE.BufferGeometry();
    const spkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      spkPos[i * 3] = 0;
      spkPos[i * 3 + 1] = -9999;
      spkPos[i * 3 + 2] = 0;
    }
    sparkGeom.setAttribute("position", new THREE.BufferAttribute(spkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.sparkPoints = new THREE.Points(sparkGeom, sparkMat);
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);
    this.sparkPool = [];
    for (let i = 0; i < sparkCount; i++) {
      this.sparkPool.push({ pos: new THREE.Vector3(0, -9999, 0), life: 0, vel: new THREE.Vector3() });
    }
  }

  setCarType(typeIndex) {
    this.carTypeIndex = typeIndex;
    this.initCarModel();
  }

  setBodyColor(hex) {
    this.bodyColorHex = hex;
    this.initCarModel();
  }

  setSpoilerType(type) {
    this.spoilerType = type;
    this.initCarModel();
  }

  setFinishType(finish) {
    this.finishType = finish;
    this.initCarModel();
  }

  setUnderglowColor(hex) {
    this.neonColorHex = hex;
    this.isNeonEnabled = hex !== 0x000000;
    this.initCarModel();
  }

  setWindowTint(tint) {
    this.windowTint = tint;
    this.initCarModel();
  }

  setRimColor(hex) {
    this.rimColorHex = hex;
    this.initCarModel();
  }

  emitSparks(pos) {
    for (let i = 0; i < 15; i++) {
      const p = this.sparkPool.find((s) => s.life <= 0);
      if (!p) break;
      p.pos.copy(pos);
      p.vel.set((Math.random() - 0.5) * 12, Math.random() * 8 + 2, (Math.random() - 0.5) * 12);
      p.life = 0.35;
    }
  }

  emitDriftSmoke() {
    const rearLeftPos = new THREE.Vector3(1.95, 0.25, -2.7).applyMatrix4(this.mesh.matrixWorld);
    const rearRightPos = new THREE.Vector3(-1.95, 0.25, -2.7).applyMatrix4(this.mesh.matrixWorld);

    const smokePlumeMultiplier = 1.0 + this.tireTemp * 1.5;

    [rearLeftPos, rearRightPos].forEach((wheelPos) => {
      const p = this.smokePool.find((s) => s.life <= 0);
      if (p) {
        p.pos.copy(wheelPos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4));
        p.vel.set(
          (Math.random() - 0.5) * (1.5 * smokePlumeMultiplier),
          (0.8 + Math.random() * 1.2) * smokePlumeMultiplier,
          (Math.random() - 0.5) * (1.5 * smokePlumeMultiplier)
        );
        p.life = 0.65 + this.tireTemp * 0.3;
        p.maxLife = p.life;
      }
    });
  }

  emitWaterSpray() {
    const rearLeftPos = new THREE.Vector3(1.95, 0.2, -2.9).applyMatrix4(this.mesh.matrixWorld);
    const rearRightPos = new THREE.Vector3(-1.95, 0.2, -2.9).applyMatrix4(this.mesh.matrixWorld);
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const speedRatio = Math.min(1.0, this.speed / 200);

    [rearLeftPos, rearRightPos].forEach((wheelPos) => {
      const p = this.sprayPool.find((s) => s.life <= 0);
      if (p) {
        p.pos.copy(wheelPos);
        p.vel.set(
          -forwardX * speedRatio * 15 + (Math.random() - 0.5) * 4,
          2.5 + Math.random() * 4.0 * speedRatio,
          -forwardZ * speedRatio * 15 + (Math.random() - 0.5) * 4
        );
        p.life = 0.45;
      }
    });
  }

  emitNitroExhaust() {
    const pipeLPos = new THREE.Vector3(0.9, 0.35, -4.9).applyMatrix4(this.mesh.matrixWorld);
    const pipeRPos = new THREE.Vector3(-0.9, 0.35, -4.9).applyMatrix4(this.mesh.matrixWorld);
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    [pipeLPos, pipeRPos].forEach((pipePos) => {
      const p = this.nitroPool.find((s) => s.life <= 0);
      if (p) {
        p.pos.copy(pipePos).add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1));
        p.vel.set(
          -forwardX * 18 + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.0,
          -forwardZ * 18 + (Math.random() - 0.5) * 2
        );
        p.life = 0.2;
        p.maxLife = p.life;
      }
    });
  }

  emitBackfirePop() {
    const pipeLPos = new THREE.Vector3(0.9, 0.35, -4.9).applyMatrix4(this.mesh.matrixWorld);
    const pipeRPos = new THREE.Vector3(-0.9, 0.35, -4.9).applyMatrix4(this.mesh.matrixWorld);
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    [pipeLPos, pipeRPos].forEach((pipePos) => {
      for (let k = 0; k < 3; k++) {
        const p = this.backfirePool.find((s) => s.life <= 0);
        if (p) {
          p.pos.copy(pipePos);
          p.vel.set(
            -forwardX * 14 + (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5,
            -forwardZ * 14 + (Math.random() - 0.5) * 3
          );
          p.life = 0.14;
        }
      }
    });
    cyberAudio.playExhaustBackfire();
  }

  recordHistoryState() {
    this.historyBuffer.push({
      x: this.position.x,
      z: this.position.z,
      heading: this.heading,
      speed: this.speed,
      angularVelocity: this.angularVelocity,
      nitroFuel: this.nitroFuel,
      totalScore: this.totalScore,
      currentDriftScore: this.currentDriftScore,
      driftMultiplier: this.driftMultiplier,
    });
    if (this.historyBuffer.length > this.maxHistoryFrames) {
      this.historyBuffer.shift();
    }
  }

  stepRewind() {
    if (this.historyBuffer.length === 0) return false;
    const state = this.historyBuffer.pop();
    this.position.x = state.x;
    this.position.z = state.z;
    this.heading = state.heading;
    this.speed = state.speed;
    this.angularVelocity = state.angularVelocity;
    this.nitroFuel = state.nitroFuel;
    this.totalScore = state.totalScore;
    this.currentDriftScore = state.currentDriftScore;
    this.driftMultiplier = state.driftMultiplier;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    return true;
  }

  updatePhysics(delta, trackManager) {
    this.recordHistoryState();

    const isNitroFiring = this.nitroActive && this.nitroFuel > 0;
    let maxForwardSpeed = isNitroFiring ? 360 : 255;
    if (this.isDrafting) maxForwardSpeed += 25;

    const maxReverseSpeed = -75;
    const accelRate = (isNitroFiring ? 190 : (this.isDrafting ? 140 : 110)) * delta;
    const brakeRate = 230 * delta;
    const coastDrag = 38 * delta;

    if (isNitroFiring) {
      this.nitroFuel = Math.max(0, this.nitroFuel - delta * 24);
      this.emitNitroExhaust();
    }

    if (this.throttleInput > 0.8 && this.speed > 90) {
      this.boostCharge = Math.min(1.0, this.boostCharge + delta * 1.5);
    }

    if (this.prevThrottle > 0.8 && this.throttleInput === 0 && this.boostCharge > 0.4) {
      this.emitBackfirePop();
      cyberAudio.playBlowOffValve();
      this.boostCharge = 0.0;
    }
    this.prevThrottle = this.throttleInput;

    if (this.throttleInput > 0) {
      this.speed = Math.min(maxForwardSpeed, this.speed + accelRate);
      this.brakeHeat = Math.max(0, this.brakeHeat - delta * 0.8);
    } else if (this.throttleInput < 0) {
      if (this.speed > 5) {
        this.speed = Math.max(0, this.speed - brakeRate);
        if (this.speed > 110) {
          this.brakeHeat = Math.min(1.0, this.brakeHeat + delta * 2.2);
        }
      } else {
        this.speed = Math.max(maxReverseSpeed, this.speed - accelRate * 0.75);
      }
    } else {
      this.brakeHeat = Math.max(0, this.brakeHeat - delta * 0.6);
      if (this.speed > 0) this.speed = Math.max(0, this.speed - coastDrag);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + coastDrag);
    }

    for (const disc of this.brakeDiscs) {
      if (this.brakeHeat > 0.15) {
        disc.material.emissive.setHex(0xff3300);
        disc.material.emissiveIntensity = this.brakeHeat * 4.0;
      } else {
        disc.material.emissive.setHex(0x000000);
        disc.material.emissiveIntensity = 0.0;
      }
    }

    const speedRatio = Math.min(1.0, Math.abs(this.speed) / 100);
    const baseTurnSpeed = 1.35;
    const driftTurnMultiplier = 1.95;

    let effectiveTurnSpeed = baseTurnSpeed;
    if (this.driftActive && Math.abs(this.speed) > 30) {
      this.isDrifting = true;
      effectiveTurnSpeed *= driftTurnMultiplier;
      this.driftMultiplier = Math.min(8.0, this.driftMultiplier + delta * 0.9);
      this.currentDriftScore += Math.abs(this.speed) * delta * 18 * this.driftMultiplier;
      this.tireTemp = Math.min(1.0, this.tireTemp + delta * 0.35);
      this.emitDriftSmoke();
    } else {
      this.isDrifting = false;
      this.tireTemp = Math.max(0.0, this.tireTemp - delta * 0.15);
      if (this.currentDriftScore > 0) {
        this.totalScore += Math.round(this.currentDriftScore);
        cyberAudio.playScoreChime();
        this.currentDriftScore = 0;
        this.driftMultiplier = 1.0;
      }
    }

    // 💧 Water spray in rain
    if (trackManager && trackManager.isRaining && this.speed > 75) {
      this.emitWaterSpray();
    }

    if (this.steerInput !== 0) {
      this.angularVelocity = -this.steerInput * effectiveTurnSpeed * speedRatio;
    } else {
      this.angularVelocity *= Math.pow(0.01, delta);
    }

    this.heading += this.angularVelocity * delta;

    // ⚖️ REALISTIC SUSPENSION BODY ROLL & PITCH PHYSICS
    const targetRoll = -this.steerInput * Math.min(0.12, (Math.abs(this.speed) / 250) * 0.12);
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, delta * 8.0);

    let targetPitch = 0.0;
    if (this.throttleInput > 0) targetPitch = -0.04 * (isNitroFiring ? 1.8 : 1.0); // Squat on accel
    else if (this.throttleInput < 0 && this.speed > 20) targetPitch = 0.07; // Dive on brake
    this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, delta * 7.0);

    this.bodyGroup.rotation.z = this.bodyRoll;
    this.bodyGroup.rotation.x = this.bodyPitch;

    const speedMs = (this.speed * 1000) / 3600;
    this.position.x += Math.sin(this.heading) * speedMs * delta;
    this.position.z += Math.cos(this.heading) * speedMs * delta;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    if (this.wFL && this.wFR) {
      const steerAngle = -this.steerInput * 0.45;
      this.wFL.rotation.y = steerAngle;
      this.wFR.rotation.y = steerAngle;
    }
    for (const w of this.wheels) {
      w.children[0].rotation.x += speedMs * delta * 4;
    }

    if (trackManager) {
      trackManager.handleCarTrackCollision(this);

      let drafting = false;
      const forwardX = Math.sin(this.heading);
      const forwardZ = Math.cos(this.heading);

      for (const rival of trackManager.aiRivals) {
        const d = this.position.distanceTo(rival.mesh.position);
        if (d < 18.0 && d > 4.0 && this.speed > 130) {
          const toRival = new THREE.Vector3().subVectors(rival.mesh.position, this.position).normalize();
          const dot = toRival.x * forwardX + toRival.z * forwardZ;
          if (dot > 0.85) {
            drafting = true;
            break;
          }
        }
      }
      this.isDrafting = drafting;
      cyberAudio.setSlipstreamActive(this.isDrafting);
    }

    const rpmRatio = Math.min(1.0, (Math.abs(this.speed) % 65) / 65 + (this.throttleInput > 0 ? 0.35 : 0));
    const policeDist = trackManager ? trackManager.nearestPoliceDist : 999999;
    const isHeli = trackManager && trackManager.helicopter ? (policeDist < 350) : false;

    cyberAudio.update(
      rpmRatio,
      Math.abs(this.speed),
      this.isDrifting ? 0.85 : 0.0,
      isNitroFiring,
      policeDist,
      isHeli
    );

    this._updateParticles(delta);
  }

  _updateParticles(delta) {
    const sPos = this.smokePoints.geometry.attributes.position;
    for (let i = 0; i < this.smokePool.length; i++) {
      const p = this.smokePool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.vel.y += delta * 0.4;
        p.life -= delta;
        sPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        sPos.setXYZ(i, 0, -9999, 0);
      }
    }
    sPos.needsUpdate = true;

    const spPos = this.sprayPoints.geometry.attributes.position;
    for (let i = 0; i < this.sprayPool.length; i++) {
      const p = this.sprayPool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta;
        spPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        spPos.setXYZ(i, 0, -9999, 0);
      }
    }
    spPos.needsUpdate = true;

    const nPos = this.nitroPoints.geometry.attributes.position;
    for (let i = 0; i < this.nitroPool.length; i++) {
      const p = this.nitroPool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta;
        nPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        nPos.setXYZ(i, 0, -9999, 0);
      }
    }
    nPos.needsUpdate = true;

    const bfPos = this.backfirePoints.geometry.attributes.position;
    for (let i = 0; i < this.backfirePool.length; i++) {
      const p = this.backfirePool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta;
        bfPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        bfPos.setXYZ(i, 0, -9999, 0);
      }
    }
    bfPos.needsUpdate = true;

    const spkPos = this.sparkPoints.geometry.attributes.position;
    for (let i = 0; i < this.sparkPool.length; i++) {
      const p = this.sparkPool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta;
        spkPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        spkPos.setXYZ(i, 0, -9999, 0);
      }
    }
    spkPos.needsUpdate = true;
  }

  reset() {
    this.position.set(0, 0.12, 0);
    this.speed = 0;
    this.heading = 0;
    this.angularVelocity = 0;
    this.verticalVelocity = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.nitroFuel = 100;
    this.currentDriftScore = 0;
    this.brakeHeat = 0;
    this.tireTemp = 0;
    this.boostCharge = 0;
    this.historyBuffer = [];
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, 0, 0);
    this.bodyGroup.rotation.set(0, 0, 0);
  }
}

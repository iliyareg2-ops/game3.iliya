// car.js - 100% Visible Volumetric Drift Smoke Clouds (Frustum Culling Disabled & Instanced 3D Billowing Puffs) & Nitro Flames
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CyberCar {
  constructor(scene, carTypeIndex = 0) {
    this.scene = scene;
    this.carTypeIndex = carTypeIndex;

    this.position = new THREE.Vector3(0, 0.12, 0);
    this.heading = 0;
    this.speed = 0;
    this.angularVelocity = 0;
    this.driftAngle = 0;
    this.verticalVelocity = 0;

    this.totalScore = 0;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.isDrifting = false;

    this.nitroFuel = 100;
    this.nitroActive = false;
    this.focusEnergy = 100;

    this.spoilerType = 0;
    this.finishType = "metallic";

    this.throttleInput = 0;
    this.steerInput = 0;
    this.driftActive = false;

    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.wheels = [];
    this.spoilerMesh = null;
    this.initCarModel();
    this.initParticleSystems();
  }

  initCarModel() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }
    this.wheels = [];

    const bodyMat = this._getPaintMaterial();
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.45, metalness: 0.3 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.9,
      transmission: 0.65,
      transparent: true,
      opacity: 0.85,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.72, 9.4), bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.mesh.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.65, 4.4), glassMat);
    cabin.position.set(0, 1.15, -0.3);
    this.mesh.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 3.5), carbonMat);
    roof.position.set(0, 1.48, -0.3);
    this.mesh.add(roof);

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 1.2), carbonMat);
    splitter.position.set(0, 0.22, 4.6);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 0.8), carbonMat);
    diffuser.position.set(0, 0.35, -4.7);
    this.mesh.add(splitter, diffuser);

    // Dual Exhaust Tips
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222630, metalness: 0.95 });
    const pipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 12), pipeMat);
    pipeL.rotateX(Math.PI / 2);
    pipeL.position.set(0.9, 0.35, -4.8);
    const pipeR = pipeL.clone();
    pipeR.position.x = -0.9;
    this.mesh.add(pipeL, pipeR);

    // Headlights & Taillights
    const hlGeom = new THREE.BoxGeometry(0.9, 0.25, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(hlGeom, hlMat);
    hlL.position.set(1.45, 0.65, 4.71);
    const hlR = hlL.clone();
    hlR.position.x = -1.45;

    const tlGeom = new THREE.BoxGeometry(3.8, 0.18, 0.1);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const tl = new THREE.Mesh(tlGeom, tlMat);
    tl.position.set(0, 0.65, -4.71);
    this.mesh.add(hlL, hlR, tl);

    const beamGeom = new THREE.ConeGeometry(8.5, 55, 16, 1, true);
    beamGeom.rotateX(-Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfffae6, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const beamL = new THREE.Mesh(beamGeom, beamMat);
    beamL.position.set(1.45, 0.65, 28);
    const beamR = new THREE.Mesh(beamGeom, beamMat);
    beamR.position.set(-1.45, 0.65, 28);
    this.mesh.add(beamL, beamR);

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
      roughness = 0.25;
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

  _buildSpoiler(carbonMat) {
    if (this.spoilerMesh) this.mesh.remove(this.spoilerMesh);

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
      const foil = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.15, 0.8), carbonMat);
      foil.position.set(0, 1.25, -4.3);
      g.add(foil);
    }

    this.spoilerMesh = g;
    this.mesh.add(g);
  }

  _buildWheels() {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.15 });

    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.45, 18);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.47, 14);
    rimGeom.rotateZ(Math.PI / 2);

    const makeWheel = (x, z) => {
      const g = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      g.add(tire, rim);
      g.position.set(x, 0.52, z);
      g.castShadow = true;
      this.mesh.add(g);
      return g;
    };

    this.wFL = makeWheel(1.95, 2.7);
    this.wFR = makeWheel(-1.95, 2.7);
    this.wRL = makeWheel(1.95, -2.7);
    this.wRR = makeWheel(-1.95, -2.7);
    this.wheels = [this.wFL, this.wFR, this.wRL, this.wRR];
  }

  // 💨 HIGH-CONTRAST VOLUMETRIC PUFF TEXTURES
  _createSmokeTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.25, "rgba(235, 240, 248, 0.85)");
    grad.addColorStop(0.6, "rgba(200, 215, 230, 0.45)");
    grad.addColorStop(1, "rgba(180, 200, 220, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(c);
  }

  _createNitroFlameTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.3, "rgba(56, 189, 248, 0.95)");
    grad.addColorStop(0.7, "rgba(2, 132, 199, 0.6)");
    grad.addColorStop(1, "rgba(3, 105, 161, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(c);
  }

  // 💨 GUARANTEED VISIBLE PARTICLE SYSTEMS (Frustum Culling Disabled!)
  initParticleSystems() {
    const smokeTex = this._createSmokeTexture();
    const nitroTex = this._createNitroFlameTexture();

    // 1. Drift Smoke System
    const smokeCount = 350;
    const smokeGeom = new THREE.BufferGeometry();
    const sPos = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount; i++) {
      sPos[i * 3] = 0;
      sPos[i * 3 + 1] = 0;
      sPos[i * 3 + 2] = 0;
    }
    smokeGeom.setAttribute("position", new THREE.BufferAttribute(sPos, 3));

    const smokeMat = new THREE.PointsMaterial({
      map: smokeTex,
      size: 14.0, // World-space size
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.smokePoints = new THREE.Points(smokeGeom, smokeMat);
    this.smokePoints.frustumCulled = false; // CRITICAL: NEVER CULL SMOKE!
    this.scene.add(this.smokePoints);

    this.smokePool = [];
    for (let i = 0; i < smokeCount; i++) {
      this.smokePool.push({
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1.4,
      });
    }

    // 2. Nitro Jet Exhaust Flames
    const nitroCount = 200;
    const nitroGeom = new THREE.BufferGeometry();
    const nPos = new Float32Array(nitroCount * 3);
    for (let i = 0; i < nitroCount; i++) {
      nPos[i * 3] = 0;
      nPos[i * 3 + 1] = 0;
      nPos[i * 3 + 2] = 0;
    }
    nitroGeom.setAttribute("position", new THREE.BufferAttribute(nPos, 3));

    const nitroMat = new THREE.PointsMaterial({
      map: nitroTex,
      size: 9.0, // World-space size
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.nitroPoints = new THREE.Points(nitroGeom, nitroMat);
    this.nitroPoints.frustumCulled = false; // CRITICAL: NEVER CULL NITRO!
    this.scene.add(this.nitroPoints);

    this.nitroPool = [];
    for (let i = 0; i < nitroCount; i++) {
      this.nitroPool.push({
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.35,
      });
    }

    // 3. Collision Sparks
    const sparkCount = 80;
    const sparkGeom = new THREE.BufferGeometry();
    const spPos = new Float32Array(sparkCount * 3);
    sparkGeom.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 2.0,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.sparkPoints = new THREE.Points(sparkGeom, sparkMat);
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);
    this.sparkPool = [];
    for (let i = 0; i < sparkCount; i++) {
      this.sparkPool.push({ pos: new THREE.Vector3(0, -999, 0), life: 0, vel: new THREE.Vector3() });
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

  emitSparks(pos) {
    for (let i = 0; i < 20; i++) {
      const p = this.sparkPool.find((s) => s.life <= 0);
      if (!p) break;
      p.pos.copy(pos);
      p.vel.set((Math.random() - 0.5) * 16, Math.random() * 12 + 2, (Math.random() - 0.5) * 16);
      p.life = 0.45;
    }
  }

  // 💨 CONTINUOUS DRIFT SMOKE EMISSION FROM BOTH REAR WHEELS
  emitDriftSmoke() {
    const rearLeftPos = new THREE.Vector3(1.95, 0.35, -2.7).applyMatrix4(this.mesh.matrixWorld);
    const rearRightPos = new THREE.Vector3(-1.95, 0.35, -2.7).applyMatrix4(this.mesh.matrixWorld);

    [rearLeftPos, rearRightPos].forEach((wheelPos) => {
      for (let k = 0; k < 4; k++) {
        const p = this.smokePool.find((s) => s.life <= 0);
        if (!p) break;

        p.pos.copy(wheelPos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.5, (Math.random() - 0.5) * 1.2));
        p.vel.set(
          (Math.random() - 0.5) * 4.0,
          1.8 + Math.random() * 3.0,
          (Math.random() - 0.5) * 4.0
        );
        p.life = 1.2 + Math.random() * 0.6;
        p.maxLife = p.life;
      }
    });
  }

  // ⚡ DENSE NITRO JET FLAME & EXHAUST GAS PLUME EMISSION
  emitNitroExhaust() {
    const pipeLPos = new THREE.Vector3(0.9, 0.38, -4.9).applyMatrix4(this.mesh.matrixWorld);
    const pipeRPos = new THREE.Vector3(-0.9, 0.38, -4.9).applyMatrix4(this.mesh.matrixWorld);
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    [pipeLPos, pipeRPos].forEach((pipePos) => {
      for (let k = 0; k < 6; k++) {
        const p = this.nitroPool.find((s) => s.life <= 0);
        if (!p) break;

        p.pos.copy(pipePos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
        p.vel.set(
          -forwardX * (28 + Math.random() * 16) + (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 3.0,
          -forwardZ * (28 + Math.random() * 16) + (Math.random() - 0.5) * 4
        );
        p.life = 0.3 + Math.random() * 0.2;
        p.maxLife = p.life;
      }
    });
  }

  updatePhysics(delta, trackManager) {
    const isNitroFiring = this.nitroActive && this.nitroFuel > 0;
    const maxForwardSpeed = isNitroFiring ? 360 : 255;
    const maxReverseSpeed = -75;
    const accelRate = (isNitroFiring ? 190 : 110) * delta;
    const brakeRate = 220 * delta;
    const coastDrag = 38 * delta;

    if (isNitroFiring) {
      this.nitroFuel = Math.max(0, this.nitroFuel - delta * 24);
      // ⚡ EMIT NITRO JET PLUMES
      this.emitNitroExhaust();
    }

    if (this.throttleInput > 0) {
      this.speed = Math.min(maxForwardSpeed, this.speed + accelRate);
    } else if (this.throttleInput < 0) {
      if (this.speed > 5) this.speed = Math.max(0, this.speed - brakeRate);
      else this.speed = Math.max(maxReverseSpeed, this.speed - accelRate * 0.75);
    } else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - coastDrag);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + coastDrag);
    }

    // 2. Cornering & Space Drift
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / 100);
    const baseTurnSpeed = 1.35;
    const driftTurnMultiplier = 1.95;

    let effectiveTurnSpeed = baseTurnSpeed;
    if (this.driftActive && Math.abs(this.speed) > 30) {
      this.isDrifting = true;
      effectiveTurnSpeed *= driftTurnMultiplier;
      this.driftMultiplier = Math.min(8.0, this.driftMultiplier + delta * 0.9);
      this.currentDriftScore += Math.abs(this.speed) * delta * 18 * this.driftMultiplier;

      // 💨 EMIT DRIFT SMOKE
      this.emitDriftSmoke();
    } else {
      this.isDrifting = false;
      if (this.currentDriftScore > 0) {
        this.totalScore += Math.round(this.currentDriftScore);
        cyberAudio.playScoreChime();
        this.currentDriftScore = 0;
        this.driftMultiplier = 1.0;
      }
    }

    if (this.steerInput !== 0) {
      this.angularVelocity = -this.steerInput * effectiveTurnSpeed * speedRatio;
    } else {
      this.angularVelocity *= Math.pow(0.01, delta);
    }

    this.heading += this.angularVelocity * delta;

    // 3. Movement & Airborne Jumping Gravity
    const speedMs = (this.speed * 1000) / 3600;
    this.position.x += Math.sin(this.heading) * speedMs * delta;
    this.position.z += Math.cos(this.heading) * speedMs * delta;

    if (this.verticalVelocity !== 0 || this.position.y > 0.12) {
      this.position.y += this.verticalVelocity * delta;
      this.verticalVelocity -= 28.0 * delta;
      if (this.position.y <= 0.12) {
        this.position.y = 0.12;
        this.verticalVelocity = 0;
      }
    }

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
    // 1. Update Drift Smoke Particles
    const sPos = this.smokePoints.geometry.attributes.position;
    for (let i = 0; i < this.smokePool.length; i++) {
      const p = this.smokePool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.vel.y += delta * 0.8;
        p.life -= delta;
        sPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        sPos.setXYZ(i, 0, -999, 0);
      }
    }
    sPos.needsUpdate = true;

    // 2. Update Nitro Jet Flame Particles
    const nPos = this.nitroPoints.geometry.attributes.position;
    for (let i = 0; i < this.nitroPool.length; i++) {
      const p = this.nitroPool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta;
        nPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        nPos.setXYZ(i, 0, -999, 0);
      }
    }
    nPos.needsUpdate = true;

    // 3. Update Sparks
    const spPos = this.sparkPoints.geometry.attributes.position;
    for (let i = 0; i < this.sparkPool.length; i++) {
      const p = this.sparkPool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.vel.y -= delta * 24;
        p.life -= delta;
        spPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        spPos.setXYZ(i, 0, -999, 0);
      }
    }
    spPos.needsUpdate = true;
  }

  reset() {
    this.position.set(0, 0.12, 0);
    this.speed = 0;
    this.heading = 0;
    this.angularVelocity = 0;
    this.verticalVelocity = 0;
    this.nitroFuel = 100;
    this.currentDriftScore = 0;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, 0, 0);
  }
}

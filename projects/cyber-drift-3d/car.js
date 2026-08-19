// car.js - Realistic Supercar Physics with Airborne Jump Gravity, Focus Energy & Automotive Tuning
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
    this.verticalVelocity = 0; // Stunt ramp jumping

    this.totalScore = 0;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.isDrifting = false;

    this.nitroFuel = 100;
    this.nitroActive = false;
    this.focusEnergy = 100; // Bullet-Time Focus

    this.spoilerType = 0; // 0: GT Wing, 1: Ducktail, 2: Aerofoil
    this.wheelType = 0;   // 0: BBS Mesh, 1: 5-Spoke, 2: Monoblock
    this.finishType = "metallic"; // 'metallic', 'matte', 'pearlescent'

    this.throttleInput = 0;
    this.steerInput = 0;
    this.driftActive = false;

    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.wheels = [];
    this.spoilerMesh = null;
    this.initCarModel();
    this.initParticleSystems();
    this.initSkidmarks();
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

    // Front Bumper Splitter & Diffuser
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 1.2), carbonMat);
    splitter.position.set(0, 0.22, 4.6);
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 0.8), carbonMat);
    diffuser.position.set(0, 0.35, -4.7);
    this.mesh.add(splitter, diffuser);

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

    // Headlight Projector Cones
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
      color: this.bodyColorHex || 0xe11d48,
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
      // Carbon GT Wing
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.3), carbonMat);
      postL.position.set(1.4, 1.15, -4.2);
      const postR = postL.clone();
      postR.position.x = -1.4;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.2), carbonMat);
      blade.position.set(0, 1.45, -4.2);
      g.add(postL, postR, blade);
    } else if (this.spoilerType === 1) {
      // Ducktail Lip
      const lip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 0.6), carbonMat);
      lip.position.set(0, 0.98, -4.6);
      lip.rotation.x = -0.35;
      g.add(lip);
    } else {
      // Aerofoil
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

  initParticleSystems() {
    // 1. Tire Smoke
    const smokeCount = 120;
    const smokeGeom = new THREE.BufferGeometry();
    const sPos = new Float32Array(smokeCount * 3);
    smokeGeom.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xd1d5db,
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.smokePoints = new THREE.Points(smokeGeom, smokeMat);
    this.scene.add(this.smokePoints);
    this.smokePool = [];
    for (let i = 0; i < smokeCount; i++) {
      this.smokePool.push({ pos: new THREE.Vector3(0, -999, 0), life: 0, vel: new THREE.Vector3() });
    }

    // 2. Collision Sparks
    const sparkCount = 80;
    const sparkGeom = new THREE.BufferGeometry();
    const spPos = new Float32Array(sparkCount * 3);
    sparkGeom.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.sparkPoints = new THREE.Points(sparkGeom, sparkMat);
    this.scene.add(this.sparkPoints);
    this.sparkPool = [];
    for (let i = 0; i < sparkCount; i++) {
      this.sparkPool.push({ pos: new THREE.Vector3(0, -999, 0), life: 0, vel: new THREE.Vector3() });
    }
  }

  initSkidmarks() {
    this.skidmarks = [];
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

  updatePhysics(delta, trackManager) {
    // 1. Acceleration & Top Speed
    const maxForwardSpeed = this.nitroActive && this.nitroFuel > 0 ? 360 : 255;
    const maxReverseSpeed = -75;
    const accelRate = (this.nitroActive && this.nitroFuel > 0 ? 190 : 110) * delta;
    const brakeRate = 220 * delta;
    const coastDrag = 38 * delta;

    if (this.nitroActive && this.nitroFuel > 0) {
      this.nitroFuel = Math.max(0, this.nitroFuel - delta * 24);
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
    if (this.driftActive && Math.abs(this.speed) > 40) {
      this.isDrifting = true;
      effectiveTurnSpeed *= driftTurnMultiplier;
      this.driftMultiplier = Math.min(8.0, this.driftMultiplier + delta * 0.9);
      this.currentDriftScore += Math.abs(this.speed) * delta * 18 * this.driftMultiplier;
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
      this.verticalVelocity -= 28.0 * delta; // Gravity
      if (this.position.y <= 0.12) {
        this.position.y = 0.12;
        this.verticalVelocity = 0;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    // Steering wheel animation
    if (this.wFL && this.wFR) {
      const steerAngle = -this.steerInput * 0.45;
      this.wFL.rotation.y = steerAngle;
      this.wFR.rotation.y = steerAngle;
    }
    for (const w of this.wheels) {
      w.children[0].rotation.x += speedMs * delta * 4;
    }

    // 4. City Collisions
    if (trackManager) {
      trackManager.handleCarTrackCollision(this);
    }

    // 5. Audio Engine
    const rpmRatio = Math.min(1.0, (Math.abs(this.speed) % 65) / 65 + (this.throttleInput > 0 ? 0.3 : 0));
    cyberAudio.update(
      rpmRatio,
      Math.abs(this.speed),
      this.isDrifting ? 0.8 : 0.0,
      this.nitroActive && this.nitroFuel > 0,
      trackManager ? trackManager.isPoliceNearby : false,
      false
    );

    this._updateParticles(delta);
  }

  _updateParticles(delta) {
    const sPos = this.smokePoints.geometry.attributes.position;
    for (let i = 0; i < this.smokePool.length; i++) {
      const p = this.smokePool[i];
      if (p.life > 0) {
        p.pos.addScaledVector(p.vel, delta);
        p.life -= delta;
        sPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        sPos.setXYZ(i, 0, -999, 0);
      }
    }
    sPos.needsUpdate = true;

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

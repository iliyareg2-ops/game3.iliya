// airplane.js - Supersonic Aerodynamics, Stunt Recognition Engine, Sonic Boom Cone, Wing Vortices & Avionics
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { flightAudio } from "./audio.js";

export class Airplane {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.cockpitPoint = new THREE.Object3D();

    this.leftElevon = null;
    this.rightElevon = null;
    this.leftCanard = null;
    this.rightCanard = null;
    this.thrusterGlows = [];
    this.exhaustParticles = [];
    this.wingtipVortices = [];

    // Shield & Sonic Boom Visuals
    this.shieldMesh = null;
    this.shieldTime = 0;
    this.sonicBoomCone = null;
    this.sonicBoomTriggered = false;

    // Flight Dynamics State
    this.position = new THREE.Vector3(0, 1.4, -450);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = 0;

    this.speed = 0; // km/h
    this.takeoffSpeed = 170;
    this.cruiseSpeed = 580;
    this.boostSpeed = 1450;
    this.machSpeed = 1235;

    this.throttle = 0;
    this.boostFuel = 100;
    this.isBoosting = false;
    this.isBraking = false;
    this.isAirborne = false;
    this.isCrashed = false;

    this.pitchInput = 0;
    this.rollInput = 0;
    this.yawInput = 0;
    this.pitchRate = 0;
    this.rollRate = 0;
    this.yawRate = 0;
    this.rollAngle = 0;
    this.pitchAngle = 0;
    this.gForce = 1.0;

    // Stunt Tracking
    this.accumulatedRoll = 0;
    this.accumulatedPitch = 0;
    this.onStuntCallback = null;
    this.stuntCooldown = 0;

    this.distanceFlownMeters = 0;
    this.lastPosition = this.position.clone();

    this.createJetModel();
    this.createCockpitInterior();
    this.createShieldBubble();
    this.createSonicBoomCone();
    this.createParticleSystems();
    this.scene.add(this.mesh);
  }

  createJetModel() {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a212b, metalness: 0.88, roughness: 0.22 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0099dd, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.8 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.9, roughness: 0.35 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0d2838, metalness: 0.95, roughness: 0.08, transparent: true, opacity: 0.65 });

    // Fuselage
    const fuselageGeom = new THREE.ConeGeometry(1.8, 16, 8);
    fuselageGeom.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeom, hullMat);
    fuselage.scale.set(1.1, 0.65, 1.0);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    this.mesh.add(fuselage);

    // Canopy
    const canopyGeom = new THREE.SphereGeometry(1.3, 16, 12);
    canopyGeom.scale(0.85, 0.7, 3.2);
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.65, -1.2);
    canopy.castShadow = true;
    this.mesh.add(canopy);

    // Main Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -2);
    wingShape.lineTo(7.5, 3.5);
    wingShape.lineTo(7.2, 5.0);
    wingShape.lineTo(1.8, 4.2);
    wingShape.lineTo(0, 4.5);
    wingShape.lineTo(-1.8, 4.2);
    wingShape.lineTo(-7.2, 5.0);
    wingShape.lineTo(-7.5, 3.5);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.22, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.08, bevelThickness: 0.08 };
    const wingGeom = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeom.rotateX(-Math.PI / 2);
    wingGeom.translate(0, 0.1, 0);
    const wings = new THREE.Mesh(wingGeom, hullMat);
    wings.castShadow = true;
    wings.receiveShadow = true;
    this.mesh.add(wings);

    // Wing Neon Trims
    const leftWingTrimGeom = new THREE.BoxGeometry(0.15, 0.2, 3.8);
    const leftWingTrim = new THREE.Mesh(leftWingTrimGeom, accentMat);
    leftWingTrim.position.set(6.8, 0.15, 3.8);
    leftWingTrim.rotation.y = -0.32;
    const rightWingTrim = leftWingTrim.clone();
    rightWingTrim.position.x = -6.8;
    rightWingTrim.rotation.y = 0.32;
    this.mesh.add(leftWingTrim, rightWingTrim);

    // Elevons
    const elevonGeom = new THREE.BoxGeometry(2.4, 0.18, 0.9);
    this.leftElevon = new THREE.Mesh(elevonGeom, darkTrimMat);
    this.leftElevon.position.set(4.5, 0.15, 4.6);
    this.rightElevon = new THREE.Mesh(elevonGeom, darkTrimMat);
    this.rightElevon.position.set(-4.5, 0.15, 4.6);
    this.mesh.add(this.leftElevon, this.rightElevon);

    // Canards
    const canardGeom = new THREE.BoxGeometry(1.6, 0.12, 0.8);
    this.leftCanard = new THREE.Mesh(canardGeom, hullMat);
    this.leftCanard.position.set(1.9, 0.2, -4.2);
    this.rightCanard = new THREE.Mesh(canardGeom, hullMat);
    this.rightCanard.position.set(-1.9, 0.2, -4.2);
    this.mesh.add(this.leftCanard, this.rightCanard);

    // Tail Fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.4, 2.8);
    finShape.lineTo(1.8, 2.5);
    finShape.lineTo(2.4, 0);
    finShape.closePath();

    const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: false });
    finGeom.rotateY(-Math.PI / 2);

    const leftFin = new THREE.Mesh(finGeom, hullMat);
    leftFin.position.set(1.9, 0.4, 3.2);
    leftFin.rotation.z = -0.22;
    leftFin.castShadow = true;

    const rightFin = new THREE.Mesh(finGeom, hullMat);
    rightFin.position.set(-1.9, 0.4, 3.2);
    rightFin.rotation.z = 0.22;
    rightFin.castShadow = true;
    this.mesh.add(leftFin, rightFin);

    // Engines
    const nacelleGeom = new THREE.CylinderGeometry(0.75, 0.85, 5.5, 12);
    nacelleGeom.rotateX(Math.PI / 2);
    const leftNacelle = new THREE.Mesh(nacelleGeom, darkTrimMat);
    leftNacelle.position.set(1.2, 0.1, 4.0);
    const rightNacelle = new THREE.Mesh(nacelleGeom, darkTrimMat);
    rightNacelle.position.set(-1.2, 0.1, 4.0);
    this.mesh.add(leftNacelle, rightNacelle);

    // Plasma Discs
    const glowGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12);
    glowGeom.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff });
    const leftGlow = new THREE.Mesh(glowGeom, glowMat);
    leftGlow.position.set(1.2, 0.1, 6.7);
    const rightGlow = new THREE.Mesh(glowGeom, glowMat);
    rightGlow.position.set(-1.2, 0.1, 6.7);
    this.mesh.add(leftGlow, rightGlow);
    this.thrusterGlows.push(leftGlow, rightGlow);
  }

  createCockpitInterior() {
    this.cockpitPoint.position.set(0, 0.82, -1.1);
    this.mesh.add(this.cockpitPoint);

    // Futuristic Holographic Reticle Ring
    const hudFrameGeom = new THREE.RingGeometry(0.18, 0.2, 16);
    const hudMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    this.hudRing = new THREE.Mesh(hudFrameGeom, hudMat);
    this.hudRing.position.set(0, 0.82, -2.4);
    this.mesh.add(this.hudRing);

    // Flight Control Stick (Yoke)
    const stickGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.8 });
    this.controlStick = new THREE.Mesh(stickGeom, stickMat);
    this.controlStick.position.set(0, 0.45, -1.8);
    this.mesh.add(this.controlStick);
  }

  createShieldBubble() {
    const shieldGeom = new THREE.SphereGeometry(9.0, 24, 24);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);
  }

  createSonicBoomCone() {
    const coneGeom = new THREE.ConeGeometry(8.5, 6.0, 24, 1, true);
    coneGeom.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    this.sonicBoomCone = new THREE.Mesh(coneGeom, coneMat);
    this.sonicBoomCone.position.set(0, 0.2, 2.0);
    this.sonicBoomCone.visible = false;
    this.mesh.add(this.sonicBoomCone);
  }

  createParticleSystems() {
    const particleCount = 70;
    const pGeom = new THREE.SphereGeometry(0.35, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff, transparent: true, opacity: 0.8 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeom, pMat.clone());
      p.visible = false;
      this.scene.add(p);
      this.exhaustParticles.push({ mesh: p, life: 0, maxLife: 0.35, velocity: new THREE.Vector3() });
    }
  }

  activateShield(duration = 12) {
    this.shieldTime = duration;
    this.shieldMesh.visible = true;
    flightAudio.playCollectSound("plasma");
  }

  emitExhaustParticle(isLeft, isBoosting) {
    const pObj = this.exhaustParticles.find((p) => !p.mesh.visible);
    if (!pObj) return;

    const offset = new THREE.Vector3(isLeft ? 1.2 : -1.2, 0.1, 6.8);
    offset.applyQuaternion(this.mesh.quaternion);
    pObj.mesh.position.copy(this.mesh.position).add(offset);

    if (isBoosting) {
      pObj.mesh.material.color.setHex(0xff7700);
      pObj.mesh.scale.setScalar(1.8);
    } else {
      pObj.mesh.material.color.setHex(0x00d4ff);
      pObj.mesh.scale.setScalar(1.0);
    }

    const backDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    pObj.velocity.copy(backDir).multiplyScalar(45 + this.speed * 0.09);
    pObj.velocity.x += (Math.random() - 0.5) * 4;
    pObj.velocity.y += (Math.random() - 0.5) * 4;

    pObj.life = 0;
    pObj.maxLife = isBoosting ? 0.42 : 0.25;
    pObj.mesh.visible = true;
  }

  updatePhysics(delta, worldManager) {
    if (this.isCrashed) return;

    if (this.shieldTime > 0) {
      this.shieldTime -= delta;
      this.shieldMesh.visible = true;
      this.shieldMesh.rotation.y += delta * 2;
      this.shieldMesh.rotation.z += delta * 1.5;
      this.shieldMesh.material.opacity = 0.25 + Math.sin(Date.now() * 0.01) * 0.15;
    } else {
      this.shieldMesh.visible = false;
    }

    // 1. Throttle & Speed
    let targetSpd = this.throttle * this.cruiseSpeed;
    if (this.isBoosting && this.boostFuel > 0) {
      targetSpd = this.boostSpeed;
      this.boostFuel = Math.max(0, this.boostFuel - delta * 20);
    } else if (this.isBraking) {
      targetSpd = Math.max(0, targetSpd * 0.4);
    }

    const accelRate = this.isBoosting ? 4.2 : 1.8;
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpd, delta * accelRate);

    // Sonic Boom Trigger
    if (this.speed >= this.machSpeed && !this.sonicBoomTriggered) {
      this.sonicBoomTriggered = true;
      flightAudio.playSonicBoom();
      this.sonicBoomCone.visible = true;
      setTimeout(() => {
        this.sonicBoomCone.visible = false;
      }, 700);
      if (this.onStuntCallback) this.onStuntCallback("💥 ЗВУКОВОЙ БАРЬЕР (MACH 1+)", 600);
    } else if (this.speed < this.machSpeed - 50) {
      this.sonicBoomTriggered = false;
    }

    // 2. Control Inputs
    const controlEffectiveness = Math.min(1.0, this.speed / 260);
    this.pitchRate = THREE.MathUtils.lerp(this.pitchRate, this.pitchInput * 1.6 * controlEffectiveness, delta * 4);
    this.rollRate = THREE.MathUtils.lerp(this.rollRate, this.rollInput * 3.2 * controlEffectiveness, delta * 5);
    this.yawRate = THREE.MathUtils.lerp(this.yawRate, (this.yawInput * 0.9 - this.rollAngle * 0.4) * controlEffectiveness, delta * 3);

    // Animate stick inside cockpit
    if (this.controlStick) {
      this.controlStick.rotation.x = this.pitchInput * 0.35;
      this.controlStick.rotation.z = -this.rollInput * 0.35;
    }

    // Elevons
    if (this.leftElevon && this.rightElevon) {
      this.leftElevon.rotation.x = this.pitchInput * 0.4 + this.rollInput * 0.5;
      this.rightElevon.rotation.x = this.pitchInput * 0.4 - this.rollInput * 0.5;
    }
    if (this.leftCanard && this.rightCanard) {
      this.leftCanard.rotation.x = -this.pitchInput * 0.35;
      this.rightCanard.rotation.x = -this.pitchInput * 0.35;
    }

    // 3. Rotations & Attitude
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, this.pitchRate * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(forward, -this.rollRate * delta);
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -this.yawRate * delta);

    this.mesh.quaternion.multiplyQuaternions(yawQuat, this.mesh.quaternion);
    this.mesh.quaternion.multiplyQuaternions(pitchQuat, this.mesh.quaternion);
    this.mesh.quaternion.multiplyQuaternions(rollQuat, this.mesh.quaternion);

    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
    this.rollAngle = Math.asin(Math.max(-1, Math.min(1, -localRight.y)));
    this.pitchAngle = Math.asin(Math.max(-1, Math.min(1, forward.y)));

    // Calculate G-Force
    this.gForce = 1.0 + Math.abs(this.pitchRate) * (this.speed / 280) * 1.8;

    // 4. Movement
    const speedMs = (this.speed * 1000) / 3600;
    const moveStep = forward.clone().multiplyScalar(speedMs * delta);
    this.mesh.position.add(moveStep);

    this.distanceFlownMeters += this.mesh.position.distanceTo(this.lastPosition);
    this.lastPosition.copy(this.mesh.position);

    // 5. Stunt Recognition (Barrel Roll & Loop-the-Loop & Low Flyby)
    this.stuntCooldown = Math.max(0, this.stuntCooldown - delta);
    if (this.isAirborne && this.stuntCooldown === 0) {
      // Roll tracking
      this.accumulatedRoll += Math.abs(this.rollRate * delta);
      if (this.accumulatedRoll >= Math.PI * 1.9) {
        this.accumulatedRoll = 0;
        this.stuntCooldown = 2.0;
        flightAudio.playStuntFanfare();
        this.addBoost(25);
        if (this.onStuntCallback) this.onStuntCallback("🔄 ФИГУРА: БОЧКА В ВОЗДУХЕ!", 400);
      }

      // Pitch loop tracking
      this.accumulatedPitch += Math.abs(this.pitchRate * delta);
      if (this.accumulatedPitch >= Math.PI * 1.9) {
        this.accumulatedPitch = 0;
        this.stuntCooldown = 2.5;
        flightAudio.playStuntFanfare();
        this.addBoost(35);
        if (this.onStuntCallback) this.onStuntCallback("🔁 МЁРТВАЯ ПЕТЛЯ НЕСТЕРОВА!", 500);
      }

      // Low Altitude Flyby
      const groundY = worldManager.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
      if (this.mesh.position.y - groundY < 18 && this.speed > 550) {
        this.stuntCooldown = 3.5;
        flightAudio.playStuntFanfare();
        this.addBoost(20);
        if (this.onStuntCallback) this.onStuntCallback("⚡ БРЕЮЩИЙ ПОЛЁТ У ЗЕМЛИ!", 350);
      }
    }

    if (Math.abs(this.rollInput) < 0.1) this.accumulatedRoll = 0;
    if (Math.abs(this.pitchInput) < 0.1) this.accumulatedPitch = 0;

    // 6. Terrain & Building Collisions
    const groundHeight = worldManager.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
    const minAltitude = groundHeight + 1.4;
    const isBuildingHit = worldManager.checkBuildingCollision(this.mesh.position, 4.5);

    if (this.mesh.position.y <= minAltitude + 0.2 || isBuildingHit) {
      if (this.speed < this.takeoffSpeed && Math.abs(this.mesh.position.x) < 400 && Math.abs(this.mesh.position.z) < 700 && !isBuildingHit) {
        this.mesh.position.y = minAltitude;
        this.isAirborne = false;
        const euler = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, "YXZ");
        euler.z = THREE.MathUtils.lerp(euler.z, 0, delta * 8);
        euler.x = THREE.MathUtils.lerp(euler.x, 0, delta * 8);
        this.mesh.quaternion.setFromEuler(euler);
      } else {
        this.isAirborne = true;
      }

      if (this.isAirborne && (this.mesh.position.y < groundHeight + 0.8 || isBuildingHit)) {
        if (this.shieldTime > 0) {
          this.mesh.position.y += 35;
          flightAudio.playShieldDeflect();
          this.shieldTime = 0;
        } else {
          this.isCrashed = true;
        }
      }
    } else {
      this.isAirborne = true;
    }

    // 7. Exhaust & Thrusters
    const isBoosting = this.isBoosting && this.boostFuel > 0;
    const thrusterColor = isBoosting ? 0xff7700 : 0x00e1ff;
    for (const glow of this.thrusterGlows) {
      glow.material.color.setHex(thrusterColor);
      glow.scale.set(1.0 + this.throttle * 0.4, 1.0 + this.throttle * 0.4, 1.0 + this.throttle * 1.3);
    }

    if (this.throttle > 0.1 || isBoosting) {
      if (Math.random() < 0.8) this.emitExhaustParticle(true, isBoosting);
      if (Math.random() < 0.8) this.emitExhaustParticle(false, isBoosting);
    }

    for (const p of this.exhaustParticles) {
      if (!p.mesh.visible) continue;
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.material.opacity = (1 - p.life / p.maxLife) * 0.8;
      }
    }
  }

  addBoost(amount) {
    this.boostFuel = Math.min(100, this.boostFuel + amount);
  }

  reset() {
    this.position.set(0, 1.4, -450);
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.set(0, 0, 0, 1);
    this.speed = 0;
    this.throttle = 0;
    this.boostFuel = 100;
    this.shieldTime = 0;
    this.isBoosting = false;
    this.isBraking = false;
    this.isAirborne = false;
    this.isCrashed = false;
    this.pitchRate = 0;
    this.rollRate = 0;
    this.yawRate = 0;
    this.distanceFlownMeters = 0;
    this.accumulatedRoll = 0;
    this.accumulatedPitch = 0;
    this.sonicBoomTriggered = false;
    this.lastPosition.copy(this.position);
  }
}

// airplane.js - Supersonic Jet with Energy Shield, Aerodynamics, and Infinite Flight Tracking
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

    // Shield Mesh
    this.shieldMesh = null;
    this.shieldTime = 0; // Shield duration in seconds

    // Flight Physics
    this.position = new THREE.Vector3(0, 1.4, -450);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = 0;

    this.speed = 0; // km/h
    this.takeoffSpeed = 170;
    this.cruiseSpeed = 580;
    this.boostSpeed = 1450;

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

    this.distanceFlownMeters = 0;
    this.lastPosition = this.position.clone();

    this.createJetModel();
    this.createCockpitInterior();
    this.createShieldBubble();
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

    // Wing Neon Edge Trims
    const leftWingTrimGeom = new THREE.BoxGeometry(0.15, 0.2, 3.8);
    const leftWingTrim = new THREE.Mesh(leftWingTrimGeom, accentMat);
    leftWingTrim.position.set(6.8, 0.15, 3.8);
    leftWingTrim.rotation.y = -0.32;
    const rightWingTrim = leftWingTrim.clone();
    rightWingTrim.position.x = -6.8;
    rightWingTrim.rotation.y = 0.32;
    this.mesh.add(leftWingTrim, rightWingTrim);

    // Movable Elevons
    const elevonGeom = new THREE.BoxGeometry(2.4, 0.18, 0.9);
    this.leftElevon = new THREE.Mesh(elevonGeom, darkTrimMat);
    this.leftElevon.position.set(4.5, 0.15, 4.6);
    this.rightElevon = new THREE.Mesh(elevonGeom, darkTrimMat);
    this.rightElevon.position.set(-4.5, 0.15, 4.6);
    this.mesh.add(this.leftElevon, this.rightElevon);

    // Forward Canards
    const canardGeom = new THREE.BoxGeometry(1.6, 0.12, 0.8);
    this.leftCanard = new THREE.Mesh(canardGeom, hullMat);
    this.leftCanard.position.set(1.9, 0.2, -4.2);
    this.rightCanard = new THREE.Mesh(canardGeom, hullMat);
    this.rightCanard.position.set(-1.9, 0.2, -4.2);
    this.mesh.add(this.leftCanard, this.rightCanard);

    // Twin Tail Fins
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

    // Twin Engine Nacelles
    const nacelleGeom = new THREE.CylinderGeometry(0.75, 0.85, 5.5, 12);
    nacelleGeom.rotateX(Math.PI / 2);
    const leftNacelle = new THREE.Mesh(nacelleGeom, darkTrimMat);
    leftNacelle.position.set(1.2, 0.1, 4.0);
    const rightNacelle = new THREE.Mesh(nacelleGeom, darkTrimMat);
    rightNacelle.position.set(-1.2, 0.1, 4.0);
    this.mesh.add(leftNacelle, rightNacelle);

    // Glowing Thruster Discs
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

    const hudFrameGeom = new THREE.RingGeometry(0.18, 0.2, 16);
    const hudMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    this.hudRing = new THREE.Mesh(hudFrameGeom, hudMat);
    this.hudRing.position.set(0, 0.82, -2.4);
    this.mesh.add(this.hudRing);
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

    // Shield countdown & pulse
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

    const accelRate = this.isBoosting ? 4.0 : 1.8;
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpd, delta * accelRate);

    // 2. Control Inputs
    const controlEffectiveness = Math.min(1.0, this.speed / 260);
    this.pitchRate = THREE.MathUtils.lerp(this.pitchRate, this.pitchInput * 1.6 * controlEffectiveness, delta * 4);
    this.rollRate = THREE.MathUtils.lerp(this.rollRate, this.rollInput * 2.8 * controlEffectiveness, delta * 5);
    this.yawRate = THREE.MathUtils.lerp(this.yawRate, (this.yawInput * 0.9 - this.rollAngle * 0.4) * controlEffectiveness, delta * 3);

    // Elevons visual deflection
    if (this.leftElevon && this.rightElevon) {
      this.leftElevon.rotation.x = this.pitchInput * 0.4 + this.rollInput * 0.5;
      this.rightElevon.rotation.x = this.pitchInput * 0.4 - this.rollInput * 0.5;
    }
    if (this.leftCanard && this.rightCanard) {
      this.leftCanard.rotation.x = -this.pitchInput * 0.35;
      this.rightCanard.rotation.x = -this.pitchInput * 0.35;
    }

    // 3. Rotations
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

    // 4. Movement
    const speedMs = (this.speed * 1000) / 3600;
    const moveStep = forward.clone().multiplyScalar(speedMs * delta);
    this.mesh.position.add(moveStep);

    // Distance tracking
    this.distanceFlownMeters += this.mesh.position.distanceTo(this.lastPosition);
    this.lastPosition.copy(this.mesh.position);

    // 5. Terrain & Skyscraper Ground Collisions
    const groundHeight = worldManager.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
    const minAltitude = groundHeight + 1.4;

    if (this.mesh.position.y <= minAltitude + 0.2) {
      if (this.speed < this.takeoffSpeed && Math.abs(this.mesh.position.x) < 400 && Math.abs(this.mesh.position.z) < 700) {
        // Taxiing on runway
        this.mesh.position.y = minAltitude;
        this.isAirborne = false;
        const euler = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, "YXZ");
        euler.z = THREE.MathUtils.lerp(euler.z, 0, delta * 8);
        euler.x = THREE.MathUtils.lerp(euler.x, 0, delta * 8);
        this.mesh.quaternion.setFromEuler(euler);
      } else {
        this.isAirborne = true;
      }

      // Check crash or shield bounce
      if (this.isAirborne && this.mesh.position.y < groundHeight + 0.8) {
        if (this.shieldTime > 0) {
          // Shield absorbs collision and bounces jet up!
          this.mesh.position.y = groundHeight + 25;
          flightAudio.playShieldDeflect();
          this.shieldTime = 0; // Consume shield
        } else {
          this.isCrashed = true;
        }
      }
    } else {
      this.isAirborne = true;
    }

    // 6. Exhaust particles
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
    this.lastPosition.copy(this.position);
  }
}

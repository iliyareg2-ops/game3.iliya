// airplane.js - Futuristic Supersonic Jet 3D Model, Cockpit Interior, Particle Trails & Flight Aerodynamics
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Airplane {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.cockpitPoint = new THREE.Object3D(); // Internal camera mount

    // Movable flight control surfaces
    this.leftElevon = null;
    this.rightElevon = null;
    this.leftCanard = null;
    this.rightCanard = null;
    this.thrusterGlows = [];
    this.exhaustParticles = [];
    this.wingtipTrails = [];

    // Flight Physics State
    this.position = new THREE.Vector3(0, 1.4, -450); // Start position on runway
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = 0; // Pointing forward along +Z runway

    this.speed = 0; // in km/h
    this.targetSpeed = 0;
    this.minSpeed = 0;
    this.takeoffSpeed = 170;
    this.cruiseSpeed = 580;
    this.maxSpeed = 860;
    this.boostSpeed = 1350;

    this.throttle = 0; // 0 to 1
    this.boostFuel = 100; // 0 to 100%
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

    this.heading = 0; // Yaw angle in radians
    this.pitchAngle = 0;
    this.rollAngle = 0;

    this.gForce = 1.0;

    this.createJetModel();
    this.createCockpitInterior();
    this.createParticleSystems();
    this.scene.add(this.mesh);
  }

  createJetModel() {
    // High-tech Matte Carbon & Titanium Materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1a212b,
      metalness: 0.88,
      roughness: 0.22,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x0099dd,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      metalness: 0.9,
      roughness: 0.35,
    });

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0d2838,
      metalness: 0.95,
      roughness: 0.08,
      transparent: true,
      opacity: 0.65,
    });

    // 1. Sleek Fuselage
    const fuselageGeom = new THREE.ConeGeometry(1.8, 16, 8);
    fuselageGeom.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeom, hullMat);
    fuselage.scale.set(1.1, 0.65, 1.0);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    this.mesh.add(fuselage);

    // 2. Cockpit Canopy (Glass Bubble)
    const canopyGeom = new THREE.SphereGeometry(1.3, 16, 12);
    canopyGeom.scale(0.85, 0.7, 3.2);
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.65, -1.2);
    canopy.castShadow = true;
    this.mesh.add(canopy);

    // 3. Swept Delta Main Wings
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

    // 4. Movable Elevons (Ailerons & Elevators)
    const elevonGeom = new THREE.BoxGeometry(2.4, 0.18, 0.9);
    this.leftElevon = new THREE.Mesh(elevonGeom, darkTrimMat);
    this.leftElevon.position.set(4.5, 0.15, 4.6);
    this.rightElevon = new THREE.Mesh(elevonGeom, darkTrimMat);
    this.rightElevon.position.set(-4.5, 0.15, 4.6);
    this.mesh.add(this.leftElevon, this.rightElevon);

    // 5. Forward Canards (Pitch fins)
    const canardGeom = new THREE.BoxGeometry(1.6, 0.12, 0.8);
    this.leftCanard = new THREE.Mesh(canardGeom, hullMat);
    this.leftCanard.position.set(1.9, 0.2, -4.2);
    this.rightCanard = new THREE.Mesh(canardGeom, hullMat);
    this.rightCanard.position.set(-1.9, 0.2, -4.2);
    this.mesh.add(this.leftCanard, this.rightCanard);

    // 6. Twin Angled Tail Fins (Vertical Stabilizers)
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
    leftFin.rotation.z = -0.22; // Cant outward
    leftFin.castShadow = true;

    const rightFin = new THREE.Mesh(finGeom, hullMat);
    rightFin.position.set(-1.9, 0.4, 3.2);
    rightFin.rotation.z = 0.22;
    rightFin.castShadow = true;
    this.mesh.add(leftFin, rightFin);

    // Tail Fin Glowing Strips
    const tailStripeGeom = new THREE.BoxGeometry(0.1, 1.8, 0.15);
    const leftTailStripe = new THREE.Mesh(tailStripeGeom, accentMat);
    leftTailStripe.position.set(2.25, 1.8, 4.4);
    leftTailStripe.rotation.z = -0.22;
    const rightTailStripe = leftTailStripe.clone();
    rightTailStripe.position.x = -2.25;
    rightTailStripe.rotation.z = 0.22;
    this.mesh.add(leftTailStripe, rightTailStripe);

    // 7. Twin Jet Engine Nacelles & Glowing Plasma Nozzles
    const nacelleGeom = new THREE.CylinderGeometry(0.75, 0.85, 5.5, 12);
    nacelleGeom.rotateX(Math.PI / 2);

    const leftNacelle = new THREE.Mesh(nacelleGeom, darkTrimMat);
    leftNacelle.position.set(1.2, 0.1, 4.0);
    leftNacelle.castShadow = true;

    const rightNacelle = new THREE.Mesh(nacelleGeom, darkTrimMat);
    rightNacelle.position.set(-1.2, 0.1, 4.0);
    rightNacelle.castShadow = true;
    this.mesh.add(leftNacelle, rightNacelle);

    // Plasma Glowing Engine Discs
    const glowGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12);
    glowGeom.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00e1ff });

    const leftGlow = new THREE.Mesh(glowGeom, glowMat);
    leftGlow.position.set(1.2, 0.1, 6.7);
    const rightGlow = new THREE.Mesh(glowGeom, glowMat);
    rightGlow.position.set(-1.2, 0.1, 6.7);
    this.mesh.add(leftGlow, rightGlow);
    this.thrusterGlows.push(leftGlow, rightGlow);

    // Landing Gear Wheels (Visual only, for ground realism)
    const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    wheelGeom.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    this.frontWheel = new THREE.Mesh(wheelGeom, tireMat);
    this.frontWheel.position.set(0, -0.9, -4.5);
    this.leftMainWheel = new THREE.Mesh(wheelGeom, tireMat);
    this.leftMainWheel.position.set(1.8, -0.9, 1.8);
    this.rightMainWheel = new THREE.Mesh(wheelGeom, tireMat);
    this.rightMainWheel.position.set(-1.8, -0.9, 1.8);
    this.mesh.add(this.frontWheel, this.leftMainWheel, this.rightMainWheel);
  }

  createCockpitInterior() {
    // Mount camera position inside cockpit
    this.cockpitPoint.position.set(0, 0.82, -1.1);
    this.mesh.add(this.cockpitPoint);

    // Futuristic Holographic Glass HUD Display
    const hudFrameGeom = new THREE.RingGeometry(0.18, 0.2, 16);
    const hudMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.hudRing = new THREE.Mesh(hudFrameGeom, hudMat);
    this.hudRing.position.set(0, 0.82, -2.4);
    this.mesh.add(this.hudRing);

    // Dashboard Instrument Panel
    const dashGeom = new THREE.BoxGeometry(1.2, 0.35, 0.6);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.6 });
    const dash = new THREE.Mesh(dashGeom, dashMat);
    dash.position.set(0, 0.45, -2.2);
    dash.rotation.x = 0.35;
    this.mesh.add(dash);
  }

  createParticleSystems() {
    // Jet Flame & Smoke particles pool
    const particleCount = 60;
    const pGeom = new THREE.SphereGeometry(0.35, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0x00e1ff,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeom, pMat.clone());
      p.visible = false;
      this.scene.add(p);
      this.exhaustParticles.push({
        mesh: p,
        life: 0,
        maxLife: 0.35,
        velocity: new THREE.Vector3(),
      });
    }
  }

  emitExhaustParticle(isLeft, isBoosting) {
    const pObj = this.exhaustParticles.find((p) => !p.mesh.visible);
    if (!pObj) return;

    const offset = new THREE.Vector3(isLeft ? 1.2 : -1.2, 0.1, 6.8);
    offset.applyQuaternion(this.mesh.quaternion);
    pObj.mesh.position.copy(this.mesh.position).add(offset);

    // Particle color based on boost
    if (isBoosting) {
      pObj.mesh.material.color.setHex(0xff7700);
      pObj.mesh.scale.setScalar(1.6);
    } else {
      pObj.mesh.material.color.setHex(0x00d4ff);
      pObj.mesh.scale.setScalar(1.0);
    }

    // Velocity shoots backward
    const backDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    pObj.velocity.copy(backDir).multiplyScalar(40 + this.speed * 0.08);
    pObj.velocity.x += (Math.random() - 0.5) * 4;
    pObj.velocity.y += (Math.random() - 0.5) * 4;

    pObj.life = 0;
    pObj.maxLife = isBoosting ? 0.4 : 0.25;
    pObj.mesh.visible = true;
  }

  updatePhysics(delta, worldManager) {
    if (this.isCrashed) return;

    // 1. Throttle and Acceleration
    let targetSpd = this.throttle * this.cruiseSpeed;
    if (this.isBoosting && this.boostFuel > 0) {
      targetSpd = this.boostSpeed;
      this.boostFuel = Math.max(0, this.boostFuel - delta * 22);
    } else if (this.isBraking) {
      targetSpd = Math.max(0, targetSpd * 0.4);
    }

    // Smooth speed lerp
    const accelRate = this.isBoosting ? 3.8 : 1.6;
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpd, delta * accelRate);

    // 2. Aerodynamic Control Surface inputs
    const controlEffectiveness = Math.min(1.0, this.speed / 280);

    // Pitch (W / S)
    this.pitchRate = THREE.MathUtils.lerp(this.pitchRate, this.pitchInput * 1.6 * controlEffectiveness, delta * 4);
    // Roll (A / D)
    this.rollRate = THREE.MathUtils.lerp(this.rollRate, this.rollInput * 2.8 * controlEffectiveness, delta * 5);
    // Yaw (Q / E or auto rudder on roll)
    this.yawRate = THREE.MathUtils.lerp(this.yawRate, (this.yawInput * 0.9 - this.rollAngle * 0.4) * controlEffectiveness, delta * 3);

    // Elevon visuals deflection
    if (this.leftElevon && this.rightElevon) {
      this.leftElevon.rotation.x = this.pitchInput * 0.4 + this.rollInput * 0.5;
      this.rightElevon.rotation.x = this.pitchInput * 0.4 - this.rollInput * 0.5;
    }
    if (this.leftCanard && this.rightCanard) {
      this.leftCanard.rotation.x = -this.pitchInput * 0.35;
      this.rightCanard.rotation.x = -this.pitchInput * 0.35;
    }

    // 3. Attitude & Quaternion Integration
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);

    // Apply rotations around local axes
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, this.pitchRate * delta);
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(forward, -this.rollRate * delta);
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -this.yawRate * delta);

    this.mesh.quaternion.multiplyQuaternions(yawQuat, this.mesh.quaternion);
    this.mesh.quaternion.multiplyQuaternions(pitchQuat, this.mesh.quaternion);
    this.mesh.quaternion.multiplyQuaternions(rollQuat, this.mesh.quaternion);

    // Calculate current roll angle for aerodynamics & UI
    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
    this.rollAngle = Math.asin(Math.max(-1, Math.min(1, -localRight.y)));

    // 4. Translation / Velocity
    const speedMs = (this.speed * 1000) / 3600; // convert km/h to m/s
    const moveStep = forward.clone().multiplyScalar(speedMs * delta);
    this.mesh.position.add(moveStep);

    // 5. Ground collision & Runway Takeoff
    const groundHeight = worldManager.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
    const minAltitude = groundHeight + 1.4;

    if (this.mesh.position.y <= minAltitude + 0.2) {
      if (this.speed < this.takeoffSpeed) {
        // Ground taxiing physics
        this.mesh.position.y = minAltitude;
        this.isAirborne = false;

        // Level wings when on ground
        const euler = new THREE.Euler().setFromQuaternion(this.mesh.quaternion, "YXZ");
        euler.z = THREE.MathUtils.lerp(euler.z, 0, delta * 8);
        euler.x = THREE.MathUtils.lerp(euler.x, 0, delta * 8);
        this.mesh.quaternion.setFromEuler(euler);
      } else {
        this.isAirborne = true;
      }

      // Check crash into mountain slope
      if (this.isAirborne && this.mesh.position.y < groundHeight + 0.6) {
        this.isCrashed = true;
      }
    } else {
      this.isAirborne = true;
    }

    // 6. Engine Exhaust Visuals
    const isBoosting = this.isBoosting && this.boostFuel > 0;
    const thrusterColor = isBoosting ? 0xff7700 : 0x00e1ff;
    for (const glow of this.thrusterGlows) {
      glow.material.color.setHex(thrusterColor);
      glow.scale.set(1.0 + this.throttle * 0.4, 1.0 + this.throttle * 0.4, 1.0 + this.throttle * 1.2);
    }

    if (this.throttle > 0.1 || isBoosting) {
      if (Math.random() < 0.8) this.emitExhaustParticle(true, isBoosting);
      if (Math.random() < 0.8) this.emitExhaustParticle(false, isBoosting);
    }

    // Update active exhaust particles
    for (const p of this.exhaustParticles) {
      if (!p.mesh.visible) continue;
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.velocity, delta);
        const progress = p.life / p.maxLife;
        p.mesh.material.opacity = (1 - progress) * 0.8;
        p.mesh.scale.multiplyScalar(1.03);
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
    this.isBoosting = false;
    this.isBraking = false;
    this.isAirborne = false;
    this.isCrashed = false;
    this.pitchRate = 0;
    this.rollRate = 0;
    this.yawRate = 0;
  }
}

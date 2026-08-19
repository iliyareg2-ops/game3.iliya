// car.js - 3D Supercars, Vibrant Automotive Paint Shader, Dynamic Headlights & Neon Underglow
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CyberCar {
  constructor(scene, carType = 0) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.carType = carType; // 0: Apex GT, 1: Phantom Drift, 2: Hyperion X

    // Customization state
    this.bodyColor = 0xe11d48; // Candy Red
    this.underglowColor = 0x00f0ff; // Neon Cyan
    this.carMaterials = [];

    // Real Dynamic Lights attached to car
    this.underglowLight = null;
    this.underglowMesh = null;
    this.headlightLeft = null;
    this.headlightRight = null;
    this.taillightLeft = null;
    this.taillightRight = null;

    // Wheels & Mechanical Parts
    this.wheels = [];
    this.frontLeftWheelGroup = new THREE.Group();
    this.frontRightWheelGroup = new THREE.Group();
    this.rearLeftWheelGroup = new THREE.Group();
    this.rearRightWheelGroup = new THREE.Group();
    this.exhaustTips = [];
    this.flameCones = [];

    // Particle Systems (Tire Smoke & Sparks)
    this.smokeParticles = [];

    // Physics Dynamics
    this.position = new THREE.Vector3(0, 0.45, 0);
    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.maxSpeed = 280;
    this.maxReverseSpeed = 60;
    this.nitroMaxSpeed = 380;
    this.acceleration = 125;
    this.braking = 240;
    this.turnSpeed = 2.5;

    this.throttleInput = 0;
    this.steerInput = 0;
    this.handbrake = false;
    this.nitroActive = false;
    this.nitroFuel = 100;

    this.steerAngle = 0;
    this.rpm = 1000;
    this.gear = 1;

    // Drift Dynamics
    this.driftAngle = 0;
    this.isDrifting = false;
    this.driftMultiplier = 1.0;
    this.currentDriftScore = 0;
    this.totalScore = 0;

    this.buildCarModel();
    this.createCarLights();
    this.createExhaustFlames();
    this.createSmokeParticles();
    this.scene.add(this.mesh);
  }

  buildCarModel() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }
    this.wheels = [];
    this.exhaustTips = [];
    this.flameCones = [];
    this.carMaterials = [];

    // Vibrant Automotive Clearcoat Paint Shader (Never turns pitch black!)
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: this.bodyColor,
      metalness: 0.35,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      emissive: this.bodyColor,
      emissiveIntensity: 0.18,
    });
    this.carMaterials.push(this.bodyMat);

    this.carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1e2229,
      metalness: 0.6,
      roughness: 0.35,
    });

    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x11283d,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.75,
    });

    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1,
    });

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x222226,
      roughness: 0.85,
    });

    this.rimMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x334155,
      emissiveIntensity: 0.2,
    });

    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });

    if (this.carType === 0) {
      this._buildApexGT();
    } else if (this.carType === 1) {
      this._buildPhantomDrifter();
    } else {
      this._buildHyperionX();
    }

    this._buildWheels();
    this.createCarLights();
  }

  _buildApexGT() {
    // Main Chassis
    const chassisGeom = new THREE.BoxGeometry(4.4, 0.75, 9.4);
    const chassis = new THREE.Mesh(chassisGeom, this.bodyMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    // Cabin / Roof
    const cabinGeom = new THREE.BoxGeometry(3.6, 0.75, 4.6);
    const cabin = new THREE.Mesh(cabinGeom, this.glassMat);
    cabin.position.set(0, 1.15, -0.4);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // Roof Top
    const roofGeom = new THREE.BoxGeometry(3.5, 0.08, 3.6);
    const roof = new THREE.Mesh(roofGeom, this.carbonMat);
    roof.position.set(0, 1.55, -0.4);
    this.mesh.add(roof);

    // Front Hood & Splitter
    const hoodGeom = new THREE.BoxGeometry(4.2, 0.35, 3.2);
    const hood = new THREE.Mesh(hoodGeom, this.bodyMat);
    hood.position.set(0, 0.68, 2.6);
    this.mesh.add(hood);

    const splitterGeom = new THREE.BoxGeometry(4.6, 0.08, 0.8);
    const splitter = new THREE.Mesh(splitterGeom, this.carbonMat);
    splitter.position.set(0, 0.22, 4.8);
    this.mesh.add(splitter);

    // Rear Spoiler
    const wingGeom = new THREE.BoxGeometry(4.4, 0.08, 0.9);
    const wing = new THREE.Mesh(wingGeom, this.carbonMat);
    wing.position.set(0, 1.35, -4.3);
    const stand1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.2), this.carbonMat);
    stand1.position.set(1.4, 1.1, -4.3);
    const stand2 = stand1.clone();
    stand2.position.x = -1.4;
    this.mesh.add(wing, stand1, stand2);

    // Lights
    const hLight1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.15), this.headlightMat);
    hLight1.position.set(1.6, 0.65, 4.71);
    const hLight2 = hLight1.clone();
    hLight2.position.x = -1.6;

    const tLight1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.15), this.taillightMat);
    tLight1.position.set(1.4, 0.65, -4.71);
    const tLight2 = tLight1.clone();
    tLight2.position.x = -1.4;

    this.mesh.add(hLight1, hLight2, tLight1, tLight2);

    // Exhausts
    this.exhaustTips.push(new THREE.Vector3(1.1, 0.35, -4.75), new THREE.Vector3(-1.1, 0.35, -4.75));
  }

  _buildPhantomDrifter() {
    // Widebody drift machine
    const chassisGeom = new THREE.BoxGeometry(4.8, 0.72, 9.6);
    const chassis = new THREE.Mesh(chassisGeom, this.bodyMat);
    chassis.position.y = 0.48;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    // Widebody Fender Flares
    const flareGeom = new THREE.BoxGeometry(5.2, 0.5, 2.2);
    const frontFlares = new THREE.Mesh(flareGeom, this.carbonMat);
    frontFlares.position.set(0, 0.55, 2.7);
    const rearFlares = new THREE.Mesh(flareGeom, this.carbonMat);
    rearFlares.position.set(0, 0.55, -2.7);
    this.mesh.add(frontFlares, rearFlares);

    // Cabin
    const cabinGeom = new THREE.BoxGeometry(3.6, 0.72, 4.2);
    const cabin = new THREE.Mesh(cabinGeom, this.glassMat);
    cabin.position.set(0, 1.1, -0.6);
    this.mesh.add(cabin);

    // Massive GT Wing
    const wingGeom = new THREE.BoxGeometry(5.2, 0.1, 1.2);
    const wing = new THREE.Mesh(wingGeom, this.carbonMat);
    wing.position.set(0, 1.65, -4.5);
    const stand1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9), this.chromeMat);
    stand1.position.set(1.5, 1.25, -4.5);
    const stand2 = stand1.clone();
    stand2.position.x = -1.5;
    this.mesh.add(wing, stand1, stand2);

    // Lights
    const hLight1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.15), this.headlightMat);
    hLight1.position.set(1.7, 0.65, 4.81);
    const hLight2 = hLight1.clone();
    hLight2.position.x = -1.7;

    const tLight1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.15), this.taillightMat);
    tLight1.position.set(1.5, 0.65, -4.81);
    const tLight2 = tLight1.clone();
    tLight2.position.x = -1.5;

    this.mesh.add(hLight1, hLight2, tLight1, tLight2);

    // Exhausts
    this.exhaustTips.push(new THREE.Vector3(0.8, 0.32, -4.85), new THREE.Vector3(-0.8, 0.32, -4.85));
  }

  _buildHyperionX() {
    // Supersonic Futuristic Hypercar
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.2, -4.8);
    bodyShape.lineTo(2.2, -4.8);
    bodyShape.lineTo(2.3, 2.0);
    bodyShape.lineTo(1.4, 4.8);
    bodyShape.lineTo(-1.4, 4.8);
    bodyShape.lineTo(-2.3, 2.0);
    bodyShape.closePath();

    const extrudeSettings = { depth: 0.7, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12 };
    const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    bodyGeom.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, this.bodyMat);
    body.position.y = 0.2;
    body.castShadow = true;
    this.mesh.add(body);

    // Jet Canopy
    const canopyGeom = new THREE.SphereGeometry(1.6, 16, 12);
    canopyGeom.scale(1.0, 0.55, 2.4);
    const canopy = new THREE.Mesh(canopyGeom, this.glassMat);
    canopy.position.set(0, 0.85, -0.4);
    this.mesh.add(canopy);

    // Central Aero Fin
    const finGeom = new THREE.BoxGeometry(0.1, 0.8, 2.4);
    const fin = new THREE.Mesh(finGeom, this.carbonMat);
    fin.position.set(0, 1.15, -3.2);
    this.mesh.add(fin);

    // Dual Jet Thruster Exhausts
    const exhaustGeom = new THREE.CylinderGeometry(0.35, 0.4, 0.8, 12);
    exhaustGeom.rotateX(Math.PI / 2);
    const ex1 = new THREE.Mesh(exhaustGeom, this.chromeMat);
    ex1.position.set(0.9, 0.45, -4.8);
    const ex2 = ex1.clone();
    ex2.position.x = -0.9;
    this.mesh.add(ex1, ex2);

    // Futuristic Light Strip
    const hStrip = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.1), this.headlightMat);
    hStrip.position.set(0, 0.65, 4.8);
    const tStrip = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.15, 0.1), this.taillightMat);
    tStrip.position.set(0, 0.65, -4.8);
    this.mesh.add(hStrip, tStrip);

    this.exhaustTips.push(new THREE.Vector3(0.9, 0.45, -5.1), new THREE.Vector3(-0.9, 0.45, -5.1));
  }

  _buildWheels() {
    const wheelRadius = 0.52;
    const wheelWidth = 0.42;

    const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    tireGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth + 0.02, 12);
    rimGeom.rotateZ(Math.PI / 2);

    const makeWheel = () => {
      const g = new THREE.Group();
      const tire = new THREE.Mesh(tireGeom, this.tireMat);
      const rim = new THREE.Mesh(rimGeom, this.rimMat);
      tire.castShadow = true;
      g.add(tire, rim);
      return g;
    };

    this.wheelFL = makeWheel();
    this.wheelFR = makeWheel();
    this.wheelRL = makeWheel();
    this.wheelRR = makeWheel();

    const trackWidth = this.carType === 1 ? 2.3 : 2.1;
    const wheelBase = 2.8;

    this.frontLeftWheelGroup.position.set(trackWidth, 0.52, wheelBase);
    this.frontRightWheelGroup.position.set(-trackWidth, 0.52, wheelBase);
    this.rearLeftWheelGroup.position.set(trackWidth, 0.52, -wheelBase);
    this.rearRightWheelGroup.position.set(-trackWidth, 0.52, -wheelBase);

    this.frontLeftWheelGroup.add(this.wheelFL);
    this.frontRightWheelGroup.add(this.wheelFR);
    this.rearLeftWheelGroup.add(this.wheelRL);
    this.rearRightWheelGroup.add(this.wheelRR);

    this.mesh.add(
      this.frontLeftWheelGroup,
      this.frontRightWheelGroup,
      this.rearLeftWheelGroup,
      this.rearRightWheelGroup
    );
  }

  createCarLights() {
    // 1. Dynamic Underglow Light (Physically illuminates ground and wheels)
    this.underglowLight = new THREE.PointLight(this.underglowColor, 3.8, 14);
    this.underglowLight.position.set(0, 0.35, 0);
    this.mesh.add(this.underglowLight);

    // Underglow Neon Glow Plane on the ground (Elevated at y=0.22 so it NEVER gets occluded by asphalt)
    const planeGeom = new THREE.PlaneGeometry(5.2, 9.8);
    planeGeom.rotateX(-Math.PI / 2);
    this.underglowMat = new THREE.MeshBasicMaterial({
      color: this.underglowColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.underglowMesh = new THREE.Mesh(planeGeom, this.underglowMat);
    this.underglowMesh.position.y = 0.22;
    this.mesh.add(this.underglowMesh);

    // 2. Front Headlight Beams (Projecting bright cones onto the asphalt)
    this.headlightLeft = new THREE.SpotLight(0xeeffff, 4.5, 60, Math.PI / 5, 0.4);
    this.headlightLeft.position.set(1.5, 0.7, 4.5);
    this.headlightLeft.target.position.set(1.5, 0.1, 28);

    this.headlightRight = new THREE.SpotLight(0xeeffff, 4.5, 60, Math.PI / 5, 0.4);
    this.headlightRight.position.set(-1.5, 0.7, 4.5);
    this.headlightRight.target.position.set(-1.5, 0.1, 28);

    this.mesh.add(this.headlightLeft, this.headlightLeft.target, this.headlightRight, this.headlightRight.target);

    // 3. Taillight Red Glow
    this.tailPointLight = new THREE.PointLight(0xff0022, 2.0, 8);
    this.tailPointLight.position.set(0, 0.7, -4.8);
    this.mesh.add(this.tailPointLight);
  }

  createExhaustFlames() {
    const flameGeom = new THREE.ConeGeometry(0.28, 1.6, 10);
    flameGeom.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });

    this.exhaustTips.forEach((pos) => {
      const flame = new THREE.Mesh(flameGeom, flameMat.clone());
      flame.position.copy(pos).add(new THREE.Vector3(0, 0, -0.8));
      flame.visible = false;
      this.mesh.add(flame);
      this.flameCones.push(flame);
    });
  }

  createSmokeParticles() {
    const pGeom = new THREE.SphereGeometry(0.35, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d8, transparent: true, opacity: 0.55 });

    for (let i = 0; i < 70; i++) {
      const mesh = new THREE.Mesh(pGeom, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokeParticles.push({
        mesh,
        life: 0,
        maxLife: 0.6,
        velocity: new THREE.Vector3(),
      });
    }
  }

  emitTireSmoke(isLeft) {
    const pObj = this.smokeParticles.find((p) => !p.mesh.visible);
    if (!pObj) return;

    const trackWidth = this.carType === 1 ? 2.3 : 2.1;
    const offset = new THREE.Vector3(isLeft ? trackWidth : -trackWidth, 0.3, -2.8);
    offset.applyQuaternion(this.mesh.quaternion);
    pObj.mesh.position.copy(this.mesh.position).add(offset);

    pObj.velocity.set(
      (Math.random() - 0.5) * 4,
      1.5 + Math.random() * 2,
      (Math.random() - 0.5) * 4
    );

    pObj.life = 0;
    pObj.maxLife = 0.5 + Math.random() * 0.3;
    pObj.mesh.scale.setScalar(1.0 + Math.random() * 0.8);
    pObj.mesh.visible = true;
  }

  triggerBackfire() {
    cyberAudio.playBackfire();
    this.flameCones.forEach((flame) => {
      flame.visible = true;
      flame.scale.set(1.2, 1.2, 1.8);
      flame.material.color.setHex(this.nitroActive ? 0x00f0ff : 0xff7700);
      setTimeout(() => {
        flame.visible = false;
      }, 140);
    });
  }

  setBodyColor(hex) {
    this.bodyColor = hex;
    if (this.bodyMat) {
      this.bodyMat.color.setHex(hex);
      this.bodyMat.emissive.setHex(hex);
      this.bodyMat.emissiveIntensity = 0.18;
    }
  }

  setUnderglowColor(hex) {
    this.underglowColor = hex;
    if (this.underglowMat) this.underglowMat.color.setHex(hex);
    if (this.underglowLight) this.underglowLight.color.setHex(hex);
  }

  setCarType(typeIdx) {
    this.carType = typeIdx;
    this.buildCarModel();
    this.createExhaustFlames();
  }

  updatePhysics(delta, trackManager) {
    let topSpd = this.nitroActive && this.nitroFuel > 0 ? this.nitroMaxSpeed : this.maxSpeed;
    let accel = this.acceleration;

    if (this.nitroActive && this.nitroFuel > 0) {
      accel *= 2.2;
      this.nitroFuel = Math.max(0, this.nitroFuel - delta * 25);
      this.flameCones.forEach((f) => (f.visible = true));
    } else {
      if (!this.nitroActive) {
        this.flameCones.forEach((f) => (f.visible = false));
      }
    }

    if (this.throttleInput > 0) {
      this.speed = Math.min(topSpd, this.speed + accel * this.throttleInput * delta);
    } else if (this.throttleInput < 0) {
      if (this.speed > 5) {
        this.speed = Math.max(0, this.speed - this.braking * delta);
      } else {
        this.speed = Math.max(-this.maxReverseSpeed, this.speed - this.acceleration * 0.6 * delta);
      }
    } else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - delta * 35);
      if (this.speed < 0) this.speed = Math.min(0, this.speed + delta * 35);
    }

    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, this.steerInput * 0.55, delta * 8);
    this.frontLeftWheelGroup.rotation.y = this.steerAngle;
    this.frontRightWheelGroup.rotation.y = this.steerAngle;

    const wheelRot = (this.speed * delta * 4) / 0.52;
    this.wheelFL.rotation.x += wheelRot;
    this.wheelFR.rotation.x += wheelRot;
    this.wheelRL.rotation.x += wheelRot;
    this.wheelRR.rotation.x += wheelRot;

    if (this.handbrake && Math.abs(this.speed) > 35) {
      this.isDrifting = true;
      this.speed = Math.max(0, this.speed - delta * 50);
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, -this.steerInput * 0.75, delta * 6);
    } else if (Math.abs(this.steerInput) > 0.4 && Math.abs(this.speed) > 95) {
      this.isDrifting = true;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, -this.steerInput * 0.48, delta * 4);
    } else {
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, delta * 5);
      if (Math.abs(this.driftAngle) < 0.08) {
        if (this.isDrifting && this.currentDriftScore > 0) {
          this.totalScore += Math.round(this.currentDriftScore);
          cyberAudio.playScoreChime();
          this.currentDriftScore = 0;
          this.driftMultiplier = 1.0;
        }
        this.isDrifting = false;
      }
    }

    if (this.isDrifting && Math.abs(this.speed) > 40) {
      const angleWeight = Math.abs(this.driftAngle) * 2.2;
      this.driftMultiplier = Math.min(8.0, this.driftMultiplier + delta * 0.8);
      const pointsDelta = this.speed * angleWeight * this.driftMultiplier * delta * 12;
      this.currentDriftScore += pointsDelta;
      this.nitroFuel = Math.min(100, this.nitroFuel + delta * 8);

      if (Math.random() < 0.9) this.emitTireSmoke(true);
      if (Math.random() < 0.9) this.emitTireSmoke(false);
    }

    const effectiveSteer = this.steerInput * (this.isDrifting ? 1.4 : 1.0);
    this.heading -= effectiveSteer * this.turnSpeed * (this.speed / this.maxSpeed) * delta;
    this.mesh.rotation.y = this.heading + this.driftAngle;

    const speedMs = (this.speed * 1000) / 3600;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    this.mesh.position.addScaledVector(forward, speedMs * delta);

    if (trackManager) {
      trackManager.handleCarTrackCollision(this);
    }

    this.rpm = 800 + (Math.abs(this.speed) % 55) * 140 + (this.throttleInput > 0 ? 1200 : 0);
    const rpmRatio = Math.min(1.0, (this.rpm - 800) / 7500);
    const driftRatio = Math.abs(this.driftAngle);
    cyberAudio.update(rpmRatio, this.speed, driftRatio, this.nitroActive, false);

    for (const p of this.smokeParticles) {
      if (!p.mesh.visible) continue;
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.scale.multiplyScalar(1.04);
        p.mesh.material.opacity = (1 - p.life / p.maxLife) * 0.55;
      }
    }
  }

  reset() {
    this.position.set(0, 0.45, 0);
    this.mesh.position.copy(this.position);
    this.heading = 0;
    this.speed = 0;
    this.driftAngle = 0;
    this.isDrifting = false;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.nitroFuel = 100;
  }
}

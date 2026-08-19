// car.js - Gold-Standard Arcade Racing & Drift Physics with 100% Synced Steering & Smooth Progressive Turns
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CyberCar {
  constructor(scene, carType = 0) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.bodySubGroup = new THREE.Group();
    this.mesh.add(this.bodySubGroup);

    this.carType = carType; // 0: Apex GT, 1: Phantom Drift, 2: Hyperion X

    // Customization
    this.bodyColor = 0xe11d48;
    this.underglowColor = 0x00f0ff;
    this.carMaterials = [];

    // Wheels & Parts
    this.wheels = [];
    this.frontLeftWheelGroup = new THREE.Group();
    this.frontRightWheelGroup = new THREE.Group();
    this.rearLeftWheelGroup = new THREE.Group();
    this.rearRightWheelGroup = new THREE.Group();
    this.exhaustTips = [];
    this.flameCones = [];

    // Particles
    this.smokeParticles = [];
    this.sparkParticles = [];

    // ==========================================
    // 🏎️ FAST, RESPONSIVE ARCADE DRIVING STATS
    // ==========================================
    this.position = new THREE.Vector3(0, 0.12, 0);
    this.heading = 0; // World heading angle (radians)
    this.speed = 0; // km/h (positive = forward, negative = reverse)

    this.maxSpeed = 265; // km/h
    this.nitroMaxSpeed = 360; // km/h
    this.maxReverseSpeed = -70; // km/h
    this.accelRate = 140; // km/h per second (0-100 in ~2.2s!)
    this.nitroAccelRate = 270; // km/h per second
    this.brakeRate = 220; // km/h per second
    this.coastDecelRate = 45; // Natural drag
    this.baseTurnSpeed = 2.35;

    this.throttleInput = 0; // -1 (brake/rev) to +1 (gas)
    this.steerInput = 0; // -1 (Left, A/←) to +1 (Right, D/→)
    this.handbrake = false;
    this.nitroActive = false;
    this.nitroFuel = 100;

    this.steerAngle = 0;
    this.driftAngle = 0;
    this.isDrifting = false;
    this.driftMultiplier = 1.0;
    this.currentDriftScore = 0;
    this.totalScore = 0;

    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.rpm = 1000;
    this.gear = 1;

    this.buildCarModel();
    this.createCarLights();
    this.createExhaustFlames();
    this.createSmokeParticles();
    this.createSparkParticles();
    this.scene.add(this.mesh);
  }

  buildCarModel() {
    while (this.bodySubGroup.children.length > 0) {
      this.bodySubGroup.remove(this.bodySubGroup.children[0]);
    }
    this.wheels = [];
    this.exhaustTips = [];
    this.flameCones = [];
    this.carMaterials = [];

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: this.bodyColor,
      metalness: 0.35,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      emissive: this.bodyColor,
      emissiveIntensity: 0.22,
    });
    this.carMaterials.push(this.bodyMat);

    this.carbonMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      metalness: 0.65,
      roughness: 0.35,
    });

    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c2e,
      metalness: 0.95,
      roughness: 0.05,
      transparent: true,
      opacity: 0.72,
    });

    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.95,
      roughness: 0.08,
    });

    this.titaniumTipMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.9,
      roughness: 0.15,
    });

    this.caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.7,
      roughness: 0.2,
    });

    this.discMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.25,
    });

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x1c1d22,
      roughness: 0.85,
    });

    this.rimMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.92,
      roughness: 0.18,
      emissive: 0x1e293b,
      emissiveIntensity: 0.2,
    });

    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.haloRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    if (this.carType === 0) {
      this._buildApexGT();
    } else if (this.carType === 1) {
      this._buildPhantomDrifter();
    } else {
      this._buildHyperionX();
    }

    this._buildInterior();
    this._buildWheels();
    this.createCarLights();
  }

  _buildApexGT() {
    const chassisGeom = new THREE.BoxGeometry(4.4, 0.7, 9.4);
    const chassis = new THREE.Mesh(chassisGeom, this.bodyMat);
    chassis.position.y = 0.58;
    chassis.castShadow = true;
    this.bodySubGroup.add(chassis);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.45, 1.2), this.carbonMat);
    bumper.position.set(0, 0.42, 4.4);
    this.bodySubGroup.add(bumper);

    const intercooler = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.2), this.chromeMat);
    intercooler.position.set(0, 0.38, 4.95);
    this.bodySubGroup.add(intercooler);

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.2), this.carbonMat);
    splitter.position.set(0, 0.24, 4.6);
    this.bodySubGroup.add(splitter);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.32, 3.4), this.bodyMat);
    hood.position.set(0, 0.78, 2.6);
    this.bodySubGroup.add(hood);

    const leftMirror = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.35), this.carbonMat);
    leftMirror.position.set(2.35, 1.12, 0.9);
    const rightMirror = leftMirror.clone();
    rightMirror.position.x = -2.35;
    this.bodySubGroup.add(leftMirror, rightMirror);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.75, 4.6), this.glassMat);
    cabin.position.set(0, 1.22, -0.4);
    cabin.castShadow = true;
    this.bodySubGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.08, 3.5), this.carbonMat);
    roof.position.set(0, 1.62, -0.4);
    this.bodySubGroup.add(roof);

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 1.0), this.carbonMat);
    diffuser.position.set(0, 0.38, -4.5);
    this.bodySubGroup.add(diffuser);

    const tipGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 12);
    tipGeom.rotateX(Math.PI / 2);
    const tipPositions = [
      new THREE.Vector3(1.3, 0.38, -4.85),
      new THREE.Vector3(0.9, 0.38, -4.85),
      new THREE.Vector3(-0.9, 0.38, -4.85),
      new THREE.Vector3(-1.3, 0.38, -4.85),
    ];
    tipPositions.forEach((pos) => {
      const tip = new THREE.Mesh(tipGeom, this.titaniumTipMat);
      tip.position.copy(pos);
      this.bodySubGroup.add(tip);
      this.exhaustTips.push(pos);
    });

    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 1.0), this.carbonMat);
    wing.position.set(0, 1.52, -4.3);
    const stand1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.2), this.carbonMat);
    stand1.position.set(1.4, 1.22, -4.3);
    const stand2 = stand1.clone();
    stand2.position.x = -1.4;
    this.bodySubGroup.add(wing, stand1, stand2);

    const haloGeom = new THREE.TorusGeometry(0.24, 0.04, 8, 16);
    const leftHalo = new THREE.Mesh(haloGeom, this.haloRingMat);
    leftHalo.position.set(1.6, 0.74, 4.75);
    const rightHalo = leftHalo.clone();
    rightHalo.position.x = -1.6;

    const bulbGeom = new THREE.SphereGeometry(0.14, 8, 8);
    const leftBulb = new THREE.Mesh(bulbGeom, this.headlightMat);
    leftBulb.position.set(1.6, 0.74, 4.72);
    const rightBulb = leftBulb.clone();
    rightBulb.position.x = -1.6;

    this.bodySubGroup.add(leftHalo, rightHalo, leftBulb, rightBulb);

    const tLight = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 0.1), this.taillightMat);
    tLight.position.set(0, 0.74, -4.72);
    this.bodySubGroup.add(tLight);
  }

  _buildPhantomDrifter() {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.72, 9.6), this.bodyMat);
    chassis.position.y = 0.56;
    chassis.castShadow = true;
    this.bodySubGroup.add(chassis);

    const frontFlares = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.55, 2.4), this.carbonMat);
    frontFlares.position.set(0, 0.64, 2.7);
    const rFlares = frontFlares.clone();
    rFlares.position.z = -2.7;
    this.bodySubGroup.add(frontFlares, rFlares);

    const intercooler = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 0.2), this.chromeMat);
    intercooler.position.set(0, 0.38, 4.95);
    this.bodySubGroup.add(intercooler);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 1.3), this.carbonMat);
    wing.position.set(0, 1.82, -4.5);
    const stand1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0), this.chromeMat);
    stand1.position.set(1.6, 1.32, -4.5);
    const stand2 = stand1.clone();
    stand2.position.x = -1.6;
    this.bodySubGroup.add(wing, stand1, stand2);

    const tipGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.7, 12);
    tipGeom.rotateX(Math.PI / 2);
    const tip1 = new THREE.Mesh(tipGeom, this.titaniumTipMat);
    tip1.position.set(0.9, 0.42, -4.9);
    const tip2 = tip1.clone();
    tip2.position.x = -0.9;
    this.bodySubGroup.add(tip1, tip2);
    this.exhaustTips.push(new THREE.Vector3(0.9, 0.42, -4.9), new THREE.Vector3(-0.9, 0.42, -4.9));

    const hLight1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.15), this.headlightMat);
    hLight1.position.set(1.75, 0.74, 4.85);
    const hLight2 = hLight1.clone();
    hLight2.position.x = -1.75;

    const tLight = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 0.1), this.taillightMat);
    tLight.position.set(0, 0.74, -4.85);
    this.bodySubGroup.add(hLight1, hLight2, tLight);
  }

  _buildHyperionX() {
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.2, -4.8);
    bodyShape.lineTo(2.2, -4.8);
    bodyShape.lineTo(2.35, 2.0);
    bodyShape.lineTo(1.5, 4.8);
    bodyShape.lineTo(-1.5, 4.8);
    bodyShape.lineTo(-2.35, 2.0);
    bodyShape.closePath();

    const extrudeSettings = { depth: 0.7, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14 };
    const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    bodyGeom.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, this.bodyMat);
    body.position.y = 0.28;
    body.castShadow = true;
    this.bodySubGroup.add(body);

    const canopyGeom = new THREE.SphereGeometry(1.6, 16, 12);
    canopyGeom.scale(1.0, 0.55, 2.4);
    const canopy = new THREE.Mesh(canopyGeom, this.glassMat);
    canopy.position.set(0, 0.94, -0.4);
    this.bodySubGroup.add(canopy);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 2.5), this.carbonMat);
    fin.position.set(0, 1.26, -3.2);
    this.bodySubGroup.add(fin);

    const exhaustGeom = new THREE.CylinderGeometry(0.38, 0.44, 0.9, 14);
    exhaustGeom.rotateX(Math.PI / 2);
    const ex1 = new THREE.Mesh(exhaustGeom, this.titaniumTipMat);
    ex1.position.set(0.9, 0.54, -4.85);
    const ex2 = ex1.clone();
    ex2.position.x = -0.9;
    this.bodySubGroup.add(ex1, ex2);

    const hStrip = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.1), this.headlightMat);
    hStrip.position.set(0, 0.74, 4.85);
    const tStrip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 0.1), this.taillightMat);
    tStrip.position.set(0, 0.74, -4.85);
    this.bodySubGroup.add(hStrip, tStrip);

    this.exhaustTips.push(new THREE.Vector3(0.9, 0.54, -5.1), new THREE.Vector3(-0.9, 0.54, -5.1));
  }

  _buildInterior() {
    const seatGeom = new THREE.BoxGeometry(0.9, 1.1, 0.9);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 });
    const seat1 = new THREE.Mesh(seatGeom, seatMat);
    seat1.position.set(0.75, 1.02, -0.5);
    const seat2 = seat1.clone();
    seat2.position.x = -0.75;

    const cageGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.2);
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9 });
    const cage1 = new THREE.Mesh(cageGeom, cageMat);
    cage1.position.set(1.3, 1.18, -1.2);
    cage1.rotation.z = 0.35;
    const cage2 = cage1.clone();
    cage2.position.x = -1.3;
    cage2.rotation.z = -0.35;

    const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), this.carbonMat);
    steerWheel.position.set(0.75, 1.22, 0.4);
    steerWheel.rotation.x = -0.4;

    this.bodySubGroup.add(seat1, seat2, cage1, cage2, steerWheel);
  }

  _buildWheels() {
    const wheelRadius = 0.55;
    const wheelWidth = 0.45;

    const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
    tireGeom.rotateZ(Math.PI / 2);

    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.74, wheelRadius * 0.74, wheelWidth + 0.02, 14);
    rimGeom.rotateZ(Math.PI / 2);

    const discGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16);
    discGeom.rotateZ(Math.PI / 2);
    const caliperGeom = new THREE.BoxGeometry(0.12, 0.22, 0.28);

    const makeWheel = (isLeft) => {
      const g = new THREE.Group();
      const tire = new THREE.Mesh(tireGeom, this.tireMat);
      const rim = new THREE.Mesh(rimGeom, this.rimMat);
      const disc = new THREE.Mesh(discGeom, this.discMat);
      const caliper = new THREE.Mesh(caliperGeom, this.caliperMat);
      caliper.position.set(isLeft ? 0.08 : -0.08, 0.18, 0);

      tire.castShadow = true;
      g.add(tire, rim, disc, caliper);
      return g;
    };

    this.wheelFL = makeWheel(true);
    this.wheelFR = makeWheel(false);
    this.wheelRL = makeWheel(true);
    this.wheelRR = makeWheel(false);

    const trackWidth = this.carType === 1 ? 2.4 : 2.15;
    const wheelBase = 2.85;

    this.frontLeftWheelGroup.position.set(trackWidth, 0.55, wheelBase);
    this.frontRightWheelGroup.position.set(-trackWidth, 0.55, wheelBase);
    this.rearLeftWheelGroup.position.set(trackWidth, 0.55, -wheelBase);
    this.rearRightWheelGroup.position.set(-trackWidth, 0.55, -wheelBase);

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
    this.underglowLight = new THREE.PointLight(this.underglowColor, 4.2, 16);
    this.underglowLight.position.set(0, 0.35, 0);
    this.mesh.add(this.underglowLight);

    const planeGeom = new THREE.PlaneGeometry(5.4, 10.2);
    planeGeom.rotateX(-Math.PI / 2);
    this.underglowMat = new THREE.MeshBasicMaterial({
      color: this.underglowColor,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.underglowMesh = new THREE.Mesh(planeGeom, this.underglowMat);
    this.underglowMesh.position.y = 0.22;
    this.mesh.add(this.underglowMesh);

    this.headlightLeft = new THREE.SpotLight(0xffffff, 5.0, 75, Math.PI / 5, 0.35);
    this.headlightLeft.position.set(1.5, 0.74, 4.5);
    this.headlightLeft.target.position.set(1.5, 0.12, 35);

    this.headlightRight = new THREE.SpotLight(0xffffff, 5.0, 75, Math.PI / 5, 0.35);
    this.headlightRight.position.set(-1.5, 0.74, 4.5);
    this.headlightRight.target.position.set(-1.5, 0.12, 35);

    this.mesh.add(this.headlightLeft, this.headlightLeft.target, this.headlightRight, this.headlightRight.target);

    this.tailPointLight = new THREE.PointLight(0xff0022, 2.5, 10);
    this.tailPointLight.position.set(0, 0.74, -4.8);
    this.mesh.add(this.tailPointLight);
  }

  createExhaustFlames() {
    const flameGeom = new THREE.ConeGeometry(0.3, 1.8, 12);
    flameGeom.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });

    this.exhaustTips.forEach((pos) => {
      const flame = new THREE.Mesh(flameGeom, flameMat.clone());
      flame.position.copy(pos).add(new THREE.Vector3(0, 0, -0.9));
      flame.visible = false;
      this.bodySubGroup.add(flame);
      this.flameCones.push(flame);
    });
  }

  createSmokeParticles() {
    const pGeom = new THREE.SphereGeometry(0.4, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.6 });

    for (let i = 0; i < 80; i++) {
      const mesh = new THREE.Mesh(pGeom, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokeParticles.push({
        mesh,
        life: 0,
        maxLife: 0.65,
        velocity: new THREE.Vector3(),
      });
    }
  }

  createSparkParticles() {
    const sGeom = new THREE.BoxGeometry(0.15, 0.15, 0.4);
    const sMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(sGeom, sMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkParticles.push({
        mesh,
        life: 0,
        maxLife: 0.3,
        velocity: new THREE.Vector3(),
      });
    }
  }

  emitSparks(pos) {
    for (let i = 0; i < 8; i++) {
      const sObj = this.sparkParticles.find((p) => !p.mesh.visible);
      if (!sObj) break;

      sObj.mesh.position.copy(pos);
      sObj.velocity.set(
        (Math.random() - 0.5) * 14,
        2.0 + Math.random() * 8,
        (Math.random() - 0.5) * 14
      );
      sObj.life = 0;
      sObj.mesh.visible = true;
    }
  }

  emitTireSmoke(isLeft) {
    const pObj = this.smokeParticles.find((p) => !p.mesh.visible);
    if (!pObj) return;

    const trackWidth = this.carType === 1 ? 2.4 : 2.15;
    const offset = new THREE.Vector3(isLeft ? trackWidth : -trackWidth, 0.25, -2.85);
    offset.applyQuaternion(this.mesh.quaternion);
    pObj.mesh.position.copy(this.mesh.position).add(offset);

    pObj.velocity.set(
      (Math.random() - 0.5) * 4,
      1.6 + Math.random() * 2.2,
      (Math.random() - 0.5) * 4
    );

    pObj.life = 0;
    pObj.maxLife = 0.55 + Math.random() * 0.3;
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
      this.bodyMat.emissiveIntensity = 0.22;
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

  // =========================================================================
  // 🏎️ GUARANTEED CONTROLS: A/← = LEFT, D/→ = RIGHT (WHEELS, NOSE, HEADING)
  // =========================================================================
  updatePhysics(delta, trackManager) {
    const isNitro = this.nitroActive && this.nitroFuel > 0;
    const topSpd = isNitro ? this.nitroMaxSpeed : this.maxSpeed;
    const accel = isNitro ? this.nitroAccelRate : this.accelRate;

    if (isNitro) {
      this.nitroFuel = Math.max(0, this.nitroFuel - delta * 25);
      this.flameCones.forEach((f) => (f.visible = true));
    } else {
      this.flameCones.forEach((f) => (f.visible = false));
    }

    // 1. Acceleration & Braking
    if (this.throttleInput > 0) {
      if (this.speed < topSpd) {
        this.speed = Math.min(topSpd, this.speed + accel * this.throttleInput * delta);
      }
    } else if (this.throttleInput < 0) {
      if (this.speed > 5) {
        this.speed = Math.max(0, this.speed - this.brakeRate * delta);
      } else {
        this.speed = Math.max(this.maxReverseSpeed, this.speed - this.accelRate * 0.7 * delta);
      }
    } else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.coastDecelRate * delta);
      if (this.speed < 0) this.speed = Math.min(0, this.speed + this.coastDecelRate * delta);
    }

    // 2. Wheel Steering Angles (steerInput: -1 Left, +1 Right)
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, this.steerInput * 0.52, delta * 12);
    this.frontLeftWheelGroup.rotation.y = this.steerAngle;
    this.frontRightWheelGroup.rotation.y = this.steerAngle;

    // 3. Controlled Power-Slide Drift
    const absSpeed = Math.abs(this.speed);

    if (this.handbrake && absSpeed > 35) {
      this.isDrifting = true;
      this.speed = Math.max(25, this.speed - delta * 40);
      const targetDrift = this.steerInput * 0.5;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, targetDrift, delta * 7);
    } else if (Math.abs(this.steerInput) > 0.6 && absSpeed > 140) {
      this.isDrifting = true;
      const targetDrift = this.steerInput * 0.35;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, targetDrift, delta * 5);
    } else {
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, delta * 8);
      if (Math.abs(this.driftAngle) < 0.05) {
        if (this.isDrifting && this.currentDriftScore > 50) {
          this.totalScore += Math.round(this.currentDriftScore);
          cyberAudio.playScoreChime();
          this.currentDriftScore = 0;
          this.driftMultiplier = 1.0;
        }
        this.isDrifting = false;
      }
    }

    // 4. Smooth Progressive Turn Rate (A decreases heading -> Left, D increases heading -> Right)
    const speedRatio = Math.min(1.0, (absSpeed + 20) / 95);
    const turnFactor = this.isDrifting ? 1.4 : 1.0;
    const effectiveTurn = this.steerInput * this.baseTurnSpeed * speedRatio * turnFactor;

    this.heading += effectiveTurn * delta * Math.sign(this.speed || 1);
    this.mesh.rotation.y = this.heading + this.driftAngle;

    // 5. Road Movement
    const speedMs = (this.speed * 1000) / 3600;
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    this.position.x += forwardX * speedMs * delta;
    this.position.z += forwardZ * speedMs * delta;
    this.position.y = 0.12;
    this.mesh.position.copy(this.position);

    // 6. Suspension Leans
    const targetRoll = THREE.MathUtils.clamp(-this.steerInput * (absSpeed / 200) * 0.08, -0.1, 0.1);
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, delta * 10);

    const targetPitch = this.throttleInput > 0 ? -0.03 : (this.throttleInput < 0 ? 0.04 : 0);
    this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, delta * 10);

    this.bodySubGroup.rotation.z = this.bodyRoll;
    this.bodySubGroup.rotation.x = this.bodyPitch;

    // 7. Rotate Wheels
    const wheelRot = (speedMs * delta * 4) / 0.55;
    this.wheelFL.rotation.x += wheelRot;
    this.wheelFR.rotation.x += wheelRot;
    this.wheelRL.rotation.x += wheelRot;
    this.wheelRR.rotation.x += wheelRot;

    // 8. Drift Scoring & Smoke
    if (this.isDrifting && absSpeed > 35) {
      this.driftMultiplier = Math.min(8.0, this.driftMultiplier + delta * 0.9);
      const pts = absSpeed * Math.abs(this.driftAngle) * this.driftMultiplier * delta * 18;
      this.currentDriftScore += pts;
      this.nitroFuel = Math.min(100, this.nitroFuel + delta * 12);

      if (Math.random() < 0.9) this.emitTireSmoke(true);
      if (Math.random() < 0.9) this.emitTireSmoke(false);
    }

    if (trackManager) {
      trackManager.handleCarTrackCollision(this);
    }

    // Audio Engine
    this.rpm = 800 + (absSpeed % 55) * 140 + (this.throttleInput > 0 ? 1400 : 0);
    const rpmRatio = Math.min(1.0, (this.rpm - 800) / 7500);
    cyberAudio.update(rpmRatio, absSpeed, Math.abs(this.driftAngle), isNitro, false, false);

    // Particles
    for (const p of this.smokeParticles) {
      if (!p.mesh.visible) continue;
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.scale.multiplyScalar(1.04);
        p.mesh.material.opacity = (1 - p.life / p.maxLife) * 0.6;
      }
    }

    for (const s of this.sparkParticles) {
      if (!s.mesh.visible) continue;
      s.life += delta;
      if (s.life >= s.maxLife) {
        s.mesh.visible = false;
      } else {
        s.mesh.position.addScaledVector(s.velocity, delta);
        s.velocity.y -= delta * 30;
      }
    }
  }

  reset() {
    this.position.set(0, 0.12, 0);
    this.mesh.position.copy(this.position);
    this.heading = 0;
    this.speed = 0;
    this.steerAngle = 0;
    this.driftAngle = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.isDrifting = false;
    this.currentDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.nitroFuel = 100;
  }
}

// city.js - Pure Motorsport Realism: Ultra-HD 2048x2048 Asphalt, Rubber Skidmarks, Sponsor Hoardings, Tire Barriers & Natural Lighting
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CityTrackManager {
  constructor(scene, trackIndex = 0, timeOfDay = "DAY") {
    this.scene = scene;
    this.trackIndex = trackIndex; // 0: F1 Autodrome, 1: Touge Mountain, 2: Miami Coast
    this.timeOfDay = timeOfDay; // "DAY", "SUNSET", "RAINSTORM"

    this.colliders = [];
    this.trafficCars = [];
    this.policeUnits = [];
    this.nitroPickups = [];
    this.pedestrians = [];
    this.speedCameras = [];
    this.destructibleProps = [];
    this.aiRivals = [];
    this.helicopter = null;

    // Track Meshes Group
    this.trackWorldGroup = new THREE.Group();
    this.scene.add(this.trackWorldGroup);

    // GTA Wanted System
    this.wantedLevel = 0;
    this.evasionTimer = 0;
    this.isEvasionFlashing = false;

    // Rewind buffer
    this.aiHistoryBuffer = [];
    this.maxHistoryFrames = 240;

    this.isRaining = timeOfDay === "RAINSTORM";
    this.rainParticles = null;
    this.rainGeom = null;

    this.onTakedownCallback = null;
    this.onBustedCallback = null;
    this.onNitroPickupCallback = null;
    this.onSpeedTrapCallback = null;
    this.onWantedLevelChange = null;
    this.onEvasionSuccess = null;

    this.bustedTimer = 0;
    this.isPoliceNearby = false;
    this.nearestPoliceDist = 999999;
    this.lastKerbRumbleTime = 0;

    this.initTextures();
    this.initLighting();
    this.buildTrackEnvironment();
    this.buildMinimalistStudioGarage();
    this.buildRainSystem();
  }

  // 🎨 ULTRA-HD 2048x2048 PBR TEXTURE GENERATOR
  initTextures() {
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 2048;
    roadCanvas.height = 2048;
    const rCtx = roadCanvas.getContext("2d");

    // Base deep dark asphalt
    rCtx.fillStyle = "#22252c";
    rCtx.fillRect(0, 0, 2048, 2048);

    // Micro-aggregate stone particles (Basalt & Granite mineral flecks)
    for (let i = 0; i < 180000; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const shade = Math.random();
      if (shade > 0.7) rCtx.fillStyle = "#3b3f49";
      else if (shade > 0.35) rCtx.fillStyle = "#181a1f";
      else if (shade > 0.15) rCtx.fillStyle = "#4a4f5b";
      else rCtx.fillStyle = "#5c6270";
      rCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // Heavy Rubbered-in Line (Racing groove on tire trajectory)
    const rubberGradL = rCtx.createLinearGradient(280, 0, 720, 0);
    rubberGradL.addColorStop(0, "rgba(10, 11, 14, 0.0)");
    rubberGradL.addColorStop(0.3, "rgba(10, 11, 14, 0.75)");
    rubberGradL.addColorStop(0.7, "rgba(12, 13, 16, 0.85)");
    rubberGradL.addColorStop(1, "rgba(10, 11, 14, 0.0)");
    rCtx.fillStyle = rubberGradL;
    rCtx.fillRect(280, 0, 440, 2048);

    const rubberGradR = rCtx.createLinearGradient(1328, 0, 1768, 0);
    rubberGradR.addColorStop(0, "rgba(10, 11, 14, 0.0)");
    rubberGradR.addColorStop(0.3, "rgba(10, 11, 14, 0.75)");
    rubberGradR.addColorStop(0.7, "rgba(12, 13, 16, 0.85)");
    rubberGradR.addColorStop(1, "rgba(10, 11, 14, 0.0)");
    rCtx.fillStyle = rubberGradR;
    rCtx.fillRect(1328, 0, 440, 2048);

    // Longitudinal Tire Scuffs & Brake Grooves
    rCtx.strokeStyle = "rgba(5, 6, 8, 0.6)";
    rCtx.lineWidth = 4;
    for (let k = 0; k < 60; k++) {
      const sx = (k % 2 === 0 ? 380 + Math.random() * 240 : 1420 + Math.random() * 240);
      rCtx.beginPath();
      rCtx.moveTo(sx, Math.random() * 2048);
      rCtx.lineTo(sx + (Math.random() - 0.5) * 12, Math.random() * 2048);
      rCtx.stroke();
    }

    // High-Resolution Solid FIA Edge Lines
    rCtx.fillStyle = "rgba(245, 248, 252, 0.95)";
    rCtx.fillRect(75, 0, 26, 2048);
    rCtx.fillRect(1947, 0, 26, 2048);

    // Broken Center Dividing Line
    rCtx.fillStyle = "rgba(235, 240, 248, 0.85)";
    for (let y = 40; y < 2048; y += 260) {
      rCtx.fillRect(1014, y, 20, 160);
    }

    this.asphaltTex = new THREE.CanvasTexture(roadCanvas);
    this.asphaltTex.wrapS = THREE.RepeatWrapping;
    this.asphaltTex.wrapT = THREE.RepeatWrapping;
    this.asphaltTex.anisotropy = 8;

    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.asphaltTex,
      roughness: this.isRaining ? 0.08 : 0.45,
      metalness: this.isRaining ? 0.6 : 0.1,
    });

    // 🏢 High-Definition Modern Architectural Facade Textures
    this.facadeMats = [
      this._createArchitecturalMat("#1e293b", "#38bdf8", "#0f172a", 0.35),
      this._createArchitecturalMat("#334155", "#e2e8f0", "#1e222b", 0.45),
      this._createArchitecturalMat("#1e2229", "#94a3b8", "#111317", 0.55),
      this._createArchitecturalMat("#475569", "#bae6fd", "#1e293b", 0.3),
      this._createArchitecturalMat("#0f172a", "#cbd5e1", "#090d16", 0.6),
    ];
  }

  _createArchitecturalMat(panelColor, windowColor, frameColor, roughnessVal) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = panelColor;
    ctx.fillRect(0, 0, 512, 1024);

    // Vertical structural mullions
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = frameColor;
      ctx.fillRect(x, 0, 6, 1024);
    }

    // Floor dividers & reflective glass windows
    for (let y = 16; y < 1024; y += 36) {
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, y, 512, 6);

      for (let x = 8; x < 512; x += 64) {
        ctx.fillStyle = (Math.random() > 0.3 ? windowColor : "rgba(10, 15, 25, 0.85)");
        ctx.fillRect(x, y + 6, 50, 24);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;

    return new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0.8,
      roughness: roughnessVal,
    });
  }

  initLighting() {
    this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.00025);

    this.ambLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(this.ambLight);

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.6);
    this.hemiLight.position.set(0, 500, 0);
    this.scene.add(this.hemiLight);

    this.mainSunLight = new THREE.DirectionalLight(0xfffaed, 3.8);
    this.mainSunLight.position.set(450, 750, 350);
    this.mainSunLight.castShadow = true;
    this.mainSunLight.shadow.mapSize.width = 2048;
    this.mainSunLight.shadow.mapSize.height = 2048;
    this.mainSunLight.shadow.camera.near = 50;
    this.mainSunLight.shadow.camera.far = 2800;
    const d = 700;
    this.mainSunLight.shadow.camera.left = -d;
    this.mainSunLight.shadow.camera.right = d;
    this.mainSunLight.shadow.camera.top = d;
    this.mainSunLight.shadow.camera.bottom = -d;
    this.scene.add(this.mainSunLight);

    this.applyAtmosphere(this.timeOfDay);
  }

  applyAtmosphere(timeOfDay) {
    this.timeOfDay = timeOfDay;
    this.isRaining = timeOfDay === "RAINSTORM";

    if (this.rainParticles) this.rainParticles.visible = this.isRaining;
    cyberAudio.setRainActive(this.isRaining);

    if (timeOfDay === "SUNSET") {
      this.scene.fog.color.setHex(0x52363e);
      this.scene.background.setHex(0x3d212b);
      this.ambLight.color.setHex(0xfb923c);
      this.ambLight.intensity = 2.0;
      this.hemiLight.color.setHex(0xf472b6);
      this.hemiLight.groundColor.setHex(0x431407);
      this.mainSunLight.color.setHex(0xfdba74);
      this.mainSunLight.position.set(700, 220, 350);
      this.mainSunLight.intensity = 3.8;
    } else if (timeOfDay === "RAINSTORM") {
      this.scene.fog.color.setHex(0x334155);
      this.scene.background.setHex(0x1e293b);
      this.ambLight.color.setHex(0x94a3b8);
      this.ambLight.intensity = 1.4;
      this.hemiLight.color.setHex(0x64748b);
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.mainSunLight.color.setHex(0xcbd5e1);
      this.mainSunLight.position.set(300, 600, 300);
      this.mainSunLight.intensity = 2.0;
    } else {
      this.scene.fog.color.setHex(0x94a3b8);
      this.scene.background.setHex(0x60a5fa);
      this.ambLight.color.setHex(0xffffff);
      this.ambLight.intensity = 1.8;
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x334155);
      this.mainSunLight.color.setHex(0xfffaed);
      this.mainSunLight.position.set(450, 750, 350);
      this.mainSunLight.intensity = 3.8;
    }

    if (this.roadMat) {
      this.roadMat.roughness = this.isRaining ? 0.08 : 0.45;
      this.roadMat.metalness = this.isRaining ? 0.6 : 0.1;
    }
  }

  setTrack(trackIndex) {
    this.trackIndex = trackIndex;
    this.buildTrackEnvironment();
  }

  buildTrackEnvironment() {
    while (this.trackWorldGroup.children.length > 0) {
      this.trackWorldGroup.remove(this.trackWorldGroup.children[0]);
    }
    this.colliders = [];
    this.trafficCars = [];
    this.policeUnits = [];
    this.nitroPickups = [];
    this.pedestrians = [];
    this.speedCameras = [];
    this.destructibleProps = [];
    this.aiRivals = [];

    let trackPoints = [];
    if (this.trackIndex === 1) {
      // 🏔️ 2. TOUGE MOUNTAIN PASS
      trackPoints = [
        new THREE.Vector3(0, 0.10, 0),
        new THREE.Vector3(0, 0.10, 280),
        new THREE.Vector3(140, 0.10, 450),
        new THREE.Vector3(320, 0.10, 420),
        new THREE.Vector3(380, 0.10, 220),
        new THREE.Vector3(260, 0.10, 60),
        new THREE.Vector3(440, 0.10, -140),
        new THREE.Vector3(350, 0.10, -380),
        new THREE.Vector3(120, 0.10, -480),
        new THREE.Vector3(-140, 0.10, -440),
        new THREE.Vector3(-360, 0.10, -320),
        new THREE.Vector3(-450, 0.10, -100),
        new THREE.Vector3(-320, 0.10, 140),
        new THREE.Vector3(-420, 0.10, 340),
        new THREE.Vector3(-220, 0.10, 420),
        new THREE.Vector3(-70, 0.10, -180),
      ];
    } else if (this.trackIndex === 2) {
      // 🌴 3. MIAMI VICE COASTLINE
      trackPoints = [
        new THREE.Vector3(0, 0.10, 0),
        new THREE.Vector3(0, 0.10, 450),
        new THREE.Vector3(180, 0.10, 620),
        new THREE.Vector3(480, 0.10, 540),
        new THREE.Vector3(560, 0.10, 220),
        new THREE.Vector3(460, 0.10, -120),
        new THREE.Vector3(300, 0.10, -450),
        new THREE.Vector3(-50, 0.10, -580),
        new THREE.Vector3(-380, 0.10, -440),
        new THREE.Vector3(-540, 0.10, -150),
        new THREE.Vector3(-480, 0.10, 220),
        new THREE.Vector3(-280, 0.10, 420),
        new THREE.Vector3(-60, 0.10, -160),
      ];
    } else {
      // 🏎️ 1. F1 AUTODROME
      trackPoints = [
        new THREE.Vector3(0, 0.10, 0),
        new THREE.Vector3(0, 0.10, 380),
        new THREE.Vector3(90, 0.10, 560),
        new THREE.Vector3(260, 0.10, 540),
        new THREE.Vector3(460, 0.10, 340),
        new THREE.Vector3(520, 0.10, 60),
        new THREE.Vector3(420, 0.10, -220),
        new THREE.Vector3(220, 0.10, -440),
        new THREE.Vector3(-40, 0.10, -540),
        new THREE.Vector3(-320, 0.10, -460),
        new THREE.Vector3(-480, 0.10, -220),
        new THREE.Vector3(-520, 0.10, 40),
        new THREE.Vector3(-420, 0.10, 280),
        new THREE.Vector3(-220, 0.10, 340),
        new THREE.Vector3(-70, 0.10, -180),
      ];
    }

    this.trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, "catmullrom", 0.35);
    const divisions = 300;
    this.trackWidth = 36;
    const halfWidth = this.trackWidth / 2;

    this.trackSamplePoints = [];
    for (let i = 0; i < divisions; i++) {
      this.trackSamplePoints.push(this.trackCurve.getPointAt(i / divisions));
    }

    // Natural Grass & Runoff Ground Plane
    const groundGeom = new THREE.PlaneGeometry(3800, 3800);
    groundGeom.rotateX(-Math.PI / 2);
    const groundColor = this.trackIndex === 1 ? 0x223824 : (this.trackIndex === 2 ? 0x2d3748 : 0x283626);
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.y = 0.0;
    ground.receiveShadow = true;
    this.trackWorldGroup.add(ground);

    // Track Ribbon Mesh
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= divisions; i++) {
      const p = this.trackCurve.getPointAt((i % divisions) / divisions);
      const nextP = this.trackCurve.getPointAt(((i + 1) % divisions) / divisions);
      const tangent = new THREE.Vector3().subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftX = p.x - normal.x * halfWidth;
      const leftZ = p.z - normal.z * halfWidth;
      const rightX = p.x + normal.x * halfWidth;
      const rightZ = p.z + normal.z * halfWidth;

      vertices.push(leftX, 0.10, leftZ);
      vertices.push(rightX, 0.10, rightZ);

      const v = (i / divisions) * 50;
      uvs.push(0, v);
      uvs.push(1, v);

      if (i < divisions) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeom = new THREE.BufferGeometry();
    roadGeom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    roadGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    roadGeom.setIndex(indices);
    roadGeom.computeVertexNormals();

    this.roadMesh = new THREE.Mesh(roadGeom, this.roadMat);
    this.roadMesh.receiveShadow = true;
    this.trackWorldGroup.add(this.roadMesh);

    // FIA Standard Apex Kerbs
    const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const curbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

    for (let i = 0; i < this.trackSamplePoints.length; i += 2) {
      const p1 = this.trackSamplePoints[i];
      const p2 = this.trackSamplePoints[(i + 1) % this.trackSamplePoints.length];
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const dist = p1.distanceTo(p2) * 2;

      const curbMat = (i / 2) % 2 === 0 ? curbRedMat : curbWhiteMat;

      const curb1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, dist), curbMat);
      curb1.position.set(mid.x + normal.x * (halfWidth + 1.0), 0.14, mid.z + normal.z * (halfWidth + 1.0));
      curb1.lookAt(mid.x + normal.x * (halfWidth + 1.0) + tangent.x, 0.14, mid.z + normal.z * (halfWidth + 1.0) + tangent.z);

      const curb2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, dist), curbMat);
      curb2.position.set(mid.x - normal.x * (halfWidth + 1.0), 0.14, mid.z - normal.z * (halfWidth + 1.0));
      curb2.lookAt(mid.x - normal.x * (halfWidth + 1.0) + tangent.x, 0.14, mid.z - normal.z * (halfWidth + 1.0) + tangent.z);

      this.trackWorldGroup.add(curb1, curb2);
    }

    this.buildMotorsportSponsorHoardings();
    this.buildTireBarriers();
    this.buildF1GrandstandsAndPits();
    this.buildStartFinishGantry();
    this.buildRoadsideStreetlights();
    this.buildDiverseBuildings();
    this.buildSpeedTrapCameras();
    this.buildDestructibleProps();
    this.buildAIRivals();
    this.buildPoliceFleet();
    this.buildPoliceHelicopter();
    this.buildDetailedTraffic();
  }

  buildMinimalistStudioGarage() {
    this.garageGroup = new THREE.Group();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x18191f,
      metalness: 0.85,
      roughness: 0.2,
    });

    const garageFloor = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), floorMat);
    garageFloor.rotateX(-Math.PI / 2);
    garageFloor.position.set(0, 0.04, 0);
    garageFloor.receiveShadow = true;
    this.garageGroup.add(garageFloor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.8 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(42, 18, 0.8), wallMat);
    backWall.position.set(0, 9, -18);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.25,
      metalness: 0.9,
      roughness: 0.1,
    });
    const glassWallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 18, 42), glassMat);
    glassWallL.position.set(-20, 9, 0);
    const glassWallR = glassWallL.clone();
    glassWallR.position.x = 20;

    this.garageGroup.add(backWall, glassWallL, glassWallR);

    const softboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const softbox1 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 10), softboxMat);
    softbox1.position.set(0, 15, 0);
    this.garageGroup.add(softbox1);

    const keySpot = new THREE.SpotLight(0xffffff, 4.0, 35, Math.PI / 3, 0.25);
    keySpot.position.set(0, 14, 0);
    this.garageGroup.add(keySpot);

    const sideSpot1 = new THREE.DirectionalLight(0xffffff, 1.2);
    sideSpot1.position.set(15, 10, 15);
    const sideSpot2 = new THREE.DirectionalLight(0xe2e8f0, 0.8);
    sideSpot2.position.set(-15, 8, -15);
    this.garageGroup.add(sideSpot1, sideSpot2);

    this.scene.add(this.garageGroup);
  }

  buildMotorsportSponsorHoardings() {
    const hoardGroup = new THREE.Group();

    const makeBoard = (brand, sub, bgHex, textHex, x, y, z, rotY) => {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, 512, 128);

      ctx.fillStyle = textHex;
      ctx.font = "900 68px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(brand, 256, 75);

      if (sub) {
        ctx.font = "700 22px Segoe UI, sans-serif";
        ctx.fillText(sub, 256, 110);
      }

      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      return mesh;
    };

    hoardGroup.add(makeBoard("PIRELLI", "POWER IS NOTHING WITHOUT CONTROL", "#facc15", "#dc2626", 260, 4, 460, -0.4));
    hoardGroup.add(makeBoard("BREMBO", "HIGH PERFORMANCE BRAKES", "#dc2626", "#ffffff", -380, 4, -280, 1.2));
    hoardGroup.add(makeBoard("MOTUL", "100% SYNTHETIC MOTOR OIL", "#dc2626", "#ffffff", -450, 4, 220, 2.1));
    hoardGroup.add(makeBoard("MICHELIN", "PILOT SPORT CUP 2", "#1d4ed8", "#facc15", 380, 4, -200, -1.8));
    hoardGroup.add(makeBoard("MOBIL 1", "OFFICIAL MOTORSPORT LUBRICANT", "#ffffff", "#1e3a8a", 160, 4, 580, -0.2));
    hoardGroup.add(makeBoard("BBS", "GERMAN ENGINEERED RACING WHEELS", "#18181b", "#e2e8f0", -420, 4, -400, 0.8));

    this.trackWorldGroup.add(hoardGroup);
  }

  buildTireBarriers() {
    const tireGroup = new THREE.Group();
    const tireRubberMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.9 });
    const tireGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.38, 14);

    const makeStack = (x, z) => {
      const g = new THREE.Group();
      for (let y = 0; y < 4; y++) {
        const tire = new THREE.Mesh(tireGeom, tireRubberMat);
        tire.position.y = 0.2 + y * 0.38;
        g.add(tire);
      }
      g.position.set(x, 0.10, z);
      return g;
    };

    const halfWidth = this.trackWidth / 2;
    const curvePoints = [0.15, 0.35, 0.65, 0.85];

    for (const u of curvePoints) {
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      for (let s = -6; s <= 6; s += 1.4) {
        const pos = pt.clone().addScaledVector(normal, halfWidth + 4.0).addScaledVector(tangent, s);
        tireGroup.add(makeStack(pos.x, pos.z));
      }
    }

    this.trackWorldGroup.add(tireGroup);
  }

  buildF1GrandstandsAndPits() {
    const standsGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const seatBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
    const seatRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });

    const makeGrandstand = (x, z, rotY) => {
      const g = new THREE.Group();

      const base = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 18), concreteMat);
      base.position.set(0, 6, 0);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 22), roofMat);
      roof.position.set(0, 14, 2);

      const seats1 = new THREE.Mesh(new THREE.BoxGeometry(32, 2, 4), seatBlue);
      seats1.position.set(0, 5, -4);
      const seats2 = new THREE.Mesh(new THREE.BoxGeometry(32, 2, 4), seatRed);
      seats2.position.set(0, 8, 0);
      const seats3 = new THREE.Mesh(new THREE.BoxGeometry(32, 2, 4), seatBlue);
      seats3.position.set(0, 11, 4);

      g.add(base, roof, seats1, seats2, seats3);
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      return g;
    };

    standsGroup.add(makeGrandstand(34, 100, Math.PI / 2));
    standsGroup.add(makeGrandstand(34, 220, Math.PI / 2));
    standsGroup.add(makeGrandstand(-34, 100, -Math.PI / 2));
    standsGroup.add(makeGrandstand(-34, 220, -Math.PI / 2));

    this.trackWorldGroup.add(standsGroup);
  }

  buildStartFinishGantry() {
    const halfWidth = this.trackWidth / 2;
    const g = new THREE.Group();

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const bannerCanvas = document.createElement("canvas");
    bannerCanvas.width = 1024;
    bannerCanvas.height = 256;
    const bCtx = bannerCanvas.getContext("2d");
    bCtx.fillStyle = "#1e293b";
    bCtx.fillRect(0, 0, 1024, 256);

    for (let x = 0; x < 1024; x += 32) {
      for (let y = 0; y < 256; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          bCtx.fillStyle = "#ffffff";
          bCtx.fillRect(x, y, 32, 32);
        }
      }
    }
    bCtx.fillStyle = "#0f172a";
    bCtx.fillRect(140, 36, 744, 184);

    const titleText = this.trackIndex === 1 ? "TOUGE MOUNTAIN PASS" : (this.trackIndex === 2 ? "MIAMI COASTLINE CIRCUIT" : "F1 GRAND PRIX AUTODROME");

    bCtx.fillStyle = "#ffffff";
    bCtx.font = "900 58px Segoe UI, sans-serif";
    bCtx.textAlign = "center";
    bCtx.fillText(titleText, 512, 120);

    bCtx.fillStyle = "#f59e0b";
    bCtx.font = "800 32px Segoe UI, sans-serif";
    bCtx.fillText("OFFICIAL TIMING & LAP SCORING", 512, 175);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.5 });

    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 18, 12), trussMat);
    pillarL.position.set(-halfWidth - 4.5, 9, 0);

    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 18, 12), trussMat);
    pillarR.position.set(halfWidth + 4.5, 9, 0);

    const span = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth + 10, 2.5, 3.2), trussMat);
    span.position.set(0, 17.5, 0);

    const bannerF = new THREE.Mesh(new THREE.PlaneGeometry(36, 9), bannerMat);
    bannerF.position.set(0, 17.5, 1.65);

    const bannerB = bannerF.clone();
    bannerB.position.z = -1.65;
    bannerB.rotation.y = Math.PI;

    g.add(pillarL, pillarR, span, bannerF, bannerB);

    const checkLineGeom = new THREE.PlaneGeometry(this.trackWidth, 4);
    checkLineGeom.rotateX(-Math.PI / 2);
    const checkLine = new THREE.Mesh(checkLineGeom, bannerMat);
    checkLine.position.set(0, 0.11, 0);
    g.add(checkLine);

    const gridBoxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const gridPositions = [
      { x: -5.5, z: 24 },
      { x: 5.5, z: 24 },
      { x: -5.5, z: 8 },
      { x: 5.5, z: 8 },
    ];

    gridPositions.forEach((pos) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.02, 9.8), gridBoxMat);
      box.position.set(pos.x, 0.11, pos.z);
      g.add(box);
    });

    g.position.set(0, 0, 0);
    this.trackWorldGroup.add(g);
  }

  buildRoadsideStreetlights() {
    const railGroup = new THREE.Group();
    const halfWidth = this.trackWidth / 2;

    const lightPoleGeom = new THREE.CylinderGeometry(0.3, 0.45, 16, 8);
    const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff8db, emissive: 0xfff8db, emissiveIntensity: 0.6 });

    const count = 30;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const polePos = pt.clone().addScaledVector(normal, halfWidth + 6.0);

      const pole = new THREE.Mesh(lightPoleGeom, lightPoleMat);
      pole.position.set(polePos.x, 8, polePos.z);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 3.5), lampGlowMat);
      lampHead.position.set(polePos.x - normal.x * 2.0, 15.8, polePos.z - normal.z * 2.0);

      railGroup.add(pole, lampHead);
    }

    this.trackWorldGroup.add(railGroup);
  }

  buildDiverseBuildings() {
    const cityGroup = new THREE.Group();

    const getMinDistToTrack = (x, z) => {
      let minD = 999999;
      for (let i = 0; i < this.trackSamplePoints.length; i += 4) {
        const pt = this.trackSamplePoints[i];
        const d = Math.hypot(x - pt.x, z - pt.z);
        if (d < minD) minD = d;
      }
      return minD;
    };

    let bldgIndex = 0;
    for (let x = -800; x <= 800; x += 120) {
      for (let z = -800; z <= 800; z += 120) {
        const distToTrack = getMinDistToTrack(x, z);
        if (distToTrack < 56) continue;

        bldgIndex++;
        const facadeMat = this.facadeMats[bldgIndex % this.facadeMats.length];
        const height = 100 + Math.random() * 220;
        const w = 48;
        const d = 48;

        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), facadeMat);
        bldg.position.set(x, height / 2, z);
        bldg.castShadow = true;
        cityGroup.add(bldg);

        this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }

    this.trackWorldGroup.add(cityGroup);
  }

  buildSpeedTrapCameras() {
    const uPositions = [0.12, 0.55, 0.85];
    const camMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    for (const u of uPositions) {
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();

      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 12, 8), camMat);
      pole.position.set(-this.trackWidth / 2 - 4.5, 6, 0);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 0.8), camMat);
      arm.position.set(0, 11.5, 0);

      const camBox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 1.8), camMat);
      camBox.position.set(0, 10.4, 0);

      g.add(pole, arm, camBox);
      g.position.set(pt.x, 0, pt.z);
      g.lookAt(pt.x + tangent.x, 0, pt.z + tangent.z);
      this.trackWorldGroup.add(g);

      this.speedCameras.push({ pos: pt, u: u, lastTriggerTime: 0 });
    }
  }

  buildDestructibleProps() {
    const halfWidth = this.trackWidth / 2;
    const coneGeom = new THREE.ConeGeometry(0.4, 1.1, 10);
    const coneBaseGeom = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    for (let i = 0; i < 20; i++) {
      const u = (i / 20);
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const g = new THREE.Group();
      const cone = new THREE.Mesh(coneGeom, coneMat);
      cone.position.y = 0.55;
      const base = new THREE.Mesh(coneBaseGeom, coneMat);
      base.position.y = 0.05;
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 10), whiteStripeMat);
      stripe.position.y = 0.65;
      g.add(cone, base, stripe);

      const offset = (i % 4 === 0 ? halfWidth - 2.5 : -(halfWidth - 2.5));
      const pos = pt.clone().addScaledVector(normal, offset);
      g.position.set(pos.x, 0.10, pos.z);
      this.trackWorldGroup.add(g);

      this.destructibleProps.push({
        group: g,
        initialPos: pos.clone(),
        velocity: new THREE.Vector3(),
        rotVelocity: new THREE.Vector3(),
        isHit: false,
        resetTimer: 0,
      });
    }
  }

  buildAIRivals() {
    const rivalsData = [
      { name: "Akira [GT-R]", color: 0x1d4ed8, u: 0.008, lane: -5.5, baseSpeedU: 0.018 },
      { name: "Ghost [911]", color: 0x1e293b, u: 0.008, lane: 5.5, baseSpeedU: 0.019 },
      { name: "⚡ Razor [M3 GTR]", color: 0x15803d, u: 0.0025, lane: -5.5, baseSpeedU: 0.017 },
    ];

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.4 });

    for (const r of rivalsData) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshPhysicalMaterial({
        color: r.color,
        metalness: 0.85,
        roughness: 0.18,
        clearcoat: 1.0,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.72, 9.2), paintMat);
      body.position.y = 0.65;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.65, 4.4), glassMat);
      cabin.position.set(0, 1.25, -0.3);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.0), carbonMat);
      wing.position.set(0, 1.55, -4.2);

      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
      hlL.position.set(1.4, 0.7, 4.61);
      const hlR = hlL.clone();
      hlR.position.x = -1.4;
      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 0.1), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 }));
      tl.position.set(0, 0.7, -4.61);

      g.add(body, cabin, wing, hlL, hlR, tl);

      const nameCanvas = document.createElement("canvas");
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nCtx = nameCanvas.getContext("2d");
      nCtx.fillStyle = "rgba(15, 23, 42, 0.9)";
      nCtx.roundRect(0, 0, 256, 64, 12);
      nCtx.fill();
      nCtx.strokeStyle = "#94a3b8";
      nCtx.lineWidth = 3;
      nCtx.stroke();
      nCtx.fillStyle = "#ffffff";
      nCtx.font = "900 22px Segoe UI, sans-serif";
      nCtx.textAlign = "center";
      nCtx.fillText(r.name, 128, 40);

      const nameTex = new THREE.CanvasTexture(nameCanvas);
      const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, side: THREE.DoubleSide }));
      namePlate.position.set(0, 3.4, 0);
      g.add(namePlate);

      const pt = this.trackCurve.getPointAt(r.u);
      g.position.set(pt.x, 0.15, pt.z);
      this.trackWorldGroup.add(g);

      this.aiRivals.push({
        name: r.name,
        mesh: g,
        u: r.u,
        laneOffset: r.lane,
        baseSpeedU: r.baseSpeedU,
        currentSpeedU: 0.0,
        lapsCompleted: 0,
        namePlate: namePlate,
      });
    }
  }

  buildPoliceFleet() {
    const policeCount = 4;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.8 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

    for (let i = 0; i < policeCount; i++) {
      const g = new THREE.Group();

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.4), bodyMat);
      chassis.position.y = 0.65;
      const doors = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.6, 3.6), whiteDoorMat);
      doors.position.set(0, 0.65, 0);

      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
      blueLight.position.set(0.7, 1.65, -0.4);
      const redLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
      redLight.position.set(-0.7, 1.65, -0.4);
      g.add(chassis, doors, blueLight, redLight);

      const u = (i * 0.22 + 0.08) % 1.0;
      const pt = this.trackCurve.getPointAt(u);
      g.position.set(pt.x, 0.15, pt.z);
      this.trackWorldGroup.add(g);

      this.policeUnits.push({
        group: g,
        u: u,
        speedU: 0.02 + i * 0.003,
        laneOffset: (i % 2 === 0 ? 5.5 : -5.5),
        active: true,
        isDestroyed: false,
        flipRot: 0,
        blueLight,
        redLight,
      });
    }
  }

  buildPoliceHelicopter() {
    const heliGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

    const fuse = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 10), bodyMat);
    heliGroup.add(fuse);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 8), bodyMat);
    tail.position.set(0, 0.6, -7);
    heliGroup.add(tail);

    const rotorGeom = new THREE.BoxGeometry(18, 0.1, 1.2);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    this.heliRotor = new THREE.Mesh(rotorGeom, rotorMat);
    this.heliRotor.position.set(0, 2.0, 0);
    heliGroup.add(this.heliRotor);

    const spotGeom = new THREE.ConeGeometry(24, 90, 16, 1, true);
    spotGeom.rotateX(Math.PI / 2);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const spotCone = new THREE.Mesh(spotGeom, spotMat);
    spotCone.position.set(0, -45, 0);
    heliGroup.add(spotCone);

    heliGroup.position.set(0, 95, 0);
    this.trackWorldGroup.add(heliGroup);
    this.helicopter = heliGroup;
  }

  buildDetailedTraffic() {
    const carColors = [0x475569, 0x1e293b, 0x94a3b8, 0xdc2626, 0x1d4ed8, 0x15803d];
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });

    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.37, 10);
    rimGeom.rotateZ(Math.PI / 2);

    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({
        color: carColors[i % carColors.length],
        metalness: 0.7,
        roughness: 0.25,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.7, 8.4), paintMat);
      body.position.y = 0.65;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.65, 4.4), glassMat);
      cabin.position.set(0, 1.25, -0.3);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.5), paintMat);
      roof.position.set(0, 1.58, -0.3);

      const makeWheel = (x, z) => {
        const wg = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeom, tireMat);
        const rim = new THREE.Mesh(rimGeom, rimMat);
        wg.add(tire, rim);
        wg.position.set(x, 0.5, z);
        return wg;
      };

      const wFL = makeWheel(1.85, 2.6);
      const wFR = makeWheel(-1.85, 2.6);
      const wRL = makeWheel(1.85, -2.6);
      const wRR = makeWheel(-1.85, -2.6);

      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.1), hlMat);
      hlL.position.set(1.4, 0.7, 4.21);
      const hlR = hlL.clone();
      hlR.position.x = -1.4;

      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.1), tlMat);
      tl.position.set(0, 0.7, -4.21);

      g.add(body, cabin, roof, wFL, wFR, wRL, wRR, hlL, hlR, tl);

      const u = (i / 8);
      const pt = this.trackCurve.getPointAt(u);
      g.position.set(pt.x + (i % 2 === 0 ? 6 : -6), 0.15, pt.z);
      this.trackWorldGroup.add(g);

      this.trafficCars.push({
        mesh: g,
        u: u,
        speed: 0.012 + (i % 3) * 0.004,
        laneOffset: (i % 2 === 0 ? 6.5 : -6.5),
        wheels: [wFL, wFR, wRL, wRR],
      });
    }
  }

  buildRainSystem() {
    const rainCount = 1800;
    this.rainGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }

    this.rainGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
    });

    this.rainParticles = new THREE.Points(this.rainGeom, rainMat);
    this.rainParticles.visible = this.isRaining;
    this.scene.add(this.rainParticles);
  }

  getClosestU(pos) {
    let closestU = 0;
    let minDistSq = Infinity;
    const len = this.trackSamplePoints.length;

    for (let i = 0; i < len; i++) {
      const pt = this.trackSamplePoints[i];
      const dx = pos.x - pt.x;
      const dz = pos.z - pt.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestU = i / len;
      }
    }
    return closestU;
  }

  recordAIRivalsHistory() {
    const frame = this.aiRivals.map((r) => ({
      u: r.u,
      lapsCompleted: r.lapsCompleted,
      speedU: r.currentSpeedU,
    }));
    this.aiHistoryBuffer.push(frame);
    if (this.aiHistoryBuffer.length > this.maxHistoryFrames) {
      this.aiHistoryBuffer.shift();
    }
  }

  stepRewindAIRivals() {
    if (this.aiHistoryBuffer.length === 0) return false;
    const frame = this.aiHistoryBuffer.pop();
    for (let i = 0; i < this.aiRivals.length; i++) {
      const r = this.aiRivals[i];
      const saved = frame[i];
      if (saved) {
        r.u = saved.u;
        r.lapsCompleted = saved.lapsCompleted;
        r.currentSpeedU = saved.speedU;

        const pt = this.trackCurve.getPointAt(r.u);
        const tangent = this.trackCurve.getTangentAt(r.u).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        r.mesh.position.copy(pt).addScaledVector(normal, r.laneOffset);
        r.mesh.position.y = 0.15;

        const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, r.laneOffset);
        r.mesh.lookAt(lookPt.x, 0.15, lookPt.z);
      }
    }
    return true;
  }

  addWantedStars(stars = 1) {
    this.wantedLevel = Math.min(3, this.wantedLevel + stars);
    this.evasionTimer = 8.0;
    this.isEvasionFlashing = false;
    if (this.onWantedLevelChange) {
      this.onWantedLevelChange(this.wantedLevel, false);
    }
  }

  handleCarTrackCollision(car) {
    const px = car.position.x;
    const pz = car.position.z;
    const carRadius = 2.6;

    // 📳 KERB RUMBLE DETECTION (Distance to track edge ~ 18m)
    const closestU = this.getClosestU(car.position);
    const pt = this.trackCurve.getPointAt(closestU);
    const distToCenter = Math.hypot(px - pt.x, pz - pt.z);
    if (distToCenter > 16.5 && distToCenter < 19.5 && Math.abs(car.speed) > 40) {
      const now = Date.now();
      if (now - this.lastKerbRumbleTime > 80) {
        this.lastKerbRumbleTime = now;
        cyberAudio.playKerbRumble(Math.abs(car.speed));
      }
    }

    for (const b of this.colliders) {
      const cx = Math.max(b.minX, Math.min(b.maxX, px));
      const cz = Math.max(b.minZ, Math.min(b.maxZ, pz));

      const dx = px - cx;
      const dz = pz - cz;
      const distSq = dx * dx + dz * dz;

      if (distSq < carRadius * carRadius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = carRadius - dist;

        car.position.x += nx * (overlap + 0.4);
        car.position.z += nz * (overlap + 0.4);
        car.mesh.position.copy(car.position);

        car.speed = -car.speed * 0.35;
        cyberAudio.playCrash();
        car.emitSparks(new THREE.Vector3(cx, 0.5, cz));
        return;
      }
    }

    for (const prop of this.destructibleProps) {
      if (prop.isHit) continue;
      const dist = prop.group.position.distanceTo(car.position);
      if (dist < 3.2) {
        prop.isHit = true;
        const hitSpeed = Math.max(25, Math.abs(car.speed));
        const forwardX = Math.sin(car.heading);
        const forwardZ = Math.cos(car.heading);

        prop.velocity.set(
          forwardX * hitSpeed * 0.3 + (Math.random() - 0.5) * 10,
          6.0 + Math.random() * 8.0,
          forwardZ * hitSpeed * 0.3 + (Math.random() - 0.5) * 10
        );
        prop.rotVelocity.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );

        car.emitSparks(prop.group.position);
        cyberAudio.playCrash();
        car.totalScore += 100;
        this.addWantedStars(1);
      }
    }
  }

  update(delta, playerCar, isRaceRunning = true) {
    const playerPos = playerCar.mesh.position;
    const playerSpeed = Math.abs(playerCar.speed);
    const playerU = this.getClosestU(playerPos);
    const now = Date.now();

    if (this.garageGroup) {
      this.garageGroup.visible = !isRaceRunning;
    }

    if (isRaceRunning) {
      this.recordAIRivalsHistory();
    }

    // 1. Rain
    if (this.isRaining && this.rainParticles) {
      this.rainParticles.position.copy(playerPos);
      const posAttr = this.rainGeom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - delta * 45;
        if (y < 0) y = 55;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 2. Helicopter
    if (this.helicopter) {
      const isHeliWanted = this.wantedLevel >= 3 || (this.wantedLevel >= 2 && Math.random() > 0.4);
      if (this.heliRotor) this.heliRotor.rotation.y += delta * 25;

      if (isHeliWanted) {
        this.helicopter.position.x = THREE.MathUtils.lerp(this.helicopter.position.x, playerPos.x, delta * 2.0);
        this.helicopter.position.z = THREE.MathUtils.lerp(this.helicopter.position.z, playerPos.z, delta * 2.0);
        this.helicopter.position.y = 85;
      } else {
        this.helicopter.position.y = 200;
      }
    }

    // 3. AI RIVALS
    for (let i = 0; i < this.aiRivals.length; i++) {
      const rival = this.aiRivals[i];
      if (isRaceRunning) {
        let diffU = (rival.u - playerU);
        if (diffU > 0.5) diffU -= 1.0;
        if (diffU < -0.5) diffU += 1.0;

        let targetSpeedMultiplier = 1.0;
        if (diffU > 0.05) {
          targetSpeedMultiplier = 0.85;
        } else if (diffU < -0.05) {
          targetSpeedMultiplier = 1.15;
        } else {
          targetSpeedMultiplier = 0.95 + (i * 0.03);
        }

        rival.currentSpeedU = THREE.MathUtils.lerp(rival.currentSpeedU, rival.baseSpeedU * targetSpeedMultiplier, delta * 1.5);

        const prevU = rival.u;
        rival.u = (rival.u + rival.currentSpeedU * delta) % 1.0;
        if (prevU > 0.85 && rival.u < 0.15) rival.lapsCompleted++;
      } else {
        rival.currentSpeedU = 0;
      }

      const pt = this.trackCurve.getPointAt(rival.u);
      const tangent = this.trackCurve.getTangentAt(rival.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      rival.mesh.position.copy(pt).addScaledVector(normal, rival.laneOffset);
      rival.mesh.position.y = 0.15;

      const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, rival.laneOffset);
      rival.mesh.lookAt(lookPt.x, 0.15, lookPt.z);

      if (rival.namePlate) {
        rival.namePlate.lookAt(playerPos.x, 3.4, playerPos.z);
      }
    }

    // 4. Speed Trap Cameras
    for (const cam of this.speedCameras) {
      const dist = cam.pos.distanceTo(playerPos);
      if (dist < 12.0 && playerSpeed > 175) {
        if (now - cam.lastTriggerTime > 6000) {
          cam.lastTriggerTime = now;
          cyberAudio.playCameraFlash();
          const pts = Math.round(playerSpeed * 4);
          playerCar.totalScore += pts;
          this.addWantedStars(1);
          if (this.onSpeedTrapCallback) {
            this.onSpeedTrapCallback(Math.round(playerSpeed), pts);
          }
        }
      }
    }

    // 5. Destructible Props
    for (const prop of this.destructibleProps) {
      if (prop.isHit) {
        prop.group.position.addScaledVector(prop.velocity, delta);
        prop.velocity.y -= delta * 28;
        prop.group.rotation.x += prop.rotVelocity.x * delta;
        prop.group.rotation.y += prop.rotVelocity.y * delta;
        prop.group.rotation.z += prop.rotVelocity.z * delta;

        if (prop.group.position.y < 0.10) {
          prop.group.position.y = 0.10;
          prop.velocity.multiplyScalar(0.4);
          prop.rotVelocity.multiplyScalar(0.4);
        }

        prop.resetTimer += delta;
        if (prop.resetTimer > 15.0) {
          prop.isHit = false;
          prop.resetTimer = 0;
          prop.group.position.copy(prop.initialPos);
          prop.group.rotation.set(0, 0, 0);
          prop.velocity.set(0, 0, 0);
        }
      }
    }

    // 6. Police Pursuits
    let nearestPoliceDist = 999999;

    for (let i = 0; i < this.policeUnits.length; i++) {
      const police = this.policeUnits[i];
      if (police.isDestroyed) {
        police.group.position.y += delta * 8;
        police.group.rotation.x += delta * 12;
        police.group.rotation.z += delta * 9;
        if (police.group.position.y > 25) {
          police.group.position.set(0, -50, 0);
        }
        continue;
      }

      let speedMultiplier = 1.0;
      if (this.wantedLevel === 1) speedMultiplier = 1.15;
      else if (this.wantedLevel === 2) speedMultiplier = 1.35;
      else if (this.wantedLevel >= 3) speedMultiplier = 1.55;

      police.u = (police.u + police.speedU * speedMultiplier * delta) % 1.0;
      const pt = this.trackCurve.getPointAt(police.u);
      const tangent = this.trackCurve.getTangentAt(police.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      police.group.position.copy(pt).addScaledVector(normal, police.laneOffset);
      police.group.position.y = 0.15;

      const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, police.laneOffset);
      police.group.lookAt(lookPt.x, 0.15, lookPt.z);

      const dist = police.group.position.distanceTo(playerPos);
      if (dist < nearestPoliceDist) nearestPoliceDist = dist;

      if (dist < 4.8) {
        if (playerSpeed > 68) {
          police.isDestroyed = true;
          cyberAudio.playTakedownCrunch();
          playerCar.emitSparks(police.group.position);
          playerCar.totalScore += 1500;
          this.addWantedStars(2);

          if (this.onTakedownCallback) {
            this.onTakedownCallback("🚓 POLICE TAKEDOWN! +1500 PTS");
          }

          setTimeout(() => {
            police.isDestroyed = false;
            police.group.rotation.set(0, 0, 0);
            police.u = (police.u + 0.3) % 1.0;
          }, 10000);
        } else {
          this.bustedTimer += delta;
          if (this.bustedTimer > 2.6) {
            if (this.onBustedCallback) this.onBustedCallback();
          }
        }
      }
    }

    this.nearestPoliceDist = nearestPoliceDist;
    this.isPoliceNearby = nearestPoliceDist < 120;
    if (playerSpeed > 35) this.bustedTimer = Math.max(0, this.bustedTimer - delta * 2);

    if (this.wantedLevel > 0) {
      if (nearestPoliceDist > 140) {
        this.evasionTimer -= delta;
        this.isEvasionFlashing = true;
        if (this.onWantedLevelChange) {
          this.onWantedLevelChange(this.wantedLevel, true);
        }

        if (this.evasionTimer <= 0) {
          this.wantedLevel = 0;
          this.isEvasionFlashing = false;
          playerCar.totalScore += 2500;
          cyberAudio.playEvasionChime();
          if (this.onWantedLevelChange) {
            this.onWantedLevelChange(0, false);
          }
          if (this.onEvasionSuccess) {
            this.onEvasionSuccess("⭐ ПОГОНЯ СБРОШЕНА! +2500 PTS EVASION BONUS");
          }
        }
      } else {
        this.evasionTimer = 8.0;
        this.isEvasionFlashing = false;
        if (this.onWantedLevelChange) {
          this.onWantedLevelChange(this.wantedLevel, false);
        }
      }
    }

    // 7. Traffic Cars
    for (const car of this.trafficCars) {
      car.u = (car.u + car.speed * delta) % 1.0;
      const pt = this.trackCurve.getPointAt(car.u);
      const tangent = this.trackCurve.getTangentAt(car.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      car.mesh.position.copy(pt).addScaledVector(normal, car.laneOffset);
      car.mesh.position.y = 0.15;

      const lookPt = pt.clone().addScaledVector(tangent, 5).addScaledVector(normal, car.laneOffset);
      car.mesh.lookAt(lookPt.x, 0.15, lookPt.z);

      for (const w of car.wheels) {
        w.children[0].rotation.x += delta * 12;
      }

      const d = car.mesh.position.distanceTo(playerPos);
      if (d < 9.0 && playerSpeed > 110 && !car.passedAudio) {
        car.passedAudio = true;
        cyberAudio.playTrafficFlyby();
      } else if (d > 22.0) {
        car.passedAudio = false;
      }
    }
  }
}

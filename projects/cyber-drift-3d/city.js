// city.js - Pure Motorsport Realism: Level Art, Environmental Storytelling, Braking Boards (150/100/50m), Marshal Posts, 3D Foliage, Dust Particles, Wet Puddles & Crowd Cheers
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CityTrackManager {
  constructor(scene, trackIndex = 0, timeOfDay = "DAY") {
    this.scene = scene;
    this.trackIndex = trackIndex; // 0: F1 Autodrome, 1: Touge Mountain, 2: Miami Coast
    this.timeOfDay = timeOfDay; // "DAY", "SUNSET", "RAINSTORM"

    this.colliders = [];
    this.trafficCars = [];
    this.pedestrians = [];
    this.speedCameras = [];
    this.destructibleProps = [];
    this.aiRivals = [];

    // Track Meshes Group
    this.trackWorldGroup = new THREE.Group();
    this.scene.add(this.trackWorldGroup);

    this.aiRivalsGroup = new THREE.Group();
    this.scene.add(this.aiRivalsGroup);

    // Rewind buffer
    this.aiHistoryBuffer = [];
    this.maxHistoryFrames = 240;

    this.isRaining = timeOfDay === "RAINSTORM";
    this.rainParticles = null;
    this.rainGeom = null;
    this.nitroPickups = [];
    this.gameMode = "RACE"; // "RACE" or "BEACH"
    this.oceanMesh = null;
    this.shorelineFoamMesh = null;
    this.onNitroPickupCallback = null;
    this.onSpeedTrapCallback = null;
    this.onTakedownCallback = null;
    this.lastKerbRumbleTime = 0;
    this.lastCrowdCheerTime = 0;

    // 💥 3D High-Velocity Flying Car Parts & Debris System
    this.crashDebrisGroup = new THREE.Group();
    this.scene.add(this.crashDebrisGroup);
    this.activeCrashDebris = [];

    // 🚦 FIA Formula 1 Starting Lights System
    this.f1LightUnits = [];

    this.initTextures();
    this.initLighting();
    this.buildTrackEnvironment();
    this.buildMinimalistStudioGarage();
    this.buildRainSystem();
  }

  setMode(mode) {
    this.gameMode = mode;
    this.buildTrackEnvironment();
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

    this.sandTex = this._createHighResSandTexture();
    this.waterCausticTex = this._createWaterCausticsTexture();

    // High-Definition Modern Architectural Facade Textures
    this.facadeMats = [
      this._createArchitecturalMat("#1e293b", "#38bdf8", "#0f172a", 0.35),
      this._createArchitecturalMat("#334155", "#e2e8f0", "#1e222b", 0.45),
      this._createArchitecturalMat("#1e2229", "#94a3b8", "#111317", 0.55),
      this._createArchitecturalMat("#475569", "#bae6fd", "#1e293b", 0.3),
      this._createArchitecturalMat("#0f172a", "#cbd5e1", "#090d16", 0.6),
    ];
  }

  _createHighResSandTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, "#e8c99b");
    grad.addColorStop(0.5, "#dfbe8c");
    grad.addColorStop(1, "#d4b07d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Natural wind ripples
    ctx.strokeStyle = "rgba(195, 155, 100, 0.4)";
    ctx.lineWidth = 6;
    for (let y = 0; y < 1024; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < 1024; x += 64) {
        const offset = Math.sin(x * 0.02 + y * 0.01) * 8;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // Micro sand grains
    for (let i = 0; i < 90000; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 1024;
      const shade = Math.random();
      if (shade > 0.7) ctx.fillStyle = "rgba(255, 245, 220, 0.45)";
      else if (shade > 0.4) ctx.fillStyle = "rgba(175, 135, 80, 0.35)";
      else ctx.fillStyle = "rgba(230, 195, 140, 0.3)";
      ctx.fillRect(sx, sy, 2, 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40);
    tex.anisotropy = 8;
    return tex;
  }

  _createWaterCausticsTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0077b6";
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = "rgba(180, 240, 255, 0.4)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 25 + Math.random() * 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    return tex;
  }

  _createArchitecturalMat(panelColor, windowColor, frameColor, roughnessVal) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = panelColor;
    ctx.fillRect(0, 0, 512, 1024);

    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = frameColor;
      ctx.fillRect(x, 0, 6, 1024);
    }

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
      this.scene.fog.color.setHex(0x9a3412);
      this.scene.background.setHex(0x7c2d12);
      this.ambLight.color.setHex(0xfdba74);
      this.ambLight.intensity = 2.4;
      this.hemiLight.color.setHex(0xf472b6);
      this.hemiLight.groundColor.setHex(0x431407);
      this.mainSunLight.color.setHex(0xf97316);
      this.mainSunLight.position.set(750, 180, 350);
      this.mainSunLight.intensity = 4.2;
    } else if (timeOfDay === "RAINSTORM") {
      this.scene.fog.color.setHex(0x1e293b);
      this.scene.background.setHex(0x0f172a);
      this.ambLight.color.setHex(0x64748b);
      this.ambLight.intensity = 1.4;
      this.hemiLight.color.setHex(0x475569);
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.mainSunLight.color.setHex(0x94a3b8);
      this.mainSunLight.position.set(300, 600, 300);
      this.mainSunLight.intensity = 2.2;
    } else if (timeOfDay === "NIGHT") {
      this.scene.fog.color.setHex(0x070b19);
      this.scene.background.setHex(0x030712);
      this.ambLight.color.setHex(0x38bdf8);
      this.ambLight.intensity = 0.9;
      this.hemiLight.color.setHex(0x818cf8);
      this.hemiLight.groundColor.setHex(0x020617);
      this.mainSunLight.color.setHex(0x60a5fa);
      this.mainSunLight.position.set(200, 450, 200);
      this.mainSunLight.intensity = 1.4;
    } else {
      this.scene.fog.color.setHex(0x7dd3fc);
      this.scene.background.setHex(0x0284c7);
      this.ambLight.color.setHex(0xffffff);
      this.ambLight.intensity = 2.0;
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x0369a1);
      this.mainSunLight.color.setHex(0xfffaed);
      this.mainSunLight.position.set(450, 750, 350);
      this.mainSunLight.intensity = 4.0;
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
    this.pedestrians = [];
    this.speedCameras = [];
    this.destructibleProps = [];
    this.aiRivals = [];
    this.nitroPickups = [];

    if (this.gameMode === "BEACH") {
      this.buildOpenBeachWorld();
      return;
    }

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
    this.buildBrakingDistanceMarkerBoards();
    this.buildFIAMarshalPosts();
    this.build3DFoliage();
    this.buildTireBarriers();
    this.buildF1GrandstandsAndPits();
    this.buildStartFinishGantry();
    this.buildRoadsideStreetlights();
    this.buildDiverseBuildings();
    this.buildSpeedTrapCameras();
    this.buildDestructibleProps();
    this.buildAIRivals();
    this.buildRichCityTrafficFleet();
    this.buildNitroPickups();
    this.build3DSpectatorsAndPitCrew();
    this.buildStreetArtAndGraffitiWalls();
    this.buildDynamicHelicopter();
    this.buildHotAirBalloons();
  }

  // 🏖️🌊 PURE TRANQUIL OPEN BEACH & OCEAN PARADISE (Zero Racing Clutter)
  buildOpenBeachWorld() {
    const coastPoints = [
      new THREE.Vector3(10, 0.1, 0),
      new THREE.Vector3(20, 0.1, 300),
      new THREE.Vector3(30, 0.1, 600),
      new THREE.Vector3(-100, 0.1, 500),
      new THREE.Vector3(-250, 0.1, 200),
      new THREE.Vector3(-200, 0.1, -200),
      new THREE.Vector3(-100, 0.1, -500),
      new THREE.Vector3(20, 0.1, -400),
    ];
    this.trackCurve = new THREE.CatmullRomCurve3(coastPoints, true, "catmullrom", 0.4);
    this.trackSamplePoints = [];
    for (let i = 0; i < 150; i++) this.trackSamplePoints.push(this.trackCurve.getPointAt(i / 150));

    // 1. Vast Textured Golden Sand Beach & Dunes (X = -2400 to X = 0)
    const sandGeom = new THREE.PlaneGeometry(2400, 3500, 32, 32);
    sandGeom.rotateX(-Math.PI / 2);
    const sandMat = new THREE.MeshStandardMaterial({
      map: this.sandTex,
      roughness: 0.92,
      metalness: 0.05,
    });
    const sandMesh = new THREE.Mesh(sandGeom, sandMat);
    sandMesh.position.set(-1200, 0.0, 0);
    sandMesh.receiveShadow = true;
    this.trackWorldGroup.add(sandMesh);

    // 2. Realistic 3D Deep Ocean Plane with Dynamic Vertex Waves (X = 0 to X = 3500)
    this.oceanGeom = new THREE.PlaneGeometry(3500, 3500, 84, 84);
    this.oceanGeom.rotateX(-Math.PI / 2);
    this.oceanOrigPos = this.oceanGeom.attributes.position.clone();
    const oceanMat = new THREE.MeshStandardMaterial({
      map: this.waterCausticTex,
      color: 0x0077c8,
      emissive: 0x002244,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.15,
    });
    this.oceanMesh = new THREE.Mesh(this.oceanGeom, oceanMat);
    this.oceanMesh.position.set(1750, 0.02, 0);
    this.oceanMesh.receiveShadow = true;
    this.trackWorldGroup.add(this.oceanMesh);

    // 3. Crystal Clear Turquoise Shallow Lagoon along Shoreline (X = 0 to X = 80)
    const lagoonGeom = new THREE.PlaneGeometry(90, 3500, 16, 32);
    lagoonGeom.rotateX(-Math.PI / 2);
    const lagoonMat = new THREE.MeshStandardMaterial({
      map: this.waterCausticTex,
      color: 0x00b4d8,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const lagoonMesh = new THREE.Mesh(lagoonGeom, lagoonMat);
    lagoonMesh.position.set(35, 0.06, 0);
    this.trackWorldGroup.add(lagoonMesh);

    // 4. Dynamic Animated Shoreline Foam Wave Mesh right on the beach (X = 2)
    const foamGeom = new THREE.PlaneGeometry(16, 3500, 1, 64);
    foamGeom.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.shorelineFoamMesh = new THREE.Mesh(foamGeom, foamMat);
    this.shorelineFoamMesh.position.set(2, 0.10, 0);
    this.trackWorldGroup.add(this.shorelineFoamMesh);

    // 5. 🪵 Driveable Wooden Ocean Pier / Jetty (Extending from Beach X=-10 straight into Ocean X=250)
    const pierGroup = new THREE.Group();
    const woodPlankMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
    const woodPillarMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.9 });

    const deckLength = 260;
    const deckWidth = 18;
    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(deckLength, 0.5, deckWidth), woodPlankMat);
    pierDeck.position.set(deckLength / 2, 0.45, 0);
    pierDeck.receiveShadow = true;
    pierGroup.add(pierDeck);

    for (let px = 10; px <= deckLength; px += 20) {
      const pilL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), woodPillarMat);
      pilL.position.set(px, -2.5, -deckWidth / 2 + 0.6);
      const pilR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), woodPillarMat);
      pilR.position.set(px, -2.5, deckWidth / 2 - 0.6);
      pierGroup.add(pilL, pilR);

      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.4, 6), woodPillarMat);
      postL.position.set(px, 1.3, -deckWidth / 2 + 0.5);
      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.4, 6), woodPillarMat);
      postR.position.set(px, 1.3, deckWidth / 2 - 0.5);
      const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), lanternMat);
      lanternL.position.set(px, 2.1, -deckWidth / 2 + 0.5);
      const lanternR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), lanternMat);
      lanternR.position.set(px, 2.1, deckWidth / 2 - 0.5);
      pierGroup.add(postL, postR, lanternL, lanternR);
    }

    const terminalPlatform = new THREE.Mesh(new THREE.BoxGeometry(36, 0.5, 40), woodPlankMat);
    terminalPlatform.position.set(deckLength + 18, 0.45, 0);
    pierGroup.add(terminalPlatform);

    pierGroup.position.set(-10, 0, 45);
    this.trackWorldGroup.add(pierGroup);

    // 6. 🌴 Tropical Palm Trees framing the Beach
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const leavesPalm = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 });

    const makePalm = (x, z) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 12, 8), trunkMat);
      trunk.position.y = 6;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6.5, 5), leavesPalm);
        frond.position.set(0, 11.5, 0);
        frond.rotation.z = 1.1;
        frond.rotation.y = (i / 6) * Math.PI * 2;
        g.add(frond);
      }
      g.add(trunk);
      g.position.set(x, 0.10, z);
      return g;
    };

    for (let p = 0; p < 50; p++) {
      const px = -120 + Math.random() * 95;
      const pz = -450 + p * 18 + Math.random() * 8;
      this.trackWorldGroup.add(makePalm(px, pz));
    }

    // 7. 🍹 Tiki Beach Bar right near Spawn
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.95 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });

    const makeTikiBar = (bx, bz, brot) => {
      const tg = new THREE.Group();
      const counter = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 4.5), bambooMat);
      counter.position.y = 1.1;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.5, 8), thatchMat);
      roof.position.y = 4.8;
      roof.rotation.y = Math.PI / 4;

      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.8, 6), bambooMat);
      p1.position.set(-4.5, 2.0, -2.0);
      const p2 = p1.clone(); p2.position.set(4.5, 2.0, -2.0);
      const p3 = p1.clone(); p3.position.set(-4.5, 2.0, 2.0);
      const p4 = p1.clone(); p4.position.set(4.5, 2.0, 2.0);

      const surfMenu = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }));
      surfMenu.position.set(-5.5, 2.0, 0);
      surfMenu.rotation.z = 0.2;

      tg.add(counter, roof, p1, p2, p3, p4, surfMenu);
      tg.position.set(bx, 0.10, bz);
      tg.rotation.y = brot;
      this.colliders.push({ minX: bx - 6, maxX: bx + 6, minZ: bz - 4, maxZ: bz + 4 });
      return tg;
    };

    this.trackWorldGroup.add(makeTikiBar(-15, -35, 0.2));
    this.trackWorldGroup.add(makeTikiBar(-20, 160, -0.4));

    // 8. 🏄 Colorful Surfboards planted in the sand right in view
    const surfColors = [0xef4444, 0x38bdf8, 0xf59e0b, 0x10b981, 0xec4899];
    for (let s = 0; s < 16; s++) {
      const color = surfColors[s % surfColors.length];
      const surfMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.25, metalness: 0.2 });
      const surfboard = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.8, 0.16), surfMat);
      surfboard.position.set(-4 + (s % 3) * 2, 1.8, -120 + s * 18);
      surfboard.rotation.z = (Math.random() - 0.5) * 0.3;
      surfboard.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      this.trackWorldGroup.add(surfboard);
    }

    // 9. 🏖️ Striped Beach Parasols & Loungers along the shore
    const umbrellaMat1 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const umbrellaMat2 = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const umbrellaMat3 = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8 });
    const loungerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

    for (let b = 0; b < 25; b++) {
      const g = new THREE.Group();
      const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), poleMat);
      uPole.position.y = 1.7;
      const uMat = b % 3 === 0 ? umbrellaMat1 : (b % 3 === 1 ? umbrellaMat2 : umbrellaMat3);
      const uCone = new THREE.Mesh(new THREE.ConeGeometry(2.8, 0.9, 14), uMat);
      uCone.position.y = 3.4;

      const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 3.2), loungerMat);
      lounger.position.set(1.2, 0.18, 0);

      g.add(uPole, uCone, lounger);
      g.position.set(-15 + Math.random() * 8, 0.10, -220 + b * 20);
      this.trackWorldGroup.add(g);
    }

    // 10. ⚓ Luxury Ocean Yachts Bobbing on Waves right in the Bay
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
    const glassBlue = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });

    const makeYacht = (x, z, rot) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 4.5, 44), hullMat);
      hull.position.y = 1.4;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(12, 5.5, 24), deckMat);
      cabin.position.set(0, 5.2, -3);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(9, 3.5, 12), glassBlue);
      bridge.position.set(0, 8.8, 0);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 18, 8), hullMat);
      mast.position.set(0, 14, -6);
      g.add(hull, cabin, bridge, mast);
      g.position.set(x, 0.0, z);
      g.rotation.y = rot;
      return g;
    };

    this.trackWorldGroup.add(makeYacht(180, 0, 0.4));
    this.trackWorldGroup.add(makeYacht(320, -140, -0.6));
    this.trackWorldGroup.add(makeYacht(420, 200, 1.2));
    this.trackWorldGroup.add(makeYacht(580, -300, 2.1));
  }

  // ⚡ REALISTIC 3D NOS / N2O NITROUS OXIDE CYLINDERS
  buildNitroPickups() {
    const pickupU = [0.07, 0.19, 0.33, 0.47, 0.59, 0.71, 0.83, 0.94];
    const nosBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.92,
      roughness: 0.15,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.98,
      roughness: 0.1,
    });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    const bottleGeom = new THREE.CylinderGeometry(0.38, 0.38, 1.6, 16);
    const neckGeom = new THREE.CylinderGeometry(0.14, 0.22, 0.35, 12);
    const valveGeom = new THREE.BoxGeometry(0.24, 0.18, 0.24);
    const ringGeom = new THREE.TorusGeometry(0.85, 0.04, 8, 24);
    ringGeom.rotateX(Math.PI / 2);

    for (let i = 0; i < pickupU.length; i++) {
      const u = pickupU[i];
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const laneOffset = (i % 3 === 0 ? -6.0 : (i % 3 === 1 ? 6.0 : 0.0));
      const pos = pt.clone().addScaledVector(normal, laneOffset);

      const g = new THREE.Group();

      const bottle = new THREE.Mesh(bottleGeom, nosBlueMat);
      bottle.position.y = 0.8;

      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.4, 16), whiteMat);
      stripe.position.y = 0.8;

      const neck = new THREE.Mesh(neckGeom, chromeMat);
      neck.position.y = 1.7;

      const valve = new THREE.Mesh(valveGeom, chromeMat);
      valve.position.y = 1.95;

      const ring = new THREE.Mesh(ringGeom, glowRingMat);
      ring.position.y = 0.05;

      g.add(bottle, stripe, neck, valve, ring);
      g.position.set(pos.x, 0.6, pos.z);
      this.trackWorldGroup.add(g);

      this.nitroPickups.push({
        mesh: g,
        u: u,
        baseY: 0.6,
        collected: false,
        respawnTimer: 0,
      });
    }
  }

  // 🏁 BRAKING DISTANCE BOARDS (150m, 100m, 50m)
  buildBrakingDistanceMarkerBoards() {
    const boardGroup = new THREE.Group();
    const turns = [0.10, 0.22, 0.42, 0.62, 0.82];
    const halfWidth = this.trackWidth / 2;

    const makeSign = (distText, pos, tangent, normal) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 72px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(distText, 128, 90);

      const tex = new THREE.CanvasTexture(c);
      const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

      const g = new THREE.Group();
      const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), signMat);
      board.position.set(0, 2.4, 0);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), postMat);
      post.position.set(0, 1.2, 0);

      g.add(board, post);
      g.position.set(pos.x, 0.10, pos.z);
      g.lookAt(pos.x - tangent.x, 0.10, pos.z - tangent.z);
      return g;
    };

    for (const u of turns) {
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const p150 = this.trackCurve.getPointAt((u - 0.024 + 1.0) % 1.0).addScaledVector(normal, halfWidth + 2.5);
      const p100 = this.trackCurve.getPointAt((u - 0.016 + 1.0) % 1.0).addScaledVector(normal, halfWidth + 2.5);
      const p50 = this.trackCurve.getPointAt((u - 0.008 + 1.0) % 1.0).addScaledVector(normal, halfWidth + 2.5);

      boardGroup.add(makeSign("150", p150, tangent, normal));
      boardGroup.add(makeSign("100", p100, tangent, normal));
      boardGroup.add(makeSign("50", p50, tangent, normal));
    }

    this.trackWorldGroup.add(boardGroup);
  }

  // 🚩 FIA MARSHAL POSTS WITH SIGNAL FLAGS
  buildFIAMarshalPosts() {
    const postGroup = new THREE.Group();
    const halfWidth = this.trackWidth / 2;
    const postLocations = [0.18, 0.48, 0.74, 0.92];

    const hutMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const flagMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

    for (const u of postLocations) {
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const pos = pt.clone().addScaledVector(normal, halfWidth + 7.0);

      const g = new THREE.Group();
      const hut = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.2, 4.0), hutMat);
      hut.position.y = 1.6;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.5, 4), roofMat);
      roof.position.y = 3.9;
      roof.rotation.y = Math.PI / 4;

      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8), hutMat);
      flagPole.position.set(2.0, 3.5, 0);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), flagMat);
      flag.position.set(2.8, 5.2, 0);

      g.add(hut, roof, flagPole, flag);
      g.position.set(pos.x, 0.10, pos.z);
      g.lookAt(pt.x, 0.10, pt.z);
      postGroup.add(g);
    }

    this.trackWorldGroup.add(postGroup);
  }

  // 🌴🌲 3D ROADSIDE FOLIAGE & BIOME TREES
  build3DFoliage() {
    const foliageGroup = new THREE.Group();
    const halfWidth = this.trackWidth / 2;

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const leavesGreen = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 });
    const leavesPalm = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 });

    const makePalm = (x, z) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 12, 8), trunkMat);
      trunk.position.y = 6;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;

      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6.5, 5), leavesPalm);
        frond.position.set(0, 11.5, 0);
        frond.rotation.z = 1.1;
        frond.rotation.y = (i / 6) * Math.PI * 2;
        g.add(frond);
      }
      g.add(trunk);
      g.position.set(x, 0.10, z);
      return g;
    };

    const makePine = (x, z) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 10, 8), trunkMat);
      trunk.position.y = 5;

      for (let k = 0; k < 4; k++) {
        const layer = new THREE.Mesh(new THREE.ConeGeometry(5.0 - k * 1.0, 4.0, 8), leavesGreen);
        layer.position.y = 5 + k * 2.6;
        g.add(layer);
      }
      g.add(trunk);
      g.position.set(x, 0.10, z);
      return g;
    };

    const count = 45;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const offsetL = halfWidth + 8.0 + Math.random() * 18.0;
      const offsetR = -(halfWidth + 8.0 + Math.random() * 18.0);

      const posL = pt.clone().addScaledVector(normal, offsetL);
      const posR = pt.clone().addScaledVector(normal, offsetR);

      if (this.trackIndex === 2) {
        // Miami Coast Palms
        foliageGroup.add(makePalm(posL.x, posL.z));
        if (i % 2 === 0) foliageGroup.add(makePalm(posR.x, posR.z));
      } else {
        // Autodrome & Touge Conifers / Park Trees
        foliageGroup.add(makePine(posL.x, posL.z));
        if (i % 2 === 0) foliageGroup.add(makePine(posR.x, posR.z));
      }
    }

    this.trackWorldGroup.add(foliageGroup);
  }

  buildMinimalistStudioGarage() {
    this.garageGroup = new THREE.Group();

    const softboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const softbox1 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 10), softboxMat);
    softbox1.position.set(0, 15, 0);
    this.garageGroup.add(softbox1);

    const keySpot = new THREE.SpotLight(0xffffff, 4.5, 45, Math.PI / 3, 0.3);
    keySpot.position.set(0, 14, 0);
    this.garageGroup.add(keySpot);

    const sideSpot1 = new THREE.DirectionalLight(0xffffff, 1.8);
    sideSpot1.position.set(15, 12, 15);
    const sideSpot2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    sideSpot2.position.set(-15, 10, -15);
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

    const addStand = (x, z, rotY) => {
      standsGroup.add(makeGrandstand(x, z, rotY));
      this.colliders.push({ minX: x - 12, maxX: x + 12, minZ: z - 20, maxZ: z + 20 });
    };

    addStand(34, 100, Math.PI / 2);
    addStand(34, 220, Math.PI / 2);
    addStand(-34, 100, -Math.PI / 2);
    addStand(-34, 220, -Math.PI / 2);

    this.trackWorldGroup.add(standsGroup);
  }

  buildStartFinishGantry() {
    const halfWidth = this.trackWidth / 2;
    const g = new THREE.Group();

    this.f1LightUnits = [];

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x111216, metalness: 0.9, roughness: 0.25 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.3, metalness: 0.8 });

    // 1. Heavy Industrial Support Pillars & Concrete Crash Barriers
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 17, 16), trussMat);
    pillarL.position.set(-halfWidth - 4.5, 8.5, 0);
    const barrierL = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 8.0), barrierMat);
    barrierL.position.set(-halfWidth - 4.5, 1.1, 0);

    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 17, 16), trussMat);
    pillarR.position.set(halfWidth + 4.5, 8.5, 0);
    const barrierR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 8.0), barrierMat);
    barrierR.position.set(halfWidth + 4.5, 1.1, 0);

    // 2. Overhead Truss Lattice Crossbeams
    const upperSpan = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth + 10, 1.8, 2.8), trussMat);
    upperSpan.position.set(0, 16.0, 0);

    const lowerSpan = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth + 8, 1.2, 2.2), trussMat);
    lowerSpan.position.set(0, 10.5, 0);

    // Diagonal support struts
    for (let x = -halfWidth + 2; x <= halfWidth - 2; x += 6) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.8, 8), trussMat);
      strut.position.set(x, 13.25, 0);
      strut.rotation.z = (x % 12 === 0 ? 0.45 : -0.45);
      g.add(strut);
    }

    // 3. F1 Official Timing & Rolex/Pirelli Grand Prix Digital Banner
    const bannerCanvas = document.createElement("canvas");
    bannerCanvas.width = 1024;
    bannerCanvas.height = 256;
    const bCtx = bannerCanvas.getContext("2d");
    bCtx.fillStyle = "#090d16";
    bCtx.fillRect(0, 0, 1024, 256);

    // Checkered cyber border
    for (let x = 0; x < 1024; x += 32) {
      for (let y = 0; y < 256; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          bCtx.fillStyle = "#1e293b";
          bCtx.fillRect(x, y, 32, 32);
        }
      }
    }
    bCtx.fillStyle = "#020617";
    bCtx.fillRect(40, 24, 944, 208);

    const titleText = this.trackIndex === 1 ? "TOUGE MOUNTAIN GP" : (this.trackIndex === 2 ? "MIAMI GRAND PRIX" : "FORMULA 1 GRAND PRIX");

    bCtx.fillStyle = "#e2e8f0";
    bCtx.font = "900 56px Segoe UI, Arial, sans-serif";
    bCtx.textAlign = "center";
    bCtx.fillText(`🏁 ${titleText}`, 512, 95);

    bCtx.fillStyle = "#38bdf8";
    bCtx.font = "800 28px Segoe UI, sans-serif";
    bCtx.fillText("FIA OFFICIAL TIMING • LIGHTS OUT START", 512, 145);

    bCtx.fillStyle = "#ef4444";
    bCtx.font = "700 20px Segoe UI, sans-serif";
    bCtx.fillText("⚫ ⚫ ⚫ ⚫ ⚫", 512, 195);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.35, metalness: 0.5 });

    const bannerF = new THREE.Mesh(new THREE.PlaneGeometry(32, 7.5), bannerMat);
    bannerF.position.set(0, 16.0, 1.45);
    const bannerB = bannerF.clone();
    bannerB.position.z = -1.45;
    bannerB.rotation.y = Math.PI;

    g.add(pillarL, barrierL, pillarR, barrierR, upperSpan, lowerSpan, bannerF, bannerB);

    // 4. 🚦 5 FIA FORMULA 1 STARTING LIGHT PODS (CLUSTERS)
    // Ordered strictly LEFT TO RIGHT (X: -5.2 -> +5.2) facing oncoming cars at Z = 0..16
    const podSpacing = 2.6;
    const bulbGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.18, 28);
    bulbGeom.rotateX(Math.PI / 2);

    const visorGeom = new THREE.CylinderGeometry(0.54, 0.54, 0.55, 28, 1, true, 0, Math.PI);
    visorGeom.rotateZ(Math.PI);
    visorGeom.rotateX(Math.PI / 2);

    const haloGeom = new THREE.SphereGeometry(0.68, 16, 16);

    for (let i = 0; i < 5; i++) {
      const podX = (i - 2) * podSpacing; // i=0 is FAR LEFT (-5.2), i=4 is FAR RIGHT (+5.2)
      const podGroup = new THREE.Group();
      podGroup.position.set(podX, 6.8, -0.6);

      // Matte Black Pod Housing (FIA Box)
      const housingMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 3.8, 0.7),
        darkSteelMat
      );
      housingMesh.castShadow = true;
      podGroup.add(housingMesh);

      // Suspension Steel Struts attaching Pod to Overhead Gantry Truss
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.0, 8), trussMat);
      hanger.position.set(0, 3.2, 0);
      podGroup.add(hanger);

      // 3 Vertical Lamps per Pod:
      // Top: Status Light (Pure Radioactive Green #00ff44)
      const topBulbMat = new THREE.MeshStandardMaterial({
        color: 0x051a0e,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.1,
        metalness: 0.2,
      });
      const topBulb = new THREE.Mesh(bulbGeom, topBulbMat);
      topBulb.position.set(0, 1.15, -0.36);
      const topVisor = new THREE.Mesh(visorGeom, hoodMat);
      topVisor.position.set(0, 1.15, -0.55);
      topVisor.rotation.y = Math.PI;

      const topHaloMat = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const topHalo = new THREE.Mesh(haloGeom, topHaloMat);
      topHalo.position.set(0, 1.15, -0.42);
      podGroup.add(topBulb, topVisor, topHalo);

      // Middle: Red LED 1 (Pure Crimson Neon Red #ff0022)
      const red1BulbMat = new THREE.MeshStandardMaterial({
        color: 0x240206,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.1,
        metalness: 0.2,
      });
      const red1Bulb = new THREE.Mesh(bulbGeom, red1BulbMat);
      red1Bulb.position.set(0, 0.0, -0.36);
      const red1Visor = new THREE.Mesh(visorGeom, hoodMat);
      red1Visor.position.set(0, 0.0, -0.55);
      red1Visor.rotation.y = Math.PI;

      const red1HaloMat = new THREE.MeshBasicMaterial({
        color: 0xff0022,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const red1Halo = new THREE.Mesh(haloGeom, red1HaloMat);
      red1Halo.position.set(0, 0.0, -0.42);
      podGroup.add(red1Bulb, red1Visor, red1Halo);

      // Bottom: Red LED 2 (Pure Crimson Neon Red #ff0022)
      const red2BulbMat = new THREE.MeshStandardMaterial({
        color: 0x240206,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.1,
        metalness: 0.2,
      });
      const red2Bulb = new THREE.Mesh(bulbGeom, red2BulbMat);
      red2Bulb.position.set(0, -1.15, -0.36);
      const red2Visor = new THREE.Mesh(visorGeom, hoodMat);
      red2Visor.position.set(0, -1.15, -0.55);
      red2Visor.rotation.y = Math.PI;

      const red2HaloMat = new THREE.MeshBasicMaterial({
        color: 0xff0022,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const red2Halo = new THREE.Mesh(haloGeom, red2HaloMat);
      red2Halo.position.set(0, -1.15, -0.42);
      podGroup.add(red2Bulb, red2Visor, red2Halo);

      // Dynamic Point Light illuminating the track asphalt & car hood in front of the gantry
      const pointLight = new THREE.PointLight(0xff0022, 0.0, 55, 1.1);
      pointLight.position.set(0, 0.0, -2.2);
      podGroup.add(pointLight);

      this.f1LightUnits.push({
        topBulbMat,
        topHaloMat,
        red1BulbMat,
        red1HaloMat,
        red2BulbMat,
        red2HaloMat,
        pointLight,
      });

      g.add(podGroup);
    }

    // 5. Checkered Finish Line & Grid Boxes
    const checkLineGeom = new THREE.PlaneGeometry(this.trackWidth, 4);
    checkLineGeom.rotateX(-Math.PI / 2);
    const checkLine = new THREE.Mesh(checkLineGeom, bannerMat);
    checkLine.position.set(0, 0.11, 0);
    g.add(checkLine);

    const gridBoxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const gridPositions = [
      { x: -5.5, z: -12 },
      { x: 5.5, z: -12 },
      { x: -5.5, z: -26 },
      { x: 5.5, z: -26 },
    ];

    gridPositions.forEach((pos) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.02, 9.8), gridBoxMat);
      box.position.set(pos.x, 0.11, pos.z);
      g.add(box);
    });

    // Place Gantry directly across the track at Z = 32 facing the grid cars at Z = 0..16
    g.position.set(0, 0, 32);
    this.trackWorldGroup.add(g);
  }

  // 🚦 FIA FORMULA 1 STARTING LIGHTS CONTROLLER (Strictly Left-to-Right + Vibrant Crimson & Emerald)
  setF1StartLights(activeRedCount, isGreen = false) {
    if (!this.f1LightUnits || this.f1LightUnits.length === 0) return;

    for (let i = 0; i < this.f1LightUnits.length; i++) {
      const unit = this.f1LightUnits[i];
      if (activeRedCount >= (i + 1)) {
        // Red lights ON for this pod (from i=0 Left to i=4 Right)
        unit.red1BulbMat.color.setHex(0xff0022);
        unit.red1BulbMat.emissive.setHex(0xff0011);
        unit.red1BulbMat.emissiveIntensity = 8.5;
        unit.red1HaloMat.opacity = 0.85;

        unit.red2BulbMat.color.setHex(0xff0022);
        unit.red2BulbMat.emissive.setHex(0xff0011);
        unit.red2BulbMat.emissiveIntensity = 8.5;
        unit.red2HaloMat.opacity = 0.85;

        unit.topBulbMat.emissiveIntensity = 0.0;
        unit.topHaloMat.opacity = 0.0;

        unit.pointLight.color.setHex(0xff0022);
        unit.pointLight.intensity = 6.5;
      } else if (isGreen) {
        // Saturated Green Go Light ON
        unit.red1BulbMat.emissiveIntensity = 0.0;
        unit.red1HaloMat.opacity = 0.0;
        unit.red2BulbMat.emissiveIntensity = 0.0;
        unit.red2HaloMat.opacity = 0.0;

        unit.topBulbMat.color.setHex(0x00ff44);
        unit.topBulbMat.emissive.setHex(0x00ff33);
        unit.topBulbMat.emissiveIntensity = 9.5;
        unit.topHaloMat.opacity = 0.95;

        unit.pointLight.color.setHex(0x00ff44);
        unit.pointLight.intensity = 8.0;
      } else {
        // All Lights OFF
        unit.red1BulbMat.emissiveIntensity = 0.0;
        unit.red1HaloMat.opacity = 0.0;
        unit.red2BulbMat.emissiveIntensity = 0.0;
        unit.red2HaloMat.opacity = 0.0;

        unit.topBulbMat.emissiveIntensity = 0.0;
        unit.topHaloMat.opacity = 0.0;

        unit.pointLight.intensity = 0.0;
      }
    }
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
      for (let i = 0; i < this.trackSamplePoints.length; i++) {
        const pt = this.trackSamplePoints[i];
        const d = Math.hypot(x - pt.x, z - pt.z);
        if (d < minD) minD = d;
      }
      return minD;
    };

    if (this.trackIndex === 1) {
      // 🏔️ TOUGE MOUNTAIN PASS - Cliffs, Rocks, Torii Gates & Mountain Lanterns
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x334d28, roughness: 0.9 });
      const toriiMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
      const toriiBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });

      // Mountain Cliff Ridges (Strict minimum clearance so mountains never touch road)
      for (let x = -800; x <= 800; x += 110) {
        for (let z = -800; z <= 800; z += 110) {
          const dist = getMinDistToTrack(x, z);
          if (dist < 80) continue; // Guarantees a wide, clear 80m safety corridor around the entire track!

          const baseRadius = 24 + Math.random() * 16;
          const cliffHeight = 45 + Math.random() * 95;
          const cliffGeom = new THREE.ConeGeometry(baseRadius, cliffHeight, 6);
          const cliff = new THREE.Mesh(cliffGeom, Math.random() > 0.4 ? rockMat : mossMat);
          cliff.position.set(x, cliffHeight / 2, z);
          cliff.rotation.y = Math.random() * Math.PI;
          cityGroup.add(cliff);
        }
      }

      // Traditional Japanese Torii Gate on Mountain Apex
      const toriiU = [0.28, 0.72];
      for (const u of toriiU) {
        const pt = this.trackCurve.getPointAt(u);
        const tangent = this.trackCurve.getTangentAt(u).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const tg = new THREE.Group();
        const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 14, 10), toriiMat);
        colL.position.set(-this.trackWidth / 2 - 2, 7, 0);
        const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 14, 10), toriiMat);
        colR.position.set(this.trackWidth / 2 + 2, 7, 0);

        const beamTop = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth + 12, 1.2, 1.4), toriiMat);
        beamTop.position.set(0, 13.8, 0);
        const capTop = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth + 14, 0.4, 1.8), toriiBlackMat);
        capTop.position.set(0, 14.5, 0);
        const beamSub = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth + 8, 0.8, 0.9), toriiMat);
        beamSub.position.set(0, 11.2, 0);

        tg.add(colL, colR, beamTop, capTop, beamSub);
        tg.position.set(pt.x, 0, pt.z);
        tg.lookAt(pt.x + tangent.x, 0, pt.z + tangent.z);
        cityGroup.add(tg);
      }
    } else {
      // 🏙️ F1 AUTODROME & MIAMI COAST - Modern Architectural Towers
      let bldgIndex = 0;
      for (let x = -800; x <= 800; x += 120) {
        for (let z = -800; z <= 800; z += 120) {
          const distToTrack = getMinDistToTrack(x, z);
          if (distToTrack < 75) continue; // Wide clearance from track edges

          bldgIndex++;
          const facadeMat = this.facadeMats[bldgIndex % this.facadeMats.length];
          const height = 100 + Math.random() * 220;
          const w = 44;
          const d = 44;

          const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), facadeMat);
          bldg.position.set(x, height / 2, z);
          bldg.castShadow = true;
          cityGroup.add(bldg);

          this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        }
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
    const coneGeom = new THREE.ConeGeometry(0.42, 1.15, 14);
    const coneBaseGeom = new THREE.BoxGeometry(0.78, 0.12, 0.78);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.35, metalness: 0.1 });
    const rubberBaseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const retroReflectiveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.4, emissive: 0x222222 });

    for (let i = 0; i < 20; i++) {
      const u = (i / 20);
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const g = new THREE.Group();
      const cone = new THREE.Mesh(coneGeom, coneMat);
      cone.position.y = 0.58;

      const base = new THREE.Mesh(coneBaseGeom, rubberBaseMat);
      base.position.y = 0.06;

      const stripeUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 14), retroReflectiveMat);
      stripeUpper.position.y = 0.72;

      const stripeLower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 14), retroReflectiveMat);
      stripeLower.position.y = 0.45;

      g.add(cone, base, stripeUpper, stripeLower);

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
    this.randomizeAIRivals();
  }

  randomizeAIRivals() {
    while (this.aiRivalsGroup.children.length > 0) {
      this.aiRivalsGroup.remove(this.aiRivalsGroup.children[0]);
    }
    this.aiRivals = [];

    const carModels = [
      ["GT-R R34", 0],
      ["911 GT3 RS", 1],
      ["Venom F5", 2],
      ["M3 E46 GTR", 3],
      ["Supra MK4", 4],
      ["Aventador SVJ", 5],
    ];

    const driverNicknames = [
      "Ghost", "Akira", "⚡ Razor", "Torretto", "Diablo", "Viper", "Klaus",
      "Kenji", "Ryosuke", "SpeedHunter", "Shadow", "Apex", "Phantom", "Tatsuya"
    ];

    const colorPalette = [
      0x1d4ed8, // Bayside Blue Pearl
      0xdc2626, // Rosso Corsa Red
      0x1e293b, // Satin Slate
      0x84cc16, // Acid Lime
      0xeab308, // Austin Gold Yellow
      0x94a3b8, // Silver Metallic
      0x7c3aed, // Midnight Violet
      0xf97316, // Sunset Orange
      0x0284c7, // Miami Cyan
      0x18181b, // Jet Obsidian Black
      0xf8fafc, // Pearl White
      0xe11d48, // Ruby Crimson
    ];

    const rimPalette = [0xd4d4d8, 0xeab308, 0x18181b, 0xb45309];
    const neonPalette = [0x00f0ff, 0x39ff14, 0xff007f, 0xffd700, 0xff073a, 0xa855f7, 0x38bdf8];

    // Pick 3 random, distinct rivals
    const shuffledNicknames = [...driverNicknames].sort(() => 0.5 - Math.random());
    const shuffledColors = [...colorPalette].sort(() => 0.5 - Math.random());
    const shuffledRims = [...rimPalette].sort(() => 0.5 - Math.random());
    const shuffledNeons = [...neonPalette].sort(() => 0.5 - Math.random());
    const shuffledCars = [...carModels].sort(() => 0.5 - Math.random());

    const baseConfigs = [
      { u: 0.008, lane: 5.5, baseSpeedU: 0.0202 },  // Leader ~236 km/h
      { u: 0.008, lane: -5.5, baseSpeedU: 0.0192 }, // P2 ~225 km/h
      { u: 0.0025, lane: -5.5, baseSpeedU: 0.0182 },// P3 ~215 km/h
    ];

    for (let i = 0; i < 3; i++) {
      const carChoice = shuffledCars[i % shuffledCars.length];
      const nick = shuffledNicknames[i];
      const displayName = `${nick} [${carChoice[0]}]`;

      const rivalSpec = {
        name: displayName,
        carType: carChoice[1],
        color: shuffledColors[i],
        rimColor: shuffledRims[i % shuffledRims.length],
        neonColor: shuffledNeons[i % shuffledNeons.length],
        u: baseConfigs[i].u,
        lane: baseConfigs[i].lane,
        baseSpeedU: baseConfigs[i].baseSpeedU,
      };

      const { group: g, wheels } = this._buildDetailedAIRivalCar(rivalSpec);

      const nameCanvas = document.createElement("canvas");
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nCtx = nameCanvas.getContext("2d");
      nCtx.fillStyle = "rgba(15, 23, 42, 0.92)";
      nCtx.roundRect(0, 0, 256, 64, 12);
      nCtx.fill();
      nCtx.strokeStyle = "#38bdf8";
      nCtx.lineWidth = 3;
      nCtx.stroke();
      nCtx.fillStyle = "#ffffff";
      nCtx.font = "900 22px Segoe UI, sans-serif";
      nCtx.textAlign = "center";
      nCtx.fillText(rivalSpec.name, 128, 40);

      const nameTex = new THREE.CanvasTexture(nameCanvas);
      const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, side: THREE.DoubleSide }));
      namePlate.position.set(0, 3.4, 0);
      g.add(namePlate);

      const pt = this.trackCurve.getPointAt(rivalSpec.u);
      g.position.set(pt.x, 0.15, pt.z);
      this.aiRivalsGroup.add(g);

      this.aiRivals.push({
        name: rivalSpec.name,
        mesh: g,
        wheels: wheels,
        u: rivalSpec.u,
        laneOffset: rivalSpec.lane,
        baseSpeedU: rivalSpec.baseSpeedU,
        currentSpeedU: 0.0,
        lapsCompleted: 0,
        namePlate: namePlate,
        mass: 1.0,
        radius: 3.4,
        knockbackOffset: new THREE.Vector3(),
        knockbackVelocity: new THREE.Vector3(),
        yawOffset: 0,
        yawVelocity: 0,
        lastCollisionTime: 0,
      });
    }
  }

  _buildDetailedAIRivalCar(rival) {
    const g = new THREE.Group();
    const wheels = [];

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: rival.color,
      metalness: 0.9,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.35, metalness: 0.7 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.9, transmission: 0.7, transparent: true, opacity: 0.92 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: rival.rimColor || 0xd4d4d8, metalness: 0.92, roughness: 0.18 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.3 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    // 1. Car Type Specific Body Shapes
    if (rival.carType === 0) {
      // Nissan Skyline GT-R R34 Spec
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.76, 9.2), paintMat);
      chassis.position.y = 0.68;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.7, 4.8), glassMat);
      cabin.position.set(0, 1.35, -0.2);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 3.8), carbonMat);
      roof.position.set(0, 1.7, -0.2);
      const hoodVents = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.8), carbonMat);
      hoodVents.position.set(0, 1.08, 2.5);
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.1, 1.2), carbonMat);
      splitter.position.set(0, 0.32, 4.6);

      // Skyline Taillights
      for (let k = -1; k <= 1; k += 2) {
        const tl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16), tlMat);
        tl1.rotateX(Math.PI / 2);
        tl1.position.set(k * 1.4, 0.75, -4.61);
        const tl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), tlMat);
        tl2.rotateX(Math.PI / 2);
        tl2.position.set(k * 0.9, 0.75, -4.61);
        g.add(tl1, tl2);
      }
      g.add(chassis, cabin, roof, hoodVents, splitter);
    } else if (rival.carType === 1) {
      // Porsche 911 GT3 RS
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 9.0), paintMat);
      chassis.position.y = 0.65;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.68, 4.4), glassMat);
      cabin.position.set(0, 1.32, -0.5);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 3.4), carbonMat);
      roof.position.set(0, 1.66, -0.5);
      const rearFenderL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 3.8), paintMat);
      rearFenderL.position.set(2.25, 0.72, -2.4);
      const rearFenderR = rearFenderL.clone();
      rearFenderR.position.x = -2.25;
      const frontWedge = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.0, 4), paintMat);
      frontWedge.rotateX(Math.PI / 2);
      frontWedge.position.set(0, 0.6, 4.5);
      const tlBar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.1), tlMat);
      tlBar.position.set(0, 0.78, -4.51);
      g.add(chassis, cabin, roof, rearFenderL, rearFenderR, frontWedge, tlBar);
    } else if (rival.carType === 3) {
      // BMW M3 E46 GTR
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.74, 9.1), paintMat);
      chassis.position.y = 0.67;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.72, 4.6), glassMat);
      cabin.position.set(0, 1.38, -0.3);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 3.6), carbonMat);
      roof.position.set(0, 1.74, -0.3);
      const powerBulge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 2.6), paintMat);
      powerBulge.position.set(0, 1.08, 2.2);
      const dtmFlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 3.4), paintMat);
      dtmFlL.position.set(2.22, 0.68, 2.4);
      const dtmFlR = dtmFlL.clone();
      dtmFlR.position.x = -2.22;
      const dtmRlL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.68, 3.6), paintMat);
      dtmRlL.position.set(2.26, 0.7, -2.4);
      const dtmRlR = dtmRlL.clone();
      dtmRlR.position.x = -2.26;
      g.add(chassis, cabin, roof, powerBulge, dtmFlL, dtmFlR, dtmRlL, dtmRlR);
    } else if (rival.carType === 4) {
      // Toyota Supra MK4
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.74, 9.2), paintMat);
      chassis.position.y = 0.66;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.66, 4.6), glassMat);
      cabin.position.set(0, 1.3, -0.3);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 3.6), carbonMat);
      roof.position.set(0, 1.62, -0.3);
      const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 2.2), paintMat);
      hoodScoop.position.set(0, 1.05, 2.5);
      g.add(chassis, cabin, roof, hoodScoop);
    } else {
      // Lamborghini Aventador SVJ / Venom F5
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.58, 9.8), paintMat);
      chassis.position.y = 0.58;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.58, 4.2), glassMat);
      cabin.position.set(0, 1.15, -0.2);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 3.0), carbonMat);
      roof.position.set(0, 1.44, -0.2);
      const sideScoopL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 2.2), carbonMat);
      sideScoopL.position.set(2.42, 0.65, -1.8);
      const sideScoopR = sideScoopL.clone();
      sideScoopR.position.x = -2.42;
      const frontWedge = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.8, 3), paintMat);
      frontWedge.rotateX(Math.PI / 2);
      frontWedge.position.set(0, 0.52, 4.8);
      g.add(chassis, cabin, roof, sideScoopL, sideScoopR, frontWedge);
    }

    // 2. High GT Carbon Wing
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.3), carbonMat);
    postL.position.set(1.4, 1.25, -4.2);
    const postR = postL.clone();
    postR.position.x = -1.4;
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.2), carbonMat);
    wingBlade.position.set(0, 1.6, -4.2);
    g.add(postL, postR, wingBlade);

    // 3. Headlights & Taillights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.1), hlMat);
    hlL.position.set(1.45, 0.75, 4.61);
    const hlR = hlL.clone();
    hlR.position.x = -1.45;
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.1), tlMat);
    tlL.position.set(1.2, 0.72, -4.61);
    const tlR = tlL.clone();
    tlR.position.x = -1.2;
    g.add(hlL, hlR, tlL, tlR);

    // 4. Titanium Dual Exhaust Tips
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 });
    const tipL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), exhaustMat);
    tipL.rotateX(Math.PI / 2);
    tipL.position.set(0.95, 0.45, -4.75);
    const tipR = tipL.clone();
    tipR.position.x = -0.95;
    g.add(tipL, tipR);

    // 5. 3D Wheels with Rim Spoke Detailing & Brake Calipers
    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.45, 18);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.47, 16);
    rimGeom.rotateZ(Math.PI / 2);
    const brakeGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.42, 14);
    brakeGeom.rotateZ(Math.PI / 2);
    const caliperGeom = new THREE.BoxGeometry(0.18, 0.28, 0.32);

    const makeWheel = (x, z) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      const brake = new THREE.Mesh(brakeGeom, new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.95 }));
      const caliper = new THREE.Mesh(caliperGeom, caliperMat);
      caliper.position.set(x > 0 ? -0.1 : 0.1, 0.2, 0.1);
      wg.add(tire, rim, brake, caliper);
      wg.position.set(x, 0.52, z);
      g.add(wg);
      wheels.push(wg);
    };

    makeWheel(1.95, 2.7);
    makeWheel(-1.95, 2.7);
    makeWheel(1.95, -2.7);
    makeWheel(-1.95, -2.7);

    // 6. Underglow RGB Neon (Glowing Ground Reflection)
    if (rival.neonColor) {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d");
      const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.5, "rgba(255, 255, 255, 0.6)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const neonTex = new THREE.CanvasTexture(c);
      const neonMat = new THREE.MeshBasicMaterial({
        map: neonTex,
        color: rival.neonColor,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const neonMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 9.4), neonMat);
      neonMesh.rotateX(-Math.PI / 2);
      neonMesh.position.set(0, 0.06, 0);
      g.add(neonMesh);
    }

    // 7. Pilot Helmet inside cockpit
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }));
    helmet.scale.set(0.9, 1.05, 1.0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.25), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.95 }));
    visor.position.set(0, 0.05, 0.25);
    const pilot = new THREE.Group();
    pilot.add(helmet, visor);
    pilot.position.set(-0.7, 1.35, -0.2);
    g.add(pilot);

    return { group: g, wheels: wheels };
  }

  // 🚒 🚌 🏎️ DIVERSE HIGH-DETAIL CITY VEHICLE FLEET BUILDERS
  _buildFireTruck() {
    const g = new THREE.Group();
    const redMat = new THREE.MeshPhysicalMaterial({ color: 0xb91c1c, roughness: 0.2, metalness: 0.7, clearcoat: 1.0 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.9, transmission: 0.8, transparent: true });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const strobeRedMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const strobeAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const cab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.8, 4.2), redMat);
    cab.position.set(0, 2.0, 4.2);

    const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.4, 4.22), whiteMat);
    cabStripe.position.set(0, 1.3, 4.2);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 0.1), glassMat);
    windshield.position.set(0, 2.4, 6.32);

    const grill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.15), silverMat);
    grill.position.set(0, 1.1, 6.33);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.5, 0.6), silverMat);
    bumper.position.set(0, 0.5, 6.4);

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 8.4), redMat);
    body.position.set(0, 2.2, -2.1);

    const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 7.2), silverMat);
    shutterL.position.set(2.32, 2.0, -2.1);
    const shutterR = shutterL.clone();
    shutterR.position.x = -2.32;

    const ladderL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 9.8), silverMat);
    ladderL.position.set(1.2, 4.0, -1.0);
    const ladderR = ladderL.clone();
    ladderR.position.x = 0.4;

    const strobe1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.6), strobeRedMat);
    strobe1.position.set(1.0, 3.55, 4.2);
    const strobe2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.6), strobeAmberMat);
    strobe2.position.set(-1.0, 3.55, 4.2);

    g.add(cab, cabStripe, windshield, grill, bumper, body, shutterL, shutterR, ladderL, ladderR, strobe1, strobe2);

    const wheelGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.55, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.57, 16);
    rimGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      wg.add(tire, rim);
      wg.position.set(x, 0.72, z);
      g.add(wg);
      wheels.push(wg);
    };

    makeW(2.2, 4.2);
    makeW(-2.2, 4.2);
    makeW(2.2, -1.5);
    makeW(-2.2, -1.5);
    makeW(2.2, -4.5);
    makeW(-2.2, -4.5);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), hlMat);
    hlL.position.set(1.6, 1.2, 6.32);
    const hlR = hlL.clone();
    hlR.position.x = -1.6;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.3, 0.1), tlMat);
    tl.position.set(0, 1.2, -6.32);

    g.add(hlL, hlR, tl);
    return { mesh: g, wheels: wheels, strobes: [{ mesh: strobe1, invert: false }, { mesh: strobe2, invert: true }] };
  }

  _buildCityBus() {
    const g = new THREE.Group();
    const blueMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.22, metalness: 0.5, clearcoat: 1.0 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.9, transmission: 0.8, transparent: true });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const signMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.4, 14.5), blueMat);
    body.position.set(0, 2.3, 0);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 14.2), whiteMat);
    roof.position.set(0, 4.1, 0);

    const winL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 13.0), glassMat);
    winL.position.set(2.28, 2.7, 0);
    const winR = winL.clone();
    winR.position.x = -2.28;

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(4.3, 2.0, 0.1), glassMat);
    frontGlass.position.set(0, 2.7, 7.27);

    const routeSign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.1), signMat);
    routeSign.position.set(0, 3.8, 7.27);

    g.add(body, roof, winL, winR, frontGlass, routeSign);

    const wheelGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.5, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.52, 16);
    rimGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      wg.add(tire, rim);
      wg.position.set(x, 0.65, z);
      g.add(wg);
      wheels.push(wg);
    };

    makeW(2.1, 4.5);
    makeW(-2.1, 4.5);
    makeW(2.1, -2.5);
    makeW(-2.1, -2.5);
    makeW(2.1, -5.2);
    makeW(-2.1, -5.2);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.1), hlMat);
    hlL.position.set(1.5, 1.1, 7.27);
    const hlR = hlL.clone();
    hlR.position.x = -1.5;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 0.1), tlMat);
    tl.position.set(0, 1.1, -7.27);

    g.add(hlL, hlR, tl);
    return { mesh: g, wheels: wheels, strobes: [] };
  }

  _buildSportCoupe(colorHex) {
    const g = new THREE.Group();
    const paintMat = new THREE.MeshPhysicalMaterial({ color: colorHex, metalness: 0.9, roughness: 0.16, clearcoat: 1.0, clearcoatRoughness: 0.05 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.9, transmission: 0.8, transparent: true });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.35, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.92, roughness: 0.18 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.5, roughness: 0.3 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.65, 8.5), paintMat);
    body.position.y = 0.65;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.62, 4.2), glassMat);
    cabin.position.set(0, 1.25, -0.2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.4), carbonMat);
    roof.position.set(0, 1.56, -0.2);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.0), carbonMat);
    splitter.position.set(0, 0.32, 4.2);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.06, 0.8), carbonMat);
    spoiler.position.set(0, 1.15, -4.1);

    g.add(body, cabin, roof, splitter, spoiler);

    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.37, 16);
    rimGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.14), caliperMat);
      caliper.position.set(0, 0.18, 0);
      wg.add(tire, rim, caliper);
      wg.position.set(x, 0.5, z);
      g.add(wg);
      wheels.push(wg);
    };

    makeW(1.85, 2.6);
    makeW(-1.85, 2.6);
    makeW(1.85, -2.6);
    makeW(-1.85, -2.6);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.1), hlMat);
    hlL.position.set(1.4, 0.7, 4.26);
    const hlR = hlL.clone();
    hlR.position.x = -1.4;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 0.1), tlMat);
    tl.position.set(0, 0.7, -4.26);

    g.add(hlL, hlR, tl);
    return { mesh: g, wheels: wheels, strobes: [] };
  }

  _buildExecutiveSedan(colorHex) {
    const g = new THREE.Group();
    const paintMat = new THREE.MeshPhysicalMaterial({ color: colorHex, metalness: 0.88, roughness: 0.2, clearcoat: 1.0 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.9, transmission: 0.8, transparent: true });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.12 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.72, 9.2), paintMat);
    body.position.y = 0.65;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.68, 4.8), glassMat);
    cabin.position.set(0, 1.3, -0.1);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 3.8), paintMat);
    roof.position.set(0, 1.64, -0.1);
    const grill = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.1), chromeMat);
    grill.position.set(0, 0.7, 4.62);

    g.add(body, cabin, roof, grill);

    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.4, 16);
    rimGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      wg.add(tire, rim);
      wg.position.set(x, 0.52, z);
      g.add(wg);
      wheels.push(wg);
    };

    makeW(1.9, 2.7);
    makeW(-1.9, 2.7);
    makeW(1.9, -2.7);
    makeW(-1.9, -2.7);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.1), hlMat);
    hlL.position.set(1.45, 0.7, 4.61);
    const hlR = hlL.clone();
    hlR.position.x = -1.45;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.1), tlMat);
    tl.position.set(0, 0.7, -4.61);

    g.add(hlL, hlR, tl);
    return { mesh: g, wheels: wheels, strobes: [] };
  }

  _buildPolicePatrol() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0c12, roughness: 0.2, metalness: 0.85, clearcoat: 1.0 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.9, transmission: 0.8, transparent: true });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.2 });
    const bullbarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const blueStrobeMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    const redStrobeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.4), bodyMat);
    chassis.position.y = 0.65;
    const doors = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.6, 3.6), whiteDoorMat);
    doors.position.set(0, 0.65, 0);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.68, 4.8), glassMat);
    cabin.position.set(0, 1.3, -0.1);

    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 0.4), bullbarMat);
    bullbar.position.set(0, 0.65, 4.8);

    const blueLight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), blueStrobeMat);
    blueLight.position.set(0.75, 1.75, -0.3);
    const redLight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), redStrobeMat);
    redLight.position.set(-0.75, 1.75, -0.3);

    g.add(chassis, doors, cabin, bullbar, blueLight, redLight);

    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.4, 16);
    rimGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      const rim = new THREE.Mesh(rimGeom, rimMat);
      wg.add(tire, rim);
      wg.position.set(x, 0.52, z);
      g.add(wg);
      wheels.push(wg);
    };

    makeW(1.95, 2.7);
    makeW(-1.95, 2.7);
    makeW(1.95, -2.7);
    makeW(-1.95, -2.7);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.1), hlMat);
    hlL.position.set(1.45, 0.7, 4.71);
    const hlR = hlL.clone();
    hlR.position.x = -1.45;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.1), tlMat);
    tl.position.set(0, 0.7, -4.71);

    g.add(hlL, hlR, tl);
    return { mesh: g, wheels: wheels, strobes: [{ mesh: blueLight, invert: false }, { mesh: redLight, invert: true }] };
  }

  buildRichCityTrafficFleet() {
    const fleetDefinitions = [
      { type: "FIRE_TRUCK", u: 0.12, lane: 7.0, speed: 0.010 },
      { type: "BUS", u: 0.28, lane: -7.0, speed: 0.009 },
      { type: "SPORT_YELLOW", u: 0.40, lane: 6.0, speed: 0.015 },
      { type: "SEDAN_SILVER", u: 0.52, lane: -6.0, speed: 0.013 },
      { type: "PATROL", u: 0.65, lane: 6.5, speed: 0.012 },
      { type: "BUS", u: 0.78, lane: -7.0, speed: 0.009 },
      { type: "SPORT_RED", u: 0.88, lane: 6.0, speed: 0.016 },
      { type: "SEDAN_BLACK", u: 0.96, lane: -6.0, speed: 0.011 },
    ];

    const massTable = {
      FIRE_TRUCK: 3.8,
      BUS: 4.2,
      PATROL: 1.6,
      SEDAN_SILVER: 1.3,
      SEDAN_BLACK: 1.3,
      SPORT_YELLOW: 1.0,
      SPORT_RED: 1.0
    };
    const radiusTable = {
      FIRE_TRUCK: 4.8,
      BUS: 5.4,
      PATROL: 3.5,
      SEDAN_SILVER: 3.4,
      SEDAN_BLACK: 3.4,
      SPORT_YELLOW: 3.2,
      SPORT_RED: 3.2
    };

    for (const item of fleetDefinitions) {
      let vehicleObj;
      if (item.type === "FIRE_TRUCK") {
        vehicleObj = this._buildFireTruck();
      } else if (item.type === "BUS") {
        vehicleObj = this._buildCityBus();
      } else if (item.type === "SPORT_YELLOW") {
        vehicleObj = this._buildSportCoupe(0xeab308);
      } else if (item.type === "SPORT_RED") {
        vehicleObj = this._buildSportCoupe(0xdc2626);
      } else if (item.type === "SEDAN_SILVER") {
        vehicleObj = this._buildExecutiveSedan(0xd4d4d8);
      } else if (item.type === "SEDAN_BLACK") {
        vehicleObj = this._buildExecutiveSedan(0x18181b);
      } else {
        vehicleObj = this._buildPolicePatrol();
      }

      const pt = this.trackCurve.getPointAt(item.u);
      vehicleObj.mesh.position.set(pt.x, 0.15, pt.z);
      this.trackWorldGroup.add(vehicleObj.mesh);

      this.trafficCars.push({
        type: item.type,
        mesh: vehicleObj.mesh,
        u: item.u,
        speed: item.speed,
        laneOffset: item.lane,
        baseLane: item.lane,
        wheels: vehicleObj.wheels,
        strobes: vehicleObj.strobes || [],
        mass: massTable[item.type] || 1.3,
        radius: radiusTable[item.type] || 3.4,
        knockbackOffset: new THREE.Vector3(),
        knockbackVelocity: new THREE.Vector3(),
        yawOffset: 0,
        yawVelocity: 0,
        lastCollisionTime: 0,
      });
    }
  }

  resetTrafficPositions() {
    const defaultPositions = [
      { u: 0.12, lane: 7.0 },
      { u: 0.28, lane: -7.0 },
      { u: 0.40, lane: 6.0 },
      { u: 0.52, lane: -6.0 },
      { u: 0.65, lane: 6.5 },
      { u: 0.78, lane: -7.0 },
      { u: 0.88, lane: 6.0 },
      { u: 0.96, lane: -6.0 },
    ];

    for (let i = 0; i < this.trafficCars.length; i++) {
      const tc = this.trafficCars[i];
      const def = defaultPositions[i % defaultPositions.length];
      tc.u = def.u;
      tc.laneOffset = def.lane;
      tc.baseLane = def.lane;
      tc.knockbackOffset.set(0, 0, 0);
      tc.knockbackVelocity.set(0, 0, 0);
      tc.yawOffset = 0;
      tc.yawVelocity = 0;
      tc.lastCollisionTime = 0;

      const pt = this.trackCurve.getPointAt(tc.u);
      const tangent = this.trackCurve.getTangentAt(tc.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      tc.mesh.position.copy(pt).addScaledVector(normal, tc.laneOffset);
      tc.mesh.position.y = 0.15;
      const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, tc.laneOffset);
      tc.mesh.lookAt(lookPt.x, 0.15, lookPt.z);
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

  // 👥 3D SPECTATORS, CHEERING FANS & PIT CREW
  build3DSpectatorsAndPitCrew() {
    const group = new THREE.Group();
    const shirtColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xf8fafc];
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 });
    const jeansMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 });
    const flagCheckerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    const makePerson = (x, y, z, rotY, isWaving = false, isPitCrew = false) => {
      const p = new THREE.Group();
      const sColor = isPitCrew ? 0xdc2626 : shirtColors[Math.floor(Math.random() * shirtColors.length)];
      const shirtMat = new THREE.MeshStandardMaterial({ color: sColor, roughness: 0.7 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), shirtMat);
      torso.position.y = 1.35;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
      head.position.y = 2.05;

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.4), isPitCrew ? shirtMat : jeansMat);
      legs.position.y = 0.45;

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), shirtMat);
      const armR = armL.clone();
      if (isWaving) {
        armL.position.set(0.48, 1.7, 0);
        armL.rotation.z = -2.2;
        armR.position.set(-0.48, 1.7, 0);
        armR.rotation.z = 2.2;

        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), flagCheckerMat);
        flag.position.set(0.6, 2.2, 0);
        p.add(flag);
      } else {
        armL.position.set(0.46, 1.25, 0);
        armR.position.set(-0.46, 1.25, 0);
      }

      p.add(torso, head, legs, armL, armR);
      p.position.set(x, y, z);
      p.rotation.y = rotY;
      return p;
    };

    // Grandstand crowds
    for (let g = 0; g < 40; g++) {
      const gx = (g % 2 === 0 ? 32 : -32) + (Math.random() - 0.5) * 6;
      const gz = 80 + Math.random() * 160;
      const gy = 5.5 + Math.random() * 5.0;
      group.add(makePerson(gx, gy, gz, g % 2 === 0 ? -Math.PI / 2 : Math.PI / 2, Math.random() > 0.4));
    }

    // Trackside fence fans
    const halfWidth = this.trackWidth / 2;
    for (let f = 0; f < 25; f++) {
      const u = 0.05 + f * 0.038;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = (f % 2 === 0 ? 1 : -1);
      const pos = pt.clone().addScaledVector(normal, side * (halfWidth + 3.5));
      group.add(makePerson(pos.x, 0.1, pos.z, Math.atan2(tangent.x, tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2), Math.random() > 0.3));
    }

    // Pit Crew in Pit Lane
    for (let pc = 0; pc < 8; pc++) {
      const pos = new THREE.Vector3(-22, 0.1, 40 + pc * 18);
      group.add(makePerson(pos.x, pos.y, pos.z, Math.PI / 2, false, true));
    }

    this.trackWorldGroup.add(group);
  }

  // 🎨 REALISTIC HIGH-RES STREET ART & GRAFFITI MURALS
  buildStreetArtAndGraffitiWalls() {
    const wallGroup = new THREE.Group();

    const makeGraffitiTexture = (text, subtitle, bgHex, sprayColors) => {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 256;
      const ctx = c.getContext("2d");

      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, 1024, 256);

      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(Math.random() * 1024, Math.random() * 256, 3, 3);
      }

      ctx.shadowColor = sprayColors[0];
      ctx.shadowBlur = 24;

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 14;
      ctx.font = "900 88px Impact, Arial Black, sans-serif";
      ctx.strokeText(text, 60, 150);

      const grad = ctx.createLinearGradient(60, 50, 60, 180);
      grad.addColorStop(0, sprayColors[0]);
      grad.addColorStop(0.5, sprayColors[1]);
      grad.addColorStop(1, sprayColors[2]);
      ctx.fillStyle = grad;
      ctx.fillText(text, 60, 150);

      ctx.fillStyle = sprayColors[1];
      for (let d = 0; d < 12; d++) {
        const dx = 120 + d * 70;
        const dlen = 20 + Math.random() * 45;
        ctx.fillRect(dx, 155, 6, dlen);
        ctx.beginPath();
        ctx.arc(dx + 3, 155 + dlen, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (subtitle) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 32px Segoe UI, sans-serif";
        ctx.fillText(subtitle, 70, 215);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    };

    const gMat1 = new THREE.MeshStandardMaterial({ map: makeGraffitiTexture("APEX DRIFT", "KING OF THE ASPHALT 2077", "#334155", ["#f43f5e", "#fb923c", "#facc15"]), roughness: 0.7 });
    const gMat2 = new THREE.MeshStandardMaterial({ map: makeGraffitiTexture("TOUGE 峠 伝説", "STREET LEGENDS NEVER DIE", "#1e293b", ["#38bdf8", "#818cf8", "#c084fc"]), roughness: 0.7 });
    const gMat3 = new THREE.MeshStandardMaterial({ map: makeGraffitiTexture("TURBO MONSTER", "FULL THROTTLE NO BRAKES", "#18181b", ["#22c55e", "#eab308", "#ef4444"]), roughness: 0.7 });

    const makeWall = (mat, x, y, z, rotY) => {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(28, 7, 1.2), mat);
      wall.position.y = 3.5;
      wall.castShadow = true;
      g.add(wall);
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      this.colliders.push({ minX: x - 15, maxX: x + 15, minZ: z - 5, maxZ: z + 5 });
      return g;
    };

    wallGroup.add(makeWall(gMat1, 180, 0.1, 480, -0.3));
    wallGroup.add(makeWall(gMat2, -320, 0.1, -180, 1.4));
    wallGroup.add(makeWall(gMat3, -240, 0.1, 380, 2.2));

    this.trackWorldGroup.add(wallGroup);
  }

  // 🚁 ANIMATED TV BROADCAST HELICOPTER
  buildDynamicHelicopter() {
    this.helicopterGroup = new THREE.Group();
    const heliMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 7.5), heliMat);
    body.position.y = 1.2;

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.6, 2.4), glassMat);
    cockpit.position.set(0, 1.4, 3.2);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 8.0, 8), heliMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 1.8, -6.5);

    this.mainRotor = new THREE.Group();
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.08, 0.7), rotorMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 14.0), rotorMat);
    this.mainRotor.add(blade1, blade2);
    this.mainRotor.position.set(0, 2.8, 0);

    this.tailRotor = new THREE.Group();
    const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.3), rotorMat);
    this.tailRotor.add(tailBlade);
    this.tailRotor.position.set(0.4, 2.2, -10.5);

    const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 6.5), darkMat);
    skidL.position.set(1.4, -0.4, 0);
    const skidR = skidL.clone();
    skidR.position.x = -1.4;

    this.helicopterGroup.add(body, cockpit, tail, this.mainRotor, this.tailRotor, skidL, skidR);
    this.helicopterGroup.position.set(60, 48, 120);
    this.trackWorldGroup.add(this.helicopterGroup);
  }

  // 🎈 FLOATING HOT AIR BALLOONS OVER THE HORIZON
  buildHotAirBalloons() {
    const balloonGroup = new THREE.Group();
    const bColors = [0xef4444, 0xf59e0b, 0x3b82f6];

    for (let i = 0; i < 3; i++) {
      const bg = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: bColors[i], roughness: 0.6 });
      const basketMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

      const envelope = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 16), mat);
      envelope.scale.set(1.0, 1.4, 1.0);
      envelope.position.y = 18;

      const basket = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 3.2), basketMat);
      basket.position.y = 0;

      bg.add(envelope, basket);
      const angle = (i / 3) * Math.PI * 2;
      bg.position.set(Math.cos(angle) * 750, 180 + i * 40, Math.sin(angle) * 750);
      balloonGroup.add(bg);
    }

    this.trackWorldGroup.add(balloonGroup);
  }

  handleCarTrackCollision(car) {
    const px = car.position.x;
    const pz = car.position.z;
    const carRadius = 2.4;

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

    // 📣 GRANDSTAND DRIFT CROWD CHEER
    if (car.isDrifting && car.currentDriftScore > 600 && Math.abs(pz) < 260 && Math.abs(px) < 60) {
      const now = Date.now();
      if (now - this.lastCrowdCheerTime > 6000) {
        this.lastCrowdCheerTime = now;
        cyberAudio.playCrowdCheer(0.85);
      }
    }

    // 💥 SOLID OBSTACLE & BUILDING COLLISION RESOLVER
    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
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

        car.position.x += nx * (overlap + 0.35);
        car.position.z += nz * (overlap + 0.35);
        car.mesh.position.copy(car.position);

        if (Math.abs(car.speed) > 15) {
          car.speed = -car.speed * 0.45;
          car.emitSparks(new THREE.Vector3(cx, 0.6, cz));
          this.spawnCrashDebris(new THREE.Vector3(cx, 0.6, cz), new THREE.Vector3(nx, 0.5, nz), 1.2, car.bodyColorHex || 0xdc2626, 0x64748b);
          cyberAudio.playCrash();
          cyberAudio.playGlassShatter(1.0);
        }
        break;
      }
    }

    for (const prop of this.destructibleProps) {
      if (prop.isHit) continue;
      const dist = prop.group.position.distanceTo(car.position);
      if (dist < 3.0) {
        prop.isHit = true;
        const hitSpeed = Math.max(30, Math.abs(car.speed));
        const forwardX = Math.sin(car.heading);
        const forwardZ = Math.cos(car.heading);

        // Light plastic cone deflection: flies away cleanly with soft sound, no speed penalty or hard crash
        prop.velocity.set(
          forwardX * hitSpeed * 0.45 + (Math.random() - 0.5) * 8,
          8.0 + Math.random() * 8.0,
          forwardZ * hitSpeed * 0.45 + (Math.random() - 0.5) * 8
        );
        prop.rotVelocity.set(
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 25
        );

        cyberAudio.playConeHit();
        car.totalScore += 100;
      }
    }
  }

  // 🚗 💥 VISIBLE 3D FLYING CAR BODY PARTS & DETACHED DEBRIS GENERATOR
  spawnCrashDebris(pos, normal, intensity = 1.0, colorA = 0xdc2626, colorB = 0x0284c7) {
    const matA = new THREE.MeshPhysicalMaterial({ color: colorA, metalness: 0.85, roughness: 0.2, clearcoat: 1.0 });
    const matB = new THREE.MeshPhysicalMaterial({ color: colorB, metalness: 0.85, roughness: 0.2, clearcoat: 1.0 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.35, metalness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, roughness: 0.05, metalness: 0.1, transmission: 0.9, transparent: true });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });

    const geoms = [
      { geom: new THREE.BoxGeometry(1.25, 0.32, 0.35), mat: matA },       // Front bumper corner piece
      { geom: new THREE.BoxGeometry(0.95, 0.45, 0.14), mat: matB },       // Door / Fender skin plate
      { geom: new THREE.BoxGeometry(0.45, 0.28, 0.22), mat: carbonMat },  // Aerodynamic side mirror
      { geom: new THREE.BoxGeometry(1.4, 0.08, 0.35), mat: carbonMat },   // Carbon winglet / splitter blade
      { geom: new THREE.TetrahedronGeometry(0.32), mat: glassMat },        // Shattered headlight crystal
      { geom: new THREE.BoxGeometry(0.85, 0.08, 0.08), mat: chromeMat },   // Chrome trim moulding
    ];

    const partCount = Math.min(8, Math.max(4, Math.round(5 * intensity)));
    for (let i = 0; i < partCount; i++) {
      const template = geoms[i % geoms.length];
      const mesh = new THREE.Mesh(template.geom, template.mat);
      mesh.castShadow = true;

      const spawnPos = pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        0.35 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.8
      ));
      mesh.position.copy(spawnPos);
      mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

      this.crashDebrisGroup.add(mesh);

      const normPower = (9 + Math.random() * 12) * Math.min(2.2, intensity);
      const vel = new THREE.Vector3(
        normal.x * normPower + (Math.random() - 0.5) * 11,
        6.0 + Math.random() * 8.0 * Math.min(2.0, intensity),
        normal.z * normPower + (Math.random() - 0.5) * 11
      );

      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 28
      );

      this.activeCrashDebris.push({
        mesh: mesh,
        pos: spawnPos,
        vel: vel,
        rotVel: rotVel,
        life: 12.0,
      });
    }
  }

  // 💥 REALISTIC MULTI-VEHICLE PHYSICAL COLLISION ENGINE (Player, AI Rivals, City Traffic)
  handleVehicleToVehicleCollisions(playerCar, delta) {
    if (!playerCar || !playerCar.mesh) return;
    const playerPos = playerCar.mesh.position;
    const playerSpeed = playerCar.speed;
    const now = Date.now();

    // 1. 🏎️ Player vs AI Rivals
    for (let i = 0; i < this.aiRivals.length; i++) {
      const rival = this.aiRivals[i];
      const rivalPos = rival.mesh.position;
      const dx = playerPos.x - rivalPos.x;
      const dz = playerPos.z - rivalPos.z;
      const dist = Math.hypot(dx, dz);
      const minSeparation = 3.8;

      if (dist < minSeparation && dist > 0.05) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minSeparation - dist;

        // Clean position separation
        playerCar.position.x += nx * (overlap * 0.55);
        playerCar.position.z += nz * (overlap * 0.55);
        playerCar.mesh.position.copy(playerCar.position);

        rival.knockbackOffset.x -= nx * (overlap * 0.55);
        rival.knockbackOffset.z -= nz * (overlap * 0.55);

        if (now - rival.lastCollisionTime > 160) {
          rival.lastCollisionTime = now;
          const hitIntensity = Math.min(2.2, Math.max(0.4, Math.abs(playerSpeed) / 100));

          const contactPt = new THREE.Vector3(
            (playerPos.x + rivalPos.x) * 0.5,
            0.65,
            (playerPos.z + rivalPos.z) * 0.5
          );

          playerCar.applyCollisionImpulse(new THREE.Vector3(nx, 0.4, nz), hitIntensity, 0, contactPt);

          // 💥 Spawn high-visibility flying 3D car parts (Bumpers, Mirrors, Winglets, Glass crystals)
          this.spawnCrashDebris(contactPt, new THREE.Vector3(nx, 0.5, nz), hitIntensity, playerCar.bodyColorHex || 0xdc2626, rival.color || 0xeab308);
          cyberAudio.playGlassShatter(hitIntensity);

          rival.knockbackVelocity.set(-nx * hitIntensity * 32, 0, -nz * hitIntensity * 32);
          rival.yawVelocity += (Math.random() - 0.5) * hitIntensity * 16;
          rival.laneOffset -= nx * hitIntensity * 4.2;
          rival.currentSpeedU *= 0.55;

          if (Math.abs(playerSpeed) > 135) {
            playerCar.totalScore += 500;
            if (this.onTakedownCallback) {
              this.onTakedownCallback(`💥 ТАКДАУН! СБИТ ${rival.name} +500 PTS`);
            }
          }
        }
      }
    }

    // 2. 🚒 🚌 🚔 Player vs City Traffic Fleet
    for (let i = 0; i < this.trafficCars.length; i++) {
      const traffic = this.trafficCars[i];
      const trafficPos = traffic.mesh.position;
      const dx = playerPos.x - trafficPos.x;
      const dz = playerPos.z - trafficPos.z;
      const dist = Math.hypot(dx, dz);
      const minSeparation = traffic.radius || 3.6;

      if (dist < minSeparation && dist > 0.05) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minSeparation - dist;
        const massRatio = (traffic.mass || 1.3) / 1.0;

        const playerWeight = Math.min(0.85, 0.5 * (1.0 / (massRatio * 0.8)));
        const trafficWeight = 1.0 - playerWeight;

        playerCar.position.x += nx * (overlap * (1.0 - playerWeight));
        playerCar.position.z += nz * (overlap * (1.0 - playerWeight));
        playerCar.mesh.position.copy(playerCar.position);

        traffic.knockbackOffset.x -= nx * (overlap * trafficWeight);
        traffic.knockbackOffset.z -= nz * (overlap * trafficWeight);

        if (now - traffic.lastCollisionTime > 160) {
          traffic.lastCollisionTime = now;
          const hitIntensity = Math.min(2.5, Math.max(0.5, (Math.abs(playerSpeed) / 95) * Math.sqrt(massRatio)));

          const contactPt = new THREE.Vector3(
            (playerPos.x + trafficPos.x) * 0.5,
            0.8,
            (playerPos.z + trafficPos.z) * 0.5
          );

          playerCar.applyCollisionImpulse(new THREE.Vector3(nx, 0.5, nz), hitIntensity, 0, contactPt);

          // 💥 Spawn flying 3D car parts and shattered glass
          const trafficColor = (traffic.type === "FIRE_TRUCK") ? 0xb91c1c : ((traffic.type === "BUS") ? 0x0284c7 : ((traffic.type === "PATROL") ? 0x0a0c12 : 0xf8fafc));
          this.spawnCrashDebris(contactPt, new THREE.Vector3(nx, 0.5, nz), hitIntensity, playerCar.bodyColorHex || 0xdc2626, trafficColor);
          cyberAudio.playGlassShatter(hitIntensity);

          traffic.knockbackVelocity.set(-nx * (hitIntensity / massRatio) * 26, 0, -nz * (hitIntensity / massRatio) * 26);
          traffic.yawVelocity += (Math.random() - 0.5) * (hitIntensity / massRatio) * 12;
          traffic.laneOffset -= nx * (hitIntensity / massRatio) * 3.2;

          if (Math.abs(playerSpeed) > 120) {
            const pts = Math.round(200 * massRatio);
            playerCar.totalScore += pts;
            if (this.onTakedownCallback) {
              const label = traffic.type === "FIRE_TRUCK" ? "🚒 ТАРАН ПОЖАРНОЙ МАШИНЫ!" : (traffic.type === "BUS" ? "🚌 ТАРАН АВТОБУСА!" : (traffic.type === "PATROL" ? "🚔 ТАРАН ПОЛИЦЕЙСКОГО ПАТРУЛЯ!" : "🚗 СТОЛКНОВЕНИЕ В ТРАФИКЕ!"));
              this.onTakedownCallback(`${label} +${pts} PTS`);
            }
          }
        }
      }
    }

    // 3. 🏎️ ⚡ AI Rivals vs City Traffic (Rivals crash and deflect off traffic)
    for (let i = 0; i < this.aiRivals.length; i++) {
      const rival = this.aiRivals[i];
      const rPos = rival.mesh.position;
      for (let j = 0; j < this.trafficCars.length; j++) {
        const traffic = this.trafficCars[j];
        const tPos = traffic.mesh.position;
        const dx = rPos.x - tPos.x;
        const dz = rPos.z - tPos.z;
        const dist = Math.hypot(dx, dz);
        const minSep = (traffic.radius || 3.6) + 1.2;

        if (dist < minSep && dist > 0.05) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minSep - dist;

          rival.knockbackOffset.x += nx * (overlap * 0.6);
          rival.knockbackOffset.z += nz * (overlap * 0.6);
          traffic.knockbackOffset.x -= nx * (overlap * 0.4);
          traffic.knockbackOffset.z -= nz * (overlap * 0.4);

          if (now - rival.lastCollisionTime > 250) {
            rival.lastCollisionTime = now;
            rival.knockbackVelocity.set(nx * 18, 0, nz * 18);
            rival.yawVelocity += (Math.random() - 0.5) * 10;
            traffic.knockbackVelocity.set(-nx * 8, 0, -nz * 8);

            const contactPt = new THREE.Vector3((rPos.x + tPos.x) * 0.5, 0.7, (rPos.z + tPos.z) * 0.5);
            this.spawnCrashDebris(contactPt, new THREE.Vector3(nx, 0.5, nz), 1.0, rival.color || 0xeab308, 0x0284c7);

            const dPlayer = playerPos.distanceTo(rPos);
            if (dPlayer < 45) {
              cyberAudio.playMetalCrunch(0.7);
              cyberAudio.playGlassShatter(0.6);
              if (playerCar.emitCollisionSparks) {
                playerCar.emitCollisionSparks(contactPt, new THREE.Vector3(nx, 0.5, nz), 0.8);
              }
            }
          }
        }
      }
    }

    // 4. 🏎️ 🏎️ AI Rivals vs AI Rivals (Bumping for racing line)
    for (let i = 0; i < this.aiRivals.length; i++) {
      const r1 = this.aiRivals[i];
      for (let j = i + 1; j < this.aiRivals.length; j++) {
        const r2 = this.aiRivals[j];
        const dx = r1.mesh.position.x - r2.mesh.position.x;
        const dz = r1.mesh.position.z - r2.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 3.8 && dist > 0.05) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = 3.8 - dist;

          r1.knockbackOffset.x += nx * (overlap * 0.5);
          r1.knockbackOffset.z += nz * (overlap * 0.5);
          r2.knockbackOffset.x -= nx * (overlap * 0.5);
          r2.knockbackOffset.z -= nz * (overlap * 0.5);

          r1.laneOffset += nx * 0.5;
          r2.laneOffset -= nx * 0.5;

          const contactPt = new THREE.Vector3((r1.mesh.position.x + r2.mesh.position.x) * 0.5, 0.6, (r1.mesh.position.z + r2.mesh.position.z) * 0.5);
          const dPlayer = playerPos.distanceTo(r1.mesh.position);
          if (dPlayer < 35 && now - r1.lastCollisionTime > 300) {
            r1.lastCollisionTime = now;
            this.spawnCrashDebris(contactPt, new THREE.Vector3(nx, 0.5, nz), 0.8, r1.color || 0xeab308, r2.color || 0xdc2626);
            cyberAudio.playMetalCrunch(0.6);
          }
        }
      }
    }
  }

  update(delta, playerCar, isRaceRunning = true, playerLaps = 0) {
    const playerPos = playerCar.mesh.position;
    const playerSpeed = Math.abs(playerCar.speed);
    const playerU = this.getClosestU(playerPos);
    const now = Date.now();
    const halfRoad = this.trackWidth / 2 - 2.8;

    if (this.garageGroup) {
      this.garageGroup.visible = !isRaceRunning;
    }

    if (isRaceRunning) {
      this.recordAIRivalsHistory();
    }

    // Check Vehicle-to-Vehicle Collisions
    if (isRaceRunning) {
      this.handleVehicleToVehicleCollisions(playerCar, delta);
    }

    // 💥 Animate 3D Tumbling Flying Car Body Parts & Debris
    for (let i = this.activeCrashDebris.length - 1; i >= 0; i--) {
      const d = this.activeCrashDebris[i];
      d.pos.addScaledVector(d.vel, delta);
      d.vel.y -= delta * 24.0;
      d.rotVel.multiplyScalar(Math.pow(0.96, delta));
      d.mesh.rotation.x += d.rotVel.x * delta;
      d.mesh.rotation.y += d.rotVel.y * delta;
      d.mesh.rotation.z += d.rotVel.z * delta;

      if (d.pos.y < 0.14) {
        d.pos.y = 0.14;
        d.vel.y = -d.vel.y * 0.38;
        d.vel.x *= 0.76;
        d.vel.z *= 0.76;
      }
      d.mesh.position.copy(d.pos);
      d.life -= delta;
      if (d.life <= 0) {
        this.crashDebrisGroup.remove(d.mesh);
        this.activeCrashDebris.splice(i, 1);
      }
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

    // 2. AI RIVALS - TRUE CONTINUOUS PROGRESS TRACKING & PHYSICAL REACTION
    for (let i = 0; i < this.aiRivals.length; i++) {
      const rival = this.aiRivals[i];

      // Damping physical knockback and spinout torque
      rival.knockbackVelocity.multiplyScalar(Math.pow(0.04, delta));
      rival.knockbackOffset.addScaledVector(rival.knockbackVelocity, delta);
      rival.knockbackOffset.multiplyScalar(Math.pow(0.08, delta));
      rival.yawVelocity *= Math.pow(0.05, delta);
      rival.yawOffset += rival.yawVelocity * delta;
      rival.yawOffset *= Math.pow(0.08, delta);

      // Lane stabilization and road bound limit
      const targetLane = (i % 2 === 0) ? 5.5 : -5.5;
      rival.laneOffset = THREE.MathUtils.lerp(rival.laneOffset, targetLane, delta * 0.9);
      rival.laneOffset = THREE.MathUtils.clamp(rival.laneOffset, -halfRoad, halfRoad);

      if (isRaceRunning) {
        const playerTotal = playerLaps + playerU;
        const rivalTotal = rival.lapsCompleted + rival.u;
        const diffProgress = rivalTotal - playerTotal;

        let targetSpeedMultiplier = 1.0;
        if (diffProgress > 0.035) {
          targetSpeedMultiplier = 0.94;
        } else if (diffProgress < -0.02) {
          targetSpeedMultiplier = 1.08;
        } else if (diffProgress < 0.0) {
          targetSpeedMultiplier = 1.04;
        } else {
          targetSpeedMultiplier = 0.98 + (i * 0.02);
        }

        rival.currentSpeedU = THREE.MathUtils.lerp(rival.currentSpeedU, rival.baseSpeedU * targetSpeedMultiplier, delta * 2.5);

        const prevU = rival.u;
        rival.u = (rival.u + rival.currentSpeedU * delta) % 1.0;
        if (prevU > 0.80 && rival.u < 0.20) rival.lapsCompleted++;
      } else {
        rival.currentSpeedU = 0;
      }

      const pt = this.trackCurve.getPointAt(rival.u);
      const tangent = this.trackCurve.getTangentAt(rival.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      rival.mesh.position.copy(pt).addScaledVector(normal, rival.laneOffset).add(rival.knockbackOffset);
      rival.mesh.position.y = 0.15;

      const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, rival.laneOffset);
      rival.mesh.lookAt(lookPt.x, 0.15, lookPt.z);
      rival.mesh.rotation.y += rival.yawOffset;

      if (rival.wheels && rival.currentSpeedU > 0) {
        const rotDelta = rival.currentSpeedU * delta * 1400;
        for (let w = 0; w < rival.wheels.length; w++) {
          rival.wheels[w].rotation.x += rotDelta;
        }
      }

      if (rival.namePlate) {
        rival.namePlate.lookAt(playerPos.x, 3.4, playerPos.z);
      }
    }

    // 3. Dynamic 3D Ocean Waves & Animated Shoreline Foam
    if (this.oceanMesh && this.oceanGeom && this.oceanOrigPos) {
      const posAttr = this.oceanGeom.attributes.position;
      const count = posAttr.count;
      const t = now * 0.002;
      for (let i = 0; i < count; i++) {
        const ox = this.oceanOrigPos.getX(i);
        const oy = this.oceanOrigPos.getY(i);
        const wave = Math.sin(ox * 0.04 + t * 1.8) * 0.95 +
                     Math.cos(oy * 0.035 + t * 1.4) * 0.75 +
                     Math.sin((ox + oy) * 0.02 + t * 2.2) * 0.45;
        posAttr.setZ(i, this.oceanOrigPos.getZ(i) + wave);
      }
      posAttr.needsUpdate = true;
      this.oceanGeom.computeVertexNormals();
    }
    if (this.shorelineFoamMesh) {
      this.shorelineFoamMesh.position.x = 2 + Math.sin(now * 0.0022) * 6.0;
      this.shorelineFoamMesh.material.opacity = 0.65 + Math.cos(now * 0.0022) * 0.35;
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

    // 6. Rich City Traffic Fleet (Physical Knockback & Strobe Animation)
    const isStrobeActive = Math.sin(now * 0.024) > 0;
    for (const car of this.trafficCars) {
      // Damping physical knockback and spinout
      car.knockbackVelocity.multiplyScalar(Math.pow(0.04, delta));
      car.knockbackOffset.addScaledVector(car.knockbackVelocity, delta);
      car.knockbackOffset.multiplyScalar(Math.pow(0.08, delta));
      car.yawVelocity *= Math.pow(0.05, delta);
      car.yawOffset += car.yawVelocity * delta;
      car.yawOffset *= Math.pow(0.08, delta);

      // Lane stabilization and road bound limit
      car.laneOffset = THREE.MathUtils.lerp(car.laneOffset, car.baseLane || car.laneOffset, delta * 0.8);
      car.laneOffset = THREE.MathUtils.clamp(car.laneOffset, -halfRoad, halfRoad);

      // Emergency Strobe Flashers
      if (car.strobes && car.strobes.length > 0) {
        for (const st of car.strobes) {
          st.mesh.visible = st.invert ? !isStrobeActive : isStrobeActive;
        }
      }

      car.u = (car.u + car.speed * delta) % 1.0;
      const pt = this.trackCurve.getPointAt(car.u);
      const tangent = this.trackCurve.getTangentAt(car.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      car.mesh.position.copy(pt).addScaledVector(normal, car.laneOffset).add(car.knockbackOffset);
      car.mesh.position.y = 0.15;

      const lookPt = pt.clone().addScaledVector(tangent, 5).addScaledVector(normal, car.laneOffset);
      car.mesh.lookAt(lookPt.x, 0.15, lookPt.z);
      car.mesh.rotation.y += car.yawOffset;

      for (const w of car.wheels) {
        w.rotation.x += delta * 12;
      }

      const d = car.mesh.position.distanceTo(playerPos);
      if (d < 9.0 && playerSpeed > 110 && !car.passedAudio) {
        car.passedAudio = true;
        cyberAudio.playTrafficFlyby();
      } else if (d > 22.0) {
        car.passedAudio = false;
      }
    }

    // 7. ⚡ N2O Nitro Canister Pickups
    for (const pickup of this.nitroPickups) {
      if (pickup.collected) {
        pickup.respawnTimer -= delta;
        if (pickup.respawnTimer <= 0) {
          pickup.collected = false;
          pickup.mesh.visible = true;
        }
      } else {
        pickup.mesh.rotation.y += delta * 2.2;
        pickup.mesh.position.y = pickup.baseY + Math.sin(Date.now() * 0.004 + pickup.u * 10) * 0.18;

        const dist = pickup.mesh.position.distanceTo(playerPos);
        if (dist < 4.2) {
          pickup.collected = true;
          pickup.mesh.visible = false;
          pickup.respawnTimer = 12.0;

          playerCar.nitroFuel = 100;
          playerCar.totalScore += 300;
          playerCar.emitSparks(pickup.mesh.position);

          if (this.onNitroPickupCallback) {
            this.onNitroPickupCallback("⚡ БАЛЛОН ЗАКИСИ АЗОТА (NOS) +100% N2O!");
          }
        }
      }
    }

    // 8. 🚁 TV Broadcast Helicopter Flight & Rotor Rotation
    if (this.helicopterGroup && this.mainRotor && this.tailRotor) {
      this.mainRotor.rotation.y += delta * 28.0;
      this.tailRotor.rotation.x += delta * 36.0;
      this.helicopterGroup.position.y = 52 + Math.sin(now * 0.0016) * 4.0;
      this.helicopterGroup.position.x = 80 + Math.cos(now * 0.0009) * 20.0;
      this.helicopterGroup.position.z = 140 + Math.sin(now * 0.0009) * 20.0;
      this.helicopterGroup.lookAt(playerPos.x, 20, playerPos.z);
    }
  }
}

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
    this.lastKerbRumbleTime = 0;
    this.lastCrowdCheerTime = 0;

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

    if (this.trackIndex === 1) {
      // 🏔️ TOUGE MOUNTAIN PASS - Cliffs, Rocks, Torii Gates & Mountain Lanterns
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x334d28, roughness: 0.9 });
      const toriiMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
      const toriiBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });

      // Mountain Cliff Ridges
      for (let x = -800; x <= 800; x += 110) {
        for (let z = -800; z <= 800; z += 110) {
          const dist = getMinDistToTrack(x, z);
          if (dist < 45) continue;

          const cliffHeight = 40 + Math.random() * 90;
          const cliffGeom = new THREE.ConeGeometry(35 + Math.random() * 25, cliffHeight, 6);
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
      { name: "Akira [GT-R]", color: 0x1d4ed8, u: 0.008, lane: -5.5, baseSpeedU: 0.0160 },
      { name: "Ghost [911]", color: 0x1e293b, u: 0.008, lane: 5.5, baseSpeedU: 0.0168 },
      { name: "⚡ Razor [M3 GTR]", color: 0x15803d, u: 0.0025, lane: -5.5, baseSpeedU: 0.0150 },
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

  // 🚒 🚌 🏎️ DIVERSE CITY VEHICLE FLEET BUILDERS
  _buildFireTruck() {
    const g = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25, metalness: 0.6 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.9 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });

    const cab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.8, 4.2), redMat);
    cab.position.set(0, 2.0, 4.2);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 0.1), glassMat);
    windshield.position.set(0, 2.4, 6.32);

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
    g.add(cab, windshield, body, shutterL, shutterR, ladderL, ladderR);

    const flasher = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 }));
    flasher.position.set(0, 3.55, 4.2);
    g.add(flasher);

    const wheelGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.55, 16);
    wheelGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Mesh(wheelGeom, tireMat);
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
    return { mesh: g, wheels: wheels };
  }

  _buildCityBus() {
    const g = new THREE.Group();
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.9 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });

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

    const routeSign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    routeSign.position.set(0, 3.8, 7.27);

    g.add(body, roof, winL, winR, frontGlass, routeSign);

    const wheelGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.5, 16);
    wheelGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Mesh(wheelGeom, tireMat);
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
    return { mesh: g, wheels: wheels };
  }

  _buildSportCoupe(colorHex) {
    const g = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.85, roughness: 0.18 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.4 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.85 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.65, 8.5), paintMat);
    body.position.y = 0.65;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.62, 4.2), glassMat);
    cabin.position.set(0, 1.25, -0.2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.4), carbonMat);
    roof.position.set(0, 1.56, -0.2);

    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14);
    wheelGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Mesh(wheelGeom, tireMat);
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

    g.add(body, cabin, roof, hlL, hlR, tl);
    return { mesh: g, wheels: wheels };
  }

  _buildExecutiveSedan(colorHex) {
    const g = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.8, roughness: 0.22 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.85 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.72, 9.2), paintMat);
    body.position.y = 0.65;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.68, 4.8), glassMat);
    cabin.position.set(0, 1.3, -0.1);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 3.8), paintMat);
    roof.position.set(0, 1.64, -0.1);

    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 14);
    wheelGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Mesh(wheelGeom, tireMat);
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

    g.add(body, cabin, roof, hlL, hlR, tl);
    return { mesh: g, wheels: wheels };
  }

  _buildPolicePatrol() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.8 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.85 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.4), bodyMat);
    chassis.position.y = 0.65;
    const doors = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.6, 3.6), whiteDoorMat);
    doors.position.set(0, 0.65, 0);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.68, 4.8), glassMat);
    cabin.position.set(0, 1.3, -0.1);

    const blueLight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
    blueLight.position.set(0.6, 1.75, -0.3);
    const redLight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    redLight.position.set(-0.6, 1.75, -0.3);

    const wheelGeom = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 14);
    wheelGeom.rotateZ(Math.PI / 2);

    const wheels = [];
    const makeW = (x, z) => {
      const wg = new THREE.Mesh(wheelGeom, tireMat);
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

    g.add(chassis, doors, cabin, blueLight, redLight, hlL, hlR, tl);
    return { mesh: g, wheels: wheels };
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
      { type: "SEDAN_BLACK", u: 0.96, lane: -6.0, speed: 0.013 },
    ];

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
        mesh: vehicleObj.mesh,
        u: item.u,
        speed: item.speed,
        laneOffset: item.lane,
        wheels: vehicleObj.wheels,
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

    // 📣 GRANDSTAND DRIFT CROWD CHEER
    if (car.isDrifting && car.currentDriftScore > 600 && Math.abs(pz) < 260 && Math.abs(px) < 60) {
      const now = Date.now();
      if (now - this.lastCrowdCheerTime > 6000) {
        this.lastCrowdCheerTime = now;
        cyberAudio.playCrowdCheer(0.85);
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
      }
    }
  }

  update(delta, playerCar, isRaceRunning = true, playerLaps = 0) {
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

    // 2. AI RIVALS - TRUE CONTINUOUS PROGRESS TRACKING & CLOSE COMPETITIVE RACING
    for (let i = 0; i < this.aiRivals.length; i++) {
      const rival = this.aiRivals[i];
      if (isRaceRunning) {
        const playerTotal = playerLaps + playerU;
        const rivalTotal = rival.lapsCompleted + rival.u;
        const diffProgress = rivalTotal - playerTotal;

        let targetSpeedMultiplier = 1.0;
        if (diffProgress > 0.025) {
          targetSpeedMultiplier = 0.85; // Eases off smoothly so player can comfortably catch up and pass!
        } else if (diffProgress < -0.04) {
          targetSpeedMultiplier = 1.04;
        } else {
          targetSpeedMultiplier = 0.95 + (i * 0.02);
        }

        rival.currentSpeedU = THREE.MathUtils.lerp(rival.currentSpeedU, rival.baseSpeedU * targetSpeedMultiplier, delta * 2.0);

        const prevU = rival.u;
        rival.u = (rival.u + rival.currentSpeedU * delta) % 1.0;
        if (prevU > 0.80 && rival.u < 0.20) rival.lapsCompleted++;
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

    // 6. Rich City Traffic Fleet (Fire Trucks, Buses, Sport Coupes, Sedans, Patrols)
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
  }
}

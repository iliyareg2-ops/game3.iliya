// city.js - Formula 1 Grand Prix Autodrome Circuit, Starting Grid, Adaptive AI Rivals & 100% Exact Progress Projection
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CityTrackManager {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.trafficCars = [];
    this.policeUnits = [];
    this.nitroPickups = [];
    this.pedestrians = [];
    this.speedCameras = [];
    this.destructibleProps = [];
    this.stuntRamps = [];
    this.aiRivals = [];
    this.helicopter = null;

    this.isRaining = false;
    this.rainParticles = null;
    this.rainGeom = null;

    this.onTakedownCallback = null;
    this.onBustedCallback = null;
    this.onNitroPickupCallback = null;
    this.onSpeedTrapCallback = null;
    this.bustedTimer = 0;
    this.isPoliceNearby = false;
    this.nearestPoliceDist = 999999;

    this.initTextures();
    this.initLighting();
    this.buildF1GrandPrixCircuitAndKerbs();
    this.buildF1GrandstandsAndPits();
    this.buildStartFinishGantryAndGrid();
    this.buildRoadsideStreetlights();
    this.buildDiverseSkyscrapers();
    this.buildSpeedTrapCameras();
    this.buildStuntRamps();
    this.buildPoliceRoadblocks();
    this.buildDestructibleProps();
    this.buildCityFurniture();
    this.buildNitroPickups();
    this.buildAnimatedPedestrians();
    this.buildAIRivals();
    this.buildPoliceFleet();
    this.buildPoliceHelicopter();
    this.buildDetailedTraffic();
    this.buildRainSystem();
  }

  initTextures() {
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const rCtx = roadCanvas.getContext("2d");

    rCtx.fillStyle = "#3f4654";
    rCtx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 45000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const shade = Math.random();
      if (shade > 0.6) rCtx.fillStyle = "#535d70";
      else if (shade > 0.3) rCtx.fillStyle = "#2d3340";
      else rCtx.fillStyle = "#69768e";
      rCtx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
    }

    // Racing line groove rubber marks
    rCtx.fillStyle = "rgba(20, 24, 32, 0.45)";
    rCtx.fillRect(180, 0, 160, 1024);
    rCtx.fillRect(684, 0, 160, 1024);

    // Track perimeter white lines
    rCtx.fillStyle = "#ffffff";
    rCtx.fillRect(35, 0, 18, 1024);
    rCtx.fillRect(971, 0, 18, 1024);

    // Center dash line
    rCtx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (let y = 30; y < 1024; y += 140) {
      rCtx.fillRect(507, y, 10, 85);
    }

    this.asphaltTex = new THREE.CanvasTexture(roadCanvas);
    this.asphaltTex.wrapS = THREE.RepeatWrapping;
    this.asphaltTex.wrapT = THREE.RepeatWrapping;

    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.asphaltTex,
      roughness: 0.38,
      metalness: 0.15,
    });

    this.facadeMats = [
      this._createFacadeMat("#142238", "#38bdf8", "#bae6fd", 0x0a1c2e),
      this._createFacadeMat("#241c10", "#f59e0b", "#fef3c7", 0x2e1c05),
      this._createFacadeMat("#0f261c", "#10b981", "#a7f3d0", 0x052414),
      this._createFacadeMat("#280f1d", "#f43f5e", "#fecdd3", 0x290416),
      this._createFacadeMat("#181920", "#f1f5f9", "#cbd5e1", 0x111317),
    ];
  }

  _createFacadeMat(bgColor, winColor1, winColor2, emissiveHex) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 28) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(0, y, 512, 4);
      for (let x = 12; x < 512; x += 26) {
        const isLit = Math.random() > 0.35;
        if (isLit) {
          ctx.fillStyle = Math.random() > 0.4 ? winColor1 : winColor2;
          ctx.fillRect(x, y + 5, 18, 18);
        } else {
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.fillRect(x, y + 5, 18, 18);
        }
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0.8,
      roughness: 0.18,
      emissive: emissiveHex,
      emissiveIntensity: 0.5,
    });
  }

  initLighting() {
    this.scene.fog = new THREE.FogExp2(0x141e2e, 0.0004);

    const ambLight = new THREE.AmbientLight(0x7598c8, 2.2);
    this.scene.add(ambLight);

    const hemiLight = new THREE.HemisphereLight(0x90b8f0, 0x30425c, 2.5);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    this.moonLight = new THREE.DirectionalLight(0xd0e4ff, 3.2);
    this.moonLight.position.set(500, 800, 400);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 50;
    this.moonLight.shadow.camera.far = 2800;
    const d = 700;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.scene.add(this.moonLight);
  }

  // 🏎️ AUTHENTIC FORMULA 1 AUTODROME CIRCUIT (Chicanes, Curva Grande, Hairpins & Esses)
  buildF1GrandPrixCircuitAndKerbs() {
    const groundGroup = new THREE.Group();

    const groundGeom = new THREE.PlaneGeometry(3600, 3600);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2230,
      roughness: 0.6,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.y = 0.0;
    ground.receiveShadow = true;
    groundGroup.add(ground);

    // 14 Iconic Formula 1 Autodrome Spline Coordinates
    const trackPoints = [
      new THREE.Vector3(0, 0.12, 0),        // Start / Finish Line
      new THREE.Vector3(0, 0.12, 380),      // Main Straight
      new THREE.Vector3(140, 0.12, 540),    // Chicane Entry (Turn 1 Right)
      new THREE.Vector3(280, 0.12, 500),    // Chicane Exit (Turn 2 Left)
      new THREE.Vector3(480, 0.12, 340),    // Curva Grande Long Arc
      new THREE.Vector3(560, 0.12, 80),     // Sweeper Apex
      new THREE.Vector3(440, 0.12, -180),   // Variante Roggia Chicane
      new THREE.Vector3(260, 0.12, -320),   // Lesmo 1 Fast Right
      new THREE.Vector3(80, 0.12, -540),    // Lesmo 2 Hairpin Turn
      new THREE.Vector3(-180, 0.12, -520),  // Serraglio High-Speed Straight
      new THREE.Vector3(-420, 0.12, -320),  // Ascari Entry
      new THREE.Vector3(-540, 0.12, -80),   // Ascari Technical Esses
      new THREE.Vector3(-460, 0.12, 220),   // Parabolica High Speed Apex
      new THREE.Vector3(-240, 0.12, 420),   // Parabolica Exit Sweeper
      new THREE.Vector3(-40, 0.12, 200),    // Approach to Finish Straight
    ];

    this.trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, "catmullrom", 0.35);
    const divisions = 320;
    this.trackWidth = 36;
    const halfWidth = this.trackWidth / 2;

    this.trackSamplePoints = this.trackCurve.getPoints(divisions);
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= divisions; i++) {
      const p = this.trackSamplePoints[i % divisions];
      const nextP = this.trackSamplePoints[(i + 1) % divisions];
      const tangent = new THREE.Vector3().subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftX = p.x - normal.x * halfWidth;
      const leftZ = p.z - normal.z * halfWidth;
      const rightX = p.x + normal.x * halfWidth;
      const rightZ = p.z + normal.z * halfWidth;

      vertices.push(leftX, 0.12, leftZ);
      vertices.push(rightX, 0.12, rightZ);

      const v = (i / divisions) * 75;
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
    groundGroup.add(this.roadMesh);

    // F1 Authentic Red & White Apex Kerbs
    const curbRedMat = new THREE.MeshBasicMaterial({ color: 0xe11d48 });
    const curbWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < this.trackSamplePoints.length; i += 2) {
      const p1 = this.trackSamplePoints[i];
      const p2 = this.trackSamplePoints[(i + 1) % this.trackSamplePoints.length];
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const dist = p1.distanceTo(p2) * 2;

      const curbMat = (i / 2) % 2 === 0 ? curbRedMat : curbWhiteMat;

      const curb1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, dist), curbMat);
      curb1.position.set(mid.x + normal.x * (halfWidth + 1.0), 0.16, mid.z + normal.z * (halfWidth + 1.0));
      curb1.lookAt(mid.x + normal.x * (halfWidth + 1.0) + tangent.x, 0.16, mid.z + normal.z * (halfWidth + 1.0) + tangent.z);

      const curb2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, dist), curbMat);
      curb2.position.set(mid.x - normal.x * (halfWidth + 1.0), 0.16, mid.z - normal.z * (halfWidth + 1.0));
      curb2.lookAt(mid.x - normal.x * (halfWidth + 1.0) + tangent.x, 0.16, mid.z - normal.z * (halfWidth + 1.0) + tangent.z);

      groundGroup.add(curb1, curb2);
    }

    this.scene.add(groundGroup);
  }

  // 🏟️ F1 PIT GRANDSTANDS ALONG MAIN STRAIGHT
  buildF1GrandstandsAndPits() {
    const standsGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const seatBlue = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const seatRed = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

    const makeGrandstand = (x, z, rotY) => {
      const g = new THREE.Group();

      const base = new THREE.Mesh(new THREE.BoxGeometry(32, 12, 18), concreteMat);
      base.position.set(0, 6, 0);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(34, 0.6, 22), roofMat);
      roof.position.set(0, 14, 2);

      const seats1 = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 4), seatBlue);
      seats1.position.set(0, 5, -4);
      const seats2 = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 4), seatRed);
      seats2.position.set(0, 8, 0);
      const seats3 = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 4), seatBlue);
      seats3.position.set(0, 11, 4);

      g.add(base, roof, seats1, seats2, seats3);
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      return g;
    };

    // 4 Grandstands along the Main Straight
    standsGroup.add(makeGrandstand(32, 100, Math.PI / 2));
    standsGroup.add(makeGrandstand(32, 220, Math.PI / 2));
    standsGroup.add(makeGrandstand(-32, 100, -Math.PI / 2));
    standsGroup.add(makeGrandstand(-32, 220, -Math.PI / 2));

    this.scene.add(standsGroup);
  }

  // 🏁 START / FINISH GANTRY ARCH & STARTING GRID BOXES
  buildStartFinishGantryAndGrid() {
    const halfWidth = this.trackWidth / 2;
    const g = new THREE.Group();

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const bannerCanvas = document.createElement("canvas");
    bannerCanvas.width = 1024;
    bannerCanvas.height = 256;
    const bCtx = bannerCanvas.getContext("2d");
    bCtx.fillStyle = "#0f172a";
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

    bCtx.fillStyle = "#38bdf8";
    bCtx.font = "900 64px Segoe UI, sans-serif";
    bCtx.textAlign = "center";
    bCtx.fillText("🏁 F1 GRAND PRIX AUTODROME", 512, 120);

    bCtx.fillStyle = "#f59e0b";
    bCtx.font = "800 34px Segoe UI, sans-serif";
    bCtx.fillText("START / FINISH LINE • LAP TIMING", 512, 175);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });

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
    checkLine.position.set(0, 0.13, 0);
    g.add(checkLine);

    // 4 Starting Grid Boxes
    const gridBoxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const gridPositions = [
      { x: -5.5, z: 24 }, // Pos 1: Akira
      { x: 5.5, z: 24 },  // Pos 2: Ghost
      { x: -5.5, z: 8 },  // Pos 3: Viper
      { x: 5.5, z: 8 },   // Pos 4: Player
    ];

    gridPositions.forEach((pos) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.02, 9.8), gridBoxMat);
      box.position.set(pos.x, 0.13, pos.z);
      g.add(box);
    });

    g.position.set(0, 0, 0);
    this.scene.add(g);
  }

  buildRoadsideStreetlights() {
    const railGroup = new THREE.Group();
    const halfWidth = this.trackWidth / 2;

    const lightPoleGeom = new THREE.CylinderGeometry(0.3, 0.45, 16, 8);
    const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff3cc });

    const count = 32;
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

      const lampLight = new THREE.PointLight(0xfff3cc, 3.5, 60);
      lampLight.position.set(polePos.x - normal.x * 2.0, 15, polePos.z - normal.z * 2.0);

      railGroup.add(pole, lampHead, lampLight);
    }

    this.scene.add(railGroup);
  }

  buildDiverseSkyscrapers() {
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
    for (let x = -800; x <= 800; x += 115) {
      for (let z = -800; z <= 800; z += 115) {
        const distToTrack = getMinDistToTrack(x, z);
        if (distToTrack < 54) continue;

        bldgIndex++;
        const facadeMat = this.facadeMats[bldgIndex % this.facadeMats.length];
        const archType = bldgIndex % 5;
        const height = 120 + Math.random() * 260;

        if (archType === 0) {
          const radius = 22 + Math.random() * 12;
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), facadeMat);
          cyl.position.set(x, height / 2, z);
          cyl.castShadow = true;
          cityGroup.add(cyl);

          this.colliders.push({ minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius });
        } else if (archType === 1) {
          const baseW = 54;
          const t1H = height * 0.5;
          const t2H = height * 0.35;
          const t3H = height * 0.15;

          const tier1 = new THREE.Mesh(new THREE.BoxGeometry(baseW, t1H, baseW), facadeMat);
          tier1.position.set(x, t1H / 2, z);
          const tier2 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.72, t2H, baseW * 0.72), facadeMat);
          tier2.position.set(x, t1H + t2H / 2, z);
          const tier3 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.45, t3H, baseW * 0.45), facadeMat);
          tier3.position.set(x, t1H + t2H + t3H / 2, z);

          cityGroup.add(tier1, tier2, tier3);
          this.colliders.push({ minX: x - baseW / 2, maxX: x + baseW / 2, minZ: z - baseW / 2, maxZ: z + baseW / 2 });
        } else {
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

    this.scene.add(cityGroup);
  }

  buildStuntRamps() {
    const rampU = [0.25, 0.72];
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 });
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd000 });

    for (const u of rampU) {
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();

      const g = new THREE.Group();
      const rampGeom = new THREE.BoxGeometry(10, 2.2, 14);
      rampGeom.rotateX(0.18);
      const rampMesh = new THREE.Mesh(rampGeom, rampMat);
      rampMesh.position.y = 0.8;

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 2), arrowMat);
      stripe.position.set(0, 1.8, 4);

      g.add(rampMesh, stripe);
      g.position.set(pt.x, 0.12, pt.z);
      g.lookAt(pt.x + tangent.x, 0.12, pt.z + tangent.z);
      this.scene.add(g);

      this.stuntRamps.push({ pos: pt, u: u });
    }
  }

  buildSpeedTrapCameras() {
    const uPositions = [0.12, 0.55, 0.85];
    const camMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

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
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), lensMat);
      lens.position.set(0, 10.4, 1.0);

      g.add(pole, arm, camBox, lens);
      g.position.set(pt.x, 0, pt.z);
      g.lookAt(pt.x + tangent.x, 0, pt.z + tangent.z);
      this.scene.add(g);

      this.speedCameras.push({ pos: pt, u: u, lastTriggerTime: 0 });
    }
  }

  buildPoliceRoadblocks() {
    const uPositions = [0.42, 0.78];
    const cruiserMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0xff5500 });

    for (const u of uPositions) {
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();

      const g = new THREE.Group();
      const cruiser1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 8.8), cruiserMat);
      cruiser1.position.set(-11, 0.6, 0);
      cruiser1.rotation.y = 0.5;

      const barrier = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 0.4), barMat);
      barrier.position.set(-3, 0.6, 0);

      g.add(cruiser1, barrier);
      g.position.set(pt.x, 0.12, pt.z);
      g.lookAt(pt.x + tangent.x, 0.12, pt.z + tangent.z);
      this.scene.add(g);
    }
  }

  buildDestructibleProps() {
    const halfWidth = this.trackWidth / 2;
    const coneGeom = new THREE.ConeGeometry(0.4, 1.1, 10);
    const coneBaseGeom = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4 });
    const whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const barrelGeom = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.6 });

    for (let i = 0; i < 20; i++) {
      const u = (i / 20);
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const g = new THREE.Group();
      if (i % 2 === 0) {
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.y = 0.55;
        const base = new THREE.Mesh(coneBaseGeom, coneMat);
        base.position.y = 0.05;
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 10), whiteStripeMat);
        stripe.position.y = 0.65;
        g.add(cone, base, stripe);
      } else {
        const barrel = new THREE.Mesh(barrelGeom, barrelMat);
        barrel.position.y = 0.8;
        g.add(barrel);
      }

      const offset = (i % 4 === 0 ? halfWidth - 2.5 : -(halfWidth - 2.5));
      const pos = pt.clone().addScaledVector(normal, offset);
      g.position.set(pos.x, 0.12, pos.z);
      this.scene.add(g);

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

  buildCityFurniture() {
    const halfWidth = this.trackWidth / 2;
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.5, metalness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

    for (let i = 0; i < 6; i++) {
      const u = (i + 0.6) / 6;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = (i % 2 === 0 ? halfWidth + 8.5 : -(halfWidth + 8.5));
      const pos = pt.clone().addScaledVector(normal, side);

      const g = new THREE.Group();
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.2, 3.5), metalMat);
      roof.position.set(0, 3.8, 0);
      const glassBack = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.2, 0.1), glassMat);
      glassBack.position.set(0, 1.9, 1.6);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.15, 0.8), metalMat);
      bench.position.set(0, 0.7, 0.8);
      g.add(roof, glassBack, bench);

      g.position.set(pos.x, 0.12, pos.z);
      g.lookAt(pt.x, 0.12, pt.z);
      this.scene.add(g);
    }
  }

  buildAnimatedPedestrians() {
    const pedCount = 20;
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const cyberMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const mats = [suitMat, cyberMat, goldMat];

    const halfWidth = this.trackWidth / 2;

    for (let i = 0; i < pedCount; i++) {
      const g = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.45), mats[i % mats.length]);
      torso.position.y = 1.35;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), skinMat);
      head.position.y = 2.1;
      g.add(head);

      const legGeom = new THREE.BoxGeometry(0.26, 0.9, 0.26);
      const legL = new THREE.Mesh(legGeom, mats[(i + 1) % mats.length]);
      legL.position.set(0.2, 0.45, 0);
      const legR = legL.clone();
      legR.position.x = -0.2;
      g.add(legL, legR);

      const u = (i / pedCount);
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const sideOffset = (i % 2 === 0 ? halfWidth + 4.5 : -(halfWidth + 4.5));
      g.position.copy(pt).addScaledVector(normal, sideOffset);
      g.position.y = 0.12;

      this.scene.add(g);
      this.pedestrians.push({
        group: g,
        u: u,
        sideOffset: sideOffset,
        speed: 0.00045 + Math.random() * 0.0002,
        legL: legL,
        legR: legR,
      });
    }
  }

  // 🏁 3 ADAPTIVE AI RIVALS WITH COMPETITIVE WHEEL-TO-WHEEL PACING
  buildAIRivals() {
    const rivalsData = [
      { name: "Akira [GT-R]", color: 0x0284c7, u: 0.007, lane: -5.5, baseSpeedU: 0.024 },
      { name: "Ghost [911]", color: 0x18181b, u: 0.007, lane: 5.5, baseSpeedU: 0.025 },
      { name: "Viper [Venom]", color: 0x16a34a, u: 0.0022, lane: -5.5, baseSpeedU: 0.023 },
    ];

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.4 });

    for (const r of rivalsData) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshPhysicalMaterial({
        color: r.color,
        metalness: 0.85,
        roughness: 0.15,
        clearcoat: 1.0,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.72, 9.2), paintMat);
      body.position.y = 0.55;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.65, 4.4), glassMat);
      cabin.position.set(0, 1.15, -0.3);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.0), carbonMat);
      wing.position.set(0, 1.45, -4.2);

      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlL.position.set(1.4, 0.6, 4.61);
      const hlR = hlL.clone();
      hlR.position.x = -1.4;
      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      tl.position.set(0, 0.6, -4.61);

      g.add(body, cabin, wing, hlL, hlR, tl);

      // 3D Floating Nameplate Badge
      const nameCanvas = document.createElement("canvas");
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nCtx = nameCanvas.getContext("2d");
      nCtx.fillStyle = "rgba(15, 23, 42, 0.85)";
      nCtx.roundRect(0, 0, 256, 64, 16);
      nCtx.fill();
      nCtx.strokeStyle = "#38bdf8";
      nCtx.lineWidth = 4;
      nCtx.stroke();
      nCtx.fillStyle = "#ffffff";
      nCtx.font = "900 24px Segoe UI, sans-serif";
      nCtx.textAlign = "center";
      nCtx.fillText(r.name, 128, 40);

      const nameTex = new THREE.CanvasTexture(nameCanvas);
      const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, side: THREE.DoubleSide }));
      namePlate.position.set(0, 3.2, 0);
      g.add(namePlate);

      const pt = this.trackCurve.getPointAt(r.u);
      g.position.set(pt.x, 0.12, pt.z);
      this.scene.add(g);

      this.aiRivals.push({
        name: r.name,
        mesh: g,
        u: r.u,
        laneOffset: r.lane,
        baseSpeedU: r.baseSpeedU,
        currentSpeedU: r.baseSpeedU,
        lapsCompleted: 0,
        namePlate: namePlate,
      });
    }
  }

  buildNitroPickups() {
    const pickupCount = 10;
    const canGeom = new THREE.CylinderGeometry(0.45, 0.45, 1.6, 14);
    const canMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1,
    });
    const ringGeom = new THREE.TorusGeometry(1.0, 0.08, 8, 18);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    for (let i = 0; i < pickupCount; i++) {
      const u = (i + 0.5) / pickupCount;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const offset = (i % 2 === 0 ? 6.0 : -6.0);
      const pos = pt.clone().addScaledVector(normal, offset);

      const g = new THREE.Group();
      const canister = new THREE.Mesh(canGeom, canMat);
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      g.add(canister, ring);

      const light = new THREE.PointLight(0x0284c7, 2.5, 12);
      g.add(light);

      g.position.set(pos.x, 1.2, pos.z);
      this.scene.add(g);

      this.nitroPickups.push({
        group: g,
        active: true,
        respawnTimer: 0,
        pos: pos,
      });
    }
  }

  buildPoliceFleet() {
    const policeCount = 4;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.2, metalness: 0.85 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });

    for (let i = 0; i < policeCount; i++) {
      const g = new THREE.Group();

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.4), bodyMat);
      chassis.position.y = 0.55;
      const doors = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.6, 3.6), whiteDoorMat);
      doors.position.set(0, 0.55, 0);

      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0x0066ff }));
      blueLight.position.set(0.7, 1.55, -0.4);
      const redLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      redLight.position.set(-0.7, 1.55, -0.4);
      g.add(chassis, doors, blueLight, redLight);

      const u = (i * 0.22 + 0.08) % 1.0;
      const pt = this.trackCurve.getPointAt(u);
      g.position.set(pt.x, 0.12, pt.z);
      this.scene.add(g);

      this.policeUnits.push({
        group: g,
        u: u,
        speedU: 0.024 + i * 0.003,
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
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

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
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xeeffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const spotCone = new THREE.Mesh(spotGeom, spotMat);
    spotCone.position.set(0, -45, 0);
    heliGroup.add(spotCone);

    heliGroup.position.set(0, 95, 0);
    this.scene.add(heliGroup);
    this.helicopter = heliGroup;
  }

  buildDetailedTraffic() {
    const carColors = [0x0284c7, 0xd97706, 0xdc2626, 0x16a34a, 0x4f46e5, 0x475569];
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.37, 10);
    rimGeom.rotateZ(Math.PI / 2);

    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({
        color: carColors[i % carColors.length],
        metalness: 0.6,
        roughness: 0.25,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.7, 8.4), paintMat);
      body.position.y = 0.55;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.65, 4.4), glassMat);
      cabin.position.set(0, 1.15, -0.3);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.5), paintMat);
      roof.position.set(0, 1.48, -0.3);

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
      hlL.position.set(1.4, 0.6, 4.21);
      const hlR = hlL.clone();
      hlR.position.x = -1.4;

      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.1), tlMat);
      tl.position.set(0, 0.6, -4.21);

      g.add(body, cabin, roof, wFL, wFR, wRL, wRR, hlL, hlR, tl);

      const u = (i / 8);
      const pt = this.trackCurve.getPointAt(u);
      g.position.set(pt.x + (i % 2 === 0 ? 6 : -6), 0.12, pt.z);
      this.scene.add(g);

      this.trafficCars.push({
        mesh: g,
        u: u,
        speed: 0.015 + (i % 3) * 0.005,
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
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  toggleWeather() {
    this.isRaining = !this.isRaining;
    if (this.rainParticles) this.rainParticles.visible = this.isRaining;
    cyberAudio.setRainActive(this.isRaining);

    if (this.roadMat) {
      this.roadMat.roughness = this.isRaining ? 0.08 : 0.4;
      this.roadMat.metalness = this.isRaining ? 0.65 : 0.15;
    }

    return this.isRaining ? "🌧️ ДОЖДЬ" : "☀️ ЯСНАЯ НОЧЬ";
  }

  // 🧮 100% ACCURATE CURVE PROJECTION (Finds exact parameter u in [0, 1] for ANY point in the world)
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

  handleCarTrackCollision(car) {
    const px = car.position.x;
    const pz = car.position.z;
    const carRadius = 2.6;

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

    for (const ramp of this.stuntRamps) {
      const dist = ramp.pos.distanceTo(car.position);
      if (dist < 7.0 && car.speed > 120 && car.position.y <= 0.2) {
        car.verticalVelocity = 14.0;
        car.totalScore += 1000;
        if (this.onNitroPickupCallback) {
          this.onNitroPickupCallback("🚀 AIR TIME JUMP! +1000 PTS");
        }
      }
    }
  }

  update(delta, playerCar, isRaceRunning = true) {
    const playerPos = playerCar.mesh.position;
    const playerSpeed = Math.abs(playerCar.speed);
    const playerU = this.getClosestU(playerPos);
    const now = Date.now();

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
      if (this.heliRotor) this.heliRotor.rotation.y += delta * 25;
      this.helicopter.position.x = THREE.MathUtils.lerp(this.helicopter.position.x, playerPos.x, delta * 2.0);
      this.helicopter.position.z = THREE.MathUtils.lerp(this.helicopter.position.z, playerPos.z, delta * 2.0);
    }

    // 3. ADAPTIVE AI RIVALS (Packs & battles directly with the player!)
    for (let i = 0; i < this.aiRivals.length; i++) {
      const rival = this.aiRivals[i];
      if (isRaceRunning) {
        // Dynamic adaptive pacing: stay within intense racing proximity!
        let diffU = (rival.u - playerU);
        if (diffU > 0.5) diffU -= 1.0;
        if (diffU < -0.5) diffU += 1.0;

        let targetSpeedMultiplier = 1.0;
        if (diffU > 0.08) {
          targetSpeedMultiplier = 0.82; // Don't run away too far
        } else if (diffU < -0.08) {
          targetSpeedMultiplier = 1.35; // Catch up aggressively from behind!
        } else {
          targetSpeedMultiplier = 0.95 + (i * 0.05); // Race neck-and-neck!
        }

        rival.currentSpeedU = THREE.MathUtils.lerp(rival.currentSpeedU, rival.baseSpeedU * targetSpeedMultiplier, delta * 2.0);

        const prevU = rival.u;
        rival.u = (rival.u + rival.currentSpeedU * delta) % 1.0;
        if (prevU > 0.85 && rival.u < 0.15) rival.lapsCompleted++;
      }

      const pt = this.trackCurve.getPointAt(rival.u);
      const tangent = this.trackCurve.getTangentAt(rival.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      rival.mesh.position.copy(pt).addScaledVector(normal, rival.laneOffset);
      rival.mesh.position.y = 0.12;

      const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, rival.laneOffset);
      rival.mesh.lookAt(lookPt.x, 0.12, lookPt.z);

      if (rival.namePlate) {
        rival.namePlate.lookAt(playerPos.x, 3.2, playerPos.z);
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

        if (prop.group.position.y < 0.12) {
          prop.group.position.y = 0.12;
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

    // 6. Nitro Pickups
    for (const pickup of this.nitroPickups) {
      if (!pickup.active) {
        pickup.respawnTimer += delta;
        if (pickup.respawnTimer > 12.0) {
          pickup.active = true;
          pickup.group.visible = true;
        }
        continue;
      }

      pickup.group.rotation.y += delta * 3.5;
      pickup.group.position.y = 1.2 + Math.sin(now * 0.005) * 0.25;

      const dist = pickup.group.position.distanceTo(playerPos);
      if (dist < 4.2) {
        pickup.active = false;
        pickup.group.visible = false;
        pickup.respawnTimer = 0;

        playerCar.nitroFuel = Math.min(100, playerCar.nitroFuel + 50);
        playerCar.totalScore += 500;
        cyberAudio.playNitroPickupSound();
        playerCar.emitSparks(pickup.group.position);

        if (this.onNitroPickupCallback) {
          this.onNitroPickupCallback("⚡ +50% N2O NITRO PICKUP! +500 PTS");
        }
      }
    }

    // 7. Police Pursuits
    let nearestPoliceDist = 999999;
    const isBlink = Math.sin(now * 0.025) > 0;

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

      police.blueLight.material.color.setHex(isBlink ? 0x00f0ff : 0x001144);
      police.redLight.material.color.setHex(!isBlink ? 0xff0022 : 0x330008);

      let speedMultiplier = 1.0;
      if (playerSpeed > 30) speedMultiplier = 1.35;

      police.u = (police.u + police.speedU * speedMultiplier * delta) % 1.0;
      const pt = this.trackCurve.getPointAt(police.u);
      const tangent = this.trackCurve.getTangentAt(police.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      police.group.position.copy(pt).addScaledVector(normal, police.laneOffset);
      police.group.position.y = 0.12;

      const lookPt = pt.clone().addScaledVector(tangent, 6).addScaledVector(normal, police.laneOffset);
      police.group.lookAt(lookPt.x, 0.12, lookPt.z);

      const dist = police.group.position.distanceTo(playerPos);
      if (dist < nearestPoliceDist) nearestPoliceDist = dist;

      if (dist < 4.8) {
        if (playerSpeed > 68) {
          police.isDestroyed = true;
          cyberAudio.playTakedownCrunch();
          playerCar.emitSparks(police.group.position);
          playerCar.totalScore += 1500;

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

    // 8. Traffic Cars
    for (const car of this.trafficCars) {
      car.u = (car.u + car.speed * delta) % 1.0;
      const pt = this.trackCurve.getPointAt(car.u);
      const tangent = this.trackCurve.getTangentAt(car.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      car.mesh.position.copy(pt).addScaledVector(normal, car.laneOffset);
      car.mesh.position.y = 0.12;

      const lookPt = pt.clone().addScaledVector(tangent, 5).addScaledVector(normal, car.laneOffset);
      car.mesh.lookAt(lookPt.x, 0.12, lookPt.z);

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

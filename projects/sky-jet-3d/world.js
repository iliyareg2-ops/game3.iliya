// world.js - High-Fidelity Photorealistic Procedural World (Continuous Smooth fBm Terrain, Tropical Ocean Beaches with Palms & Ships, Agricultural Crop Fields, Alpine Lakes & Modern Megacity with Skybridges)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { flightAudio } from "./audio.js";

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkSize = 1000;
    this.viewDistance = 2; // 5x5 grid = 5000m x 5000m active simulation zone

    this.windmills = [];
    this.lighthouses = [];
    this.trafficCars = [];
    this.clouds = [];
    this.buildingColliders = [];
    this.beaconLights = [];
    this.waterMeshes = [];
    this.stuntRings = [];
    this.aiPlanes = [];
    this.ships = [];

    this.radarDish = null;
    this.windsock = null;

    // Time of Day
    this.timeOfDay = "DAY";
    this.timeCycle = 0.2;

    this.currentBiome = "AIRPORT";
    this.onBiomeChangeCallback = null;

    this.initTexturesAndMaterials();
    this.initLighting();
    this.initAirportBase();
    this.initClouds();
    this.initSkyTraffic();
    this.initStuntRings();
  }

  initTexturesAndMaterials() {
    // 1. Blue Glass Skyscraper Facade
    const blueCanvas = document.createElement("canvas");
    blueCanvas.width = 512;
    blueCanvas.height = 1024;
    const bCtx = blueCanvas.getContext("2d");
    bCtx.fillStyle = "#121e2d";
    bCtx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 30) {
      bCtx.fillStyle = "#22354a";
      bCtx.fillRect(0, y, 512, 4);
      for (let x = 12; x < 512; x += 28) {
        const isLit = Math.random() > 0.35;
        bCtx.fillStyle = isLit ? (Math.random() > 0.6 ? "#fffae0" : "#00f0ff") : "#09121c";
        bCtx.fillRect(x, y + 5, 20, 20);
      }
    }
    const blueTex = new THREE.CanvasTexture(blueCanvas);
    blueTex.wrapS = THREE.RepeatWrapping;
    blueTex.wrapT = THREE.RepeatWrapping;

    this.blueGlassMat = new THREE.MeshStandardMaterial({
      map: blueTex,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x003355,
      emissiveIntensity: 0.45,
    });

    // 2. Gold Luxury Facade
    const goldCanvas = document.createElement("canvas");
    goldCanvas.width = 512;
    goldCanvas.height = 1024;
    const gCtx = goldCanvas.getContext("2d");
    gCtx.fillStyle = "#241b10";
    gCtx.fillRect(0, 0, 512, 1024);

    for (let y = 16; y < 1024; y += 28) {
      gCtx.fillStyle = "#4a3820";
      gCtx.fillRect(0, y, 512, 3);
      for (let x = 14; x < 512; x += 24) {
        const isLit = Math.random() > 0.4;
        gCtx.fillStyle = isLit ? "#ffd166" : "#140f09";
        gCtx.fillRect(x, y + 4, 18, 18);
      }
    }
    const goldTex = new THREE.CanvasTexture(goldCanvas);
    goldTex.wrapS = THREE.RepeatWrapping;
    goldTex.wrapT = THREE.RepeatWrapping;

    this.goldGlassMat = new THREE.MeshStandardMaterial({
      map: goldTex,
      metalness: 0.88,
      roughness: 0.2,
      emissive: 0x442800,
      emissiveIntensity: 0.45,
    });

    // 3. Cyber Neon Billboard Tower
    const cyberCanvas = document.createElement("canvas");
    cyberCanvas.width = 512;
    cyberCanvas.height = 1024;
    const cCtx = cyberCanvas.getContext("2d");
    cCtx.fillStyle = "#0f1218";
    cCtx.fillRect(0, 0, 512, 1024);

    for (let y = 20; y < 1024; y += 36) {
      cCtx.fillStyle = "#18202c";
      cCtx.fillRect(0, y, 512, 4);
      for (let x = 16; x < 512; x += 32) {
        const isLit = Math.random() > 0.45;
        cCtx.fillStyle = isLit ? "#00ffcc" : "#070a0f";
        cCtx.fillRect(x, y + 6, 22, 22);
      }
    }

    cCtx.fillStyle = "#000000";
    cCtx.fillRect(32, 360, 448, 260);
    cCtx.strokeStyle = "#ff0055";
    cCtx.lineWidth = 8;
    cCtx.strokeRect(32, 360, 448, 260);

    cCtx.font = "bold 56px Arial";
    cCtx.fillStyle = "#00f0ff";
    cCtx.textAlign = "center";
    cCtx.fillText("SKY JET 3D", 256, 460);

    cCtx.font = "bold 32px Arial";
    cCtx.fillStyle = "#ff007f";
    cCtx.fillText("CYBER METROPOLIS", 256, 530);

    const cyberTex = new THREE.CanvasTexture(cyberCanvas);
    cyberTex.wrapS = THREE.RepeatWrapping;
    cyberTex.wrapT = THREE.RepeatWrapping;

    this.cyberMat = new THREE.MeshStandardMaterial({
      map: cyberTex,
      metalness: 0.82,
      roughness: 0.28,
      emissive: 0x112233,
      emissiveIntensity: 0.6,
    });

    // 4. White Concrete Tower
    const whiteCanvas = document.createElement("canvas");
    whiteCanvas.width = 512;
    whiteCanvas.height = 1024;
    const wCtx = whiteCanvas.getContext("2d");
    wCtx.fillStyle = "#e2e8f0";
    wCtx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 30) {
      wCtx.fillStyle = "#94a3b8";
      wCtx.fillRect(0, y, 512, 5);
      for (let x = 12; x < 512; x += 26) {
        const isLit = Math.random() > 0.4;
        wCtx.fillStyle = isLit ? "#2b6cb0" : "#334155";
        wCtx.fillRect(x, y + 6, 18, 16);
      }
    }
    const whiteTex = new THREE.CanvasTexture(whiteCanvas);
    whiteTex.wrapS = THREE.RepeatWrapping;
    whiteTex.wrapT = THREE.RepeatWrapping;

    this.whiteArchMat = new THREE.MeshStandardMaterial({
      map: whiteTex,
      metalness: 0.4,
      roughness: 0.5,
    });
  }

  initLighting() {
    this.scene.fog = new THREE.FogExp2(0xcfe2f3, 0.00028);

    this.hemiLight = new THREE.HemisphereLight(0xbde0fe, 0x485635, 0.95);
    this.hemiLight.position.set(0, 900, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaea, 1.85);
    this.sunLight.position.set(900, 1000, 700);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 100;
    this.sunLight.shadow.camera.far = 5000;

    const d = 1200;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    const sunGeom = new THREE.SphereGeometry(75, 16, 16);
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3aa });
    this.sunOrb = new THREE.Mesh(sunGeom, this.sunMat);
    this.sunOrb.position.copy(this.sunLight.position).multiplyScalar(3.0);
    this.scene.add(this.sunOrb);
  }

  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    if (mode === "DAY") {
      this.scene.background.setHex(0xcbe0f5);
      this.scene.fog.color.setHex(0xcfe2f3);
      this.hemiLight.color.setHex(0xbde0fe);
      this.hemiLight.groundColor.setHex(0x485635);
      this.hemiLight.intensity = 0.95;
      this.sunLight.color.setHex(0xfffaea);
      this.sunLight.intensity = 1.85;
      this.sunLight.position.set(900, 1000, 700);
      this.sunMat.color.setHex(0xfff3aa);
      this.blueGlassMat.emissiveIntensity = 0.45;
      this.goldGlassMat.emissiveIntensity = 0.45;
      this.cyberMat.emissiveIntensity = 0.6;
    } else if (mode === "SUNSET") {
      this.scene.background.setHex(0x381832);
      this.scene.fog.color.setHex(0xc85e48);
      this.hemiLight.color.setHex(0xff7744);
      this.hemiLight.groundColor.setHex(0x28101a);
      this.hemiLight.intensity = 1.15;
      this.sunLight.color.setHex(0xff8844);
      this.sunLight.intensity = 2.2;
      this.sunLight.position.set(1400, 240, 400);
      this.sunMat.color.setHex(0xff5511);
      this.blueGlassMat.emissiveIntensity = 0.75;
      this.goldGlassMat.emissiveIntensity = 0.8;
      this.cyberMat.emissiveIntensity = 0.9;
    } else if (mode === "NIGHT") {
      this.scene.background.setHex(0x040710);
      this.scene.fog.color.setHex(0x080d1a);
      this.hemiLight.color.setHex(0x223355);
      this.hemiLight.groundColor.setHex(0x040810);
      this.hemiLight.intensity = 0.5;
      this.sunLight.color.setHex(0x7799cc);
      this.sunLight.intensity = 0.75;
      this.sunLight.position.set(600, 800, -500);
      this.sunMat.color.setHex(0xddffff);
      this.blueGlassMat.emissiveIntensity = 1.0;
      this.goldGlassMat.emissiveIntensity = 1.0;
      this.cyberMat.emissiveIntensity = 1.3;
    }
  }

  // Continuous Smooth Macro-Biome Weights (4000m scale per zone)
  getBiomeWeights(x, z) {
    if (Math.abs(x) < 500 && Math.abs(z) < 650) {
      return { mountains: 0, city: 0, meadow: 0, ocean: 0, airport: 1 };
    }

    const scale = 0.00025; // 4000m period
    const b1 = Math.sin(x * scale) * Math.cos(z * scale);
    const b2 = Math.sin((x + 1600) * scale * 1.3) * Math.sin((z + 1200) * scale * 1.3);

    // Continuous 4-way classification
    let wMtn = Math.max(0, b1);
    let wCity = Math.max(0, -b1);
    let wMeadow = Math.max(0, b2);
    let wOcean = Math.max(0, -b2);

    const sum = wMtn + wCity + wMeadow + wOcean + 0.0001;
    return {
      mountains: wMtn / sum,
      city: wCity / sum,
      meadow: wMeadow / sum,
      ocean: wOcean / sum,
      airport: 0,
    };
  }

  getBiomeAt(x, z) {
    const w = this.getBiomeWeights(x, z);
    if (w.airport > 0.5) return "AIRPORT";
    if (w.city >= w.mountains && w.city >= w.meadow && w.city >= w.ocean) return "CITY";
    if (w.meadow >= w.mountains && w.meadow >= w.city && w.meadow >= w.ocean) return "FLOWERS";
    if (w.ocean >= w.mountains && w.ocean >= w.city && w.ocean >= w.meadow) return "OCEAN";
    return "MOUNTAINS";
  }

  // Smooth Multi-Octave Terrain Height with natural beaches, erosion, and rolling hills
  getTerrainHeight(x, z) {
    const distToRunwayX = Math.abs(x);
    const distToRunwayZ = Math.abs(z);
    if (distToRunwayX < 140 && distToRunwayZ < 750) return 0;

    const w = this.getBiomeWeights(x, z);

    // 1. Mountain elevation (fBm ridges: 20m - 420m)
    const m1 = Math.sin(x * 0.0008) * Math.cos(z * 0.0008) * 340;
    const m2 = Math.abs(Math.sin(x * 0.0024 + 1.2) * Math.cos(z * 0.0024 + 0.8)) * 130;
    const m3 = Math.sin(x * 0.007) * Math.cos(z * 0.007) * 30;
    const hMountain = Math.max(12, Math.abs(m1) + m2 + m3);

    // 2. Meadow elevation (Gentle rolling green hills: 8m - 45m)
    const hMeadow = Math.sin(x * 0.0018) * Math.cos(z * 0.0018) * 28 + Math.sin(x * 0.004) * 12 + 16;

    // 3. City elevation (Flat urban plateau: 2m with slight elevation)
    const hCity = 2.0;

    // 4. Ocean elevation (Sea level 0m, with coastal beach slope and archipelago islands)
    const islandNoise = Math.sin(x * 0.0035) * Math.cos(z * 0.0035);
    let hOcean = 0;
    if (islandNoise > 0.35) {
      hOcean = (islandNoise - 0.35) * 180; // Tropical island peaks
    }

    // Blend all components continuously
    let h =
      w.mountains * hMountain +
      w.meadow * hMeadow +
      w.city * hCity +
      w.ocean * hOcean;

    // Airport plateau blending
    if (distToRunwayX < 450 && distToRunwayZ < 850) {
      const blend = Math.max(0, Math.min(1, Math.max((distToRunwayX - 140) / 300, (distToRunwayZ - 750) / 100)));
      h *= blend;
    }

    return h;
  }

  checkBuildingCollision(planePos, radius = 4.5) {
    const px = planePos.x;
    const py = planePos.y;
    const pz = planePos.z;

    for (const b of this.buildingColliders) {
      if (
        px + radius >= b.minX &&
        px - radius <= b.maxX &&
        pz + radius >= b.minZ &&
        pz - radius <= b.maxZ &&
        py + radius >= b.minY &&
        py - radius <= b.maxY
      ) {
        return true;
      }
    }
    return false;
  }

  initAirportBase() {
    const group = new THREE.Group();

    const rwLength = 1200;
    const rwWidth = 54;
    const rwGeom = new THREE.PlaneGeometry(rwWidth, rwLength);
    rwGeom.rotateX(-Math.PI / 2);
    const rwMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.85 });
    const runway = new THREE.Mesh(rwGeom, rwMat);
    runway.position.set(0, 0.2, 0);
    runway.receiveShadow = true;
    group.add(runway);

    const dashGeom = new THREE.PlaneGeometry(2.4, 24);
    dashGeom.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -rwLength / 2 + 50; z < rwLength / 2 - 50; z += 40) {
      const dash = new THREE.Mesh(dashGeom, dashMat);
      dash.position.set(0, 0.25, z);
      group.add(dash);
    }

    const lightGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
    const whiteGlowMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
    const greenGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });

    for (let z = -rwLength / 2; z <= rwLength / 2; z += 40) {
      let mat = whiteGlowMat;
      if (z === -rwLength / 2) mat = greenGlowMat;
      if (z === rwLength / 2) mat = redGlowMat;

      const leftLight = new THREE.Mesh(lightGeom, mat);
      leftLight.position.set(-rwWidth / 2 - 2, 0.4, z);
      const rightLight = new THREE.Mesh(lightGeom, mat);
      rightLight.position.set(rwWidth / 2 + 2, 0.4, z);
      group.add(leftLight, rightLight);
    }

    const towerBaseGeom = new THREE.CylinderGeometry(6, 9, 45, 12);
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
    const towerBase = new THREE.Mesh(towerBaseGeom, concreteMat);
    towerBase.position.set(80, 22.5, -200);
    group.add(towerBase);

    const cabGeom = new THREE.CylinderGeometry(11, 7, 10, 12);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x113355,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const cab = new THREE.Mesh(cabGeom, glassMat);
    cab.position.set(80, 50, -200);
    group.add(cab);

    const dishGroup = new THREE.Group();
    const dishGeom = new THREE.SphereGeometry(4, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.4 });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.rotation.x = Math.PI / 3;
    dishGroup.add(dish);
    dishGroup.position.set(80, 56, -200);
    group.add(dishGroup);
    this.radarDish = dishGroup;

    const hangarGeom = new THREE.CylinderGeometry(28, 28, 70, 16, 1, false, 0, Math.PI);
    hangarGeom.rotateZ(Math.PI / 2);
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x485260, metalness: 0.7, roughness: 0.4 });
    const hangar1 = new THREE.Mesh(hangarGeom, hangarMat);
    hangar1.position.set(95, 0, -50);
    const hangar2 = new THREE.Mesh(hangarGeom, hangarMat);
    hangar2.position.set(95, 0, 80);
    group.add(hangar1, hangar2);

    this.scene.add(group);
  }

  initStuntRings() {
    const ringPositions = [
      { x: 0, y: 110, z: 400 },
      { x: 220, y: 170, z: 1200 },
      { x: -280, y: 220, z: 1800 },
      { x: 450, y: 260, z: 2600 },
      { x: -420, y: 290, z: -1200 },
      { x: 600, y: 320, z: -1900 },
      { x: -800, y: 190, z: 700 },
      { x: 950, y: 160, z: -600 },
    ];

    const ringGeom = new THREE.TorusGeometry(15, 1.3, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });

    ringPositions.forEach((p) => {
      const ring = new THREE.Mesh(ringGeom, ringMat.clone());
      ring.position.set(p.x, p.y, p.z);
      ring.rotation.y = Math.random() * Math.PI;
      this.scene.add(ring);
      this.stuntRings.push({ mesh: ring, active: true });
    });
  }

  initSkyTraffic() {
    const airlinerMat = new THREE.MeshStandardMaterial({ color: 0xf5f8fc, roughness: 0.3, metalness: 0.7 });
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    for (let i = 0; i < 4; i++) {
      const planeGroup = new THREE.Group();
      const fuseGeom = new THREE.CylinderGeometry(3.5, 3.5, 45, 12);
      fuseGeom.rotateX(Math.PI / 2);
      const fuse = new THREE.Mesh(fuseGeom, airlinerMat);
      planeGroup.add(fuse);

      const wingGeom = new THREE.BoxGeometry(42, 0.6, 6);
      const wings = new THREE.Mesh(wingGeom, airlinerMat);
      wings.position.set(0, 0, 2);
      planeGroup.add(wings);

      const strobe1 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), strobeMat);
      strobe1.position.set(21, 0.4, 2);
      const strobe2 = strobe1.clone();
      strobe2.position.x = -21;
      planeGroup.add(strobe1, strobe2);

      planeGroup.position.set(
        (Math.random() - 0.5) * 6000,
        650 + Math.random() * 300,
        (Math.random() - 0.5) * 6000
      );

      this.scene.add(planeGroup);
      this.aiPlanes.push({
        group: planeGroup,
        speed: 180 + Math.random() * 60,
        heading: Math.random() * Math.PI * 2,
      });
    }
  }

  // Create High-Detail Chunk with Continuous Shading (Snow, Rock, Meadows, Beach Sand, Ocean Lagoon)
  createChunk(cx, cz) {
    const chunkGroup = new THREE.Group();
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;
    const centerX = startX + this.chunkSize / 2;
    const centerZ = startZ + this.chunkSize / 2;
    const biome = this.getBiomeAt(centerX, centerZ);

    const segs = 36;
    const geom = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, segs, segs);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    const snowColor = new THREE.Color(0xf6f9fd);
    const rockColor = new THREE.Color(0x525a66);
    const alpineGrassColor = new THREE.Color(0x2d5526);
    const meadowColor = new THREE.Color(0x40912e);
    const cityAsphaltColor = new THREE.Color(0x181c24);
    const beachSandColor = new THREE.Color(0xe5c98d); // Golden tropical beach sand
    const shallowLagoonColor = new THREE.Color(0x0ea5e9); // Turquoise shallow water
    const deepOceanBedColor = new THREE.Color(0x0c4a6e);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + centerX;
      const vz = pos.getZ(i) + centerZ;
      const vy = this.getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      const w = this.getBiomeWeights(vx, vz);

      if (vy <= 1.2 && w.ocean > 0.25) {
        // Ocean bed
        color.lerpColors(deepOceanBedColor, shallowLagoonColor, vy / 1.2);
      } else if (vy <= 6.5 && (w.ocean > 0.15 || w.meadow > 0.15)) {
        // Tropical Golden Beach Shoreline
        color.copy(beachSandColor);
      } else if (w.city > 0.45) {
        // City Road Surface
        color.copy(cityAsphaltColor);
      } else if (w.meadow > 0.35 && vy < 65) {
        // Striped Colorful Crop & Flower Fields
        const cropPattern = Math.sin(vx * 0.025 + vz * 0.015);
        if (cropPattern > 0.5) {
          color.setHex(0x9333ea); // Lavender Rows
        } else if (cropPattern > 0.15) {
          color.setHex(0xe11d48); // Red Poppy Fields
        } else if (cropPattern < -0.35) {
          color.setHex(0xeab308); // Golden Sunflower Fields
        } else {
          color.copy(meadowColor);
        }
      } else {
        // Mountain Elevation Shading
        if (vy > 240) {
          color.copy(snowColor);
        } else if (vy > 130) {
          const t = (vy - 130) / 110;
          color.lerpColors(rockColor, snowColor, t);
        } else if (vy > 40) {
          const t = (vy - 40) / 90;
          color.lerpColors(alpineGrassColor, rockColor, t);
        } else {
          color.copy(alpineGrassColor);
        }
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.08,
    });

    const terrain = new THREE.Mesh(geom, mat);
    terrain.position.set(centerX, 0, centerZ);
    terrain.receiveShadow = true;
    chunkGroup.add(terrain);

    const chunkColliders = [];

    // Populate Detailed Props based on Biome
    if (biome === "CITY") {
      this.populateDetailedCity(chunkGroup, centerX, centerZ, chunkColliders);
    } else if (biome === "FLOWERS") {
      this.populateDetailedFarmland(chunkGroup, centerX, centerZ);
    } else if (biome === "OCEAN") {
      this.populateDetailedOcean(chunkGroup, centerX, centerZ);
    } else if (biome === "MOUNTAINS" && Math.abs(centerX) > 250) {
      this.populateDetailedMountains(chunkGroup, centerX, centerZ);
    }

    this.scene.add(chunkGroup);
    return { group: chunkGroup, cx, cz, biome, colliders: chunkColliders };
  }

  // 🏙️ Hyper-Detailed Megacity with Skybridges, Central Park & Traffic
  populateDetailedCity(group, cx, cz, collidersList) {
    const materials = [this.blueGlassMat, this.goldGlassMat, this.cyberMat, this.whiteArchMat];
    const gridStep = 140;

    // Central Green Park in one city block
    const parkX = cx - 70;
    const parkZ = cz - 70;
    const parkGeom = new THREE.PlaneGeometry(110, 110);
    parkGeom.rotateX(-Math.PI / 2);
    const parkMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
    const park = new THREE.Mesh(parkGeom, parkMat);
    park.position.set(parkX, 1.6, parkZ);
    group.add(park);

    // Park Pond
    const pondGeom = new THREE.CircleGeometry(24, 16);
    pondGeom.rotateX(-Math.PI / 2);
    const pondMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
    const pond = new THREE.Mesh(pondGeom, pondMat);
    pond.position.set(parkX, 1.65, parkZ);
    group.add(pond);

    let lastTowerPos = null;

    for (let x = cx - this.chunkSize / 2 + 80; x < cx + this.chunkSize / 2 - 80; x += gridStep) {
      for (let z = cz - this.chunkSize / 2 + 80; z < cz + this.chunkSize / 2 - 80; z += gridStep) {
        // Keep central park clear of skyscrapers
        if (Math.abs(x - parkX) < 60 && Math.abs(z - parkZ) < 60) continue;
        if (Math.random() < 0.15) continue;

        const width = 48 + Math.random() * 35;
        const depth = 48 + Math.random() * 35;
        const height = 110 + Math.random() * 250; // 110m to 360m high

        const mat = materials[Math.floor(Math.random() * materials.length)];
        const bldgGeom = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeom, mat);
        bldg.position.set(x, height / 2 + 1.5, z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        group.add(bldg);

        const boxCollider = {
          minX: x - width / 2,
          maxX: x + width / 2,
          minZ: z - depth / 2,
          maxZ: z + depth / 2,
          minY: 1.5,
          maxY: height + 1.5,
        };
        collidersList.push(boxCollider);
        this.buildingColliders.push(boxCollider);

        // Skybridge connecting double towers!
        if (lastTowerPos && lastTowerPos.height > 160 && height > 160 && Math.random() > 0.4) {
          const bridgeY = Math.min(lastTowerPos.height, height) * 0.75;
          const dist = Math.hypot(x - lastTowerPos.x, z - lastTowerPos.z);
          if (dist < 180) {
            const bridgeGeom = new THREE.BoxGeometry(16, 8, dist);
            const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
            const bridge = new THREE.Mesh(bridgeGeom, bridgeMat);
            bridge.position.set((x + lastTowerPos.x) / 2, bridgeY, (z + lastTowerPos.z) / 2);
            bridge.lookAt(x, bridgeY, z);
            group.add(bridge);
          }
        }
        lastTowerPos = { x, z, height };

        // Rooftop antenna with blinking warning lights
        if (height > 200) {
          const spireGeom = new THREE.CylinderGeometry(0.5, 2.0, 45, 8);
          const spireMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9 });
          const spire = new THREE.Mesh(spireGeom, spireMat);
          spire.position.set(x, height + 22.5 + 1.5, z);
          group.add(spire);

          const beaconGeom = new THREE.SphereGeometry(1.6, 8, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
          const beacon = new THREE.Mesh(beaconGeom, beaconMat);
          beacon.position.set(x, height + 45 + 1.5, z);
          group.add(beacon);
          this.beaconLights.push(beacon);
        } else if (Math.random() > 0.5) {
          const heliGeom = new THREE.RingGeometry(8, 12, 16);
          heliGeom.rotateX(-Math.PI / 2);
          const heliMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
          const helipad = new THREE.Mesh(heliGeom, heliMat);
          helipad.position.set(x, height + 1.6, z);
          group.add(helipad);
        }
      }
    }

    // Street traffic cars
    for (let i = 0; i < 18; i++) {
      const carGeom = new THREE.BoxGeometry(2.8, 1.4, 5.5);
      const isRed = Math.random() > 0.5;
      const carMat = new THREE.MeshBasicMaterial({ color: isRed ? 0xff2222 : 0xffffcc });
      const car = new THREE.Mesh(carGeom, carMat);

      const isXAxis = Math.random() > 0.5;
      car.position.set(
        cx + (Math.random() - 0.5) * this.chunkSize * 0.8,
        2.4,
        cz + (Math.random() - 0.5) * this.chunkSize * 0.8
      );
      group.add(car);

      this.trafficCars.push({
        mesh: car,
        axis: isXAxis ? "x" : "z",
        speed: 45 + Math.random() * 50,
        dir: Math.random() > 0.5 ? 1 : -1,
        min: (isXAxis ? cx : cz) - this.chunkSize / 2,
        max: (isXAxis ? cx : cz) + this.chunkSize / 2,
      });
    }
  }

  // 🌸 Detailed Farmland with Windmills, Farmhouses & Wooden Fences
  populateDetailedFarmland(group, cx, cz) {
    // 1. Windmills with cloth lattice sails
    for (let i = 0; i < 2; i++) {
      const wx = cx + (Math.random() - 0.5) * (this.chunkSize - 250);
      const wz = cz + (Math.random() - 0.5) * (this.chunkSize - 250);
      const wy = this.getTerrainHeight(wx, wz);

      const millGroup = new THREE.Group();
      const towerGeom = new THREE.CylinderGeometry(5.5, 8.5, 32, 10);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xd9c5b2, roughness: 0.85 });
      const tower = new THREE.Mesh(towerGeom, towerMat);
      tower.position.y = 16;
      millGroup.add(tower);

      const bladesGroup = new THREE.Group();
      const bladeGeom = new THREE.BoxGeometry(2.0, 24, 0.4);
      bladeGeom.translate(0, 12, 0);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.rotation.z = (Math.PI / 2) * b;
        bladesGroup.add(blade);
      }

      bladesGroup.position.set(0, 29, 6.0);
      millGroup.add(bladesGroup);
      millGroup.position.set(wx, wy, wz);
      group.add(millGroup);

      this.windmills.push(bladesGroup);
    }

    // 2. Rustic Farmhouses with Red Tile Roofs
    for (let i = 0; i < 3; i++) {
      const fx = cx + (Math.random() - 0.5) * (this.chunkSize - 200);
      const fz = cz + (Math.random() - 0.5) * (this.chunkSize - 200);
      const fy = this.getTerrainHeight(fx, fz);

      const houseGroup = new THREE.Group();
      const houseGeom = new THREE.BoxGeometry(16, 9, 12);
      const houseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
      const house = new THREE.Mesh(houseGeom, houseMat);
      house.position.y = 4.5;
      houseGroup.add(house);

      // Red Roof
      const roofGeom = new THREE.ConeGeometry(13, 7, 4);
      roofGeom.rotateY(Math.PI / 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.position.y = 12.5;
      houseGroup.add(roof);

      houseGroup.position.set(fx, fy, fz);
      group.add(houseGroup);
    }
  }

  // 🌊 Detailed Ocean with Beaches, 3D Palm Trees, Luxury Yachts & Lighthouses
  populateDetailedOcean(group, cx, cz) {
    // 1. Water Mesh
    const waterGeom = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 20, 20);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.9,
      roughness: 0.12,
      transparent: true,
      opacity: 0.88,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.set(cx, 0.8, cz);
    group.add(water);
    this.waterMeshes.push(water);

    // 2. Palm Trees along beaches
    const palmTrunkGeom = new THREE.CylinderGeometry(0.5, 0.9, 10, 6);
    palmTrunkGeom.translate(0, 5, 0);
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const frondGeom = new THREE.BoxGeometry(1.6, 0.2, 7.0);
    frondGeom.translate(0, 0, 3.5);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });

    for (let i = 0; i < 14; i++) {
      const px = cx + (Math.random() - 0.5) * this.chunkSize * 0.8;
      const pz = cz + (Math.random() - 0.5) * this.chunkSize * 0.8;
      const py = this.getTerrainHeight(px, pz);

      // Place only on sandy beach elevations (1.5m - 12m)
      if (py >= 1.5 && py <= 14) {
        const palmGroup = new THREE.Group();
        const trunk = new THREE.Mesh(palmTrunkGeom, palmTrunkMat);
        trunk.rotation.z = (Math.random() - 0.5) * 0.25;
        palmGroup.add(trunk);

        // Palm Fronds
        for (let f = 0; f < 6; f++) {
          const frond = new THREE.Mesh(frondGeom, frondMat);
          frond.position.y = 9.8;
          frond.rotation.y = (Math.PI / 3) * f;
          frond.rotation.x = 0.45;
          palmGroup.add(frond);
        }

        palmGroup.position.set(px, py, pz);
        group.add(palmGroup);
      }
    }

    // 3. Ships & Yachts anchored in the bay
    for (let i = 0; i < 2; i++) {
      const sx = cx + (Math.random() - 0.5) * (this.chunkSize - 300);
      const sz = cz + (Math.random() - 0.5) * (this.chunkSize - 300);
      const sy = this.getTerrainHeight(sx, sz);

      if (sy <= 0.5) {
        // In water
        const shipGroup = new THREE.Group();
        const hullGeom = new THREE.BoxGeometry(12, 6, 36);
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.7 });
        const hull = new THREE.Mesh(hullGeom, hullMat);
        hull.position.y = 2.0;
        shipGroup.add(hull);

        // Ship cabin
        const cabinGeom = new THREE.BoxGeometry(8, 5, 16);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });
        const cabin = new THREE.Mesh(cabinGeom, cabinMat);
        cabin.position.set(0, 6.5, -4);
        shipGroup.add(cabin);

        shipGroup.position.set(sx, 0.8, sz);
        shipGroup.rotation.y = Math.random() * Math.PI * 2;
        group.add(shipGroup);
      }
    }

    // 4. Coastal Lighthouse on rocks
    const lx = cx + 90;
    const lz = cz + 90;
    const ly = this.getTerrainHeight(lx, lz);
    if (ly > 8) {
      const lhGroup = new THREE.Group();
      const lhGeom = new THREE.CylinderGeometry(3.5, 6, 38, 12);
      const lhMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
      const lh = new THREE.Mesh(lhGeom, lhMat);
      lh.position.y = 19;
      lhGroup.add(lh);

      const beamGeom = new THREE.ConeGeometry(14, 140, 16);
      beamGeom.rotateX(Math.PI / 2);
      beamGeom.translate(0, 0, 70);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.y = 38;
      lhGroup.add(beam);

      lhGroup.position.set(lx, ly, lz);
      group.add(lhGroup);
      this.lighthouses.push(beam);
    }
  }

  populateDetailedMountains(group, cx, cz) {
    const treeCount = 50;
    const coneGeom = new THREE.ConeGeometry(6, 19, 6);
    coneGeom.translate(0, 9.5, 0);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9, flatShading: true });
    const inst = new THREE.InstancedMesh(coneGeom, pineMat, treeCount);
    inst.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < treeCount; i++) {
      const tx = cx + (Math.random() - 0.5) * (this.chunkSize - 100);
      const tz = cz + (Math.random() - 0.5) * (this.chunkSize - 100);
      const ty = this.getTerrainHeight(tx, tz);
      if (ty > 220 || ty < 12) continue;

      const scale = 0.8 + Math.random() * 0.8;
      dummy.position.set(tx, ty, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  initClouds() {
    const cloudGeom = new THREE.DodecahedronGeometry(1, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
    });

    for (let i = 0; i < 40; i++) {
      const cluster = new THREE.Group();
      const puffCount = 6 + Math.floor(Math.random() * 8);

      for (let j = 0; j < puffCount; j++) {
        const puff = new THREE.Mesh(cloudGeom, cloudMat);
        const scale = 30 + Math.random() * 50;
        puff.scale.set(scale, scale * 0.6, scale);
        puff.position.set(
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 90
        );
        cluster.add(puff);
      }

      cluster.position.set(
        (Math.random() - 0.5) * 6000,
        380 + Math.random() * 450,
        (Math.random() - 0.5) * 6000
      );

      this.clouds.push({
        group: cluster,
        speedX: 2.0 + Math.random() * 2.5,
      });

      this.scene.add(cluster);
    }
  }

  updateChunks(playerX, playerZ) {
    const currentChunkX = Math.floor(playerX / this.chunkSize);
    const currentChunkZ = Math.floor(playerZ / this.chunkSize);

    const neededKeys = new Set();

    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const cx = currentChunkX + dx;
        const cz = currentChunkZ + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.chunks.has(key)) {
          const chunkObj = this.createChunk(cx, cz);
          this.chunks.set(key, chunkObj);
        }
      }
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        if (chunk.colliders && chunk.colliders.length > 0) {
          this.buildingColliders = this.buildingColliders.filter(
            (b) => !chunk.colliders.includes(b)
          );
        }
        this.scene.remove(chunk.group);
        this.chunks.delete(key);
      }
    }

    const newBiome = this.getBiomeAt(playerX, playerZ);
    if (newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      if (this.onBiomeChangeCallback) {
        this.onBiomeChangeCallback(newBiome);
      }
    }
  }

  update(delta, playerPos, onRingCollect) {
    this.updateChunks(playerPos.x, playerPos.z);

    if (this.timeOfDay === "AUTO") {
      this.timeCycle = (this.timeCycle + delta * 0.015) % 1;
      if (this.timeCycle < 0.4) this.setTimeOfDay("DAY");
      else if (this.timeCycle < 0.65) this.setTimeOfDay("SUNSET");
      else this.setTimeOfDay("NIGHT");
    }

    if (this.radarDish) this.radarDish.rotation.y += delta * 1.2;

    for (const blades of this.windmills) {
      blades.rotation.z += delta * 1.8;
    }

    for (const beam of this.lighthouses) {
      beam.rotation.y += delta * 1.4;
    }

    // Stunt Rings
    const time = Date.now() * 0.003;
    for (const ring of this.stuntRings) {
      if (!ring.active) continue;
      ring.mesh.rotation.z += delta * 1.5;
      ring.mesh.scale.setScalar(1.0 + Math.sin(time + ring.mesh.position.x) * 0.08);

      const d = ring.mesh.position.distanceTo(playerPos);
      if (d < 16) {
        ring.active = false;
        ring.mesh.material.color.setHex(0x00ff88);
        flightAudio.playRingChime();
        if (onRingCollect) onRingCollect();
        setTimeout(() => {
          ring.active = true;
          ring.mesh.material.color.setHex(0x00f0ff);
        }, 12000);
      }
    }

    // AI Traffic
    for (const plane of this.aiPlanes) {
      plane.group.position.x += Math.cos(plane.heading) * plane.speed * delta;
      plane.group.position.z += Math.sin(plane.heading) * plane.speed * delta;
      plane.group.rotation.y = -plane.heading + Math.PI / 2;

      if (plane.group.position.distanceTo(playerPos) > 4000) {
        plane.group.position.x = playerPos.x - Math.cos(plane.heading) * 3500;
        plane.group.position.z = playerPos.z - Math.sin(plane.heading) * 3500;
      }
    }

    // Wave ripples
    const waveTime = Date.now() * 0.002;
    for (const water of this.waterMeshes) {
      const pos = water.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const w = Math.sin(u * 0.05 + waveTime) * Math.cos(v * 0.05 + waveTime) * 0.7;
        pos.setZ(i, w);
      }
      pos.needsUpdate = true;
    }

    // Red Aviation beacons
    const isBlink = Math.sin(Date.now() * 0.006) > 0;
    for (const beacon of this.beaconLights) {
      beacon.material.color.setHex(isBlink ? 0xff0033 : 0x330008);
    }

    // Traffic cars
    for (const car of this.trafficCars) {
      if (car.axis === "x") {
        car.mesh.position.x += car.speed * car.dir * delta;
        if (car.mesh.position.x > car.max) car.mesh.position.x = car.min;
        if (car.mesh.position.x < car.min) car.mesh.position.x = car.max;
      } else {
        car.mesh.position.z += car.speed * car.dir * delta;
        if (car.mesh.position.z > car.max) car.mesh.position.z = car.min;
        if (car.mesh.position.z < car.min) car.mesh.position.z = car.max;
      }
    }

    // Drift clouds
    for (const cloud of this.clouds) {
      cloud.group.position.x += cloud.speedX * delta * 6;
      if (cloud.group.position.x > playerPos.x + 3500) {
        cloud.group.position.x = playerPos.x - 3500;
      }
    }
  }
}

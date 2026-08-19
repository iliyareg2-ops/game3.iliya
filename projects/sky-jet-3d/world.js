// world.js - Infinite Multi-Biome Procedural World with Realistic Textured 3D Skyscrapers, Collision Detection, and 4 Dynamic Biomes
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkSize = 900;
    this.viewDistance = 2; // 5x5 grid

    this.windmills = [];
    this.lighthouses = [];
    this.trafficCars = [];
    this.clouds = [];
    this.buildingColliders = []; // Active building AABB bounding boxes
    this.beaconLights = [];

    this.radarDish = null;
    this.windsock = null;

    this.currentBiome = "AIRPORT";
    this.onBiomeChangeCallback = null;

    this.initTexturesAndMaterials();
    this.initLighting();
    this.initAirportBase();
    this.initClouds();
  }

  // Create high-detail procedural skyscraper canvas textures (Windows, Neon Ads, Architectural Facades)
  initTexturesAndMaterials() {
    // 1. Blue Glass Highrise Facade Texture
    const blueCanvas = document.createElement("canvas");
    blueCanvas.width = 512;
    blueCanvas.height = 1024;
    const bCtx = blueCanvas.getContext("2d");

    bCtx.fillStyle = "#162338";
    bCtx.fillRect(0, 0, 512, 1024);

    // Floor dividers & windows
    for (let y = 16; y < 1024; y += 32) {
      // Horizontal concrete slab
      bCtx.fillStyle = "#2c3e55";
      bCtx.fillRect(0, y, 512, 4);

      for (let x = 12; x < 512; x += 28) {
        const isLit = Math.random() > 0.35;
        if (isLit) {
          const warm = Math.random() > 0.6;
          bCtx.fillStyle = warm ? "#ffeaa7" : "#00f0ff";
        } else {
          bCtx.fillStyle = "#0c1524";
        }
        bCtx.fillRect(x, y + 6, 20, 20);
      }
    }
    const blueTex = new THREE.CanvasTexture(blueCanvas);
    blueTex.wrapS = THREE.RepeatWrapping;
    blueTex.wrapT = THREE.RepeatWrapping;

    this.blueGlassMat = new THREE.MeshStandardMaterial({
      map: blueTex,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x005577,
      emissiveIntensity: 0.35,
    });

    // 2. Gold Luxury Skyscraper Facade Texture
    const goldCanvas = document.createElement("canvas");
    goldCanvas.width = 512;
    goldCanvas.height = 1024;
    const gCtx = goldCanvas.getContext("2d");

    gCtx.fillStyle = "#2b2216";
    gCtx.fillRect(0, 0, 512, 1024);

    for (let y = 16; y < 1024; y += 28) {
      gCtx.fillStyle = "#59442a";
      gCtx.fillRect(0, y, 512, 3);
      for (let x = 14; x < 512; x += 24) {
        const isLit = Math.random() > 0.4;
        gCtx.fillStyle = isLit ? "#ffd166" : "#18120b";
        gCtx.fillRect(x, y + 4, 18, 18);
      }
    }
    const goldTex = new THREE.CanvasTexture(goldCanvas);
    goldTex.wrapS = THREE.RepeatWrapping;
    goldTex.wrapT = THREE.RepeatWrapping;

    this.goldGlassMat = new THREE.MeshStandardMaterial({
      map: goldTex,
      metalness: 0.88,
      roughness: 0.22,
      emissive: 0x664400,
      emissiveIntensity: 0.35,
    });

    // 3. Cyberpunk Neon Tower with Billboard Screen
    const cyberCanvas = document.createElement("canvas");
    cyberCanvas.width = 512;
    cyberCanvas.height = 1024;
    const cCtx = cyberCanvas.getContext("2d");

    cCtx.fillStyle = "#11141c";
    cCtx.fillRect(0, 0, 512, 1024);

    for (let y = 20; y < 1024; y += 36) {
      cCtx.fillStyle = "#1e2636";
      cCtx.fillRect(0, y, 512, 4);
      for (let x = 16; x < 512; x += 32) {
        const isLit = Math.random() > 0.45;
        cCtx.fillStyle = isLit ? "#00ffcc" : "#090d14";
        cCtx.fillRect(x, y + 6, 22, 22);
      }
    }

    // Huge Neon Billboard in the middle
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
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0x112233,
      emissiveIntensity: 0.5,
    });

    // 4. Modern White Architectural Highrise
    const whiteCanvas = document.createElement("canvas");
    whiteCanvas.width = 512;
    whiteCanvas.height = 1024;
    const wCtx = whiteCanvas.getContext("2d");

    wCtx.fillStyle = "#dde4ed";
    wCtx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 30) {
      wCtx.fillStyle = "#98a6b8";
      wCtx.fillRect(0, y, 512, 5);
      for (let x = 12; x < 512; x += 26) {
        const isLit = Math.random() > 0.4;
        wCtx.fillStyle = isLit ? "#3377aa" : "#445566";
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
    this.scene.fog = new THREE.FogExp2(0xcfe2f3, 0.00032);

    const hemiLight = new THREE.HemisphereLight(0xbde0fe, 0x485635, 0.9);
    hemiLight.position.set(0, 800, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaea, 1.8);
    this.sunLight.position.set(900, 1000, 700);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 100;
    this.sunLight.shadow.camera.far = 4500;

    const d = 1100;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Sun Visual Billboard
    const sunGeom = new THREE.SphereGeometry(70, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3aa });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.position.copy(this.sunLight.position).multiplyScalar(3.0);
    this.scene.add(sunMesh);
  }

  // Balanced 2D Biome Distribution: alternating smoothly every 1600m in all directions
  getBiomeAt(x, z) {
    // Starting runway plateau
    if (Math.abs(x) < 550 && Math.abs(z) < 700) {
      return "AIRPORT";
    }

    // Grid cells of 1800m
    const cellX = Math.floor((x + 100000) / 1800);
    const cellZ = Math.floor((z + 100000) / 1800);
    const hash = Math.abs((cellX * 73856093) ^ (cellZ * 19349663)) % 4;

    if (hash === 0) return "MOUNTAINS"; // 🏔️ Alpine Mountains
    if (hash === 1) return "CITY";      // 🏙️ 3D Megacity
    if (hash === 2) return "FLOWERS";   // 🌸 Flower Meadows & Windmills
    return "OCEAN";                     // 🌊 Ocean & Archipelago
  }

  getTerrainHeight(x, z) {
    const biome = this.getBiomeAt(x, z);

    if (biome === "AIRPORT") {
      const distToRunwayX = Math.abs(x);
      const distToRunwayZ = Math.abs(z);
      if (distToRunwayX < 140 && distToRunwayZ < 750) return 0;
      return Math.min(25, (distToRunwayX - 140) * 0.15);
    }

    if (biome === "CITY") {
      return 1.5; // City road surface
    }

    if (biome === "OCEAN") {
      const islandNoise = Math.sin(x * 0.004) * Math.cos(z * 0.004);
      if (islandNoise > 0.45) {
        return (islandNoise - 0.45) * 220;
      }
      return 0;
    }

    if (biome === "FLOWERS") {
      const h1 = Math.sin(x * 0.0025) * Math.cos(z * 0.0025) * 45;
      const h2 = Math.sin(x * 0.006 + 1.2) * 15;
      return Math.max(2, h1 + h2 + 18);
    }

    // Mountains
    const nx1 = x * 0.0007;
    const nz1 = z * 0.0007;
    const nx2 = x * 0.0022;
    const nz2 = z * 0.0022;
    const nx3 = x * 0.0065;
    const nz3 = z * 0.0065;

    let h1 = Math.sin(nx1 * 2.1) * Math.cos(nz1 * 1.8) * 360;
    let h2 = (Math.sin(nx2 * 3.4 + 1.2) + Math.cos(nz2 * 2.9 + 0.8)) * 140;
    let h3 = (Math.sin(nx3 * 5.0) * Math.cos(nz3 * 4.2)) * 35;

    let rawHeight = Math.abs(h1 + h2) * 1.2 + h3;
    return Math.max(15, rawHeight);
  }

  // Checks if airplane position intersects with any active skyscraper bounding box
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

  createChunk(cx, cz) {
    const chunkGroup = new THREE.Group();
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;
    const centerX = startX + this.chunkSize / 2;
    const centerZ = startZ + this.chunkSize / 2;
    const biome = this.getBiomeAt(centerX, centerZ);

    const segs = 32;
    const geom = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, segs, segs);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    const snowColor = new THREE.Color(0xf5f8fc);
    const rockColor = new THREE.Color(0x565c63);
    const grassColor = new THREE.Color(0x2f4c24);
    const meadowColor = new THREE.Color(0x458532);
    const cityRoadColor = new THREE.Color(0x181c22);
    const sandColor = new THREE.Color(0xdfc999);
    const oceanColor = new THREE.Color(0x106090);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + centerX;
      const vz = pos.getZ(i) + centerZ;
      const vy = this.getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      if (biome === "CITY") {
        color.copy(cityRoadColor);
      } else if (biome === "OCEAN") {
        if (vy > 4) color.copy(sandColor);
        else color.copy(oceanColor);
      } else if (biome === "FLOWERS") {
        const flowerNoise = Math.sin(vx * 0.02) * Math.cos(vz * 0.02);
        if (flowerNoise > 0.45) color.setHex(0xe63946); // Poppy
        else if (flowerNoise > 0.15) color.setHex(0x9d4edd); // Lavender
        else if (flowerNoise < -0.3) color.setHex(0xffb703); // Sunflower
        else color.copy(meadowColor);
      } else {
        if (vy > 320) color.copy(snowColor);
        else if (vy > 180) color.lerpColors(rockColor, snowColor, (vy - 180) / 140);
        else if (vy > 60) color.lerpColors(grassColor, rockColor, (vy - 60) / 120);
        else color.copy(grassColor);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: biome === "OCEAN" ? 0.2 : 0.85,
      metalness: biome === "OCEAN" ? 0.8 : 0.1,
    });

    const terrain = new THREE.Mesh(geom, mat);
    terrain.position.set(centerX, 0, centerZ);
    terrain.receiveShadow = true;
    chunkGroup.add(terrain);

    const chunkColliders = [];

    // Populate Biome-Specific Features
    if (biome === "CITY") {
      this.populateCity(chunkGroup, centerX, centerZ, chunkColliders);
    } else if (biome === "FLOWERS") {
      this.populateFlowerMeadow(chunkGroup, centerX, centerZ);
    } else if (biome === "OCEAN") {
      this.populateOceanIslands(chunkGroup, centerX, centerZ);
    } else if (biome === "MOUNTAINS" && Math.abs(centerX) > 300) {
      this.populateMountainPines(chunkGroup, centerX, centerZ);
    }

    this.scene.add(chunkGroup);
    return { group: chunkGroup, cx, cz, biome, colliders: chunkColliders };
  }

  // 🏙️ Realistic 3D Megacity with Textured Facades & Collision Boxes
  populateCity(group, cx, cz, collidersList) {
    const materials = [this.blueGlassMat, this.goldGlassMat, this.cyberMat, this.whiteArchMat];
    const gridStep = 130;

    for (let x = cx - this.chunkSize / 2 + 75; x < cx + this.chunkSize / 2 - 75; x += gridStep) {
      for (let z = cz - this.chunkSize / 2 + 75; z < cz + this.chunkSize / 2 - 75; z += gridStep) {
        if (Math.random() < 0.2) continue; // Avenue gap

        const width = 45 + Math.random() * 32;
        const depth = 45 + Math.random() * 32;
        const height = 90 + Math.random() * 240; // 90m to 330m high

        const mat = materials[Math.floor(Math.random() * materials.length)];
        const bldgGeom = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeom, mat);
        bldg.position.set(x, height / 2 + 1.5, z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        group.add(bldg);

        // Store AABB Collider for physical collision
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

        // Rooftop glowing spire with blinking aviation beacon
        if (height > 180) {
          const spireGeom = new THREE.CylinderGeometry(0.5, 2.0, 40, 8);
          const spireMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9 });
          const spire = new THREE.Mesh(spireGeom, spireMat);
          spire.position.set(x, height + 20 + 1.5, z);
          group.add(spire);

          // Red Blinking Obstruction Beacon on top
          const beaconGeom = new THREE.SphereGeometry(1.5, 8, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
          const beacon = new THREE.Mesh(beaconGeom, beaconMat);
          beacon.position.set(x, height + 40 + 1.5, z);
          group.add(beacon);
          this.beaconLights.push(beacon);
        } else if (Math.random() > 0.5) {
          // Helipad on roof
          const heliGeom = new THREE.RingGeometry(8, 11, 16);
          heliGeom.rotateX(-Math.PI / 2);
          const heliMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
          const helipad = new THREE.Mesh(heliGeom, heliMat);
          helipad.position.set(x, height + 1.6, z);
          group.add(helipad);
        }
      }
    }

    // Street traffic cars
    for (let i = 0; i < 16; i++) {
      const carGeom = new THREE.BoxGeometry(2.8, 1.3, 5.5);
      const isRed = Math.random() > 0.5;
      const carMat = new THREE.MeshBasicMaterial({ color: isRed ? 0xff2222 : 0xffffdd });
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
        speed: 40 + Math.random() * 50,
        dir: Math.random() > 0.5 ? 1 : -1,
        min: (isXAxis ? cx : cz) - this.chunkSize / 2,
        max: (isXAxis ? cx : cz) + this.chunkSize / 2,
      });
    }
  }

  populateFlowerMeadow(group, cx, cz) {
    for (let i = 0; i < 2; i++) {
      const wx = cx + (Math.random() - 0.5) * (this.chunkSize - 200);
      const wz = cz + (Math.random() - 0.5) * (this.chunkSize - 200);
      const wy = this.getTerrainHeight(wx, wz);

      const millGroup = new THREE.Group();
      const towerGeom = new THREE.CylinderGeometry(5, 8, 30, 8);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xeadbc8, roughness: 0.8 });
      const tower = new THREE.Mesh(towerGeom, towerMat);
      tower.position.y = 15;
      millGroup.add(tower);

      const bladesGroup = new THREE.Group();
      const bladeGeom = new THREE.BoxGeometry(1.8, 22, 0.4);
      bladeGeom.translate(0, 11, 0);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x4a321a });

      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.rotation.z = (Math.PI / 2) * b;
        bladesGroup.add(blade);
      }

      bladesGroup.position.set(0, 27, 5.5);
      millGroup.add(bladesGroup);
      millGroup.position.set(wx, wy, wz);
      group.add(millGroup);

      this.windmills.push(bladesGroup);
    }
  }

  populateOceanIslands(group, cx, cz) {
    const waterGeom = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x006699,
      metalness: 0.9,
      roughness: 0.15,
      transparent: true,
      opacity: 0.88,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.set(cx, 0.8, cz);
    group.add(water);

    const lx = cx + 80;
    const lz = cz + 80;
    const ly = this.getTerrainHeight(lx, lz);
    if (ly > 10) {
      const lhGroup = new THREE.Group();
      const lhGeom = new THREE.CylinderGeometry(3, 5, 36, 10);
      const lhMat = new THREE.MeshStandardMaterial({ color: 0xdd2222 });
      const lh = new THREE.Mesh(lhGeom, lhMat);
      lh.position.y = 18;
      lhGroup.add(lh);

      const beamGeom = new THREE.ConeGeometry(12, 120, 16);
      beamGeom.rotateX(Math.PI / 2);
      beamGeom.translate(0, 0, 60);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.y = 36;
      lhGroup.add(beam);

      lhGroup.position.set(lx, ly, lz);
      group.add(lhGroup);
      this.lighthouses.push(beam);
    }
  }

  populateMountainPines(group, cx, cz) {
    const treeCount = 45;
    const coneGeom = new THREE.ConeGeometry(6, 18, 5);
    coneGeom.translate(0, 9, 0);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f3b1e, roughness: 0.9, flatShading: true });
    const inst = new THREE.InstancedMesh(coneGeom, pineMat, treeCount);
    inst.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < treeCount; i++) {
      const tx = cx + (Math.random() - 0.5) * (this.chunkSize - 100);
      const tz = cz + (Math.random() - 0.5) * (this.chunkSize - 100);
      const ty = this.getTerrainHeight(tx, tz);
      if (ty > 240 || ty < 10) continue;

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
        (Math.random() - 0.5) * 5000,
        380 + Math.random() * 450,
        (Math.random() - 0.5) * 5000
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

    // Unload distant chunks & remove their building colliders
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

  update(delta, playerPos) {
    this.updateChunks(playerPos.x, playerPos.z);

    if (this.radarDish) this.radarDish.rotation.y += delta * 1.2;

    for (const blades of this.windmills) {
      blades.rotation.z += delta * 1.8;
    }

    for (const beam of this.lighthouses) {
      beam.rotation.y += delta * 1.4;
    }

    // Blink red aviation lights on skyscrapers
    const isBlink = Math.sin(Date.now() * 0.005) > 0;
    for (const beacon of this.beaconLights) {
      beacon.material.color.setHex(isBlink ? 0xff0033 : 0x440011);
    }

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

    for (const cloud of this.clouds) {
      cloud.group.position.x += cloud.speedX * delta * 6;
      if (cloud.group.position.x > playerPos.x + 3500) {
        cloud.group.position.x = playerPos.x - 3500;
      }
    }
  }
}

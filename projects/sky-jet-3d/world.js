// world.js - Infinite Multi-Biome Procedural World (Mountains, Megacity, Flower Meadows, Ocean Archipelago)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // key: "cx,cz" -> ChunkObject
    this.chunkSize = 900;
    this.viewDistance = 2; // radius of chunks around player (5x5 grid = 25 chunks)

    this.windmills = [];
    this.lighthouses = [];
    this.trafficCars = [];
    this.clouds = [];
    this.radarDish = null;
    this.windsock = null;

    this.currentBiome = "AIRPORT";
    this.onBiomeChangeCallback = null;

    this.initLighting();
    this.initAirportBase();
    this.initClouds();
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

  getBiomeAt(x, z) {
    // Starting runway area
    if (Math.abs(x) < 550 && Math.abs(z) < 700) {
      return "AIRPORT";
    }

    // Biome distribution based on world regions
    if (z > 950) {
      return "CITY"; // 🏙️ Megacity Skyline
    } else if (z < -950 && x > 200) {
      return "FLOWERS"; // 🌸 Flower Meadows & Windmills
    } else if (x < -950) {
      return "OCEAN"; // 🌊 Ocean & Islands
    } else {
      return "MOUNTAINS"; // 🏔️ Alpine Mountains
    }
  }

  getTerrainHeight(x, z) {
    const biome = this.getBiomeAt(x, z);

    // Flat airport zone
    if (biome === "AIRPORT") {
      const distToRunwayX = Math.abs(x);
      const distToRunwayZ = Math.abs(z);
      if (distToRunwayX < 140 && distToRunwayZ < 750) return 0;
      return Math.min(25, (distToRunwayX - 140) * 0.15);
    }

    if (biome === "CITY") {
      // City ground is mostly flat with slight terraces
      return 1.5;
    }

    if (biome === "OCEAN") {
      // Ocean water level is 0, rocky islands rise up
      const islandNoise = Math.sin(x * 0.004) * Math.cos(z * 0.004);
      if (islandNoise > 0.45) {
        return (islandNoise - 0.45) * 220; // Island hills
      }
      return 0; // Water
    }

    if (biome === "FLOWERS") {
      // Smooth rolling green hills
      const h1 = Math.sin(x * 0.0025) * Math.cos(z * 0.0025) * 45;
      const h2 = Math.sin(x * 0.006 + 1.2) * 15;
      return Math.max(2, h1 + h2 + 18);
    }

    // Default: Alpine Mountains & Canyons
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

  initAirportBase() {
    const group = new THREE.Group();

    // Runway
    const rwLength = 1200;
    const rwWidth = 54;
    const rwGeom = new THREE.PlaneGeometry(rwWidth, rwLength);
    rwGeom.rotateX(-Math.PI / 2);
    const rwMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.85 });
    const runway = new THREE.Mesh(rwGeom, rwMat);
    runway.position.set(0, 0.2, 0);
    runway.receiveShadow = true;
    group.add(runway);

    // Dashed center line
    const dashGeom = new THREE.PlaneGeometry(2.4, 24);
    dashGeom.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -rwLength / 2 + 50; z < rwLength / 2 - 50; z += 40) {
      const dash = new THREE.Mesh(dashGeom, dashMat);
      dash.position.set(0, 0.25, z);
      group.add(dash);
    }

    // Runway Edge Lights
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

    // Control Tower
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

    // Radar dish
    const dishGroup = new THREE.Group();
    const dishGeom = new THREE.SphereGeometry(4, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.4 });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.rotation.x = Math.PI / 3;
    dishGroup.add(dish);
    dishGroup.position.set(80, 56, -200);
    group.add(dishGroup);
    this.radarDish = dishGroup;

    // Hangars
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

  // Create a Chunk Mesh based on its Biome
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
        // Multi-color flower field patches
        const flowerNoise = Math.sin(vx * 0.02) * Math.cos(vz * 0.02);
        if (flowerNoise > 0.45) {
          color.setHex(0xe63946); // Red Poppy
        } else if (flowerNoise > 0.15) {
          color.setHex(0x9d4edd); // Lavender
        } else if (flowerNoise < -0.3) {
          color.setHex(0xffb703); // Golden Sunflower
        } else {
          color.copy(meadowColor);
        }
      } else {
        // Mountains
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

    // Populate Biome-Specific Features
    if (biome === "CITY") {
      this.populateCity(chunkGroup, centerX, centerZ);
    } else if (biome === "FLOWERS") {
      this.populateFlowerMeadow(chunkGroup, centerX, centerZ);
    } else if (biome === "OCEAN") {
      this.populateOceanIslands(chunkGroup, centerX, centerZ);
    } else if (biome === "MOUNTAINS" && Math.abs(centerX) > 300) {
      this.populateMountainPines(chunkGroup, centerX, centerZ);
    }

    this.scene.add(chunkGroup);
    return { group: chunkGroup, cx, cz, biome };
  }

  // 🏙️ 3D Megacity with Skyscrapers, Neon Spires & Moving Traffic
  populateCity(group, cx, cz) {
    const bldgCount = 28;
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x222a36,
      metalness: 0.85,
      roughness: 0.25,
    });

    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00e1ff,
      emissiveIntensity: 0.9,
    });

    const goldNeonMat = new THREE.MeshStandardMaterial({
      color: 0xffa500,
      emissive: 0xff8800,
      emissiveIntensity: 0.9,
    });

    const gridStep = 120;
    for (let x = cx - this.chunkSize / 2 + 70; x < cx + this.chunkSize / 2 - 70; x += gridStep) {
      for (let z = cz - this.chunkSize / 2 + 70; z < cz + this.chunkSize / 2 - 70; z += gridStep) {
        if (Math.random() < 0.25) continue; // Street intersection

        const width = 45 + Math.random() * 30;
        const depth = 45 + Math.random() * 30;
        const height = 80 + Math.random() * 220; // 80m to 300m tall skyscrapers!

        const bldgGeom = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeom, bldgMat);
        bldg.position.set(x, height / 2 + 1.5, z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        group.add(bldg);

        // Rooftop glowing spire or helipad
        if (height > 180) {
          const spireGeom = new THREE.CylinderGeometry(0.5, 2.0, 35, 8);
          const spire = new THREE.Mesh(spireGeom, Math.random() > 0.5 ? neonMat : goldNeonMat);
          spire.position.set(x, height + 17.5 + 1.5, z);
          group.add(spire);
        } else if (Math.random() > 0.6) {
          // Helipad ring
          const ringGeom = new THREE.RingGeometry(8, 10, 16);
          ringGeom.rotateX(-Math.PI / 2);
          const helipad = new THREE.Mesh(ringGeom, goldNeonMat);
          helipad.position.set(x, height + 1.7, z);
          group.add(helipad);
        }
      }
    }

    // Traffic lanes with moving glowing headlights
    for (let i = 0; i < 14; i++) {
      const carGeom = new THREE.BoxGeometry(2.5, 1.2, 5.0);
      const isRed = Math.random() > 0.5;
      const carMat = new THREE.MeshBasicMaterial({ color: isRed ? 0xff2222 : 0xffffaa });
      const car = new THREE.Mesh(carGeom, carMat);

      const isXAxis = Math.random() > 0.5;
      car.position.set(
        cx + (Math.random() - 0.5) * this.chunkSize * 0.8,
        2.2,
        cz + (Math.random() - 0.5) * this.chunkSize * 0.8
      );

      group.add(car);
      this.trafficCars.push({
        mesh: car,
        axis: isXAxis ? "x" : "z",
        speed: 35 + Math.random() * 45,
        dir: Math.random() > 0.5 ? 1 : -1,
        min: (isXAxis ? cx : cz) - this.chunkSize / 2,
        max: (isXAxis ? cx : cz) + this.chunkSize / 2,
      });
    }
  }

  // 🌸 Flower Meadow with Windmills
  populateFlowerMeadow(group, cx, cz) {
    // Add 1-2 Windmills per chunk
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

      // Blades
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

  // 🌊 Ocean with Lighthouses
  populateOceanIslands(group, cx, cz) {
    // Water surface
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

    // Lighthouse on island
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

      // Light beam
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

  // 🏔️ Mountain Pine Trees
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

  // Stream chunks around player position
  updateChunks(playerX, playerZ) {
    const currentChunkX = Math.floor(playerX / this.chunkSize);
    const currentChunkZ = Math.floor(playerZ / this.chunkSize);

    // Track active chunk keys
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

    // Unload distant chunks
    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.group);
        this.chunks.delete(key);
      }
    }

    // Check biome change
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

    // Rotate radar
    if (this.radarDish) this.radarDish.rotation.y += delta * 1.2;

    // Rotate windmill blades
    for (const blades of this.windmills) {
      blades.rotation.z += delta * 1.8;
    }

    // Sweep lighthouse beams
    for (const beam of this.lighthouses) {
      beam.rotation.y += delta * 1.4;
    }

    // Move traffic cars
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
